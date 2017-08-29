const Configstore = require('configstore');
const {name} = require('./env');

module.exports = new Configstore(`shopware-cli-${name}`);

