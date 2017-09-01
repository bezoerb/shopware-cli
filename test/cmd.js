import test from 'ava';
import swag from '..';

test('fail "console" without swdir', async t => {
  await t.throws(swag('console'));
});

test('fail "tools" without swdir', async t => {
  await t.throws(swag('tools'));
});
