const inquirer = require('inquirer');
const store = require('./store');

const questions = ({reset, initial}) => [
  {
    type: 'confirm',
    name: 'overwrite',
    message: `I've detected an existing Shopware installation. 
Do you want to overwrite?`,
    when: !initial && typeof reset === 'undefined',
    default: false
  },
  {
    type: 'input',
    name: 'url',
    message: 'What\'s your site url',
    when: response => response.overwrite || initial || reset,
    default: () => store.get('url')
  },
  {
    type: 'input',
    name: 'dbname',
    message: 'What\'s your database name',
    when: response => response.overwrite || initial || reset,
    default: () => store.get('dbname')
  },
  {
    type: 'input',
    name: 'dbuser',
    message: 'What\'s your database username',
    when: response => response.overwrite || initial || reset,
    default: () => store.get('dbuser')
  },
  {
    type: 'input',
    name: 'dbpass',
    message: 'What\'s your database password',
    when: response => response.overwrite || initial || reset,
    default: () => store.get('dbpass')
  },
  {
    type: 'input',
    name: 'dbhost',
    message: 'What\'s your database host',
    when: response => response.overwrite || initial || reset,
    default: () => store.get('dbhost') || '127.0.0.1'
  },
  {
    type: 'input',
    name: 'dbport',
    message: 'What\'s your database port',
    when: response => response.overwrite || initial || reset,
    default: () => store.get('dbport') || '3306'
  }
];

module.exports.questions = ({reset, initial}) => inquirer.prompt(questions({reset, initial})).then(data => {
  store.set(data);
  console.log('');
  return data;
});
