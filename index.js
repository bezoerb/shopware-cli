const {swConsole, phar, setPermissions, clearCache} = require('./lib/util');

module.exports = (command, args, options) => {
  switch (command) {
    case 'console':
      return swConsole(args, options);
    case 'tools':
      return phar(args, options);
    case 'permissions':
      return setPermissions();
    case 'clear:cache':
    case 'cache:clear':
      return clearCache(options);
    case 'install':
    case 'refresh':
      return console.log('deprecated...');
    default:
      console.log(`Command ${command} is not implemented`);
  }
};
