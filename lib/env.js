const fs = require('fs');
const path = require('path');
const findUp = require('find-up');
const makeDir = require('make-dir');

// determine the app root
let base = findUp.sync('.shopware-cli.json', {
  cwd: process.cwd()
});

base = base ? path.dirname(base) : process.cwd();

if (base !== process.cwd()) {
  if (!fs.existsSync(base)) {
    makeDir.sync(base);
  }

  process.chdir(base);
}

module.exports = {
  base,
  name: path.basename(base),
  submoduleUrl: 'https://github.com/shopware/shopware.git',
  submoduleTarget: 'src',
};