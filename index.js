// Const Listr = require('listr');
// const install = require('./lib/install');
// const refresh = require('./lib/refresh');
const {swConsole, phar, setPermissions, clearCache} = require('./lib/util');

module.exports = (command, args, options) => {
  // Const tasks = new Listr([
  //   {
  //     title: 'Install',
  //     task: () => install(options),
  //     enabled: () => command === 'install'
  //   },
  //   {
  //     title: 'Running updates',
  //     task: () => refresh(options)
  //   }
  // ]);

  switch (command) {
    case 'console':
      return swConsole(args, options);
    case 'tools':
      return phar(args, options);
    case 'permissions':
      return setPermissions();
    case 'cache:clear':
      return clearCache(options);
    case 'install':
    case 'refresh':
      return console.log('deprecated...');
    default:
      console.log(`Command ${command} is not implemented`);
  }
};
