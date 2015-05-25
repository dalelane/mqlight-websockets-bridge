'use strict';
/**
 * Starts the websockets notification bridge.
 *
 * @author Dale Lane
 */

var server = require('./lib/server');

server.start(function onStart () {
    console.log('started');
});
