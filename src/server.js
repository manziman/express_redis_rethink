// This is a basic express app which will serve as
// a framework for interacting with either Redis channels
// or a RethinkDB realtime database through websockets. The c
// client specifies which channel it would like to access, 
// and the server opens a connection to monitor the database.

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var http = require("http");
var WebSocket = require("ws");
var Redis = require("redis");
var rdb = require('rethinkdb');
var app = express();

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html')
})

// Create http server to initialize the 
// websockets server.
var server = http.createServer(app);

// Create connection to Rethinkdb
var connection = null;
rdb.connect( {host: 'localhost', port: 28015}, function(err, conn) {
    if (err) throw err;
    connection = conn;
});

// Create websocket server using http server
var wss = new WebSocket.Server({ server: server, path: "/monitor" });

// Error catching
wss.on('error', function (err) {
    consle.log(err);
});

// Heartbeat
function heartbeat () {
    this.isAlive = true;
}

// Define Websockets listener callbacks for
// handling incoming connections
wss.on('connection', function (ws) {

    // Live connection detection
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    // Log closed connections
    ws.on('close', function (code, reason) {
        console.log("Connection closed because:", reason, "giving code:", code);
    });

    // Create a Redis client to subscribe to the
    // channel and receive messages
    var subscriber = Redis.createClient();
    
    // Handle reception of Websockets messages from 
    // speaker client. 
    ws.on('message', function (message) {

        // Switch statement to determine which channel
        // to subscribe to.
        switch (message) {
            case 'channel1':
                if (subscriber.subscribe('channel1')) {
                    ws.send("You are subscribed to channel1");
                } else {
                    ws.send("Subscription to channel1 failed!");
                }
                break;
            case 'channel2':
                if (subscriber.subscribe('channel2')) {
                    ws.send("You are subscribed to channel2");
                } else {
                    ws.send("Subscription to channel2 failed!");
                }
                break;
            case 'channel3':
                if (subscriber.subscribe('channel3')) {
                    ws.send("You are subscribed to channel3");
                } else {
                    ws.send("Subscription to channel3 failed!");
                }
                break;
            case 'rethinkdb':
                if (connection.open) {
                    ws.send("Waiting for changes to RethinkDB table 'test'");
                    rdb.db('test').table('messages').changes().run(connection, function (err, cursor) {
                        if (err) throw err;
                        cursor.each(function (err, row) {
                            if (err) throw err;
                            ws.send(JSON.stringify(row, null, 2));
                        });
                    });
                } else {
                    ws.send("Database not connected!");
                }
                break;
            default:
                ws.send(message + " not available!");
        }

    });

    // Define handling of receipt of message on
    // Redis channel.
    subscriber.on('message', function (channel, message) {
        console.log("Message from redis: ", message, " on channel: ", channel, " of type: ", typeof(message));
        ws.send("Message received from redis: " + message + " on channel: " + channel);
    });

    // Verify connection with immediate response to 
    // speaker.
    ws.send("Websocket connection established.");

});

// Check each Websockets client connections to see if it is 
// still alive. If not, terminate the websocket.
var clientCheck = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive == false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping((err) => {Error(err)});
    });
}, 1000);

// Start HTTP server on either port 8080 or the port specified
// by the environment variable PORT
server.listen(process.env.PORT || 8080, function () {
    console.log("Server started on port " + server.address().port);
});
