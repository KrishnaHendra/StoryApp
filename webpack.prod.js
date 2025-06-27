const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isWatchMode = process.argv.includes('--watch');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css',
    }),
  ].filter(Boolean),
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxInitialRequests: 20,
      maxAsyncRequests: 20,
      cacheGroups: {
        vendors: {
          test: /[\/]node_modules[\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
});
