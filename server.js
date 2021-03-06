// setup a basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mongoose = require('mongoose');
var crypto = require('crypto');
var db = mongoose.connection;
var MONGOHQ_URL="mongodb://kuragari:12345@oceanic.mongohq.com:10095/users"
var fs = require('fs');

var sanitizer = require('sanitizer');
var validator = require('validator');

var port = process.env.PORT || 31337;

var morgan	= require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

app.use(function(req,res,next){
    req.db = db;
    next();
});



server.listen(port,function(){
	console.log('Server listening at port %d', port);
});

mongoose.connect(MONGOHQ_URL);

fs.readdirSync(__dirname + '/models').forEach(function(filename){
if(~filename.indexOf('.js')) require(__dirname + '/models/' + filename);
});

//getting this to work, user.js is not working so im not sure what to do here
var Schema = mongoose.Schema;

var usersSchema = new Schema({
	username: String,
	password: String,
	email: String
});
var userList = mongoose.model('users',usersSchema);


app.get('/users',function(req,res){
	mongoose.model('users').find(function(err,users){
		res.send(users);
	});
});

//set the static files location /public
app.use(express.static(__dirname + '/public')); 
//log every request to the console
app.use(morgan('dev'));
//pull information from html in POST
app.use(bodyParser());
// simulate DELETE and PUT
app.use(methodOverride());


var usernames = ['admin']; //block the admin username (you can disable it)
var numUsers = 0;

io.on('connection', function(socket){
	 var addedUser = false;
	 
	 //when the client emits 'new message', this listens and executes
	 socket.on('new message', function(data){
	 	//tell the client to execute 'new message'
	 	socket.broadcast.emit('new message',{
	 		username: socket.username,
	 		message: data
	 	});
	 });

	 socket.on('user check', function(user) {
	 	console.log('user ' + user);

	 	userList.findOne({username: user}, function(err,userExists){
	 	 if(userExists){
	 	 		socket.emit('user valid')
	 			console.log('userExists');
	 		}
	 		else {
	 			console.log('user not found');
	 			socket.emit('user invalid');
	 		}
	 	});
	});
	 socket.on('register user', function(user,pass1,pass2,email) {
	 	var passMatch = (pass1 === pass2);
	 	var emailValid = validator.isEmail(email);
	 	if(passMatch && emailValid)
	 	{
	 		var passhash = crypto.createHash('md5').update(pass1).digest('hex');
	 		var user_data =
	 		{
	 			username: user,
	 			password: passhash,
	 			email: email
	 		}
	 	console.log('registering');
	 	var newUser = new userList(user_data);
	 	console.log(newUser);
	 	newUser.save( function(err){
    		if(err){
    			console.log('error');
        		console.log(err);
        	}
		});
	 	socket.emit('registration complete');
	 	}
	 	else if(emailValid)
	 	{
	 		console.log('passwords dont match');
	 		socket.emit('password mismatch');
	 	}
	 	else if(passMatch)
	 	{
	 		console.log('email not valid');
	 		socket.emit('email invalid');
	 	}
	 	else
	 	{
	 		console.log('email not valid');
	 		socket.emit('email invalid');
	 		console.log('passwords dont match');
	 		socket.emit('password mismatch');
	 	}
	});
	 socket.on('pw check', function(user,pw) {

	 	userList.findOne({username: user}, function(err,userExists){
	 	 	if(userExists){
	 	 		var passhash = crypto.createHash('md5').update(pw).digest('hex');
	 	 		if(userExists.password === passhash)
	 	 		{
	 				console.log('valid pw');
	 				console.log(passhash);
	 				socket.emit('valid pw');
	 			}
	 			else 
	 			{
	 				console.log('invalid pw');
	 				socket.emit('invalid pw');
	 			}
	 		}
	 		else
	 		{
	 			return console.error(err);
	 		}
	 	});
	});
	 //when the client emits 'add user', this listens and executes
	 socket.on('add user', function(username){
	 	//store the username in the socket session for this client
	 	socket.username = username;
	 	usernames[username] = username;
	 	numUsers++;
	 	addedUser = true;
	 	socket.emit('login',{
	 		numUsers: numUsers
	 	});
	 	//echo globally(all clients) that a person has connected\
	 	socket.broadcast.emit('user joined',{
	 		username: socket.username,
	 		numUsers: numUsers
	 	});
	 });
	 //when client emters 'stop typing', broadcats it to others
	 socket.on('stop typing', function(){
	 	socket.broadcast.emit('stop typing',{
	 		username: socket.username
	 	});
	 });

	 socket.on('disconnect', function(){
	 	//remove username from global usernames list
	 	if(addedUser){
	 		delete usernames[socket.username];
	 		numUsers--;


	 		//echo globally thjat this client has left
	 		socket.broadcast.emit('user left',{
	 			username:socket.username,
	 			numUsers: numUsers
	 		});
	 	}
	 });
});
