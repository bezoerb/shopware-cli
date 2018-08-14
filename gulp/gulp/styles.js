/* eslint-env node, es6 */
const gulp = require('gulp');
const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const less = require('less');
const chalk = require('chalk');
const gulpLoadPlugins = require('gulp-load-plugins');
const PluginError = require('plugin-error');
const log = require('fancy-log');
const {stripIndent} = require('common-tags');
const {themeConfig} = require('../lib/shopware');
const {tmpl, TMP, WEB, SRC, ROOT, DOCROOT} = require('../lib/dir');
const {isProd} = require('../lib/env');

const autoprefixer = require('autoprefixer');

const $ = gulpLoadPlugins();

/**
 * Ensures that the theme's all.less file exists
 */
const ensureThemeLess = () => {
  const base = tmpl.path('less/all.less', {folder: SRC});
  if (fs.existsSync(base)) {
    return Promise.resolve();
  }

  log(`${chalk.bold('Generating missing file:')} ${chalk.green(path.relative(tmpl.path({folder: DOCROOT}), base))}`);

  return themeConfig()
    .then(({inheritancePath}) => fs.outputFile(base, stripIndent`
      /* ===================================================
         ${inheritancePath[0]} - main less entry file
         =================================================== */
      
      /**
       * This file is is an auto-generated. 
       * Feel free to replace, delete or edit.
       */`
    ));
};

/**
 * Prepare less file with import statements to all required files
 * This file needs to be saved next to the final css to get correct paths as the shopware
 * backend compiles with the `relativeUrls` option set to true
 */
const prepareStyles = () => themeConfig()
  .then(({less}) => less.map(file => tmpl.path(file, {folder: DOCROOT})))
  .then(files => files.map(file => `@import "${path.relative(tmpl.path('cache', {folder: WEB}), file)}";`))
  .then(less => fs.outputFile(tmpl.path('cache/dev.less', {folder: WEB}), less.join(os.EOL)))
  .then(() => ensureThemeLess());

/**
 * Fix needed for watching mode until the following issues are fixed:
 *  - https://github.com/stevelacy/gulp-less/issues/283
 *  - https://github.com/less/less.js/issues/3185
 * @param file
 */
const clearStyleCache = file => {
  const fileManagers = less.environment && less.environment.fileManagers || [];
  fileManagers.forEach(fileManager => {
    if (fileManager.contents && fileManager.contents[file]) {
      delete fileManager.contents[file];
    }
  });
};

/**
 * Less task
 *
 * @param reload browsersync reload method
 */
const styles = (reload) => () => themeConfig().then(({config}) => {
    return gulp.src(tmpl.path('cache/dev.less', {folder: WEB}))
      .pipe($.sourcemaps.init())
      // Compile less files
      .pipe($.if(
        '*.less',
        $.less({
          modifyVars: config,
          relativeUrls: true,
          paths: [path.join(__dirname, '../../node_modules'), tmpl.path('node_modules', ROOT)],
        })
      ))
      .on('error', function (error) {
        const message = new PluginError('less', error.message).toString();
        process.stderr.write(message + '\n');
        this.emit('end');
      })
      // Concatenate and minify styles
      .pipe($.if(isProd() && '*.css', $.cssnano({safe: true, zindex: false})))
      // Add vendor prefixes
      .pipe($.postcss([autoprefixer()]))
      // We don't use the lessTarget here because this can differ from the filename generated
      // by shopware's {{compileLess timestamp={themeTimestamp} output="lessFiles"}}
      // .pipe($.rename(lessTarget))
      .pipe($.size({title: 'styles'}))
      .pipe($.sourcemaps.write('./'))
      .pipe(tmpl.dest('web/cache', {folder: DOCROOT}))
      .pipe(tmpl.dest({folder: TMP}))
      .pipe(reload({
        stream: true,
        match: '**/*.css',
      }));
});

module.exports = {
  prepareStyles,
  styles,
  clearStyleCache,
};
