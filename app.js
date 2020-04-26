//Author paulphoku
//Restful apis by NodeJs
//created on 30-03-2020


var crypto = require('crypto');
var uuid = require('uuid');
var express = require('express');
var bodyParser = require('body-parser');

//Defining the PORT
const port = process.env.PORT || 4000;

//Connect to Mysql
const db = require('./config/connection');

//PASSWORD UTIL
var getRandomString = function(length){
    return crypto.randomBytes(Math.ceil(length/2))
    .toString('hex') //convert to hexa format
    .slice(0,length); //return requred number of charecters
};
var sha512 = function (password,salt) {
    var hash = crypto.createHmac('sha512',salt); //Use SHA512
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt:salt,
        passwordHash:value
    };
};
function saltHashPassword(userPassword) {
    var salt = getRandomString(16); //Generate Randon String
    var passwordData = sha512(userPassword,salt);
    return passwordData;
};
function checkHashPassword(userPassword, salt){
    var passwordData = sha512(userPassword, salt);
    return passwordData; 
}
//END PASSWORD UTIL



const app = express();
//middleware
app.use(bodyParser.json()); //Accespt json params
app.use(bodyParser.urlencoded({extended:true}));

//test password encryption
// app.get("/",(req,res,next)=>{
//     console.log('Password : 123456');
//     var encrypt = saltHashPassword("123456");
//     console.log('Encrypt: ' +encrypt.passwordHash);
//     console.log('Salt: ' +encrypt.salt);
// });

//Register
app.post('/register/',(req,res,next)=>{
    var post_data = req.body; //get post params
    
    var uid = uuid.v4();
    var plaint_password = post_data.password;
    var hash_data = saltHashPassword(plaint_password);
    var password = hash_data.passwordHash;
    var salt = hash_data.salt; //get salt

    var fname = post_data.fname;
    var lname = post_data.lname;
    var email = post_data.email;

    db.query('SELECT * FROM user WHERE usr_email=?', [email], function(err, results,fields){
        if(err){
            console.log('MySQL ERROR', err);
        }

        if(results && results.length){
            res.json('User already exists!!!');
            console.log('User already exists!!!');
        }else{
            db.query('INSERT INTO `user`(`usr_unique_id`, `usr_salt`, `usr_created_at`, `usr_updated_at`, `usr_fname`, `usr_lname`, `usr_email`, `usr_encrypted_password`) VALUES (?,?,NOW(),NOW(),?,?,?,?)',
            [uid, salt,fname, lname, email, password],function(err, result, fields) {
                if(err){
                    console.log('MySQL ERROR', err);
                    res.json('Register error: ',err);
                }
                res.json('Register sucessful');
                console.log('Register sucessful');
                res.json(result);
            });
        }
    });
})

app.post('/login',(req, res, next) =>{

    var post_data = req.body;

    //Extract email and password from request
    var user_password = post_data.password;
    var email = post_data.email;

    db.query('Select * From user Where usr_email=?', [email],function(error, result, fields){
        db.on('error', function(err){
            console.log('MySQL ERROR',err);
            res.json('Login Error');
        });

        if (result && result[0].usr_salt) {
            var salt = result[0].usr_salt;//Getsalt from database
            var encrypted_password = result[0].usr_encrypted_password;
            //hash password from login
            var hashed_password = checkHashPassword(user_password, salt).passwordHash;
            if (encrypted_password == hashed_password) {
                res.end(JSON.stringify(result[0]));
            }else{
                res.end(JSON.stringify('Wrong password'));
            }
        }else{
            res.json('user not exist!!!');
        }
    });
});

app.get('/test',(req, res, next) =>{

    db.query('Select * From user',function(error, result, fields){
        db.on('error', function(err){
            console.log('MySQL ERROR',err);
            res.json('Login Error');
        });

        res.end(JSON.stringify(result[0]));
        
    });
});

//start server
app.listen(port, () => {
    console.log('Server started on Port: ', port);
});

