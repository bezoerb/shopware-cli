import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import test from 'ava';
import makeDir from 'make-dir';
import uuid from 'uuid/v4';
import swag from '..';

test.beforeEach('prepare', async t => {
  const cwd = path.join(os.tmpdir(), 'shopware-cli-test', uuid());
  await makeDir(cwd);
  process.chdir(cwd);

  await swag('install', {}, {
    url: 'localhost',
    dbname: 'shopware_test',
    dbuser: 'root',
    dbpass: '',
    dbhost: '127.0.0.1',
    dbport: '3306'
  });

  t.context.cwd = cwd;
});

test('install', async t => {
  t.true(fs.existsSync(path.join(t.context.cwd, 'src/config.php')), 'shopware config generated');

  const contents = await fs.readFile(path.join(t.context.cwd, 'src/config.php'), 'utf8');

  t.regex(contents, new RegExp(`'username'\\s+=>\\s+'root'`));
  t.regex(contents, new RegExp(`'password'\\s+=>\\s+'breozb'`));
  t.regex(contents, new RegExp(`'dbname'\\s+=>\\s+'satisfyr'`));
  t.regex(contents, new RegExp(`'host'\\s+=>\\s+'127.0.0.1'`));
  t.regex(contents, new RegExp(`'port'\\s+=>\\s+'3306'`));

  t.pass(`Done in ${process.cwd()}`);
});
