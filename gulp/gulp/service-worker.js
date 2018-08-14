/* eslint-env node, es6 */
const path = require('path');
const fs = require('fs-extra');
const {generateSW} = require('workbox-build');
const pkg = require('../../package.json');
const {themeConfig} = require('../lib/shopware');
const {tmpl, DIST, ROOT, DOCROOT} = require('../lib/dir');

/**
 * Get rev manifest so we know which assets to precache
 * @return {*}
 */
const getManifest = () => fs.readJson(tmpl.path('rev-manifest.json', {folder: DIST})).catch(() => ({}));

/**
 * Generate a service worker file that will provide offline functionality for
 * local resources. This should only be done for the 'dist' directory, to allow
 * live reload to work as expected when serving from the 'app' directory.
 *
 * See http://www.html5rocks.com/en/tutorials/service-worker/introduction/ for
 * an in-depth explanation of what service workers are and why you should care.
 */
const generateServiceWorker = () => Promise.all([
  themeConfig(),
  getManifest(),
]).then(([{lessTarget, jsTarget}, manifest]) => {
  const docroot = tmpl.path({folder: DOCROOT});
  const swDest = path.join(docroot, 'service-worker.js');
  const fonts = ['woff', 'woff2', 'ttf', 'eot'];
  const assets = ['svg', 'gif', 'png', 'jpg', 'js', 'css'];
  const config = {
    // Used to avoid cache conflicts when serving on localhost.
    cacheId: pkg.name,
    swDest,
    importWorkboxFrom: 'local',
    runtimeCaching: [{
      // Fonts
      urlPattern: '.*.(' + fonts.join('|') + ')',
      handler: 'cacheFirst',
      options: {
        // Use a custom cache name for this route.
        cacheName: 'axro-font-cache',
      },
    }, {
      // Assets
      urlPattern: '.*.(' + assets.join('|') + ')',
      handler: 'staleWhileRevalidate',
      options: {
        // Use a custom cache name for this route.
        cacheName: 'axro-asset-cache',
      },
    }],
    globStrict: false,
    modifyUrlPrefix: {
      [docroot]: '',
    },
    globDirectory: docroot,
    globPatterns: [
      // Add/remove glob patterns to match your directory setup.
      ...Object.values(manifest)
        // Don't grab the static styleguide images for precaching
        .filter(file => !file.includes('_resources/img/content'))
        .map(file => tmpl.path(file, {folder: ROOT})),

      // This requires the shopware config to be up to date.
      // Otherwise we would try to cache the wrong files
      tmpl.path(lessTarget, {folder: DOCROOT}),
      tmpl.path(jsTarget, {folder: DOCROOT}),
    ].map(file => path.relative(docroot, file)),
    // Other configuration options...
  };

  return generateSW(config).then(({count, size}) => {
    console.log(`Generated ${swDest}, which will precache ${count} files, totaling ${size} bytes.`);
  });
});

module.exports = {
  generateServiceWorker,
};
