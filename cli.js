#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const meow = require('meow');
const updateNotifier = require('update-notifier');
const logSymbols = require('log-symbols');
const execa = require('execa');
const ui = require('./lib/ui');
const {base} = require('./lib/env');
const store = require('./lib/store');
const swag = require('./');

const cli = meow(`
	Usage
	  $ shopware <command>
	  
	Commands
	  install  Setup new shopware installation
	  refresh  Refresh shopware installation and plugins
	  console  Make calls to the shopware console from anywhere in your project
	  phar     Make calls to the shopware sw.phar from anywhere in your project
	   
	Options
	  --tbd       
	Examples
	  $ swag install
	  $ swag 
`);

updateNotifier({pkg: cli.pkg}).notify();

const rcContent = `# This file is required to identify the root installation directory.
# The config can be found in: ${store.path}`;

Promise
  .resolve()
  .then(() => ({cmd: cli.input[0], input: cli.input[1] || ''}))
  .then(({cmd, input}) => {
    if (cmd === 'install') {
      fs.writeFileSync(path.join(base, '.shopware-cli.json'), rcContent);
      return ui(cli.flags).then(answers => ({cmd, answers, input}));
    }

    return {cmd, answers: {}, input};
  })
  .then(({cmd, answers, input}) => {
    if (cmd) {
      return swag(cmd, input, Object.assign({}, cli.flags, answers));
    }

    cli.showHelp();
  })
  .catch(err => {
    console.error(`\n${logSymbols.error} ${err.message}`);
    process.exit(1);
  });