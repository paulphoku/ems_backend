const mysql = require('mysql');
// const express = require('express');
// const bodyParser = require('body-parser');


//- Connection configuration
var db_config = {
    host: 'bo1nmv2ew69eo0xxnbcs-mysql.services.clever-cloud.com',
    user: 'us0p8xdgwfdp0hao',
    password: '5ax8TJIiDoXJMLSz5qKq',
    database: 'bo1nmv2ew69eo0xxnbcs'
};


//- Create the connection variable
var db = mysql.createConnection(db_config);



module.exports = db;
