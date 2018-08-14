/* eslint-env node */
const os = require('os');
const fs = require('fs-extra');
const url = require('url');
const log = require('fancy-log');
const critical = require('critical');
const xmlParser = require('xml-parser');
const got = require('got');
const postcss = require('postcss');
const discard = require('postcss-discard');
const {themeConfig} = require('../lib/shopware');
const {getOption} = require('../lib/env');
const {tmpl, SRC, DOCROOT} = require('../lib/dir');
const {runServer} = require('./server');

/**
 * Change this to filter relevant urls from sitemap,.xml
 * @type {RegExp}
 */
const URL_REGEX = /^(https?:\/\/[^/]+)?\/(([^/]+)\/){0,2}$/igm;

/**
 * Compute critical css
 * @param {string} host Host
 * @param {Array<string>} urls Urls for which we fetch the critical css
 * @param {string} lessTarget Compiled css file
 * @return {Promise} Resolves aftzer the critical css is generated
 */
const computeCritical = (host, urls = [], lessTarget) => {
  const css = tmpl.path(lessTarget, {folder: DOCROOT});
  const base = tmpl.path({folder: DOCROOT});

  log('Generating critical css for the following urls:');
  console.log(urls.map(f => ` - ${f}`).join(os.EOL));
  return Promise.all(urls.map(src => {
    let uri = src;
    if (getOption('proxy')) {
      uri = uri.replace(getOption('proxy'), '');
    }

    // Cleanup uri to get the name of the target file (remove host)
    uri = uri.replace(/https?:\/\/[^/]+/, '');
    let target = uri.replace(/(^\/)|(\/$)/g, '');

    return Promise.resolve(target)
      .then(name => name ? `${name}.css` : 'index.css')
      .then(name => tmpl.path(`css/critical/${name}`, {folder: SRC}))
      .then(dest => Promise.all([dest, critical.generate({
        timeout: 120000,
        inline: false,
        src,
        css,
        penthouse: {
          renderWaitTime: 1000,
          forceInclude: [/wsmenu/],
        },
        dimensions: [
          {width: 375, height: 800},
          {width: 1440, height: 1440},
        ],
        base,
      })]))
      .then(([target, css]) => [
        target,
        postcss([discard({atrule: ['@font-face', '@imports']})]).process(css).css,
      ])
      .then(([target, css]) => fs.outputFile(target, css))
      .catch(err => log(`${src} errored: ${err.message}`));
  }));
};

/**
 * Fetch relevant urls from sitemap.xml
 * @param {string} host The host
 * @return {Promise} Resolves with array of urls
 */
const fetchUrls = host => got(`${host}/sitemap.xml`, {rejectUnauthorized: false}).then(response => {
  const sitemap = xmlParser(response.body.toString());
  return sitemap.root.children.map(node => {
    const [loc] = node.children.filter(item => item.name === 'loc');
    const {content} = loc || {};
    return content;
  }).filter(loc => {
    const parsed = url.parse(loc);
    return URL_REGEX.test(parsed.pathname);
  });
}).catch(err => console.log(err));

/**
 * Base task to create critical css
 * @return {Promise} Resolves after task is completed
 */
const criticalStyles = () => runServer({
  host: 'localhost',
  watch: false,
  localOnly: true,
  logLevel: 'silent',
  notify: false,
}).then(({url, destroy}) => {
  process.setMaxListeners(0);
  return fetchUrls(url)
    .then(urls => themeConfig().then(({lessTarget}) => computeCritical(url, urls, lessTarget)))
    .then(() => {
      log(`I'm all done. Closing browser-sync for now`);
      destroy();
    })
    .then(() => setTimeout(() => process.exit(0), 10));
});

module.exports = {
  critical: criticalStyles,
};
