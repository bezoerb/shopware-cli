const $ = require('jquery');

const matchMediaPolyfill = require('mq-polyfill').default;

/**
 * Define the window.matchMedia
 */
matchMediaPolyfill(global);

global.define = function(){};

global.$ = $;
global.jQuery = $;
