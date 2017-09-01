[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]

# Shopware CLI 

Convinienve CLI tool for shopware - **BETA**

## Features

* Install [shopware](https://github.com/shopware/shopware) with an opinionated folder structure for git projects.
* Update projects
* Run shopware console commands from any subdirectory in the project
* Run the official [shopware CLI tools](https://github.com/shopwareLabs/sw-cli-tools) from any subdirectory in the project.

## Install

```bash
$ npm i -g shopware-cli
```

## Usage

#### Install
```bash
$ shopware install
```

```bash
├── plugins          # Plugins get symlinked to src/custom/plugins/...
├── plugins-legacy   # Legacy plugins get symlinked to src/engine/Shopware/Plugins/Local/...
│   ├── Backend
│   ├── Core
│   └── Frontend
├── src              # Shopware installation
└── themes
    └── Frontend     # Themes get symlinked to src/themes/Frontend/...
```
With this structure it's possible to keep shopware clean and out of your git repository


#### Update

```bash
$ shopware update
```

Update submodule, plugins and theme and finally run migrations. Should be called after `git pull`

#### Console

```bash
$ shopware console command [options] [arguments]
```


#### Official shopware CLI tools

```bash
$ shopware phar command [options] [arguments]
```



## License

MIT © [Ben Zörb](http://sommerlaune.com)


[npm-image]: https://badge.fury.io/js/shopware-cli.svg
[npm-url]: https://npmjs.org/package/shopware-cli
[travis-image]: https://travis-ci.org/bezoerb/shopware-cli.svg?branch=master
[travis-url]: https://travis-ci.org/bezoerb/shopware-cli
[daviddm-image]: https://david-dm.org/bezoerb/shopware-cli.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/bezoerb/shopware-cli
[coveralls-image]: https://coveralls.io/repos/bezoerb/shopware-cli/badge.svg
[coveralls-url]: https://coveralls.io/r/bezoerb/shopware-cli

