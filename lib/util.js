const path = require('path');
const fs = require('fs');
const execa = require('execa');
const {base} = require('./env');

const dir = (...parts) => {
  return path.join(...[base || process.cwd(), ...parts]);
};

const bindir = (...parts) => {
  const base = path.resolve(__dirname, '..', 'bin');
  return path.join(...[base, ...parts]);
};

const formatFlags = (flags = {}) =>
  Object.keys(flags).reduce((result, key) => {
    if (flags[key] === false) {
      result.push(`--no-${key}`);
    } else if (flags[key] === true) {
      result.push(`--${key}`);
    } else if (typeof flags[key] === 'number') {
      result.push(`--${key}=${flags[key]}`);
    } else if (typeof flags[key] === 'string' && /\s/.test(flags[key])) {
      result.push(`--${key}="${flags[key]}"`);
    } else {
      result.push(`--${key}=${flags[key]}`);
    }

    return result;
  }, []);

const write = (file, data) =>
  new Promise((resolve, reject) => fs.writeFile(file, data, (err) => err && reject(err) || resolve()));

const symlink = (target, src) =>
  new Promise((resolve, reject) => fs.symlink(target, src, (err) => err && reject() || resolve()));

const composer = (args) => {
  return execa('php', [bindir('composer.phar'), ...args]);
};

const phar = (input, flags = {}) => {
  return execa.stdout('php', [bindir('sw.phar'), input, '--ansi', ...formatFlags(flags)], {cwd: dir('src')})
    .then(stdout => console.log(stdout))
    .catch(err => console.error(err.message));
};

const swConsole = (input, flags = {}, options = {}) => {
  return execa.stdout('php', [dir('src','bin','console'), input, '--ansi', ...formatFlags(flags)], {cwd: dir('src')})
    .then(stdout => !options.silent && console.log(stdout))
    .catch(err => console.error(err.message));
};

module.exports = {
  dir,
  write,
  symlink,
  composer,
  phar,
  swConsole
};