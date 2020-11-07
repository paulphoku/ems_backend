//Author paulphoku
//Restful apis by NodeJs
//created on 30-03-2020


var crypto = require('crypto');
var uuid = require('uuid');
var express = require('express');
var bodyParser = require('body-parser');
const cors = require('cors');
const OneSignal = require('onesignal-node');

const client = new OneSignal.Client('e9bca909-a3dc-446f-a0bd-e02184daa9cb', 'YjBmZjllZTAtNDQ2Ni00MTNlLTk1NzktNjU0MGJmMDA1OGEy');



//Defining the PORT
const port = process.env.PORT || 8080;

//Connect to Mysql
const db = require('./config/connection');
const { json } = require('body-parser');

//PASSWORD UTIL
var getRandomString = function (length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') //convert to hexa format
        .slice(0, length); //return requred number of charecters
};
var sha512 = function (password, salt) {
    var hash = crypto.createHmac('sha512', salt); //Use SHA512
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value
    };
};
function saltHashPassword(userPassword) {
    var salt = getRandomString(16); //Generate Randon String
    var passwordData = sha512(userPassword, salt);
    return passwordData;
};
function checkHashPassword(userPassword, salt) {
    var passwordData = sha512(userPassword, salt);
    return passwordData;
}
//END PASSWORD UTIL

function sendNotification(message) {
    const notification = {
        contents: {
            'tr': 'Yeni bildirim',
            'en': message,
        },
        included_segments: ['Subscribed Users'],
    };

    // or you can use promise style:
    client.createNotification(notification)
        .then(response => {
            console.log(response.body);
            if (response.body.id.length > 1) {
                return true;
            } else {
                return false
            }
        })
        .catch(e => {
            console.log(e)
            return false
        });
}


const app = express();
//middleware
app.use(bodyParser.json()); //Accespt json params
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

//Register
app.post('/register/', (req, res, next) => {
    var post_data = req.body; //get post params

    var uid = uuid.v4();
    var plaint_password = post_data.password;
    var hash_data = saltHashPassword(plaint_password);
    var password = hash_data.passwordHash;
    var salt = hash_data.salt; //get salt

    var fname = post_data.fname;
    var lname = post_data.lname;
    var email = post_data.email;

    db.query('SELECT * FROM user WHERE usr_email=?', [email], function (err, results, fields) {
        if (err) {
            console.log('MySQL ERROR', err);
        }

        if (results && results.length) {
            res.send({ msg: 'User already exists!!!' });
            console.log('User already exists!!!');
        } else {
            db.query('INSERT INTO `user`(`usr_unique_id`, `usr_salt`, `usr_created_at`, `usr_updated_at`, `usr_fname`, `usr_lname`, `usr_email`, `usr_encrypted_password`, usr_role) VALUES (?,?,NOW(),NOW(),?,?,?,?, "normal")',
                [uid, salt, fname, lname, email, password], function (err, rows, fields) {
                    if (err) {
                        console.log('MySQL ERROR', err);
                        res.send({ msg: "Could not register user", status: 1 });
                    } else {
                        res.send({ msg: "Done", status: 0, rows: rows.length, data: rows });
                    }
                });
        }
    });
})

app.post('/login', (req, res, next) => {

    var post_data = req.body;

    //Extract email and password from request
    var user_password = post_data.password;
    var email = post_data.email;

    db.query('Select * From user Where usr_email=?', [email], function (error, rows, fields) {

        if (rows[0] && rows[0].usr_salt) {
            var salt = rows[0].usr_salt;//Getsalt from database
            var encrypted_password = rows[0].usr_encrypted_password;
            //hash password from login
            var hashed_password = checkHashPassword(user_password, salt).passwordHash;
            if (encrypted_password == hashed_password) {
                res.send({ msg: "Done", status: 0, rows: rows.length, data: rows });
            } else {
                res.send({ msg: "Wrong password", status: 1 });
            }
        } else {
            res.send({ msg: "user not exist!!!", status: 2 });
        }
    });
});

//get user
app.get('/getUser/:user_id', (req, res, next) => {

    let user_id = req.params.user_id;

    db.query('SELECT * FROM user WHERE usr_unique_id=?', [user_id], function (error, result, fields) {
        if (result) {
            res.send({ status: 0, msg: 'done', data: result });
        } else {
            res.send({ msg: 'Something went wrong', status: 1 });
        }
    });
});

//Get Balance
app.get('/balance/:user_id', (req, res, next) => {

    let user_id = req.params.user_id;

    db.query('SELECT * FROM transactions WHERE user_id=' + user_id, function (error, result, fields) {

        if (result < 1) {
            res.send({
                result: 'No Transactions yet',
                code: 204
            });
        } else {
            db.query('SELECT SUM(t_amt) as bal FROM transactions', function (err, Res) {
                res.send({
                    result: Res[0].bal,
                    code: 200
                });
            });
        }
    });

});

//test
app.get('/test', (req, res, next) => {
    db.query('Select * From user', function (error, result, fields) {
        res.send({ msg: 'Done', status: 0, data: result });
    });
});

//RUpdate User
app.post('/update_user/', (req, res, next) => {
    var post_data = req.body; //get post params


    var uuid = post_data.uuid;
    var fname = post_data.fname;
    var lname = post_data.lname;
    var email = post_data.email;
    var date = '';

    db.query('UPDATE `user` SET `usr_updated_at`=NOW(),`usr_fname`=?,`usr_lname`=? WHERE `usr_unique_id`=?', [fname, lname, uuid], function (err, results, fields) {
        if (err) {
            console.log('MySQL ERROR', err);
        }
        res.send({ msg: 'done', status: 0 });
    });
})

//Create report
app.post('/add_report/', (req, res, next) => {
    var post_data = req.body; //get post params

    var train = post_data.train;
    var type = post_data.type;
    var title = post_data.title;
    var message = post_data.message;

    db.query('INSERT INTO `report` (train, type, title, message, created_at) VALUES ( ?, ?, ?, ?, NOW())', [train, type, title, message], function (err, results, fields) {
        if (err) {
            console.log('MySQL ERROR', err);
        }
        res.send({ msg: 'done', status: 0 });
    });
})

//get all updates
app.post('/get_all_updates/', (req, res, next) => {
    var searchText = req.body.searchText;
    db.query("SELECT * FROM `notifications` WHERE title LIKE '%"+searchText+"%' OR msg LIKE '%"+searchText+"%' OR  created_at LIKE '%"+searchText+"%' ORDER BY created_at DESC", function (err, results, fields) {
        if (err) {
            console.log('MySQL ERROR', err);
        }
        res.send({ msg: 'done', status: 0 , data: results});
    });
})

//get all reports
app.post('/get_all_reports', (req, res, next) => {
    var searchText = req.body.searchText;
    db.query("SELECT * FROM `report` WHERE title LIKE '%"+searchText+"%' OR message LIKE '%"+searchText+"%' OR train LIKE '%"+searchText+"%' OR created_at LIKE '%"+searchText+"%' ORDER BY created_at DESC", function (err, results, fields) {
        if (err) {
            console.log('MySQL ERROR', err);
        }
        res.send({ msg: 'done', status: 0 , data: results});
    });
})

//Create updates
app.post('/send_updates/', (req, res, next) => {
    var post_data = req.body; //get post params

    var title = post_data.title;
    var message = post_data.message;
    var link = post_data.link;
    var priority = post_data.priority;

    var img = '';


    if (true) {
        db.query('INSERT INTO `notifications` (created_at, title, msg, img, link, priority) VALUES (NOW(), ?, ?, ?, ?, ?)', [ title, message, img, link, priority], function (err, results, fields) {
            if (err) {
                console.log('MySQL ERROR', err);
            }
            sendNotification(message)
            res.send({ msg: 'done', status: 0 });
        });
    }
})

//Get Transactions
app.get('/transaction/:user_id', (req, res, next) => {

    let user_id = req.params.user_id;

    query = "SELECT t.t_id, t.usr_id , DATE_FORMAT(t.t_date, '%d') as t_day, DATE_FORMAT(t.t_date, '%b') as t_month, t_desc, t_amt , tt.tt_desc, t_bal FROM transactions t, trans_type tt     WHERE t.t_type = tt.tt_id AND t.usr_id='" + user_id + "'";
    db.query(query, function (error, result, fields) {

        if (result < 1) {
            res.send({
                result: 'No Transactions yet',
                code: 204
            });
        } else {
            res.send({
                result: result,
                code: 200
            });
        }
    });
});

app.post('/transaction/', (req, res, next) => {
    var post_data = req.body; //get post params

    usr_id = post_data.usr_id;
    t_desc = post_data.t_desc;
    t_amt = post_data.t_amt;
    t_bal = post_data.t_bal;
    t_type = post_data.t_type;

    db.query('INSERT INTO `transactions`(`usr_id`, `t_type`, `t_desc`, `t_date`, `t_amt`, `t_bal`) VALUES (?,?,?,NOW(),?,?)',
        [usr_id, t_type, t_desc, t_amt, t_bal], function (err, result, fields) {
            if (err) {
                console.log('MySQL ERROR', err);
                res.status(200);
            } else {
                res.send({ msg: 'Transaction sucessful', data: result, status: 0 })
            }
        });

})

//start server
app.listen(port, () => {
    console.log('Server started on Port: ', port);
});

