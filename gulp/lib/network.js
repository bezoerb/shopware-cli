/* eslint-env node, es6 */
const os = require('os');
const getport = require('getport');

/**
 * Helper to get the current host ip
 * Returns 127.0.0.1 as fallback if no external ip is available
 *
 * @returns {string}
 */
const getHost = () => {
  const ifaces = os.networkInterfaces();
  let address = '127.0.0.1';
  Object.keys(ifaces).forEach(ifname => {
    ifaces[ifname].some(iface => {
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        // Skips over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return false;
      }

      address = iface.address;
      return true;
    });
  });

  return address;
};

/**
 * Promisify getPort
 * @param start
 * @param end
 * @returns {Promise}
 */
const getPort = (start, end) => new Promise((resolve, reject) => getport(start, end, (err, port) => {
  return (err && reject(err)) || resolve(port);
}));

module.exports = {
  getHost,
  getPort,
};
