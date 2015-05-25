'use strict';

// external dependencies
var mqlight = require('mqlight');

/**
 * createClient()
 *   Creates an mqlight client, getting connection options from the Bluemix
 *    registry if available, or localhost otherwise.
 *
 * @param {string} clientname - name for the client
 * @param {Function} callback - callback with the client handle
 */
module.exports.createClient = function createClient (clientname, callback) {

    var clientOptions = {};

    if (process.env.VCAP_SERVICES) {
        // we are running in a Bluemix environment, so we
        //  get the connection information from Bluemix
        var services = JSON.parse(process.env.VCAP_SERVICES);
        console.log('Connecting using Bluemix service');

        if (services.mqlight && services.mqlight.length > 0) {
            var mqlightservice = services.mqlight[0];
            clientOptions.service = mqlightservice.credentials.connectionLookupURI;
            clientOptions.user = mqlightservice.credentials.username;
            clientOptions.password = mqlightservice.credentials.password;
        }
        else {
            return callback(
                new Error('Running in a CF environment but the app is not bound to an mqlight service')
            );
        }
    }
    else {
        // no config provided, so use a hard-coded default
        clientOptions.service = 'amqp://localhost';
        console.log('Connecting using default options');
    }

    mqlight.createClient(clientOptions, function onConnection (err, client) {
        if (err) {
            console.error('Failed to create connection to mqlight');
            console.error(err.message);
            return callback(err);
        }
        return callback(null, client);
    });
};
