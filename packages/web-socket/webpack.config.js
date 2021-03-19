/*
 * @Author: zhangjiangpo 
 * @Date: 2021-03-19 19:02:47 
 * @Last Modified by: 
 * @Last Modified time: 2021-03-19 19:04:06
 */
const path = require('path')
module.exports = {
  mode: 'production',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, "./lib"),
    filename: "index.js",
    chunkFilename: "[id].js",
    libraryExport: "default",
    library: "@zjp/web-socket",
    libraryTarget: "umd",
    umdNamedDefine: true,
    globalObject: 'this'
  },
  module: {
    rules: [{
      test: /\.js$/,
      include: __dirname,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }]
  }
}