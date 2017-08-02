const fs = require('fs');
const path = require('path');
const execa = require('execa');
const cpy = require('cpy');
const mkdir = require('make-dir');
const Listr = require('listr');
const moment = require('moment');
const store = require('./store');
const {configPhp, gitmodules} = require('./templates');
const {composer, write, dir, swConsole} = require('./util');
const {submoduleUrl} = require('./env');

module.exports = (options = {}) => {
  return new Listr([
    {
      title: 'Installing shopware',
      task: () => {
        return new Listr([
          {
            title: 'Git init',
            task: (ctx, task) => execa.stdout('git', ['init'])
              .catch(() => {
                task.skip('Git repository already in place');
              }),
          },
          {
            title: 'Add shopware as .gitmodule',
            task: (ctx, task) => execa.stdout('git', ['submodule', 'add', submoduleUrl, 'src'])
              .then(() => write(dir('.gitmodules'), gitmodules()))
              .catch(() => {
                ctx.submodule = true;
                task.skip('Submodule already exists in the index')
              }),
          },
          {
            title: 'Build configuration',
            task: () => write(dir('src', 'config.php'), configPhp(options)),
          },
          {
            title: 'Composer install',
            task: () => composer(['install', '-o', '-d', dir('src')]),
          },
          {
            title: 'Build database',
            task: () => swConsole('sw:database:setup', {
              steps: 'drop,create,import,setupShop',
              host: store.get('url'),
              path: ''
            }, {silent: true})
          },
          {
            title: 'Initialize theme',
            task: () => swConsole('sw:theme:initialize', {}, {silent: true}),
          },
          {
            title: 'Disable first run wizard',
            task: () => swConsole('sw:firstrunwizard:disable', {}, {silent: true}),
          },
          {
            title: 'Create demo admin (demo/demo)',
            task: () => swConsole('sw:admin:create', {
              name: 'Demo user',
              email: 'demo@example.com',
              username: 'demo',
              password: 'demo',
              locale: 'de_DE',
            }, {silent: true}),
          },
          {
            title: 'Add install lock',
            task: () => write(dir('src','recovery','install','data','install.lock'), moment().format('yyyyMMddHHmm'))
          }

        ]);
      }
    },
    {
      title: 'Adding extra directories',
      task: () => {
        return new Listr([
          {
            title: 'Plugins, themes & legacy plugins',
            task: () => Promise.all([
              mkdir(dir('plugins')),
              mkdir(dir('plugins-legacy')),
              mkdir(dir('plugins-legacy', 'Backend')),
              mkdir(dir('plugins-legacy', 'Core')),
              mkdir(dir('plugins-legacy', 'Frontend')),
              mkdir(dir('themes')),
              mkdir(dir('themes', 'Frontend')),
            ]),
          },
          {
            title: 'Add gitkeep',
            task: () => Promise.all([
              write(dir('plugins', '.gitkeep'), ''),
              write(dir('plugins-legacy', 'Backend', '.gitkeep'), ''),
              write(dir('plugins-legacy', 'Core', '.gitkeep'), ''),
              write(dir('plugins-legacy', 'Frontend', '.gitkeep'), ''),
              write(dir('themes', 'Frontend', '.gitkeep'), ''),
            ]),
          }
        ]);
      },
    },
  ])
};