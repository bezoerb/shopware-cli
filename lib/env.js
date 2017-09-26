const fs = require('fs');
const path = require('path');
const findUp = require('find-up');
const spawn = require('cross-spawn');
const makeDir = require('make-dir');

function base() {
  // Determine the app root
  let b = findUp.sync('.shopware-cli.json', {
    cwd: process.cwd()
  });

  // Try git root
  if (b) {
    b = path.dirname(b);
  } else {
    const cmd = spawn.sync('git', ['rev-parse', '--show-toplevel']);
    b = cmd.status === 0 && cmd.stdout.toString().trim();
  }

  // Ensure directory exists
  if (b && b !== process.cwd()) {
    if (!fs.existsSync(b)) {
      makeDir.sync(b);
    }

    process.chdir(b);
  } else {
    b = process.cwd();
  }

  return b;
}

module.exports = {
  base,
  name: path.basename(base()),
  submoduleUrl: 'https://github.com/shopware/shopware.git',
  submoduleTarget: 'shopware'
};
