/* eslint-env node, es6 */
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const log = require('fancy-log');
const difference = require('lodash/difference');
const webpack = require('webpack');
const ManifestPlugin = require('webpack-manifest-plugin');
const MergeIntoSingleFilePlugin = require('webpack-merge-and-include-globally');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const {tmpl, ROOT, SRC, DIST, DOCROOT, TMP} = require('./lib/dir');
const {themeConfig} = require('./lib/shopware');
const {isProd} = require('./lib/env');
const serve = process.argv.includes('serve');

/**
 * Export webpack config
 * Initial promise fetches js & inheritancePath from themeConfig and glob scr/js folder for unlisted files
 *
 * @returns {Promise} Return promise for webpack config
 */
module.exports = () =>
  Promise.all([themeConfig(), tmpl.glob('{js,scripts}/*.js', {folder: SRC})]).then(
    ([{js = [], inheritancePath = []}, scripts = []]) => {
      /**
       * The current theme name (first in the inheritance list)
       */
      const [theme] = inheritancePath;

      /**
       * Javascript root
       * @type {string}
       */
      const jsRoot = tmpl.path('js', {folder: SRC});

      /**
       * These libraries are required by most shopware plugins so they need to be included first before the main script
       * in a separate file if they are not already defined in the theme config
       * @type {*[]}
       */
      const swagResponsiveDependencies = [
        tmpl.path('themes/Frontend/Responsive/frontend/_public/src/js/jquery.plugin-base.js', {folder: DOCROOT}),
        tmpl.path('themes/Frontend/Responsive/frontend/_public/src/js/jquery.state-manager.js', {folder: DOCROOT}),
        tmpl.path('themes/Frontend/Responsive/frontend/_public/src/js/jquery.storage-manager.js', {folder: DOCROOT}),
      ];

      /**
       * Locate filepath in parent theme via theme config
       * @param {string|RegExp} componentPath Part of the filepath
       * @returns {string} Absolute filepath
       */
      const resolvePathFromConfig = componentPath => {
        const matcher = file =>
          componentPath instanceof RegExp ? componentPath.test(file) : file.includes(componentPath);
        const file = js.find(file => matcher(file));
        return file && tmpl.path(file, {folder: DOCROOT});
      };

      /**
       * Locate filepath in node_modules
       * @param {string} module module
       * @returns {string} Absolute filepath
       */
      const resolveNpmPath = module => {
        return inheritancePath.reduce((res, name) => {
          if (res.length) {
            return res;
          }

          const file = tmpl.path(`themes/Frontend/${name}/node_modules/${module}`, {folder: DOCROOT});
          return fs.existsSync(file) ? file : res;
        }, '') || require.resolve('jquery');
      };

      /**
       * Fetch js files from config based on filter
       * @param {function} filter Filter function
       * @returns {any[]} Array of filepaths
       */
      const getFiles = (filter = () => true) => {
        return [...new Set(js)]
          .map(file => {
            // Fix broken symlinks
            if (fs.existsSync('/' + file)) {
              return '/' + file;
            }

            const res = tmpl.path(file, {folder: DOCROOT});
            if (fs.existsSync(res)) {
              return res;
            }

            if (!file.includes(`Frontend/${theme}/frontend/_resources/js`)) {
              log(`${chalk.bold.red('Error:')} File not found. Skipping ${chalk.magenta(file)}`);
            }
            return fs.existsSync(res) ? res : undefined;
          })
          .filter(file => file)
          .filter(file => filter(file));
      };

      /**
       * We will need a vendor js file exposing jquery, StateManager & StorageManager
       * if these files are not already included in the theme config.
       * This is caused by shopware plugins which have these files as dependencies in most cases.
       * The plugin scripts are are included right before our theme scripts so jquery isn't available there.
       * This scenario can occur if the main theme e.g. extends the Bare theme
       *
       * @returns {boolean} true if vendor script is required
       */
      const needsVendorScript = () => {
        const [theme, parent] = inheritancePath; // eslint-disable-line no-unused-vars
        return (parent === 'Bare') || !resolvePathFromConfig(/jquery(\.min)?\.js/);
      };

      /**
       * Theme js files which are specified in the theme.php
       * except the compiled one in _resources
       * @returns {Array<string>} Theme javascript files from config
       */
      const themeJs = () => getFiles(file => file.includes(`Frontend/${theme}/frontend/_public/src`));

      /**
       * The main js file compiled by webpack for production
       * This one is not listed in the config json but remains in the theme scripts root folder
       * @returns {Array<string>} Main scripts
       */
      const main = () => difference(scripts, themeJs());

      /**
       * Make sure crucial files are exposed in case they are used in the main scripts
       * @type {*[]}
       */
      const expose = [
        {
          pattern: /jquery(\.min)?\.js/,
          vars: ['jQuery', '$'],
        },
        {pattern: /picturefill\.js/, vars: ['picturefill']},
        {pattern: /modernizr/, vars: ['Modernizr']},
      ];

      /**
       * Provide global jquery to modules
       * @type {{$: string, jQuery: string, [window.jQuery]: string}}
       */
      const provide = {
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery',
        'window.picturefill': 'picturefill',
      };

      /**
       * Add common aliases
       * @type {{jquery: string}}
       */
      const aliases = {
        jquery: resolvePathFromConfig(/jquery(\.min)?\.js/) || resolveNpmPath('jquery'),
        '../jquery': 'jquery',
        hyperform: resolveNpmPath('hyperform/dist/hyperform.cjs.js'),
        modernizr: resolvePathFromConfig('modernizr'),
        Responsive: tmpl.path('themes/Frontend/Responsive/frontend/_public/src/js', {folder: DOCROOT}),
        ...inheritancePath.reduce((aliases, theme) => {
          return {
            ...aliases,
            [theme]: tmpl.path(`themes/Frontend/${theme}/frontend/_public/src/js`, {folder: DOCROOT}),
          };
        }, {}),
      };

      Object.keys(aliases).forEach(key => {
        if (!aliases[key]) {
          delete aliases[key];
        }
      });

      const config = {
        context: jsRoot,
        resolve: {
          modules: [
            jsRoot,
            tmpl.path('tests', {folder: ROOT}),
            ...inheritancePath.map(theme => tmpl.path(`themes/Frontend/${theme}/node_modules`, {folder: DOCROOT})),
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, '../node_modules'),
          ],
          alias: aliases,
        },

        resolveLoader: {
          modules: [path.resolve(__dirname, '../node_modules')],
          extensions: ['.js', '.json'],
          mainFields: ['loader', 'main'],
        },

        entry: {
          main: ['babel-polyfill', ...main()],
        },

        output: {
          path: tmpl.path('js', {folder: DIST}),
          publicPath: 'frontend/_resources/js/',
          filename: 'main.js',
        },

        plugins: [
          new webpack.NoEmitOnErrorsPlugin(),
          new webpack.ProvidePlugin(provide),
          new webpack.optimize.ModuleConcatenationPlugin(),
          new webpack.optimize.OccurrenceOrderPlugin(),
          new webpack.EnvironmentPlugin({NODE_ENV: 'development'}),
        ],

        module: {
          rules: [
            ...expose.map(({pattern, vars = []}) => ({
              test: pattern,
              use: vars.map(options => ({loader: 'expose-loader', options})),
            })),
            {
              test: /modernizr/,
              use: 'imports-loader?this=>window',
            },
            {
              test: /\.json$/,
              use: ['json-loader'],
            },
            {
              test: /.js?$/,
              exclude: /(node_modules)|(Frontend\/Bare)|(Frontend\/Responsive)|(\/plugins\/)|(\/plugins-custom\/)/i,
              use: [{
                loader: 'babel-loader',
                options: {
                  presets: [path.resolve(__dirname, '../node_modules/@babel/preset-env')],
                  plugins: [require(path.resolve(__dirname, '../node_modules/@babel/plugin-proposal-object-rest-spread'))],
                  retainLines: true,
                }
              }],
            },
          ],
        },
      };

      /**
       * Make sure we got an entry point
       */
      if (config.entry.main.length === 0) {
        const emptyJs = tmpl.path('empty.js', {folder: TMP});
        fs.outputFileSync(emptyJs, '/** Intentionally empty **/');
        config.entry.main = [emptyJs];
      }

      if (needsVendorScript()) {
        config.entry.vendor = [resolveNpmPath('jquery'), ...swagResponsiveDependencies];

        config.plugins.push(new webpack.optimize.CommonsChunkPlugin({
          names: ['vendor'],
          filename: (isProd()) ? '[name]-[hash].js' : '[name].js',
          minChunks: Infinity,
        }));
      }

      if (resolvePathFromConfig(/jquery(\.min)?\.js/)) {
        config.externals = {
          jquery: 'jQuery',
        };
      }

      if (isProd()) {
        // Webpack 4 only
        // config.mode = 'production';
        config.plugins.push(new CleanWebpackPlugin(tmpl.path('js', {folder: DIST}), {allowExternal: true}));
        config.plugins.push(new webpack.optimize.UglifyJsPlugin());
        config.plugins.push(new ManifestPlugin({
          fileName: '../rev-manifest.json',
          basePath: 'frontend/_resources/js/',
        }));
      } else {
        // Webpack 4 only
        // config.mode = 'development';
        config.devtool = '#cheap-module-source-map';

        config.output = {
          path: tmpl.path('web/cache', {folder: DOCROOT}),
          publicPath: '/web/cache/',
          filename: '[name].js',
        };

        const swag = getFiles(file => !file.includes(`Frontend/${theme}/frontend/_resources`));
        if (swag.length) {
          config.plugins.push(new MergeIntoSingleFilePlugin({files: {'swag.js': swag}}));
        } else {
          fs.outputFile(tmpl.path('web/cache/swag.js', {folder: DOCROOT}), '/* No custom shopware script files */');
        }
      }

      if (serve) {
        config.entry.main = ['webpack/hot/dev-server', 'webpack-hot-middleware/client', ...config.entry.main];

        config.plugins.push(new webpack.HotModuleReplacementPlugin());
        config.module.rules[config.module.rules.length - 1].use.unshift('monkey-hot-loader');
      }

      // console.log(`
      //   process.env.env: ${process.env.env}
      //   process.env.NODE_ENV: ${process.env.NODE_ENV}
      //   process.env.SHOPWARE_ENV: ${process.env.SHOPWARE_ENV}
      //   process.env.DOCKER_ENV: ${process.env.DOCKER_ENV}
      // `);
      //
      // console.log(`---------------------------- WEBPACK CONFIG (env: ${ENV}) --------------------------`);
      // console.log(config);
      // console.log('----------------------------------------------------------------------');
      // console.log(config.module.rules);

      return config;
    }
  );
