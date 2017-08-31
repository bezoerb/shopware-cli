import os from 'os';
import fs from 'fs-extra';
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

  const contents = await fs.readFile(path.join(testdir, 'src/config.php'), 'utf8');

  t.regex(contents, new RegExp(`'username'\s+=>\s+'root'`)); // eslint-disable-line no-useless-escape
  t.regex(contents, new RegExp(`'password'\s+=>\s+'breozb'`)); // eslint-disable-line no-useless-escape
  t.regex(contents, new RegExp(`'dbname'\s+=>\s+'satisfyr'`)); // eslint-disable-line no-useless-escape
  t.regex(contents, new RegExp(`'host'\s+=>\s+'127.0.0.1'`)); // eslint-disable-line no-useless-escape
  t.regex(contents, new RegExp(`'port'\s+=>\s+'3306'`)); // eslint-disable-line no-useless-escape

  t.pass(`Done in ${process.cwd()}`);
});
