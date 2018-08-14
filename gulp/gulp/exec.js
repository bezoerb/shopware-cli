/* eslint-env node, es6 */
const log = require('fancy-log');
const {setHost, destroyDbConnection} = require('../lib/shopware');
const {phpCli} = require('../lib/php');
const {ENV, getOption} = require('../lib/env');

/**
 * Set shopware host (possible in combination with shop parameter)
 * @return {Promise}
 */
const swSetHost = () => setHost(getOption('host', 'localhost'))
  .then(() => destroyDbConnection())
  .catch(err => log('Error:', err));

/**
 * Dump theme config
 * @return {Promise}
 */
const swDumpConfig = () => phpCli('sw:theme:dump:configuration').catch(err => log('Error:', err));

/**
 * Compile theme and generate template cache
 * @return {Promise}
 */
const swCompileTheme = () => phpCli('sw:theme:cache:generate').catch(err => log('Error:', err));

/**
 * Clear cache (use --env [node|dev|prod] for specific environment)
 * @return {Promise}
 */
const swCacheClear = () => phpCli(['sw:cache:clear', `--env=${ENV}`]).catch(err => log('Error:', err));

module.exports = {
  swDumpConfig,
  swCompileTheme,
  swCacheClear,
  swSetHost,
};
