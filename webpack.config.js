/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    lambda: './src/lambda.ts',
  },
  resolve: {
    extensions: ['.js', '.json', '.ts'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'commonjs2',
  },
  target: 'node',
  devtool: 'source-map',
  // resolve: {
  //   extensions: ['.ts', '.js'],
  //   // modules: ['node_modules', 'src'],
  //   alias: {
  //     src: path.resolve(__dirname, 'src'),
  //   },
  // },
  module: {
    rules: [
      // {
      //   // Include ts, tsx, js, and jsx files.
      //   test: /\.(ts|js)$/,
      //   exclude: /node_modules/,
      //   use: ['babel-loader'],
      // },
      {
        test: /\.ts$/,
        include: path.resolve(__dirname, 'src'),
        use: [
          {
            loader: 'ts-loader',
            options: { configFile: 'tsconfig.lambda.json' },
          },
        ],
      },
    ],
  },
};
