/* eslint-env node, es6 */
const path = require('path');
const fs = require('fs-extra');
const mergeOptions = require('merge-options');
const backstopjs = require('backstopjs');
const url = require('url');
const {getOption} = require('../lib/env');
const {tmpl, ROOT, DOCROOT} = require('../lib/dir');
const {runServer} = require('./server');

/**
 * Run backstop in node server
 *
 * @param {string} cmd Backstop command. Can be one of [test, reference, approve]
 * @return {Promise}
 */
const runBackstop = cmd => runServer({
  host: 'localhost',
  watch: false,
  localOnly: true,
  logLevel: 'silent',
  notify: false,
}).then(({url: serverUrl, destroy}) => Promise.all([
  {serverUrl, destroy},
  path.join(__dirname, '../tests/backstop.json'),
  tmpl.glob(['**/backstop.json'], ROOT),
])).then(([{serverUrl, destroy}, baseConfig, themeConfig]) => Promise.all([
  {serverUrl, destroy},
  ...[baseConfig, ...themeConfig].map(file => fs.readJson(file)),
])).then(([{serverUrl, destroy}, ...configs]) => {
  const config = mergeOptions.call({concatArrays: true}, ...configs);
  const shop = getOption('shop');
  // Map browsersync url to scenarios
  config.scenarios = (config.scenarios || []).map(scenario => {
    const {url: scenarioUrl = 'http://localhost', cookiePath = ''} = scenario;
    const parsed = url.parse(scenarioUrl);
    const path = parsed.path || '';
    const hash = parsed.hash || '';
    return {
      ...scenario,
      url: `${serverUrl}${path}${hash}`,
      cookiePath: tmpl.path(cookiePath, DOCROOT),
    };
  });

  // Make paths absolute to DOCROOT so it's easier to overwrite in theme
  config.onBeforeScript = tmpl.path(config.onBeforeScript, DOCROOT);
  config.onReadyScript = tmpl.path(config.onReadyScript, DOCROOT);
  // Also add shop id to reports & reference folders
  config.paths = Object.keys(config.paths || {}).reduce((paths, key) => ({
    ...paths, [key]: tmpl.path((/scripts/.test(key) ? config.paths[key] : path.join(config.paths[key], `${shop}`))),
  }), {});

  return backstopjs(cmd, {config})
    .then(() => destroy())
    .then(() => {
      setTimeout(() => process.exit(0), 1000);
      return true;
    });
});

/**
 * Regression tests using basckstopjs
 * @return {Promise} Resolves when task is finished
 */
const regression = () => {
  if (getOption('approve')) {
    return runBackstop('approve');
  }

  if (getOption('reference')) {
    return runBackstop('reference');
  }
  runBackstop('test');
};

/**
 * Generate reference files
 * @return {Promise} Resolves when task is finished
 */
const regressionReference = () => runBackstop('reference');

/**
 * Approve test results
 * @return {Promise} Resolves when task is finished
 */
const regressionApprove = () => runBackstop('approve');

module.exports = {
  regression,
  regressionReference,
  regressionApprove,
};
