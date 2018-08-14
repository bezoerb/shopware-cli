Shopware theme tools
======================
Set of `gulp tasks` and `npm scripts` to make shopware theme developers' lives easier.


Feature / technologies
----------------------
* Build system based on npm scripts, [gulp](http://gulpjs.com) and [webpack](https://webpack.js.org/)
* Works well with or without Docker
* Browsersync dev server
* Javascript bundling with [webpack](https://webpack.github.io/) including [HMR](https://github.com/webpack/docs/wiki/hot-module-replacement-with-webpack)
* SVG spritesheets for icons
* Critical css generation via [critical](https://github.com/addyosmani/critical)
* Delightful Javascript testing with [Jest](https://facebook.github.io/jest/)
* Visual regression tests using [BackstopJS](https://garris.github.io/BackstopJS/)
* Offline support with the help of [service workers](http://www.html5rocks.com/en/tutorials/service-worker/introduction/)

Requirements
------------
The requirements for theme development are:
* Node >= 7.6
* Gulp 4.x
* PHP >= 5.6


Getting started
---------------

#### Install global dependencies
* [Node](https://nodejs.org/en/download/)
* [yarn](https://yarnpkg.com/lang/en/docs/install/#mac-stable)   
* Run `yarn global add gulp-cli`

#### Install local dependencies
* Run `yarn` in the project root directory.

#### Setup theme
* Add smarty functions
* Change script loading in **frontend/index/index.tpl** 
* Change stylesheet loading in **frontend/index/header.tpl**

See [Theme documentation](./doc/theme.md)

Usage
-----
After everything is installed you can start working with the help of the predefined package scripts. 

**`~$ yarn [script] [<args>]`**

### Scripts
| Script                 | Description 
| ---------------------- | ----------------------------
| `start`                | Start the development server
| `test:ci`              | Test syntax and run unit tests 
| `test:visual`          | Run visual regression tests<br/>This command has the custom args _--reference_ and _--approve_. See next section: [args] (#args)
| `build:compile`        | Build assets<br/>This command  requires the web/cache/config_[shopid].json file to be present.<br/>Run the shopware console command `sw:theme:dump:configuration` to generate the files.
| `build:critical`       | Generate critical css
| <nobr>`build:service-worker`</nobr> | Generate service worker


### Args
| Argument               | Default | Description 
| ---------------------- | ------- | --------------------
| <nobr>`--env [SHOPWARE_ENV]`</nobr> | `'dev'` | Environment
| <nobr>`--base [DIRECTORY]`</nobr>   | `null`  | The project root directory. <br/>We'll do our best to detect the directory automatically for you. Only use this option if this fails __(Error: could not resolve shopware directory)__
| `--shop [SHOPID]` | `1` | Shop ID
| `--host [HOST]` | External IP from your machine (or docker container) | Host gets populated to the database. Your shop will be available here: `http://[HOST]:8000/` If port 8000 is already in use the url may differ.
| `--proxy [URL]` | null | Proxy to remote host instead of local installation
| <nobr>`--fpm [FPM CONNECTION URI]`</nobr> | null | For docker you should normally use `127.0.0.1:9000`
| <nobr>`--db [DB CONNECTION URI]`</nobr> | null | `[username:password@]host[:port]/[database]`

| **test:visual**<br/>`--reference`  | false | Generate reference screenshots |
| **test:visual**<br/>`--approve`  | false | Approve visual regression testing results |


### Examples
##### Run on docker with local node tooling and use localhost
```shell
yarn start --db 127.0.0.1:3307  --fpm 127.0.0.1:9000 --host localhost
``` 

##### Run on docker-toolbox (WIN) with local node tooling and use localhost
```shell
yarn start --db 192.168.99.100:3307  --fpm 192.168.99.100:9000 --host localhost
``` 


##### Local node & local php and use localhost
```shell
yarn start --host localhost
``` 

##### Docker everywhere 
```shell
docker/bin/yarn # Install dependencies first
docker/bin/yarn start --base /project/shopware --host localhost
``` 

Filesystem structure
-------------

```shell
 ├──scripts
 │   ├── README.md                  
 │   ├── gulpfile.js                
 │   ├── webpack.config.js          
 │   │
 │   ├── gulp                       // Gulp Tasks
 │   │   ├── styles.js
 │   │   └── ...               
 │   │
 │   ├── lib                        // Helper methods
 │   │   └── ...  
 │   │
 │   └── tests                      // Test configuration
 │       ├── backstop_data          // Backstop helper scripts
 │       │                          // Test results, test references 
 │       ├── backstop.json          // Backstop Basiskonfiguration 
 │       ├── jest.setup.js          // Jest setup script
 │       └── jest.setup.test.js     // Simple Jest test to validate the setup
 │                                  // Theme specific tests should be located in in THEME/tests/XYZ.test.js files
 │
 ├── package.json                   // Gulp configuration file
 ├── babel.config.js                // Babel config
 ├── .browserlistrc                 // List of supported Browsers (used for less/js)
 ├── .editorconfig                  // Basic code styles: http://editorconfig.org
 ├── .eslintrc                      // Eslint configuration
 ├── .eslintignore                  // Eslint ignore list
 ├── .npmrc                         // NPM config (no package-lock.json)
 │
 ├─ themes/Frontend/AwesomeShopwareTheme  
 │       ├── _private/smarty                  // Smarty functions 
 │       │       ├── function.asset.php       // Generate link to file hashed by node tooling (e.g. _resources/img/icons-c506289c56.svg)
 │       │       ├── function.critical.php    // Inline generated critical css if available
 │       │       ├── function.env.php         // Detect environment (node/browsersync or apache)
 │       │       ├── function.icon.php        // Render icon from iconsprite     
 │       │       ├── function.img.php         // Render responsive image with shopware generated srcset
 │       │       └── function.svg.php         // Inline svg from the filesystem
 │       │
 │       ├── frontend/_resources              // Home of your compiled assets   
 │       │       ├── rev-manifest.json        // Mapping file > hashed file 
 │       │       └── ...

```


Theme
-----
[Theme documentation](./doc/theme.md)

Tasks
-----
[Tasks documentation](./doc/tasks.md)