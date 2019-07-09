const express = require("express");
const sql = require("sync-mysql");
const path = require("path");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const htmlEntities = require("html-entities").XmlEntities;

const statusCodes = {
    BadRequest: 400,
    Ok: 200
};

var app = new express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, "public")));

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
})

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
    result = sqlConnection.query(`SELECT username FROM tokens WHERE token = ${token};`);
    if (result.length > 0) return result[0].username;
    return false;
}