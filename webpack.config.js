const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@core": path.resolve(__dirname, "src/core/"),
      "@ecs": path.resolve(__dirname, "src/core/ecs/"),
      "@utils": path.resolve(__dirname, "src/core/utils/"),
      "@debug": path.resolve(__dirname, "src/core/debug/"),
      "@types": path.resolve(__dirname, "src/types/")
    }
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "public")
    },
    compress: true,
    port: 9000
  }
}
