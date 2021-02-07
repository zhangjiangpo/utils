const path = require('path')
module.exports = {
  mode: 'production',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, "./lib"),
    filename: "index.js",
    chunkFilename: "[id].js",
    libraryExport: "default",
    library: "@zjp/session-store",
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