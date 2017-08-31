import os from 'os';
import fs from 'fs';
import path from 'path';
import test from 'ava';
import makeDir from 'make-dir';
import swag from '..';

const testdir = path.join(os.tmpdir(), 'shopware-cli-test');

test.before('prepare', async () => {
  await makeDir(testdir);
  process.chdir(testdir);
});

test('fail "console" without swdir', async t => {
  await t.throws(swag('console'));
});

test('fail "tools" without swdir', async t => {
  await t.throws(swag('tools'));
});

test('install', async t => {
  await swag('install', {}, {
    url: 'localhost',
    dbname: 'shopware_test',
    dbuser: 'root',
    dbpass: '',
    dbhost: '127.0.0.1',
    dbport: '3306'
  });

  t.true(fs.existsSync(path.join(testdir, 'src/config.php')), 'shopware config generated');
  t.pass(`Done in ${process.cwd()}`);
});
