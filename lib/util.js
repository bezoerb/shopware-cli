const path = require('path');
const fs = require('fs');
const execa = require('execa');
const chalk = require('chalk');
const globby = require('globby');
const findUp = require('find-up');
const {base} = require('./env');

const dir = (...parts) => {
  return path.join(...[base || process.cwd(), ...parts]);
};

const shopwareDir = () => {
  return globby(['*/shopware.php', 'shopware.php'], {cwd: base || process.cwd()})
    .then(p => p && p[0] || findUp('shopware.php'))
    .then( p => {
      if (p && fs.existsSync(p)) {
        return path.dirname(p);
      }

      throw new Error('Could not find shopware base dir');
    });
};

const consoleDir = () => {
  return shopwareDir()
    .then(p => path.join(p, 'bin', 'console'))
    .then(p => {
       if (p && fs.existsSync(p)) {
         return p;
       }

       throw new Error('Could not find "console""');

    });
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
  new Promise((resolve, reject) => fs.symlink(target, src, (err) => err && reject(err) || resolve()));

const composer = (args) => {
  return execa('php', [bindir('composer.phar'), ...args]);
};

const phar = (input, flags = {}) => {
  if (typeof input === 'string') {
    input = [input];
  }
  return shopwareDir()
    .then(base => execa.stdout('php', [bindir('sw.phar'), ...input, '--ansi', ...formatFlags(flags)], {cwd: base}))
    .then(stdout => console.log(stdout))
    .catch(err => console.error(chalk.red(err.message)) && process.exit(1));
};

const swConsole = (input, flags = {}, options = {}) => {
  if (typeof input === 'string') {
    input = [input];
  }
  return consoleDir()
    .then( cmd => shopwareDir().then( base => ({'cmd': path.resolve(cmd),'base': path.resolve(base)})))
    .then(({cmd, base}) => execa.stdout('php', [cmd, ...input, '--ansi', ...formatFlags(flags)], {cwd: base}) )
    .then(stdout => !options.silent && console.log(stdout))
    .catch(err => console.error(chalk.red(err.message)) && process.exit(1));
};

module.exports = {
  dir,
  write,
  symlink,
  composer,
  phar,
  swConsole
};