const fs = require('fs');
const path = require('path');
const findUp = require('find-up');
const spawn = require('cross-spawn');
const makeDir = require('make-dir');

// Determine the app root
let base = findUp.sync('.shopware-cli.json', {
  cwd: process.cwd()
});

// Try git root
if (base) {
  base = path.dirname(base);
} else {
  const cmd = spawn.sync('git', ['rev-parse', '--show-toplevel']);
  base = cmd.status === 0 && cmd.stdout.toString().trim();
}

// Ensure directory exists
if (base && base !== process.cwd()) {
  if (!fs.existsSync(base)) {
    makeDir.sync(base);
  }

  process.chdir(base);
} else {
  base = process.cwd();
}

module.exports = {
  base,
  name: path.basename(base),
  submoduleUrl: 'https://github.com/shopware/shopware.git',
  submoduleTarget: 'src'
};
