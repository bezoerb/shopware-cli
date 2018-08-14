/* eslint-env node, es6 */
const gulpLoadPlugins = require('gulp-load-plugins');
const {tmpl, SRC, TMP} = require('../lib/dir');

const $ = gulpLoadPlugins();

/**
 * Optimize svg images and create svg sprite
 */
const svgstore = () =>
  tmpl.src('img/icons/**/*.svg', {folder: SRC})
    .pipe($.rename(path => {
      if (path.dirname !== '.') {
        path.basename = `${path.dirname}-${path.basename}`;
      }
    }))
    .pipe($.imagemin([
      $.imagemin.svgo({
        plugins: [{removeViewBox: false}, {removeUselessStrokeAndFill: false}, {cleanupIDs: {
          prefix: {
            toString() {
              this.counter = this.counter || 0;

              return `id-${this.counter++}`;
            },
          },
        }}],
      }),
    ]))
    .pipe($.svgstore())
    .pipe(tmpl.dest('frontend/_resources/img', {folder: TMP}))
    .pipe($.size({title: 'svgstore'}));

/**
 * Optimize images
 */
const imagemin = () =>
  tmpl.src(['img/**/*', '!img/icons/**/*.svg'], {folder: SRC, inherit: true})
    .pipe($.imagemin())
    .pipe(tmpl.dest('frontend/_resources/img', {folder: TMP}))
    .pipe($.size({title: 'imagemin'}));

module.exports = {
  imagemin,
  svgstore,
};
