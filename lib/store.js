const {name} = require('./env');
const path = require('path');
const Configstore = require('configstore');

module.exports = new Configstore(`shopware-cli-${name}`);

