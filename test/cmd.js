import os from 'os';
import path from 'path';
import test from 'ava';
import makeDir from 'make-dir';
import swag from '..';

const testdir = path.join(os.tmpdir(), 'shopware-cli-test');

test.before('prepare', async () => {
  await makeDir(testdir);
});

test('fail "console" without swdir', async t => {
  await t.throws(swag('console'));
});

test('fail "tools" without swdir', async t => {
  await t.throws(swag('tools'));
});

test('install', async t => {
  process.chdir(path.join(os.tmpdir(), 'shopware-cli-test'));
  await swag('install', {}, {
    url: 'localhost',
    dbname: 'shopware_test',
    dbuser: 'root',
    dbpass: '',
    dbhost: '127.0.0.1',
    dbport: '3306'
  });

  t.pass(`Done in ${process.cwd()}`);
});
