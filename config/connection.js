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

db.connect(function(error,res){
    if (!!error) {
        // console.log(error);
       res.json({
           code : 100,
           status : "Error in connection database: " + error
        });
		// return;
    } else {
        console.log('Connected to the database');
        // res.json({
        //     code : 200, 
        //     status : "Connected to the database:"
        //  });
    }
});


module.exports=db;
