const fs = require('fs');
const path = require('path');
const cpy = require('cpy');
const execa = require('execa');
const Listr = require('listr');
const globby = require('globby');
const {submoduleUrl, composer, phar, dir, swConsole} = require('./util');
const store = require('./store');

const updatePlugin = (dir) => {
  
};

module.exports = () => {
  return new Listr([
    {
      title: 'Update shopware',
      task: () => {
        return new Listr([
          {
            title: 'Init shopware submodule',
            task: () => execa.stdout('git', ['submodule', 'init']),
          },
          {
            title: 'Update shopware submodule',
            task: () => execa.stdout('git', ['submodule', 'update']),
          },
          {
            title: 'Composer install',
            task: () => composer(['install', '-o', '-d', dir('src')]),
          },
          {
            title: 'Set host',
            task: () => swConsole('sw:database:setup', {steps: 'setupShop', host: store.get('url')}, {silent: true}),
          },
          {
            title: 'Symlink themes',
            task: () => globby('*/*/', {cwd: dir('themes')}).then((themes) => {
            //  console.log(themes);
            }),
          },
          {
            title: 'Symlink legacy plugins',
            task: () => globby('*/*/', {cwd: dir('plugins-legacy')}).then((plugins) => {
         //     console.log(plugins);
            }),
          },
          {
            title: 'Symlink plugins',
            task: () => globby('*/', {cwd: dir('plugins')}).then((plugins) => {
          //    console.log(plugins);
            }),
          },
          {
            title: 'Run migrations',
            task: () => swConsole('sw:migrations:migrate', {mode: 'install'}, {silent: true}),
          },
        ]);
      }
    }
  ])
};