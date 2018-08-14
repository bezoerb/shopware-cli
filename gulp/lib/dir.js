/* eslint-env node, es6 */
const path = require('path');
const {flatten, first, isPlainObject, isString} = require('lodash');
const {stripIndents} = require('common-tags');
const vinylFs = require('vinyl-fs');
const {wrapVinylStream} = require('./stream');
const {theme} = require('./env');
const globby = require('globby');
const {docroot, themeConfig} = require('./shopware');

// Constants
const DOCROOT = 'DOCROOT';
const TMP = 'TMP';
const WEB = 'WEB';
const ROOT = 'ROOT';
const SRC = 'SRC';
const DIST = 'DIST';

// Setup Paths
const paths = {};
// Static paths
paths[DOCROOT] = docroot() || process.cwd();
paths[WEB] = path.join(paths[DOCROOT], 'web');
// Dynamic paths based on theme
paths[ROOT] = name => path.join(paths[DOCROOT], 'themes/Frontend', name);
paths[DIST] = name => path.join(paths[ROOT](name), 'frontend/_resources');
paths[SRC] = name => path.join(paths[ROOT](name), 'frontend/_public/src');
paths[TMP] = name => path.join(paths[ROOT](name), '.tmp');

// Some path helper
const themeConstants = Object.keys(paths).filter(index => typeof paths[index] === 'function');
const staticConstants = Object.keys(paths).filter(type => !themeConstants.includes(type));
const isThemeConstant = type => themeConstants.includes(type);
const isStaticConstant = type => staticConstants.includes(type);

function getPath(basedir, ...rest) {
  if (!rest.length) {
    return basedir;
  }

  const dirs = flatten(rest).map(dir => {
    // Handle negative globs
    const match = dir.match(/^(!+)(.*)$/);
    if ((match && path.isAbsolute(match[2])) || path.isAbsolute(dir)) {
      return dir;
    }

    if (match) {
      const file = path.join(basedir, match[2]);
      return `${match[1]}${file}`;
    }

    return path.join(basedir, dir);
  });

  return dirs.length === 1 ? first(dirs) : dirs;
}

/**
 * Directory helper
 *
 * @param type
 * @param rest
 * @returns {*}
 */
function dir(type, ...rest) {
  if (!isThemeConstant(type) && !isStaticConstant(type)) {
    throw new Error(stripIndents`
      helper/dir.js:
      Type needs to be one of [${[...staticConstants, ...themeConstants].join(', ')}].
      Got: "${type}"
    `);
  }

  // Paths of type function need a theme so we need the themeConfig (e.g. web/cache/config_1.json)
  let basedir;
  if (typeof paths[type] === 'function' && theme) {
    basedir = paths[type](theme);
  } else if (typeof paths[type] === 'function') {
    const {inheritancePath} = themeConfig.sync();
    if (!inheritancePath) {
      throw new Error(stripIndents`
         helper/dir.js:
         Your version of shopware is to old. You need at least v5.3.4
       `);
    }
    basedir = paths[type](first(inheritancePath));
  } else {
    basedir = paths[type] || type;
  }

  return getPath(basedir, ...rest);
}

const prepareOpts = (glob = [], opts = {}) => {
  if (Object.keys(opts).length === 0 && isString(glob) && (isThemeConstant(glob) || isStaticConstant(glob))) {
    opts = {folder: glob};
    glob = '';
  } else if (isPlainObject(glob) && Object.keys(opts).length === 0) {
    opts = glob;
    glob = '';
  } else if (!Array.isArray(glob)) {
    glob = [glob];
  }

  if (isString(opts)) {
    opts = {folder: opts};
  }

  if (Array.isArray(glob)) {
    glob = glob.map(g => {
      if (isThemeConstant(g) || isStaticConstant(g)) {
        return dir(g);
      }
      return g;
    });
  }

  return [glob, opts];
};

const tmpl = {};

/**
 *
 * @param glob
 * @param opts
 * @returns {stream}
 */
tmpl.src = (glob = [], opts = {}) => {
  const [_glob, _opts] = prepareOpts(glob, opts);
  const {inherit = false, folder: type = ROOT, ...streamOpts} = _opts;

  if (!streamOpts.base) {
    streamOpts.base = tmpl.path({folder: type});
  }

  if (!isThemeConstant(type)) {
    const msg = stripIndents`
    helper/dir.js: 
    template.src only works for theme related directories. 
    "folder" needs to be one of [${themeConstants.join(', ')}]
  `;
    return wrapVinylStream(Promise.reject(new Error(msg)));
  }

  let promise = themeConfig().then(({inheritancePath}) => {
    if (inherit) {
      return inheritancePath.map(theme => getPath(paths[type](theme), ..._glob));
    }

    const [theme] = inheritancePath;

    return getPath(paths[type](theme), ..._glob);
  });

  return wrapVinylStream(promise, {cwd: process.cwd(), ...streamOpts});
};

/**
 * Wrap gulp dest to map
 * @param glob
 * @param opts
 * @returns {*}
 */
tmpl.dest = (glob = [], opts = {}) => {
  const [_glob, _opts] = prepareOpts(glob, opts);
  const {folder: type = ROOT, ...streamOpts} = _opts;

  if (!isThemeConstant(type) && !isStaticConstant(type)) {
    throw new Error(stripIndents`
      helper/dir.js:
      Type needs to be one of [${[...staticConstants, ...themeConstants].join(', ')}].
      Got: "${type}"
  `);
  }

  return vinylFs.dest(dir(type, ..._glob), {cwd: process.cwd(), ...streamOpts});
};

/**
 * Get path
 * @param glob
 * @param opts
 * @returns {*}
 */
tmpl.path = (glob = [], opts = {}) => {
  const [_glob, _opts] = prepareOpts(glob, opts);
  const {folder: type = DOCROOT} = _opts;

  return dir(type, ..._glob);
};

/**
 *
 * @param glob
 * @param opts
 * @returns {Promise}
 */
tmpl.glob = (glob = [], opts = {}) => {
  const [_glob, _opts] = prepareOpts(glob, opts);
  const {folder: type = DOCROOT, inherit = false} = _opts;

  if (!isThemeConstant(type) && !isStaticConstant(type)) {
    throw new Error(stripIndents`
      helper/dir.js:
      Type needs to be one of [${[...staticConstants, ...themeConstants].join(', ')}].
      Got: "${type}"
  `);
  }

  return themeConfig().then(({inheritancePath}) => {
    if (inherit && isThemeConstant(type)) {
      return inheritancePath.map(theme => getPath(paths[type](theme), ..._glob));
    }

    const [theme] = inheritancePath;
    return getPath(paths[type](theme), ..._glob);
  }).then(pattern => globby(pattern));
};

module.exports = {
  paths,
  tmpl,
  DOCROOT: DOCROOT,
  TMP: TMP,
  WEB: WEB,
  ROOT: ROOT,
  SRC: SRC,
  DIST: DIST,
};
