const fs = require('fs');
const Listr = require('listr');
const install = require('./lib/install');
const refresh = require('./lib/refresh');
const {swConsole, phar} = require('./lib/util');

module.exports = (command, args, options) => {
  switch (command) {
    case 'console':
      return swConsole(args, options);
    case 'phar':
      return phar(args, options);
  }

  const tasks = new Listr([
    {
      title: 'Installing shopware',
      task: () => install(options),
      enabled: () => command === 'install',
    },
    {
      title: 'Running updates',
      task: () => refresh(options),
    }
  ], {
  //  showSubtasks: false
  });

  return tasks.run();
};