'use strict';
/* eslint-env node, es6 */
// This gulpfile makes use of new JavaScript features.
// Babel handles this without us having to do anything. It just works.
// You can read more about the new JavaScript features here:
// https://babeljs.io/docs/learn-es2015/

const gulp = require('gulp');
const del = require('del');

const {isProd, getOption} = require('./lib/env');
const {tmpl, WEB, SRC, ROOT, DIST, TMP} = require('./lib/dir');
const {task, series, parallel, watch} = gulp;

// Require the gulp
const {serve, bs} = require('./gulp/server');
const {rev, revReplace} = require('./gulp/rev');
const {prepareStyles, styles, clearStyleCache} = require('./gulp/styles');
const {critical} = require('./gulp/optimization');
const {scripts} = require('./gulp/scripts');
const {svgstore, imagemin} = require('./gulp/images');
const {regression, regressionReference, regressionApprove} = require('./gulp/tests');
const {swDumpConfig, swCompileTheme, swCacheClear, swSetHost} = require('./gulp/exec');
const {generateServiceWorker} = require('./gulp/service-worker');
const {psiMobile, psiDesktop} = require('./gulp/psi');

// Shopware: Dump theme config
task('sw:host', swSetHost);
// Shopware: Dump theme config
task('sw:config', swDumpConfig);
// Shopware: Compile theme and generate template cache
task('sw:compile', swCompileTheme);
// Shopware: Clear cache (use --env [node|dev|prod] for specific environment)
task('sw:cl', swCacheClear);

// Force exit and reset host
task('exit', series('sw:host', () => process.exit()));

// Generate a service worker file that will provide offline functionality for
// local resources. This should only be done for the document root, to allow
// live reload to work as expected when serving from the 'frontend/_public/src' directory.
// activated in frontend/public/src/js/sw/index.js
// See http://www.html5rocks.com/en/tutorials/service-worker/introduction/ for
// an in-depth explanation of what service workers are and why we should care.
task('generate-service-worker', generateServiceWorker);

// Prepare less file with import statements to all required less files
// including less files from theme config and the all.less file from this theme.
// CSS processing via gulp is DEV-only
task('styles:prepare', prepareStyles);
// Compile and automatically prefix stylesheets
task('styles', series(['styles:prepare'], styles(bs.reload)));
task('styles:test', series(styles(bs.reload, true)));
// Just rebuild theme files on change
task('styles:watch', series(styles(bs.reload, true)));

// Process scripts with webpack based on environment
// node environment (used in browsersync server) enables HMR (Hot Module Replacement)
task('scripts', scripts());

// Hash asset filenames and create app/config/rev-manifest.json
task('rev:files', rev);
task('rev', series(['rev:files'], revReplace));

// Layout regression tests using backstop js
// Basic configuration in scripts/tests/backstop.json
// Add specific scenarios or viewports in THEME/tests/backstop.json
task('regression:test', regression);
task('regression:reference', regressionReference);
task('regression:approve', regressionApprove);

// Optimizations
task('optimization:critical', series('sw:compile', 'sw:config', critical));
task('critical', series(critical));

// Automatically create svg sprite from svg icons in frontend/public/src/img/icons/**/*.svg
task('svgstore', svgstore);
// Optimize images
task('imagemin', imagemin);
task('images', parallel(['svgstore', 'imagemin']));
task(
  'images:watch',
  series(['images'], done => {
    bs.reload();
    done();
  })
);

// Cleanup tasks
task('clean:dist', () => del(tmpl.path(['img/*', 'js/vendor*', 'js/sw'], DIST), {dot: true, force: true}));
task('clean:cache', () =>
  del(['.tmp', tmpl.path('cache/*.{css,less,js,map}', WEB), tmpl.path(TMP)], {dot: true, force: true})
);
task('clean', parallel('clean:dist', 'clean:cache'));

// Optimize assets for prod environment
task('assets', series(['images', 'scripts', 'rev', 'sw:compile', 'generate-service-worker']));

// Prepare assets for browsersync serve
task(
  'serve:prepare',
  series(['clean:cache'], parallel(isProd() ? ['assets'] : ['styles', 'scripts', 'images']))
);

// Run dev server and watch files
task('serve', series('serve:prepare', () => serve().then(() => {
  const opts = {
    usePolling: getOption('docker'),
    interval: 500,
    alwaysStat: true,
  };

  const stylesGlob = tmpl.path('**/*.less', SRC);
  const imagesGlob = tmpl.path('**/*.{jpg,jpeg,gif,png,webp,svg}', SRC);
  const smartyGlob = tmpl.path('{documents,frontend,newsletter,widgets}/**/*.tpl', ROOT);

  watch(stylesGlob, opts, series('styles:watch')).on('change', file => clearStyleCache(file));
  watch(imagesGlob, opts, series('images:watch'));
  watch(smartyGlob, opts, series(bs.reload));
})));

// Open a secure tunnel to localhost to let pagespeed insights analyse the page
// task('ngrok:url', ngrokUrl);
// Run PageSpeed Insights for desktop
task('psi:desktop', psiDesktop);
// Run PageSpeed Insights for mobile
task('psi:mobile', psiMobile);
// Force exit and reset host
// task('psi:exit', () => setHost(getOption('host', 'localhost')).then(() => process.exit()));
// task('psi', series(['assets', 'ngrok:url', 'psi:mobile', 'psi:desktop', 'psi:exit']));

// Build task - optimize assets
task('build', series(['clean', 'assets']));
// Build tasks for use in docker if we won't have access to php
task('build:compile:nophp', series('clean', parallel('images', 'scripts'), 'rev'));
task('build:sw:nophp', series('generate-service-worker'));

