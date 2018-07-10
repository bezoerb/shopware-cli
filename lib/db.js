/* eslint-env node */
const mysql = require('mysql');

const exitHook = require('async-exit-hook');

let pool;

const noop = function () {
}

/**
 * Destroy all pool connections
 * @returns {Promise<any>} Resolves after connection is closed
 */
const destroy = (cb = noop) =>
  new Promise((resolve, reject) => {
    if (pool && pool.end) {
      pool.end(err => {
        if (err) {
          cb();
          return reject(err);
        }
        cb();
        resolve();
      });
    } else {
      cb();
      resolve();
    }
  });

const connect = (config = {}) => {
  if (!pool || pool._closed) {
    try {
      pool = mysql.createPool(config);
      exitHook(cb => destroy(cb));
    } catch (err) {
      return Promise.reject(err);
    }
  }
  return Promise.resolve(pool);
};

/**
 * Perform database query
 * @param {string} sql The sql query
 * @param {array} values The values to be
 * @return {Promise} Return a promise holding an object with results and fields information
 */
const query = (sql, values) => connect().then(pool => {
  // Make sure we got a query
  if (!sql) {
    return Promise.reject(new Error('Empty db query'));
  }

  // Make sure the pool isn't closed already
  if (pool._closed) {
    return Promise.reject(new Error('Connection killed'));
  }

  const cb = (resolve, reject) => (error, results, fields) => {
    if (error) {
      return reject(error);
    }

    return resolve({results, fields});
  };

  return new Promise((resolve, reject) => {
    if (!values) {
      return pool.query(sql, cb(resolve, reject));
    }

    return pool.query(sql, values, cb(resolve, reject));
  });
});

module.exports = {
  query,
  destroy,
  connect,
};
