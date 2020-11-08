//Author paulphoku
//Restful apis by NodeJs
//created on 30-03-2020


var crypto = require('crypto');
var uuid = require('uuid');
var express = require('express');
var bodyParser = require('body-parser');
const cors = require('cors');
const OneSignal = require('onesignal-node');
"use strict";
const nodemailer = require("nodemailer");
const Twilio = require("twilio");


const client = new OneSignal.Client('e9bca909-a3dc-446f-a0bd-e02184daa9cb', 'YjBmZjllZTAtNDQ2Ni00MTNlLTk1NzktNjU0MGJmMDA1OGEy');

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    auth: {
        user: 'erms2020@outlook.com',
        pass: 'admin@erms'
    },
    tls: true,
});

function sendSMS(tel, message) {
    // getting ready
    const twilioNumber = '+12029183159';
    const accountSid = 'ACb43150568429fac3440ea1cc0c177e9a';
    const authToken = 'f84be7757da7a7889c29753433469ae2';
    const client = Twilio(accountSid, authToken);

    // start sending message
    const phoneNumbers = [tel];

    phoneNumbers.map(phoneNumber => {

        if (!validE164(phoneNumber)) {
            throw new Error('number must be E164 format!');
        }

        const textContent = {
            body: message,
            to: phoneNumber,
            from: twilioNumber
        }
        client.messages.create(textContent)
            .then((message) => console.log(message.to))
    })
}

// Validate E164 format
function validE164(num) {
    return /^\+?[1-9]\d{1,14}$/.test(num)
}

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

async function resetPass(email, password, res) {
    try {
        // send mail with defined transport object
        let info = await transporter.sendMail({
            from: '"ERMS" <erms2020@outlook.com>', // sender address
            to: email, // list of receivers
            subject: "Forgot Password ✔", // Subject line
            text: "", // plain text body
            html: "<b>Your password has been reseted here is your new password:</b>"
                + "<br><h1>" + password + "</h1>"
                + "<br><br> <p>login to the application using the new passsword and head to profile to add your own unique password!</p>"
                + "<br><p>kind Regards</><br><p>Air Food ✈️", // html body
        });

        console.log(password);

        console.log("Message sent: %s", info.messageId);
        if (info.messageId) {
            res.send({ msg: "Done", status: 0 });
        } else {

        }
    } catch (err) {
        console.log(err);
        res.send({ msg: 'Something went wrong', status: 2 });
    }
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

        if (!result) {
            res.send({
                result: 0,
                code: 200
            });
        } else {
            db.query('SELECT SUM(t_amt) as bal FROM transactions where user_id =' + user_id, function (err, Res) {
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

//Update User
app.post('/update_user/', (req, res, next) => {
    var post_data = req.body; //get post params


    var uuid = post_data.uuid;
    var fname = post_data.fname;
    var lname = post_data.lname;
    var email = post_data.email;
    var cell = post_data.cell;
    var date = '';


    db.query("UPDATE `user` SET `usr_updated_at`=NOW(),`usr_fname`=?,`usr_lname`=? , `usr_cell`=? WHERE `usr_unique_id`=?", [fname, lname, cell, uuid], function (err, results, fields) {
        if (err) {
            console.log('MySQL ERROR', err);
        } else {
            console.log(results);

            res.send({ msg: 'done', status: 0 });
        }
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
    db.query("SELECT * FROM `notifications` WHERE title LIKE '%" + searchText + "%' OR msg LIKE '%" + searchText + "%' OR  created_at LIKE '%" + searchText + "%' ORDER BY created_at DESC", function (err, results, fields) {
        if (err) {
            console.log('MySQL ERROR', err);
        }
        res.send({ msg: 'done', status: 0, data: results });
    });
})

//get all reports
app.post('/get_all_reports', (req, res, next) => {
    var searchText = req.body.searchText;
    db.query("SELECT * FROM `report` WHERE title LIKE '%" + searchText + "%' OR message LIKE '%" + searchText + "%' OR train LIKE '%" + searchText + "%' OR created_at LIKE '%" + searchText + "%' ORDER BY created_at DESC", function (err, results, fields) {
        if (err) {
            console.log('MySQL ERROR', err);
        }
        res.send({ msg: 'done', status: 0, data: results });
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
        db.query('INSERT INTO `notifications` (created_at, title, msg, img, link, priority) VALUES (NOW(), ?, ?, ?, ?, ?)', [title, message, img, link, priority], function (err, results, fields) {
            if (err) {
                console.log('MySQL ERROR', err);
            }
            sendNotification(message);
            db.query('SELECT usr_cell FROM `user`', [], function (err, rows, fields) {
                if (err) {
                    console.log('MySQL ERROR', err);
                }
                for (let index = 0; index < rows.length; index++) {
                    if (rows[index].usr_cell != '') {
                        sendSMS('+27'+(rows[index].usr_cell).substr(1,9), message);
                    }
                }
            });

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

//reset password
app.get('/resetPassword/:email', (req, res, next) => {
    var email = req.params.email;
    var plaint_password = uuid.v4().substr(0, 8);
    plaint_password = plaint_password.toUpperCase();
    var hash_data = saltHashPassword(plaint_password);
    var password = hash_data.passwordHash;
    var salt = hash_data.salt; //get salt

    db.query("UPDATE `user` SET `usr_salt`=?,`usr_encrypted_password`=? WHERE usr_email = ?",
        [salt, password, email], function (err, rows, fields) {
            if (err) {
                console.log('MySQL ERROR', err);
                res.send({ msg: "Could not change password", status: 1 });
            } else if (rows.changedRows > 0) {
                resetPass(email, plaint_password, res);
            } else {
                res.send({ msg: "Invalid email recieved or email not registered", status: 1, data: rows });
            }
        }
    );
})

//update password
app.post('/update_password', (req, res, next) => {
    var uuid = req.body.uuid;
    var plaint_password = req.body.password;
    var hash_data = saltHashPassword(plaint_password);
    var password = hash_data.passwordHash;
    var salt = hash_data.salt; //get salt

    try {
        db.query("UPDATE `user` SET `usr_salt`=?,`usr_encrypted_password`=? WHERE usr_unique_id = ?",
            [salt, password, uuid], function (err, rows, fields) {
                if (err) {
                    //console.log('MySQL ERROR', err);
                    res.send({ msg: "Could not change password", status: 1 });
                } else if (rows.changedRows > 0) {
                    res.send({ msg: "Done", status: 0, rows: rows.length, data: rows });
                } else {
                    res.send({ msg: "Could not change password", status: 1, data: rows });
                }
            }
        );
    } catch (err) {
        res.send({ msg: 'Something went wrong', status: 2 });
    }
})

//delete user
app.post('/delete_user', (req, res, next) => {
    var uid = req.body.uuid;
    try {
        db.query("DELETE FROM `user` WHERE `user`.`usr_unique_id` = ?", [uid], function (err, rows, fields) {
            if (err) {
                console.log('MySQL ERROR', err);
            }

            if (rows.affectedRows) {
                res.send({ msg: "Done", status: 0 });
            } else {
                res.send({ msg: "Could not delete user", status: 1, });
            }
        }
        );
    } catch (err) {
        res.send({ msg: 'Something went wrong', status: 2 });
    }
})

//get all users
app.post('/get_all_users', (req, res, next) => {
    var searchText = req.body.searchText;
    try {
        db.query("SELECT * FROM user WHERE usr_email LIKE '%" + searchText + "%' OR usr_created_at LIKE '%" + searchText + "%' OR usr_role LIKE '%" + searchText + "%' ORDER BY usr_created_at DESC", [], function (err, rows, fields) {
            if (err) {
                console.log('MySQL ERROR', err);
            }

            if (rows) {
                res.send({ msg: "Done", data: rows, status: 0 });
            } else {
                res.send({ msg: "Could not get all users", status: 1, });
            }
        }
        );
    } catch (err) {
        res.send({ msg: 'Something went wrong', status: 2 });
        console.log(err)
    }
})

//register as
app.post('/register_admin', (req, res, next) => {
    var uuid = req.body.uuid;
    var ur = req.body.ur;
    try {
        db.query("UPDATE `user` SET `usr_role`='" + ur + "' WHERE uuid = ?",
            [uuid], function (err, rows, fields) {
                if (rows) {
                    res.send({ status: 0, msg: 'done', data: rows });
                } else {
                    console.log(err);
                    res.send({ msg: "Something went wrong", status: 1 });
                }
            }
        );
    } catch (err) {
        res.send({ msg: 'Something went wrong', status: 2 });
    }
})


//start server
app.listen(port, () => {
    console.log('Server started on Port: ', port);
});