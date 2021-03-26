
# 引用
```javascript
npm i @zhangjiangpo/web-socket

import Socket from '@zhangjiangpo/web-socket'
```
## 初始化
```javascript
import Socket from '...'
let socket = new Socket(sessionStorage.getItem('tmWSUrl') || 'wss://ws.aixuexi.com/websocket')
socket.on(Socket.EventKey.MESSAGE, (msg) => {})
socket.on(Socket.EventKey.LOG, (data) => {})
socket.on(Socket.EventKey.OPEN, () => {
  //是否是重连操作
  if(socket._reconnectCount > 0){
    //socket 初始化成功后 login或者join reconnect 里处理 外层不在处理
    ...
  }
})
//then socket对象的方法 同Promise
socket.then(() => {
  //成功
}, () => {
  //失败
})
```
## common.js @decorator.throttle demo
```javascript
//import {decorator} from 'common.js'
class A{
  constructor(name, time){
    this.name = name;
    this.time = time
    console.log(name)
  }
  @decorator.throttle(2000)
  say(age){
    console.log('A say', this.name, age)
    // must return Promise
    return Promise.resolve(this.name)
  }
  sy(age){
    //节流 delay时间内执行第一次调用
    this.say(age).then(res => {
      console.log('get name ', res)
    })
    this.say(age);
    setTimeout(() => {
      this.say(age);
      this.say(age);
    },1200)
  }
}
let a = new A('zjp', 200)
setTimeout(() => {a.sy(12)}, 6000)
let b = new A('zjpb', 200)
b.sy(14)

//result
zjp
zjpb

throttle do
throttle do
throttle do
A say zjpb 14
get name  zjpb

throttle do
throttle do
throttle do
A say zjp 12
get name  zjp
```