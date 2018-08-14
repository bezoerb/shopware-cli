/* eslint-env node, es6 */
const webpack = require('webpack');
const log = require('fancy-log');
const PluginError = require('plugin-error');
const {isDev} = require('../lib/env');
const webpackConfig = require('../webpack.config.js');

/**
 * Concatenate and minify JavaScript.
 */
const scripts = () => cb => {
  webpackConfig().then(config => ({
    ...config, stats: /* isDev && */ {
      // Configure the console output
      colors: true,
      modules: true,
      reasons: true,
      errorDetails: true,
    },
  })).then(config => {
    webpack(config, (err, stats) => {
      if (err) {
        throw new PluginError('webpack:build', err);
      }
      if (isDev()) {
        log('[webpack:build]', stats.toString({
          colors: true,
        }));
      }

      cb();
    });
  });
};

module.exports = {
  scripts,
};
