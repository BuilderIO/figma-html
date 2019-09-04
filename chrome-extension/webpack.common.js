const path = require("path");
const { copySync } = require("fs-extra-promise");

function copyInfoToDist() {
  copySync("./info", "./dist", {
    overwrite: true,
    recursive: true
  });
}

copyInfoToDist();

module.exports = {
  entry: {
    popup: path.join(__dirname, "src/popup/index.tsx"),
    inject: path.join(__dirname, "src/inject.ts"),
    background: path.join(__dirname, "src/background.ts")
  },
  output: {
    path: path.join(__dirname, "dist/js"),
    filename: "[name].js"
  },
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.tsx?$/,
        use: "ts-loader"
      },
      {
        exclude: /node_modules/,
        test: /\.scss$/,
        use: [
          {
            loader: "style-loader" // Creates style nodes from JS strings
          },
          {
            loader: "css-loader" // Translates CSS into CommonJS
          },
          {
            loader: "sass-loader" // Compiles Sass to CSS
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  }
};
