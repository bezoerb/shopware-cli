const Listr = require('listr');
const chalk = require('chalk');
const {getOption} = require('../lib/env');
const {config} = require('../lib/shopware');
const {query, connect, destroy} = require('../lib/db');

const dbConnect = () =>
  config().then(({db}) =>
    connect({
      host: db.host,
      port: db.port,
      user: db.username,
      password: db.password,
      database: db.dbname
    })
  );

const setShopHost = (host = 'localhost') => {
  const tasks = new Listr(
    [
      {
        title: 'Connect database',
        task: () => dbConnect()
      },
      {
        title: `Set host to ${chalk.cyan(host)} for shopId ${getOption(
          'shop'
        )}`,
        task: () =>
          query('UPDATE s_core_shops set host = ? WHERE id = ?', [
            host,
            getOption('shop')
          ])
      },
      {
        title: 'Destroy connection',
        task: () => destroy()
      }
    ],
    {
      collapse: true,
      renderer: 'default',
      exitOnError: true
    }
  );

  return tasks.run();
};

const getShopHost = () =>
  dbConnect()
    .then(() =>
      query('SELECT host FROM s_core_shops WHERE id = ?', [getOption('shop')])
    )
    .then(({results = []}) => {
      const [row = {}] = results;
      const {host} = row;
      return destroy().then(() => host);
    });

module.exports = {
  setShopHost,
  getShopHost
};
