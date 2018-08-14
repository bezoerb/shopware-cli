/* eslint-env jest, browser */
test('Shopware base scripts are set up', () => {
  expect($).toBeDefined();
  expect($.subscribe).toBeDefined();
  expect($.publish).toBeDefined();
  expect(window.StateManager).toBeDefined();
  expect(window.StorageManager).toBeDefined();
});
