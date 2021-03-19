/*
 * @Author: zhangjiangpo 
 * @Date: 2021-03-19 19:00:18 
 * @Last Modified by:    
 * @Last Modified time: 2021-03-19 19:00:18 
 */
/**
 * 防抖
 * @param {*} ctx 上下文 
 * @param {*} fn 
 * @param {*} delay 
 */
function debounce(ctx, fn, delay){
  let timer = null
  return function (){
    var arg = [].slice.call(arguments)
    return new Promise((resolve, reject) => {
      if(timer){
        console.log("debounce do")
      } else {
        timer = setTimeout(() => {
          timer = null
          fn && fn.apply(ctx, arg).then(() => {
            resolve();
          }, () => {
            reject();
          }).catch(e => {
            console.error('debounce error' + JSON.stringify(e), e)
          })
        }, delay)
      }
    })
  }
}
export default {
  debounce
}