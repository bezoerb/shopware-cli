/* eslint-env node, es6 */
const ngrok = require('ngrok');
const {output: pageSpeed} = require('psi');
const {setHost} = require('../lib/shopware');
const {runServer} = require('./server');


/**
 * Open a secure tunnel to local browsersync server and run pagespeed through that tunnel
 *
 * @param {object} opts Pagsepeed configuration
 */
const runPsi = (opts = {}) =>
  runServer({
    host: 'localhost',
    watch: false,
    localOnly: true,
    logLevel: 'silent',
    notify: false,
  })
    .then(({proto, port, destroy}) => ngrok.connect({addr: port, proto}).then(url => ({url, destroy})))
    .then(({url, destroy}) => setHost(url.replace(/^.*:\/\//, '')).then(() =>  ({url, destroy})))
    .then(({url, destroy}) => pageSpeed(url.replace(/^.*:\/\//, ''), opts).then(() => destroy()))
    .then(() => ngrok.kill())
    .then(() => setTimeout(() => process.exit(0), 500));


/**
 * Run pagespeed insights with strategy: mobile
 */
const psiMobile = () =>
  runPsi({
    strategy: 'mobile',
    nokey: 'true',
    threshold: 1,
  });


/**
 * Run pagespeed insights with strategy: desktop
 */
const psiDesktop = () =>
  runPsi({
    strategy: 'desktop',
    nokey: 'true',
    threshold: 1,
  });

module.exports = {
  psiMobile,
  psiDesktop,
};
