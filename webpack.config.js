const webpack = require('webpack')
const HtmlWebpackInlineSourcePlugin = require("html-webpack-inline-source-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = (env, argv) => ({
  mode: argv.mode === "production" ? "production" : "development",
  devtool: false, //  argv.mode === "production" ? false : "inline-source-map",
  entry: {
    ui: "./plugin/ui.tsx", // The entry point for your UI code
    code: "./plugin/code.ts" ,
    lib: "./lib/html-to-figma.ts"// The entry point for your plugin code
  },
  module: {
    rules: [
      { test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ },
      {
        test: /\.css$/,
        loader: [{ loader: "style-loader" }, { loader: "css-loader" }]
      },
      { test: /\.(png|jpg|gif|webp|svg)$/, loader: [{ loader: "url-loader" }] }
    ]
  },
  resolve: { extensions: [".tsx", ".ts", ".jsx", ".js"] },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist")
  },
  plugins: [
    new webpack.EnvironmentPlugin(['NODE_ENV', 'API_ROOT']),
    new HtmlWebpackPlugin({
      template: "./plugin/ui.html",
      filename: "ui.html",
      inlineSource: ".(js)$",
      chunks: ["ui"]
    }),
    new HtmlWebpackInlineSourcePlugin()
  ]
});
