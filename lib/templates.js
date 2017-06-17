const {submoduleUrl, submoduleTarget} = require('./env');

module.exports.gitmodules = () => `
[submodule "shopware"]
	path = ${submoduleTarget}
	url = ${submoduleUrl}
	ignore = untracked
`;

module.exports.configPhp = function ({
  dbuser: dbuser = '',
  dbpass: dbpass = '',
  dbname: dbname = '',
  dbhost: dbhost = '127.0.0.1',
  dbport: dbport = 3306,
}) {

  return `<?php
return [
  'db' => [
  'username' => '${dbuser}',
  'password' => '${dbpass}',
  'dbname'   => '${dbname}',
  'host'     => '${dbhost}',
  'port'     => '${dbport}'
],
'front'       => [
  'showException'   => true,
  'throwExceptions' => true,
  'noErrorHandler'  => false,
],

// Low-Level PHP-Fehler
'phpsettings' => [
  'display_errors' => 1,
],
'template'    => [
  'forceCompile' => true,
],
'mail'        => [
  'type' => 'file',
],
// Backend-Cache
'cache'       => [
  'backend'         => 'Black-Hole',
  'backendOptions'  => [],
  'frontendOptions' => [
  'write_control' => false
],
],

// Model-Cache
'model'       => [
  'cacheProvider' => 'Array' // supports Apc, Array, Wincache and Xcache
],

// Http-Cache
'httpCache'   => [
  'enabled' => false, // true or false
  'debug'   => true,
],
];`;

};