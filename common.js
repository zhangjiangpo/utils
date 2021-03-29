/*
 * @Author: zhangjiangpo 
 * @Date: 2021-03-19 19:00:18 
 * @Last Modified by: 
 * @Last Modified time: 2021-03-29 14:51:07
 */
var decorator = {
  /**
   * class function and return must be Promise
   * @param {*} delay 
   */
  throttle(delay){
    return (target, key, descriptor) => {
      let mt = descriptor.value;
      //ctx 为null时， 取运行时的this 即class实例对象
      descriptor.value = throttle(null, mt, delay)
      return descriptor;
    }
  }
}
/**
 * 节流 return must be Promise
 * @param {*} ctx 上下文 
 * @param {*} fn 
 * @param {*} delay 
 */
function throttle(ctx, fn, delay){
  let timer = null
  return function (...arg){
    return new Promise((resolve, reject) => {
      if(timer){
        console.log("throttle do")
      } else {
        timer = setTimeout(() => {
          timer && clearTimeout(timer)
          timer = null
          fn && fn.call(ctx || this, ...arg).then((res) => {
            resolve(res);
          }, (err) => {
            reject(err);
          }).catch(e => {
            console.error('throttle error' + JSON.stringify(e), e)
            throw new Error(e && e.message)
          })
        }, delay)
      }
    })
  }
}
export {
  throttle,
  decorator
}
export default {
  throttle,
  decorator
}