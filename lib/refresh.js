const fs = require('fs');
const path = require('path');
const cpy = require('cpy');
const execa = require('execa');
const Listr = require('listr');
const globby = require('globby');
const hasYarn = require('has-yarn');
const {composer, symlink, dir, swConsole} = require('./util');
const {submoduleTarget} = require('./env');
const store = require('./store');

const updatePlugin = (dir, cwd = '', list = '') => {
  const name = path.basename(dir);
  const manifest = path.join(cwd, dir, 'composer.json');
  let promise = Promise.resolve();
  if (fs.existsSync(manifest)) {
    promise = composer(['install', '-o', '-d', path.dirname(manifest)]);
  }

  if (!(new RegExp(`^\\|\\s*${name}`)).test(list)) {
    return promise;
  }

  return promise.then(() => Promise.all([
    swConsole(['sw:plugin:update', name], {}, {silent: true})
  ]));
};

const buildTheme = dir => {
  const manifest = path.join('themes', dir, 'package.json');
  if (!fs.existsSync(manifest)) {
    return Promise.resolve();
  }

  if (hasYarn(path.dirname(manifest))) {
    return execa('yarn', {cwd: path.dirname(manifest)})
      .then(() => execa('yarn', ['build'], {cwd: path.dirname(manifest)}));
  }

  return execa('node', ['install'], {cwd: path.dirname(manifest)})
    .then(() => execa('node', ['run', 'build'], {cwd: path.dirname(manifest)}));
};

const linkTheme = dir => {
  const src = path.join(submoduleTarget, 'themes', path.dirname(dir), path.basename(dir));
  const dest = path.relative(path.dirname(src), path.join('themes', path.dirname(dir), path.basename(dir)));
  return symlink(dest, src);
};

const linkPlugin = dir => {
  const src = path.join(submoduleTarget, 'custom', 'plugins', path.basename(dir));
  const dest = path.relative(path.dirname(src), path.join('plugins', path.basename(dir)));
  return symlink(dest, src);
};

const linkLegacyPlugin = dir => {
  console.log(dir);
  const base = path.join(submoduleTarget, 'engine', 'Shopware', 'Plugins', 'Local');
  const src = path.join(base, path.dirname(dir), path.basename(dir));
  const dest = path.relative(path.dirname(src), path.join('plugins-legacy/Local', path.dirname(dir), path.basename(dir)));
  return symlink(dest, src);
};

const copyLegacyPlugin = dir => {
  const src = path.join('plugins-legacy/Community', path.dirname(dir), path.basename(dir), '**/*');
  const dest = path.join('src/engine/Shopware/Plugins/Community', path.dirname(dir), path.basename(dir));
  return cpy(src, dest);
};

module.exports = () => {
  return new Listr([
    {
      title: 'Update shopware',
      task: () => {
        return new Listr([
          {
            title: 'Init shopware submodule',
            task: () => execa.stdout('git', ['submodule', 'init'])
          },
          {
            title: 'Update shopware submodule',
            task: () => execa.stdout('git', ['submodule', 'update'])
          },
          {
            title: 'Composer install',
            task: () => composer(['install', '-o', '-d', dir(submoduleTarget)])
          },
          {
            title: 'Set host',
            task: () => swConsole('sw:database:setup', {steps: 'setupShop', host: store.get('url')}, {silent: true})
          },
          {
            title: 'Symlink themes',
            task: () => globby('*/*/', {cwd: dir('themes')}).then(themes => {
              return Promise.all(themes.map(theme => linkTheme(theme)));
            })
          },
          {
            title: 'Symlink plugins',
            task: () => Promise.all([
              globby('*/', {cwd: dir('plugins')}).then(plugins => {
                return Promise.all(plugins.map(plugin => linkPlugin(plugin)));
              }),
              globby('*/*/', {cwd: dir('plugins-legacy/Local')}).then(plugins => {
                return Promise.all(plugins.map(plugin => linkLegacyPlugin(plugin)));
              })
            ])
          },
          {
            title: 'Copy community plugins',
            task: () => Promise.all([
              globby('*/*/', {cwd: dir('plugins-legacy/Community')}).then(plugins => {
                return Promise.all(plugins.map(plugin => copyLegacyPlugin(plugin)));
              })
            ])
          },
          {
            title: 'Run migrations',
            task: () => swConsole('sw:migrations:migrate', {mode: 'install'}, {silent: true})
          },
          {
            title: 'Update plugins',
            task: () => swConsole('sw:plugin:refresh', {}, {silent: true})
              .then(() => swConsole('sw:plugin:list', {}, {silent: true}))
              .then(stdout => Promise.all([
                // Update custom plugins
                globby('*/', {cwd: dir('plugins')}).then(plugins => {
                  return Promise.all(plugins.map(plugin => updatePlugin(plugin, 'plugins', stdout)));
                }),
                // Update legacy plugins
                globby('*/*/', {cwd: dir('plugins-legacy/Local')}).then(plugins => {
                  return Promise.all(plugins.map(plugin => updatePlugin(plugin, 'plugins-legacy/Local', stdout)));
                }),
                // Update legacy plugins
                globby('*/*/', {cwd: dir('plugins-legacy/Community')}).then(plugins => {
                  return Promise.all(plugins.map(plugin => updatePlugin(plugin, 'plugins-legacy/Community', stdout)));
                })
              ]))
          },
          {
            title: 'Prepare themes',
            task: () => swConsole(['sw:theme:dump:configuration'], {}, {silent: true})
              .then(() => swConsole(['sw:theme:cache:generate'], {}, {silent: true}))
          },
          {
            title: 'Build themes',
            task: () => globby('*/*/', {cwd: dir('themes')}).then(themes => {
              return Promise.all(themes.map(theme => buildTheme(theme)));
            })
          }
        ]);
      }
    }
  ], {showSubtasks: true});
};
