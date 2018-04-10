// Unit testing for websockets application

var chai = require('chai');
var expect = require('chai').expect;
var wsclient = require('websocket').client;
var rdb = require('rethinkdb');

chai.use(require('chai-http'));

var app = require('../src/server.js');

var connection = null;
var rdbconn = null;
var testws = null;

describe('', function () {

    this.timeout(5000);

    before(function (done) {
        testws = new wsclient();
        rdb.connect( {host: 'localhost', port: 28015}, function(err, conn) {
            if (err) throw err;
            rdbconn = conn;
            rdb.db('test').tableList().run(rdbconn, function (err, result) {
                if (err) throw err;
                if (result[0] != 'messages') {
                    rdb.db('test').tableCreate('messages').run(rdbconn, function (err, result) {
                        if (err) throw err;
                        done();
                    });
                } else {
                    done();
                }
            });
        });
    });

    after(function(done) {
        /*rdb.db('test').tableDrop('messages').run(rdbconn, function (err, result) {
            if (err) throw err;
            done();
        });*/
        done();
    });

    it('should return index page', function () {
        return chai.request(app)
            .get('/')
            .then(function(res) {
                expect(res).to.have.status(200);
                expect(res).to.be.html;
            })
    });

    it('should confirm Websockets connection', function (done) {
        testws.on('connect', function (conn) {
            if (conn.connected) {
                connection = conn;
                connection.once('message', function (message) {
                    expect(typeof(message.utf8Data)).to.equal('string');
                    expect(message.utf8Data).equal("Websocket connection established.");
                    done();
                });
            }
        });
        testws.connect('ws://localhost:8080/monitor');
    });

    it('should confirm Rethinkdb connection', function (done) {
        if (connection.connected) {
            connection.once('message', function (message) {
                expect(typeof(message.utf8Data)).to.equal('string');
                expect(message.utf8Data).equal("Waiting for changes to RethinkDB table 'test'");
                done();
            });
            connection.send('rethinkdb');
        }
    });

    it('should push database updates to client', function (done) {
        if (connection.connected) {
            connection.once('message', function (message) {
                expect(typeof(JSON.parse(message.utf8Data))).to.equal('object');
                data = JSON.parse(message.utf8Data)
                expect(data.new_val.messagetype).to.equal("test message");
                expect(data.new_val.data).to.equal("test string data");
                done();
            });
        }
        rdb.db('test').table('messages').insert(
            {
                "messagetype": "test message",
                "data": "test string data"
            }
        ).run(rdbconn, function (err, result) {
            if (err) throw err;
        });
    });

})