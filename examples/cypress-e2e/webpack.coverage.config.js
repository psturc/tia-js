import { merge } from 'webpack-merge';
import baseConfig from './webpack.config.js';

// Set environment for Babel to enable instrumentation
process.env.NODE_ENV = 'test';
process.env.CYPRESS_COVERAGE = 'true';

export default merge(baseConfig, {
  mode: 'development', // Use development mode for better debugging
  devtool: 'source-map', // Enable source maps for coverage mapping
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              // Add Istanbul instrumentation for coverage
              [
                'babel-plugin-istanbul',
                {
                  exclude: [
                    '**/*.test.js',
                    '**/*.spec.js',
                    '**/*.cy.js',
                    '**/cypress/**',
                    '**/node_modules/**',
                  ],
                },
              ],
            ],
            cacheDirectory: false, // Disable cache to ensure instrumentation is applied
          },
        },
      },
    ],
  },
  optimization: {
    // Disable minification to preserve coverage instrumentation
    minimize: false,
  },
});
