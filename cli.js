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
const {base, submoduleTarget} = require('./lib/env');
const store = require('./lib/store');
const swag = require('.');

const cli = meow({help: false});

updateNotifier({pkg: cli.pkg}).notify();

// Console.log(cli);process.exit(1);

const rcContent = `# This file is required to identify the root installation directory.
# The config can be found in: ${store.path}`;

const showHelp = () => console.log(redent(trimNewlines(`
  Usage
    $ shopware <command>
    
  Commands
    console     Make calls to the shopware console from anywhere in your project
    tools       Make calls to the shopware sw.phar from anywhere in your project
    cache:clear Clear cache
    help        Show this help
     
  Options
    --tbd 
          
  Examples
    $ shopware install
    $ shopware 
`), 2));

// Check existing installation
const initial = ![
  path.join(base(), '.shopware-cli.json'),
  path.join(base(), submoduleTarget, 'config.php'),
  path.join(base(), submoduleTarget, 'shopware.php')
].reduce((res, file) => res || fs.existsSync(file), false);

Promise
  .resolve()
  .then(() => ({cmd: cli.input[0], input: cli.input.slice(1) || []}))
  .then(({cmd, input}) => {
    if (cmd === 'install') {
      fs.writeFileSync(path.join(base(), '.shopware-cli.json'), rcContent);
      return ui.questions(Object.assign({}, cli.flags, {initial})).then(answers => ({cmd, answers, input}));
    }

    return {cmd, answers: {}, input};
  })
  .then(({cmd, answers, input}) => {
    if (cmd === 'install' && !answers.overwrite && !initial) {
      console.log(redent(trimNewlines(`${chalk.red('Canceled due to existing installation')}`)));
      process.exit(0);
    }

    if (cmd) {
      return swag(cmd, input, Object.assign({}, cli.flags, answers))
        .catch(err => console.error(chalk.red(err.message)) && process.exit(1));
    }

    showHelp();
  })
  .catch(err => {
    console.error(`\n${logSymbols.error} ${err.message}`);
    process.exit(1);
  });
