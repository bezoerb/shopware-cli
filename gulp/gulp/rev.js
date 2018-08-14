const {tmpl, ROOT, TMP, DIST} = require('../lib/dir');
const gulpLoadPlugins = require('gulp-load-plugins');
const $ = gulpLoadPlugins();

/**
 * Hash files based on content so you can increase browser cache times
 * @returns {*}
 */
const rev = () =>
  tmpl.src('**/*.{jpg,jpeg,gif,png,webp,svg}', {folder: TMP})
    .pipe($.rev())
    .pipe(tmpl.dest({folder: ROOT}))
    .pipe($.rev.manifest(tmpl.path('rev-manifest.json', {folder: DIST}), {
      base: tmpl.path({folder: DIST}),
      merge: true,
    }))
    .pipe(tmpl.dest({folder: DIST}))
    .pipe($.size({title: 'rev'}));

/**
 * Replace rev'd files in .js & .css files
 * @todo need a way to replace in .less files without altering source files as shopware is using them
 * @returns {*}
 */
const revReplace = () => {
  const manifest = tmpl.src('rev-manifest.json', {folder: DIST});

  return tmpl.src(['styles/*.css', 'scripts/*.js'], {folder: DIST})
    .pipe($.revReplace({manifest: manifest, replaceInExtensions: ['.js', '.css']}))
    .pipe(tmpl.dest({folder: DIST}));
};

module.exports = {
  rev,
  revReplace,
};
