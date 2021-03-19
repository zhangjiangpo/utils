/*
 * @Author: zhangjiangpo 
 * @Date: 2021-03-19 19:00:12 
 * @Last Modified by: 
 * @Last Modified time: 2021-03-19 19:02:05
 */

import {debounce} from '../../common'
/**
 * 获取配置信息
 * @param {*} option 业务侧配置
 */
var getDefaultOpt = (option) => {
  return Object.assign({
    proto: 'rmhttp1', // 子协议
    //心跳相关配置 为null 则不心跳
    heartbeat: {
      timeInval: 6000, // 6s心跳
      retryCount: 10, // 10次心跳无响应触发超时
      message: {url: 'api/status/heartBeat'}
    },
    //重连配置
    reconnect: {
      delay: 5 * 1000,
    },
    //init 超时时间
    initTimeout: 10 * 1000,
    // state：0时 消息重试次数
    sendRetry: 3,
     // 回复收到的消息
    getFeedbackMsg: (msg) => {
      if (msg && msg.requestId && msg.url) {
        let feedbackMsg = {
          "url": 'api/status/receiveFeedback',
          "requestId": msg.requestId,
          "data": {
            "url": msg.url
          }
        }
        return JSON.stringify(feedbackMsg)
      }
      return ''
    }
  }, option)
}
/**
 * new Socket(url, option).then()
 */
export default class Socket {
  constructor(wsUrl, option) {
    this.wsUrl = wsUrl
    this.opt = getDefaultOpt(option)
    this._socket = null // socket对象
    this.isLogout = false
    this.heartbeat = { // 心跳
      interval: null,
      //已经尝试重试次数
      retriedCount: 0
    }
    //重连机制函数
    this._reconnect = null
    //重连次数
    this._reconnectCount = 0
    this.dateKey = null
    this._eventQueue = {}
    this._onceEventQueue = {}
    this.initTimeouter = null

    //防抖重连 状态为非1
    this._reconnect = debounce(this, (reason) => {
      if(!this.isStateOK()){
        this._reconnectCount++
        this._initSocket()
        let that = this
        return new Promise((resolve, reject) => {
          that.then(resolve, reject)
        })
      } else {
        return Promise.resolve()
      }
    }, this.opt.reconnect.delay)

    this._initSocket()
  }
  static EventKey = {
    CLOSE: 'CLOSE',
    OPEN: 'OPEN',
    ERROR: 'ERROR',
    MESSAGE: 'MESSAGE',
    TIMEOUT: 'TIMEOUT', //心跳无响应超时
    LOG: 'LOG', //log
  }
  /**
   * 初始化后 获取是否成功事件
   */
  then(fn, errFn){
    let that = this
    if(this.isStateOK()){
      fn && fn()
      return
    }
    that.initTimeouter = true
    setTimeout(() => {
      if(!that.initTimeouter){
        return
      }
      errFn && errFn()
      this.destroy('init timeout').then(() => {
        this._reconnect('init timeout')
      })
    }, this.opt.initTimeout)
    this.once(Socket.EventKey.OPEN, function socketThen() {
      that.initTimeouter = false
      fn && fn()
    })
  }
  /**
   * 注册事件到队列 例： socket.on(Socket.EventKey.CLOSE, () => {});
   * @param {*} key 事件类型
   * @param {*} fn  事件
   */
  on(key, fn){
    if(!Socket.EventKey[key]){
      this._logFilter("socket event key undefined " + key, "event")
      return false
    }
    if(!this._eventQueue[key]){
      this._eventQueue[key] = [fn]
    } else {
      this._eventQueue[key].push(fn)
    }
  }
  once(key, fn){
    if(!Socket.EventKey[key]){
      this._logFilter("socket event key undefined " + key, "event")
      return false
    }
    if(!this._onceEventQueue[key]){
      this._onceEventQueue[key] = [fn]
    } else {
      if(fn.name && this._onceEventQueue[key].some(item => item.name == fn.name)){
        return
      }
      this._onceEventQueue[key].push(fn)
    }
  }
  /**
   * socket 发送消息事件 readyState != 1 不发消息
   * 
   * @param message 消息体
   * @param callback callback(error = {type:10/20, [count]}, readyState)
   * @param count 重试次数倒计时
   * 
   * @returns  this._socket.readyState 外层业务去判断是否要重连 并 重发
   */
  send(message, callback, count = this.opt.sendRetry) {
    let readyState = this._socket && this._socket.readyState != undefined ? this._socket.readyState : -1
    this._logFilter(message, 'send:readyState:' + readyState + ":count:" + count)
    if(readyState === 1){
      this._socket.send(JSON.stringify(message))
      callback && callback(null, readyState)
    } else if(readyState == 0){
      if(count > 0) {
        --count
        setTimeout(() => {
          return this.send(message, callback, count)
        }, 2000)
      }
      callback && callback({
        type: 10,
        count
      }, readyState)
    } else {
      // 正在关闭 或者 已经关闭
      callback && callback({
        type: 20
      }, readyState)
    }
  }
  /**
   * 销毁当前socket对象
   * @param {*} reason 销毁原由
   */
  destroy(reason) {
    this._logFilter(reason, 'destroy:')
    this._socket && this._socket.close()
    return new Promise(resolve => {
      this.once(Socket.EventKey.CLOSE, () => {
        resolve()
      })
    })
  }
  /**
   * 登出ws 不会再重连
   */
  logout(){
    this.isLogout = true
    //只有退出登录才清空队列
    this._clear()
    return this.destroy()
  }
  /**
   * 判断当前socket状态是否可用
   */
  isStateOK(){
    return this._socket && this._socket.readyState == 1
  }
  // 创建socket
  _initSocket() {
    this.dateKey = Date.now()
    try {
      if ('WebSocket' in window) {
        if (this.opt.proto) {
          this._socket = new WebSocket(this.wsUrl, this.opt.proto)
        } else {
          this._socket = new WebSocket(this.wsUrl)
        }
      } else {
        this._logFilter('====WebSocket not in window====', 'init')
        return Promise.reject('windows no WebSocket')
      }
    } catch (e) {
      this._logFilter('====_initSocket error====' + JSON.stringify(e), 'init')
      return Promise.reject('init error')
    }
    if(this._socket){
      this._logFilter('====_initSocket====', 'init')
      return this._initEventHandle()
    } else {
      this._logFilter('====_initSocket null====', 'init')
      return Promise.reject('init null')
    }
  }
  _handleQueueEvents(key, data){
    let events = this._eventQueue[key]
    if(events && events.length){
      events.forEach(fn => {
        fn(data)
      })
    }
    let onceEvents = this._onceEventQueue[key]
    while(onceEvents && onceEvents.length > 0){
      let fn = onceEvents.shift()
      fn(data)
    }
  }
  _clear(){
    //销毁队列
    this._eventQueue = {}
    this._onceEventQueue = {}
    //有心跳interval的清空
    this.heartbeat.interval && clearInterval(this.heartbeat.interval)
    this._socket = null
  }
  // 初始化socket设置
  _initEventHandle() {
    this.once(Socket.EventKey.OPEN, () => {
      //open后执行心跳
      if(this.opt.heartbeat){
        this._heartStart()
      }
    })
    /**
     * socket close 底层不再自己重连（重连就是重新实例化Socket） 由外侧业务监听close事件后决定是否重连
     */
    this._socket.onclose = (event) => {
      this._logFilter('llws连接关闭!', 'close:')
      this._handleQueueEvents(Socket.EventKey.CLOSE, event)
      if(!this.isLogout){
        this._reconnect(' close ')
      }
    }

    this._socket.onerror = (event) => {
      this._logFilter("llws连接错误!" + JSON.stringify(event), 'error')
      this._handleQueueEvents(Socket.EventKey.ERROR)
      if(!this.isLogout){
        this._reconnect(' error ')
      }
    }
    this._socket.onopen = () => {
      this._logFilter("llws连接成功!", 'open')
      this._handleQueueEvents(Socket.EventKey.OPEN)
    }
    this._socket.onmessage = event => {
      let msg = {}
      try{
        msg = JSON.parse(event.data)
      }catch(e){
        this._logFilter("message error" + JSON.stringify(e), 'on:')
      }
      this._logFilter(msg && msg.url, 'on:')
      let feedbackMsg = ''
      this.opt.getFeedbackMsg && (feedbackMsg = this.opt.getFeedbackMsg()) && this._socket.send(feedbackMsg)
      // 所有消息
      this._logFilter(msg, 'on:')
      this._handleQueueEvents(Socket.EventKey.MESSAGE, msg)
    }
  }
  _logFilter(msg, type) {
    let heartbeat = this.opt.heartbeat || {}
    let hbMsg = heartbeat.message || {}
    try {
      if (msg && msg.url && msg.url.indexOf(hbMsg.url) >= 0 || msg && msg.indexOf && msg.indexOf(hbMsg.url) > -1) {
        return
      }
      this._handleQueueEvents(Socket.EventKey.LOG, {
        type: 'ws:' + type + ":dateKey:" + this.dateKey,
        data: msg
      })
    } catch (err) {
      console.log('ws log 失败', err)
    }
  }
  // 心跳 
  _heartStart() {
    this.heartbeat.interval && clearInterval(this.heartbeat.interval)
    let heartbeat = this.opt.heartbeat || {}
    let hbMsg = heartbeat.message || {}
    this.heartbeat.retriedCount = 0
    //只要收到消息
    this.on(Socket.EventKey.MESSAGE, (msg) => {
      this.heartbeat.retriedCount = 0
    })
    this.heartbeat.interval = setInterval(() => {
      if(this.heartbeat.retriedCount > heartbeat.retryCount){
        clearInterval(this.heartbeat.interval)
        this._handleQueueEvents(Socket.EventKey.TIMEOUT)
        this.destroy('heartbeat timeout').then(() => {
          if(!this.isLogout){
            this._reconnect('heart time out')
          }
        })
      } else {
        ++this.heartbeat.retriedCount
        this.send(hbMsg)
      }
    }, heartbeat.timeInval)
  }
}