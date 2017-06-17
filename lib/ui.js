const inquirer = require('inquirer');
const store = require('./store');

const questions = (reset) => [
  {
    type: 'input',
    name: 'url',
    message: 'What\'s your site url',
    default: () => store.get('url'),
  },
  {
    type: 'input',
    name: 'dbname',
    message: 'What\'s your database name',
    default: () => store.get('dbname'),
  },
  {
    type: 'input',
    name: 'dbuser',
    message: 'What\'s your database username',
    default: () => store.get('dbuser'),
  },
  {
    type: 'input',
    name: 'dbpass',
    message: 'What\'s your database password',
    default: () => store.get('dbpass'),
  },
  {
    type: 'input',
    name: 'dbhost',
    message: 'What\'s your database host',
    default: () => store.get('dbhost') || '127.0.0.1',
  },
  {
    type: 'input',
    name: 'dbport',
    message: 'What\'s your database port',
    default: () => store.get('dbport') || '3306',
  },
];

module.exports = ({reset: reset = false}) => inquirer.prompt(questions(reset)).then(data => {
  store.set(data);
  console.log('');
  return data;
});