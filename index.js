const Listr = require('listr');
const install = require('./lib/install');
const refresh = require('./lib/refresh');
const {swConsole, phar} = require('./lib/util');

module.exports = (command, args, options) => {
  const tasks = new Listr([
    {
      title: 'Install',
      task: () => install(options),
      enabled: () => command === 'install'
    },
    {
      title: 'Running updates',
      task: () => refresh(options)
    }
  ]);

  switch (command) {
    case 'console':
      return swConsole(args, options);
    case 'tools':
      return phar(args, options);
    default:
      return tasks.run();
  }
};
