/* eslint-env node, es6 */
const then = require('then-callback');
const through = require('through2');
const globParent = require('glob-parent');
const flatten = require('lodash/flatten');
const File = require('vinyl');
const globby = require('globby');
const fs = require('fs-extra');
const isPromise = require('is-promise');

/**
 * Add fs.lstat to vinyl file
 * @param {File} file
 * @returns {*}
 */
const addStats = file =>
  fs.lstat(file.path).then(stat => {
    if (stat) {
      file.stat = stat;
    }
    return file;
  });

/**
 * Add fs.lstat to vinyl file
 * @param {File} file
 * @param {string} base
 * @returns {*}
 */
const setBase = (file, base) => {
  if (base) {
    file.base = base;
  }

  return file;
}

/**
 * Return list of files + glob-parent for pattern
 * @param pattern
 * @param opts
 * @returns {Promise<any>}
 */
const glob = (pattern = [], opts = {}) => {
  const {base, cwd = process.cwd()} = opts;
  if (!Array.isArray(pattern)) {
    pattern = [pattern];
  }

  const promises = pattern.map(p => {
    return globby(p).then(files => files.map(filename => ({cwd, base: base || globParent(filename), path: filename})));
  });

  return Promise.all(promises).then(files => flatten(files));
};

/**
 * Wrap result from glob in vinyl file
 * @param files
 * @param base
 * @returns {Promise<any>}
 */
const vinylize = (files = [], base) => {
  const promises = files.map(file =>
    fs
      .readFile(file.path)
      .then(contents => new File({...file, contents}))
      .then(file => addStats(file))
      .then(file => setBase(file, base))
  );

  return Promise.all(promises).then(files => flatten(files));
};

function debug(...prefix) {
  // Return stream
  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      console.log(file);
      return cb(null, file);
    }

    if (file.isStream()) {
      return this.emit('error', 'Streaming not supported');
    }

    const {history, path, base, cwd} = file;

    console.log(...prefix, {history, path, base, cwd});

    cb(null, file);
  });
}

/**
 * Convert promise to gulp fs stream
 * @param promise
 * @param opts
 * @returns {stream}
 */
const wrapVinylStream = (promise, opts = {}) => {
  const pass = through.obj();
  const stream = through.obj();
  const {base} = opts;

  if (!isPromise(promise)) {
    throw new TypeError('expect `promise` to be promise');
  }

  const vinylpromise = promise
    .then(pattern => glob(pattern, opts))
    .then(files => vinylize(files, base));

  stream.promise = then(vinylpromise).then((err, res) => {
    if (err) {
      return stream.emit('error', err);
    }

    // Return dead stream if empty array
    if (Array.isArray(res) && res.length === 0) {
      process.nextTick(pass.end.bind(pass));
      return pass;
    }

    if (Array.isArray(res)) {
      res.forEach(file => {
        stream.push(file);
      });
    } else {
      stream.push(res);
    }

    stream.push(null);
  });

  return stream.pipe(pass);
};

module.exports = {
  debug,
  wrapVinylStream,
};
