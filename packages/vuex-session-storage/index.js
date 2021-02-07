/*
 * @Author: zhangjiangpo 
 * @Date: 2021-01-28 15:16:56 
 * @Last Modified by: 
 * @Last Modified time: 2021-01-29 11:49:31
 *  vuex 状态值关联到 sessionStorage 中
 * 
 * 
  **
   * 
   * @param {*} modules vuex module对象
   * @param {*} types   格式必须是如下格式：
   * 
   *  export const global = { //对象名即为命名空间
        SAVE_REDBAG_TYPE: 'SAVE_REDBAG_TYPE'
      }
   *
    const ss = new SessionStore(modules, types)
    new Vuex.Store({
      modules: ss.modules,
      plugins: [ss.getPlugin()]
    })
 */
export default class SessionStore{
  constructor(modules = {}, types = {}) {
    this.modules = modules;
    this.types = types
    this.prefix = "SESSION_STORE_";
    this._init()
  }
  _init() {
    // 有缓存 取缓存的值覆盖 module.state
    Object.keys(this.modules).forEach(moduleKey => {
      let state = this._getModuleState(moduleKey)
      if(state) {
        this.modules[moduleKey].state = state
      }
    })
  }
  _getModuleState(key) {
    let moduleStateStr = sessionStorage.getItem(this.prefix + key);
    try{
      return JSON.parse(moduleStateStr)
    } catch(e) {
      console.warn('get session store fail ' + JSON.stringify(e))
      return null
    }
  }
  _saveModuleState(key, value) {
    try{
      sessionStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch(e) {
      console.warn('set session store fail ' + JSON.stringify(e))
    }
  }
  getPlugin(){
    return store => {
      store.subscribe((mutation, state) => {
        // 每次 mutation 之后调用
        // mutation 的格式为 { type, payload }
        Object.keys(this.types).forEach(key => {
          if(mutation.type.indexOf(key + '/') >= 0){
            this._saveModuleState(key, state[key])
          }
        })
      })
    }
  }
}
