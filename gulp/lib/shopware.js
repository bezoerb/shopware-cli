/* eslint-env node, es6 */
const url = require('url');
const path = require('path');
const fs = require('fs-extra');
const findUp = require('find-up');
const globby = require('globby');
const chalk = require('chalk');
const execa = require('execa');
const mysql = require('mysql');
const deasyncPromise = require('deasync-promise');
const {phpCli} = require('./php');
const {base, shop, getOption} = require('./env');

/**
 * Get git root
 * @returns {string|null}
 */
const gitRoot = () => {
  const {stdout: dir, failed, code} = execa.sync('git', ['rev-parse', '--show-toplevel']);
  return failed || code !== 0 ? null : dir.trim();
};

/**
 * Get root when calling outside the shopware directory
 * @returns {string|null}
 */
const projectRoot = () => {
  const file = findUp.sync(['.env', '.gitmodules']);
  return file ? path.dirname(file) : null;
};

/**
 * Try to find shopware base directory
 * first try parents and fallback to git root + find
 *
 * @returns {string}
 */
const docroot = () => {
  const file = 'shopware.php';

  // Only check if we don't have a base directory
  if (!base) {
    // Assume everything as expected and we're in the frontend directory besides the shopware root
    if (fs.existsSync(path.join(__dirname, `../../shopware/${file}`))) {
      return path.resolve(__dirname, '../../shopware');
    }

    // Assume we are inside shopware
    const dir = findUp.sync(file);
    if (dir) {
      return path.dirname(dir);
    }
  }

  const basePath = base || gitRoot() || projectRoot() || process.cwd();
  const matches = globby.sync([file, `*/${file}`], {cwd: basePath});

  if (matches.length && fs.existsSync(path.join(basePath, matches[0]))) {
    return path.dirname(path.join(basePath, matches[0]));
  }

  console.log(chalk.red('Error: could not resolve shopware directory'));
  process.exit(1);
};

const configFile = path.resolve(docroot(), 'web', 'cache', `config_${shop}.json`);

const fixSymlink = file => {
  if (/^\/?project\//.test(file)) {
    file = file.replace(/^\/?project\//, path.join(docroot() ,'..') + '/');
  }

  if (fs.existsSync(file)) {
    return path.relative(docroot(), file);
  }

  if (fs.existsSync('/' + file)) {
    return path.relative(docroot(), `/${file}`);
  }

  // console.log(docroot(), file);

  return file;
};

/**
 * Fix misresolved paths in theme configuration
 * @param config
 */
const repairConfig = (config = {}) => {
  const {less = [], js = []} = config;
  return {...config, less: less.map(file => fixSymlink(file)), js: js.map(file => fixSymlink(file))};
};

/**
 * Get shopware theme configuration
 * @returns {Promise}
 */
const themeConfig = () => {
  let condition = Promise.resolve();
  if (!fs.existsSync(configFile)) {
    condition = phpCli(['sw:theme:dump:configuration']);
  }
  return condition
    .then(() => fs.readJson(configFile, {throws: false}))
    .then(config => repairConfig(config));
};

/**
 * Sync version of themeConfig()
 * @returns {Object}
 * @throws {Error}
 */
themeConfig.sync = () => {
  if (!fs.existsSync(configFile)) {
    try {
      deasyncPromise(phpCli(['sw:theme:dump:configuration']));
    } catch (err) {
      console.log(`Missing config file. Run ${chalk.green('gulp sw:config')}`);
      console.log(err.message);
      process.exit(1);
    }
  }
  const config = fs.readJsonSync(configFile, {throws: false});
  return repairConfig(config);
};


/**
 * Parse database connection URI
 * mysql://[username:password@]host[:port]/[database]
 * @param uri
 * @return {*}
 */
const parseDbConnectionUri = uri => {
  if (uri) {
    const parsed = url.parse(uri.includes('://') ? uri : `mysql://${uri}`);
    const {auth, port, hostname, pathname} = parsed || {};

    const database = pathname ? pathname.substring(1) : undefined;
    const [user, password] = auth ? auth.split(':') : [];

    return {
      host: hostname,
      port: port || 3306,
      user,
      password,
      database,
    }
  }

  return {};
};

/**
 * Get database config from shopware/config.php
 * Can be overwritten by env/option
 * @return {*}
 */
const dbConfig = () => {
  const configFile = path.join(docroot(), 'config.php');
  const keys = ['username', 'password', 'host', 'port', 'dbname'];
  const db = getOption('db', '');
  const {host, port, user, password, database} = parseDbConnectionUri(db);

  const env = {
    username: getOption('dbUser', user),
    password: getOption('dbPass', password),
    host: getOption('dbHost', host),
    port: getOption('dbPort', port),
    dbname: getOption('dbName', database),
  };

  if (fs.existsSync(configFile)) {
    return fs.readFile(configFile, 'utf8').then(config => {
      // Remove comments
      const cleaned = config.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '');
      return keys.reduce((res, key) => {
        const regexp = new RegExp(`['"]${key}['"]\\s+=>\\s+['"]([^'"]+)['"]`);
        const match = regexp && regexp.exec(cleaned);
        if (env[key]) {
          res[key] = env[key];
        } else if (match && match[1] !== res[key]) {
          res[key] = match[1];
        }
        return res;
      }, {});
    });
  }

  return Promise.resolve(env);
};

let pool;

const destroyDbConnection = () => new Promise((resolve, reject) => {
  if (pool && !pool._closed) {
    pool.end(err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  } else {
    resolve();
  }
});

const startMysql = () => dbConfig().then(db => {
  if (!pool || pool._closed) {
    pool = mysql.createPool({
      host: db.host,
      port: db.port,
      user: db.username,
      password: db.password,
      database: db.dbname,
    });
  }
  return pool;
});

/**
 * Perform database query
 * @param q
 * @param args
 * @return {*}
 */
const dbQuery = (q, args = []) => startMysql().then(pool => {
  if (!q) {
    return Promise.reject(new Error('Empty db query'));
  }

  if (pool._closed) {
    return Promise.reject(new Error('Connection killed'));
  }

  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return reject(err);
      }
      connection.query(q, args, (error, results) => {
        if (error) {
          console.log(error);
          return reject(error);
        }
        connection.release();
        return resolve(results);
      });
    });
  });
});

const getHostFromDb = () => dbQuery('SELECT host FROM s_core_shops WHERE id = ?', [shop])
  .then(result => {
    const [row = {}] = result;
    return row.host;
  });

const setHost = (host, port = '') => {
  if (port) {
    host = `${host}:${port}`;
  }
  return dbQuery('UPDATE s_core_shops set host = ? WHERE id = ?', [host, shop]);
};

module.exports = {
  docroot,
  themeConfig,
  setHost,
  dbQuery,
  destroyDbConnection,
  getHostFromDb,
};
