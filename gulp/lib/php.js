/* eslint-env node, es6 */
const parseurl = require('parseurl');
const fs = require('fs-extra');
const path = require('path');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const php = require('php-proxy-middleware');
const phpFpm = require('php-fpm');
const {find} = require('lodash');
const fastCgi = require('fastcgi-client');
const execa = require('execa');
const {ENV, getOption, isProd} = require('./env');

const fpmConsole = cmd => {
  const [host, port] = getOption('fpm').split(':');

  const fpm = new Promise((resolve, reject) => {
    const loader = fastCgi({
      host: host || 'php',
      port: port || 9000,
    });
    loader.on('ready', () => resolve(loader));
    loader.on('error', reject);
  });

  return fpm.then(
    php =>
      new Promise((resolve, reject) => {
        php.request(
          {
            REQUEST_METHOD: 'GET',
            SCRIPT_FILENAME: '/project/bin/fcgi-console.php',
            QUERY_STRING: JSON.stringify(cmd),
          },
          (err, request) => {
            if (err) {
              return reject(err);
            }

            let output = '';
            let errors = '';

            request.stdout.on('data', function (data) {
              output += data.toString('utf8');
            });

            request.stderr.on('data', function (data) {
              errors += data.toString('utf8');
            });

            request.stdout.on('end', function () {
              if (errors) {
                reject(new Error(errors));
              }

              resolve(output);
            });
          }
        );
      })
  );
};

/**
 * Create php middleware
 */
const getMiddleware = (env, tmpl, DOCROOT) => {
  if (env === 'prod') {
    process.env.SHOPWARE_ENV = 'production';
    process.env.SHOPWARE_DEBUG = 0;
  } else {
    process.env.SHOPWARE_ENV = 'node';
    process.env.SHOPWARE_DEBUG = 0;
  }

  if (getOption('docker') || getOption('fpm')) {
    const [host, port] = getOption('fpm').split(':');

    return phpFpm(
      {
        root: tmpl.path({folder: DOCROOT}),
        host: host || 'php',
        port: port || 9000,
      },
      {
        script: '/project/shopware/shopware.php',
      }
    );
  }

  return php({
    address: '127.0.0.1', // Which interface to bind to
    // eslint-disable-next-line camelcase
    ini: {max_execution_time: 60, variables_order: 'EGPCS'},
    root: tmpl.path({folder: DOCROOT}),
    router: tmpl.path('shopware.php', {folder: DOCROOT}),
  });
};

/**
 * Fire up php middleware
 * @returns {Function}
 */
function phpMiddleware(themes = [], env = ENV) {
  const {tmpl, DOCROOT, TMP} = require('./dir');
  const middleware = getMiddleware(env, tmpl, DOCROOT);

  let base = [tmpl.path({folder: DOCROOT})];
  if (!isProd()) {
    const inheritance = themes.map(name => {
      return tmpl.path(`themes/Frontend/${name}/frontend/_public/src`);
    });

    base = [
      tmpl.path({folder: TMP}),
      tmpl.path('frontend/_resources', {folder: TMP}),
      ...inheritance,
      tmpl.path({folder: DOCROOT}),
    ];
  }

  const serve = serveStatic(path.join(__dirname, '..'));

  // Helper function to check if file exists
  const exists = pathname =>
    find(base, root => {
      const file = path.join(root, pathname);
      return fs.existsSync(file) && fs.statSync(file).isFile() && !/\.php$/.test(file);
    }) !== undefined;

  // Helper to passthrough unsynced media files
  const isUnsynedMedia = pathnmame => /\/media\/image\//.test(pathnmame) && !exists(pathnmame);

  // Check for dynamic webpack/browsersync files
  const isDevtools = pathname =>
    /^\/browser-sync\//.test(pathname) || /^\/__webpack_hmr$/.test(pathname) || /\.hot-update\.json$/.test(pathname);

  return function (req, res, next) {
    const {pathname} = parseurl(req);

    // Rewrite unsynced media paths to
    if (isUnsynedMedia(pathname)) {
      req.url = '/fallback.svg';
      serve(req, res, finalhandler(req, res));
    } else if (isDevtools(pathname) || exists(pathname)) {
      next();
    } else {
      middleware(req, res, next);
    }
  };
}

/**
 * Run php command
 * @param args
 * @param opts
 * @returns {Promise}
 */
function phpCli(args = [], opts = {}) {
  const {tmpl, DOCROOT} = require('./dir');

  if (typeof args === 'string') {
    args = [args];
  }
  if (!getOption('php')) {
    return Promise.resolve();
  }
  if (getOption('docker') || getOption('fpm')) {
    return fpmConsole(args);
  }

  return execa(tmpl.path('bin/console', {folder: DOCROOT}), args, opts);
}

module.exports = {
  phpCli,
  phpMiddleware,
};
