const mysql = require('mysql');
// const express = require('express');
// const bodyParser = require('body-parser');

const db = mysql.createConnection({
    //hosted db
    host: 'bo1nmv2ew69eo0xxnbcs-mysql.services.clever-cloud.com',
    user: 'us0p8xdgwfdp0hao',
    password: '5ax8TJIiDoXJMLSz5qKq',
    database: 'bo1nmv2ew69eo0xxnbcs'

    //hosted db
    // host: 'localhost',
    // user: 'root',
    // password: '',
    // database: 'ems_db'
});


function handleDisconnect() {
    // the old one cannot be reused.

    db.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }else{
            console.log('Connected to database')
        }                                    // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    db.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();

module.exports = db;
