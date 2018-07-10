const path = require('path');
const fs = require('fs-extra');
const execa = require('execa');
const globby = require('globby');
const findUp = require('find-up');
const wsfp = require('wsfp');
const Listr = require('listr');
const {base} = require('./env');

const dir = (...parts) => {
  return path.join(...[base() || process.cwd(), ...parts]);
};

const shopwareDir = () => {
  return globby(['*/shopware.php', 'shopware.php'], {cwd: base() || process.cwd()})
    .then(p => (p && p[0]) || findUp('shopware.php'))
    .then(p => {
      if (p && fs.existsSync(p)) {
        return path.dirname(p);
      }

      throw new Error('Could not find shopware base dir');
    });
};

const consoleDir = basePromise => {
  return (basePromise || shopwareDir())
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

const write = (file, data) => fs.writeFile(file, data);

const symlink = (target, src) => fs.ensureSymlink(target, src);

const composer = args => {
  return execa('php', [bindir('composer.phar'), ...args]);
};

const phar = (input, flags = {}, options = {}) => {
  if (typeof input === 'string') {
    input = [input];
  }
  return shopwareDir()
    .then(base => execa.stdout('php', [bindir('sw.phar'), ...input, '--ansi', ...formatFlags(flags)], {cwd: base}))
    .then(stdout => {
      if (!options.silent) {
        console.log(stdout);
      }
      return stdout;
    });
};

const swConsole = (input, flags = {}, options = {}) => {
  if (typeof input === 'string') {
    input = [input];
  }
  const basePromise = shopwareDir();
  return consoleDir(basePromise)
    .then(cmd => basePromise.then(base => ({cmd: path.resolve(cmd), base: path.resolve(base)})))
    .then(({cmd, base}) => execa.stdout('php', [cmd, ...input, '--ansi', ...formatFlags(flags)], {cwd: base}))
    .then(stdout => {
      if (!options.silent) {
        console.log(stdout);
      }
      return stdout;
    });
};

const setPermissions = () => shopwareDir().then(base => new Promise((resolve, reject) => {
  wsfp(path.join(path.resolve(base), '{var,web,files,media,engine/Shopware/Plugins/Community}'), err => {
    if (err) {
      return reject(err);
    }
    resolve();
  });
}));

const clearCache = (flags = {}) => shopwareDir().then(base => {

  const tasks = new Listr([
    {
      title: 'Remove cache directories',
      task: () => globby(['var/cache/*', '!var/cache/clear_cache.sh'], {cwd: path.resolve(base)})
        .then(dirs => Promise.all(dirs.map(dir => fs.remove(path.resolve(base, dir)))))
    },
    {
      title: 'Run cache_clear.sh',
      task: () => execa.stdout('sh', ['clear_cache.sh'], {cwd: path.resolve(base, 'var/cache')})
    },
    {
      title: `Run console sw:cache:clear ${formatFlags(flags).join(' ')}`,
      task: () => swConsole('sw:cache:clear', flags, {silent: true})
    }
  ]);

  return tasks.run();
});

module.exports = {
  dir,
  write,
  symlink,
  composer,
  phar,
  swConsole,
  setPermissions,
  clearCache
};
