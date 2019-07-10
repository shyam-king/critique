const express = require("express");
const sql = require("sync-mysql");
const path = require("path");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const htmlEntities = require("html-entities").XmlEntities;
const multer = require("multer");
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname)
    }
});
var upload = multer({storage: storage});
   

const statusCodes = {
    BadRequest: 400,
    Ok: 200
};

var app = new express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: true}));

var sqlConnection;

app.post("/newuser", (req, res)=>{
    if (!req.body.username || !req.body.password) {
        res.status(statusCodes.BadRequest).send({message: ["Require both username and password."]});
    }
    else {
        let errors = [];
        let username = req.body.username;
        let password = req.body.password;

        errors = checkGoodUsername(username);
        errors = errors.concat(checkGoodPassword(password));

        username = htmlEntities.encode(req.body.username);
        password = htmlEntities.encode(req.body.password);

        if (errors.length > 0) {
            res.status(statusCodes.BadRequest).send({message: errors});
        }
        else {
            let result;
            result = sqlConnection.query(`SELECT * FROM users WHERE username = '${username}';`);
            if (result.length > 0) {
                res.status(statusCodes.BadRequest).send({message: ["The user already exists!"], status: "exists"});
            }
            else {
                let crypt = new crypto.createHmac("sha256", password);
                password = crypt.digest("base64");
                result = sqlConnection.query(`INSERT INTO users (username, password) values ('${username}', '${password}');`);
                sqlConnection.query(`CREATE TABLE user${result.insertId}_showstatus(id varchar(20), status json );`);
                sqlConnection.query(`CREATE TABLE user${result.insertId}_activities(time timestamp, activity text);`);
                sqlConnection.query(`INSERT INTO user${result.insertId}_activities(activity) VALUES ("Joined Critique.")`);
                sqlConnection.query(`CREATE TABLE user${result.insertId}_profile(field varchar(20), content text, tag char(10) default 'none');`);
                sqlConnection.query(`INSERT INTO user${result.insertId}_profile(field, content, tag) VALUES ('username', '${username}', 'username')`);
                res.status(statusCodes.Ok).send({message: "The user has been added!", status: "added"});
            }
        }
    }
});

app.post("/login", (req,res)=>{
    let username = req.body.username;
    let password = req.body.password;

    if (!username || !password) {
        res.status(statusCodes.BadRequest).send({message: ["Require both username and password!"]});
    }
    else {
        username = htmlEntities.encode(username);
        password = htmlEntities.encode(password);

        let c = crypto.createHmac("sha256", password);
        password = c.digest("base64");

        let result;

        result = sqlConnection.query(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}';`);
        if (result.length > 0) {
            result = sqlConnection.query(
                `INSERT INTO tokens (username, expiry) VALUES ('${username}', DATE_ADD(NOW(), INTERVAL 1 DAY));`
            );
            res.cookie("token", result.insertId);
            res.status(statusCodes.Ok).send({message: ["successs"], token: result.insertId});
        }
        else {
            res.status(statusCodes.BadRequest).send({message: ["The username and password do not match."]});
        }
    }
});

app.post("/verifyToken", (req,res)=>{
    let token = req.cookies.token;
    if (!token) {
        res.status(statusCodes.BadRequest).send();
    }
    else {
        if (verifyToken(token)) {
            res.status(statusCodes.Ok).send({message: "verified!"});
        }
    }
});

app.get("/topMovies", (req,res)=>{
    let result = sqlConnection.query(`SELECT id FROM imdbtop;`);
    let ids = [];
    for (let i = 0; i < result.length;i ++) {
        ids.push(result[i].id);
    }
    res.status(200).send(ids);
});

app.get("/status/:id/:key", (req, res)=>{
    let id = req.params.id;
    let key = req.params.key;

    //prevent sql injections
    id = htmlEntities.encode(id);
    key = htmlEntities.encode(key);

    let result;
    let username = verifyToken(req.cookies.token);
    if (!username) {
        res.status(statusCodes.BadRequest).send({message: "Token could not be verified. Kindly relogin."});
    }
    else {
        result = sqlConnection.query(`SELECT id FROM users WHERE username='${username}';`);
        let userid = result[0].id;
        result = sqlConnection.query(`SELECT status->>'$.${key}' FROM user${userid}_showstatus where id = '${id}';`);
        if (result.length > 0) 
            res.status(statusCodes.Ok).send(result[0][`status->>'$.${key}'`]);
        else
            res.status(statusCodes.BadRequest).send({message: "no such key!"});
            
    }
});

app.get("/status/:id", (req, res)=>{
    let id = req.params.id;

    //prevent sql injections
    id = htmlEntities.encode(id);

    let result;
    
    let username = verifyToken(req.cookies.token);
    if (!username) {
        res.status(statusCodes.BadRequest).send({message: "Token could not be verified. Kindly relogin."});
    }
    else {
        result = sqlConnection.query(`SELECT id FROM users WHERE username='${username}';`);
        let userid = result[0].id;
        result = sqlConnection.query(`SELECT status FROM user${userid}_showstatus WHERE id='${id}';`);
        if (result.length > 0)
                res.status(statusCodes.Ok).send(result[0].status);
        else
            res.status(statusCodes.BadRequest).send({message: "no such record"});
    }
});

app.post("/status/:id/:key", (req,res)=>{
    let id = req.params.id;
    let key = req.params.key;
    let value = req.body.value;

    //prevent sql injection
    id = htmlEntities.encode(id);
    key = htmlEntities.encode(key);
    value = htmlEntities.encode(value);

    let token = req.cookies.token;

    let username = verifyToken(token);
    let userid, result;

    if (!username) {
        res.status(statusCodes.BadRequest).send({message: "Could not verify token. Please log in to your account."});
    }
    else {
        result = sqlConnection.query(`SELECT id FROM users WHERE username = '${username}'`);
        userid = result[0].id;

        result = sqlConnection.query(`SELECT * FROM user${userid}_showstatus WHERE id = '${id}'`);
        if (result.length == 0) {
            sqlConnection.query(`INSERT INTO user${userid}_showstatus(id, status) VALUES ('${id}', '{}')`);
        }

        result = sqlConnection.query(`UPDATE user${userid}_showstatus SET status = JSON_SET(status, '$.${key}', '${value}') WHERE id = '${id}'`);
        res.status(statusCodes.Ok).send();
    }
});

app.post("/activity", (req,res)=>{
    let content = req.body.content;
    if (!content) {
        res.status(statusCodes.BadRequest).send({message: "Received empty activity"});
    }
    else {
        content = htmlEntities.encode(content);

        let token = req.cookies.token;
        let username = verifyToken(token);

        if (!username) {
            res.status(statusCodes.BadRequest).send({message: "Could not verify token. Please log in again!"});
        }
        else {
            let userid;
            let result = sqlConnection.query(`SELECT id FROM users where username  = '${username}';`);
            userid = result[0].id;

            sqlConnection.query(`INSERT INTO user${userid}_activities(activity) VALUES ("${content}");`);
            res.status(statusCodes.Ok).send();
        }
    }
});

app.get("/profile", (req,res)=>{
    let token = req.cookies.token;
    let username = verifyToken(token);

    if (!username) {
        res.status(statusCodes.BadRequest).send({message: "Please log in!"});
    }
    else {
        let result, userid;
        result = sqlConnection.query(`SELECT id FROM users WHERE username = '${username}';`);
        userid = result[0].id;

        result = sqlConnection.query(`SELECT * FROM user${userid}_profile;`);
        res.status(statusCodes.Ok).send(result);
    }
});

app.get("/activity", (req,res)=>{
    let token = req.cookies.token;
    let username = verifyToken(token);

    if (!username){
        res.status(statusCodes.BadRequest).send({message: "Please login"});
    }
    else {
        let result, userid;
        result = sqlConnection.query(`SELECT id from users where username = '${username}'`);
        userid = result[0].id;

        result = sqlConnection.query(`SELECT activity FROM user${userid}_activities ORDER BY time desc;`);
        res.status(statusCodes.Ok).send(result);
    }
})

app.post("/updateProfile", (req, res)=>{
    let profile = req.body.profile;
    let token = req.cookies.token;

    let username = verifyToken(token);

    if (!username)
        res.status(statusCodes.BadRequest).send({message: "Please login"});
    else {
        let result, userid;
        result = sqlConnection.query(`SELECT id from users where username = '${username}'`);
        userid = result[0].id;

        profile.forEach(element => {
            element.field = htmlEntities.encode(element.field.toLowerCase());
            element.content = htmlEntities.encode(element.content);
            result = sqlConnection.query(`SELECT * FROM user${userid}_profile WHERE field = '${element.field}'`);
            if (result.length > 0) {
                if (element.content == "") {
                    sqlConnection.query(`DELETE FROM user${userid}_profile where field = '${element.field}'`);
                }
                else {
                    sqlConnection.query(`UPDATE user${userid}_profile SET content = '${element.content}' WHERE field = '${element.field}';`);
                }
            }
            else {
                if (element.content != "")
                    sqlConnection.query(`INSERT INTO user${userid}_profile(field, content) VALUES ('${element.field}', '${element.content}')`);
            }
        });
        sqlConnection.query(`INSERT INTO user${userid}_activities(activity) VALUES ("Updated profile.");`);
        res.status(statusCodes.Ok).send();
    }
});

app.post("/updateProfilePic", upload.single("profilepic"), (req,res)=>{
    console.log(req.file);
    res.send("OK");
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(3000, function(){
    sqlConnection = new sql({
        user: "spider",
        password: "spider",
        host: "localhost",
        database:"spiderCritique"
    });

    console.log("Listening @ port: 3000");
});

function checkGoodPassword(password) {
    let errors = [];

    if (password.length < 8) errors.push("The password must be at least 8 characters long.");
    if (password.search(/[A-Z]/) < 0) errors.push("The password must contain at least one uppercase character.");
    if (password.search(/[0-9]/) < 0) errors.push("The password must contain at least one digit.");
    if (password.search(/[^\w]/) < 0) errors.push("The password must have at least one special character.");
 
    return errors;
}

function checkGoodUsername(username) {
    let errors = [];
    
    if (username.length < 8) errors.push("The username must be at least 8 characters long.");

    return errors;
}

function verifyToken(token) {
    let result;
    sqlConnection.query("DELETE FROM tokens WHERE expiry < NOW();");
    if (!token)
        return false;
    result = sqlConnection.query(`SELECT username FROM tokens WHERE token = '${token}';`);
    if (result.length > 0) return result[0].username;
    return false;
}