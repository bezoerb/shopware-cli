#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const meow = require('meow');
const updateNotifier = require('update-notifier');
const logSymbols = require('log-symbols');
const trimNewlines = require('trim-newlines');
const chalk = require('chalk');
const redent = require('redent');
const ui = require('./lib/ui');
const {base} = require('./lib/env');
const store = require('./lib/store');
const swag = require('./');

const cli = meow({help: false});

updateNotifier({pkg: cli.pkg}).notify();

//console.log(cli);process.exit(1);

const rcContent = `# This file is required to identify the root installation directory.
# The config can be found in: ${store.path}`;

const showHelp = () => console.log(redent(trimNewlines(`
  Usage
    $ shopware <command>
    
  Commands
    install  Setup new shopware installation
    refresh  Refresh shopware installation and plugins from git
    console  Make calls to the shopware console from anywhere in your project
    phar     Make calls to the shopware sw.phar from anywhere in your project
    help     Show this help
     
  Options
    --tbd 
          
  Examples
    $ shopware install
    $ shopware 
`), 2));

// check existing installation
const initial = ![
  path.join(base, '.shopware-cli.json'),
  path.join(base, 'src','config.php'),
  path.join(base, 'src','shopware.php'),
].reduce((res, file) => res || fs.existsSync(file), false);

Promise
  .resolve()
  .then(() => ({cmd: cli.input[0], input: cli.input.slice(1) || []}))
  .then(({cmd, input}) => {
    if (cmd === 'install') {
      fs.writeFileSync(path.join(base, '.shopware-cli.json'), rcContent);
      return ui.questions(Object.assign({},cli.flags, {initial})).then(answers => ({cmd, answers, input}));
    }

    return {cmd, answers: {}, input};
  })
  .then(({cmd, answers, input}) => {
    if (cmd === 'install' && !answers.overwrite && !initial) {
      console.log(redent(trimNewlines(`${chalk.red('Canceled due to existing installation')}`)));
      process.exit(0);
    }
    
    if (cmd) {
      return swag(cmd, input, Object.assign({}, cli.flags, answers));
    }

    showHelp();
  })
  .catch(err => {
    console.error(`\n${logSymbols.error} ${err.message}`);
    process.exit(1);
  });