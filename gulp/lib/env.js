/* eslint-env node, es6 */
const minimist = require('minimist');
const dotenv = require('dotenv');
const {join} = require('path');
const {existsSync} = require('fs');
const {shopware = {}} = require('../../package.json');

const envFiles = [join(__dirname, '../../', '.env'), join(__dirname, '../../shopware/', '.env')];

envFiles.forEach(envFile => {
  if (existsSync(envFile)) {
    dotenv.config({path: envFile});
  }
});

const defaultOptions = {
  string: ['env', 'host', 'base', 'shop', 'theme', 'dbHost', 'dbPort', 'dbPass', 'dbName', 'dbUser', 'db', 'criticalurls'],
  boolean: ['docker', 'php'],
  default: {
    env: shopware.env || process.env.env || process.env.NODE_ENV || process.env.SHOPWARE_ENV || process.env.DOCKER_ENV || 'dev',
    host: shopware.host || process.env.host || process.env.SHOPWARE_HOST,
    base: shopware.base || process.env.base,
    shop: shopware.shop || process.env.shop || process.env.SHOPWARE_SHOP || 1,
    theme: shopware.theme || process.env.theme,
    docker: shopware.docker || false,
    fpm: shopware.fpm,
    db: process.env.DATABASE_URL,
    dbHost: shopware.dbHost,
    dbPort: shopware.dbPort,
    dbUser: shopware.dbUser,
    dbPass: shopware.dbPass,
    dbName: shopware.dbName,
    criticalurls: shopware.criticalurls,
    php: true,
  },
};

const options = minimist(process.argv.slice(2), defaultOptions);

if (options.docker && !options.fpm) {
  options.fpm = 'php:9000';
}

// Get option considering commandline args
const getOption = (key, defaultValue) => (options[key] !== undefined && options[key]) || defaultValue;
// Get option ignoring commandline args
const getEnv = (key, defaultValue) => (defaultOptions[key] !== undefined && defaultOptions[key]) || defaultValue;

const isProd = () => ['prod', 'production'].includes(getOption('env').toLowerCase()) || process.argv.includes('-p');

module.exports = {
  getOption,
  getEnv,
  isProd,
  isDev: () => !isProd(),
  ENV: getOption('env'),
  base: getOption('base'),
  shop: getOption('shop'),
  theme: getOption('theme'),
};
