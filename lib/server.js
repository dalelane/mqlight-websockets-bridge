'use strict';
(function () {

/**
 * Websockets bridge module.
 *
 *  Provides a websocket that clients can connect to and subscribe to mqlight
 *  topics. It will subscribe to those MQ light topics, and act as a bridge by
 *  republishing received messages down the websocket.
 *
 *  This is a one-way bridge - republishing mqlight messages to websocket clients.
 *  It does not allow web clients to publish messages.
 *
 *  When a websocket connection closes, it unsubscribes from the topic.
 *
 * @author Dale Lane
 */

// core dependencies
var http = require('http');
var path = require('path');
// external dependencies
var async = require('async');
var httpstatus = require('http-status');
var Primus = require('primus');
var randomstring = require('randomstring');
// local dependency
var messaging = require('./messaging');


// prepare the websockets server
var wsserver;
var server = http.createServer();
var primusoptions = {
    // websockets implementation
    transformer : 'websockets'
};
var primus = new Primus(server, primusoptions);
primus.save(path.join(__dirname, '..', 'depends', 'primus.js'));



/**
 * If there is a problem with the connection to the broker, there is
 *  no point keeping the websockets server running, so end it now.
 */
function handleMqlightError (spark, error) {
    console.error('Error from mqlight : ' + error.message);
    spark.write({ error : 'Error in connection to mqlight broker', statusCode : httpstatus.INTERNAL_SERVER_ERROR });
    spark.end();
}


/**
 * A message has been received from the mqlight broker.
 *  It will be passed to the websocket client.
 */
function handleMqlightMessage (spark, topic, data, delivery) {
    if (delivery.destination.topicPattern === topic) {
        spark.write(data);
    }
}



/**
 * Authentication for a websockets connection.
 *
 *  If you want to decide if a user/client is allowed to make a connection
 *   you can do that here.
 *
 * @param {Object} req - connection request
 * @param {Function} callback - callback with an error message if not authenticated,
 *                                 or nothing if the connection should be allowed
 */
function clientAuth (req, callback) {

    // if you decide to reject the client connection...
    // return callback({ statusCode : httpstatus.UNAUTHORIZED, message : 'Sorry, no.' });

    // if you decide to allow the connection...
    return callback();
}


/**
 * Authentication for a mqlight subscription.
 *
 *  If you want to decide whether a user/client is allowed to subscribe to the
 *   topic that they request, you can do that here.
 */
function topicAuth (spark, topic, callback) {

    // if you decide to refuse the subscription...
    // return callback({ statusCode : httpstatus.UNAUTHORIZED, message : 'Not authorized to subscribe to this topic' });

    // if you decide to allow the subscription...
    return callback();
}



function handleWsConnection (spark) {
    // clients provide the topic they want to subscribe to in the query
    var topic = spark.query.topic;
    var clientid = 'wsbridge_' + randomstring.generate(25);

    async.waterfall([
        // check that the client is allowed to subscribe to the
        //  topic that they are requesting
        function verifyTopic (next) {
            topicAuth(spark, topic, next);
        },
        // connect to the mqlight broker
        function connectToMqlight (next) {
            messaging.createClient(clientid, next);
        },
        // register mqlight callback handlers
        function handleMqlightEvents (client, next) {
            client.on('error', function onMqlightError (mqerr) {
                handleMqlightError(spark, mqerr);
            });
            client.on('message', function onMqlightMessage (data, delivery) {
                handleMqlightMessage(spark, topic, data, delivery);
            });
            next(null, client);
        },
        // register ws event handler
        function handleWsDisconnect (client, next) {
            spark.on('end', function onWsEnd () {
                try {
                    client.unsubscribe(topic);
                }
                catch (err) {
                    console.error('Failed to unsubscribe : ' + err.message);
                }
            });
            next(null, client);
        },
        // subscribe to the topic requested by the client
        function subscribeToTopic (client, next) {
            client.subscribe(topic, next);
        }
    ], function wsConnectionComplete (err) {
        if (err) {
            if (err.statusCode) {
                spark.write(err);
            }
            else {
                spark.write({ error : err.message, statusCode : httpstatus.INTERNAL_SERVER_ERROR });
            }
            spark.end();
        }
    });
}




// check that client should be allowed to connect
primus.authorize(clientAuth);

// handle a new request from a client
primus.on('connection', handleWsConnection);



function start (callback) {
    var port = process.env.VCAP_APP_PORT || process.env.PORT || 3100;

    console.log('Websockets server starting on port ' + port);
    wsserver = server.listen(port, function onwsopen () {
        callback();
    });
}


function stop (callback) {
    if (wsserver) {
        console.log('Stopping websockets server');
        wsserver.close(function onwsclose (err) {
            wsserver = null;
            return callback(err);
        });
    }
    else {
        console.log('Received request to stop websockets server while already stopped');
        return callback();
    }
}



module.exports = {
    start : start,
    stop : stop
};

}());
