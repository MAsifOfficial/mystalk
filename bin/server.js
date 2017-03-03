/** TO DO **/
/*
1) When server shuts, disconnet all clients first
*/
/**********/



var socketio = require("socket.io")();
apiai = require("apiai");

var app = apiai("a3623bc100f140d2acf414ebce7580e8");

//Listen on port 8080
var io = socketio.listen(8080);
var users = [];
var userSock = [];
var sessionIDs = [];
console.log("Server started on port 8080");

io.on('connection', function(socket) {
	var clientIpAddress = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
	console.log("Got connection from: " + clientIpAddress);

	socket.on('join', function(name) {
		if(users.indexOf(name) == -1) {
			users.push(name);
			userSock.push(socket);
			sessionIDs.push(makeid());
			message = name + " has joined the chat.";
			io.sockets.emit('notice', {message: message});
		} else {
			message = "A user already exists with this name.";
			socket.emit('joining', {message: message, joined: false});
			socket.disconnect();
		}
	});

	// if a command is recieved
	socket.on('command', function(data) {
		chat_command(data.command, data.argument, socket);
	});

	//Broadcast a user's message to everyone else in the room
	socket.on('say', function(data) {
		message = data.message;
		var i = userSock.indexOf(socket);
		var nick = users[i];
		socket.broadcast.emit('say', {message: message, nick: nick});
		console.log(data);
	});

	socket.on('disconnect', function() {
		var i = userSock.indexOf(socket);
		var nick = users[i];
		data = {message: nick + " has disconnected"};
		io.sockets.emit('notice', data);
		userSock.splice(i,1);
		users.splice(i,1);
		sessionIDs.splice(i,1);
		console.log(users.join());
		console.log(data);
	});
});


function chat_command(cmd, arg, socket) {
	switch(cmd) {
		case 'nick': 
			var notice = nick + " changed their name to " + arg;
			var i = userSock.indexOf(socket);
			users[i] = arg;
			socket.emit('notice', {message: notice});
			break;
		case 'pm':
			var sender = getUserNick(socket);
			var reciever = arg.match(/[a-z]+\b/)[0];
			var recvSocket = users.indexOf(reciever);
			var message = arg.substr(reciever.length, arg.length);
			io.to(userSock[recvSocket].id).emit('tell', {message: message, to:reciever, from: sender});
			break;
		case 'all':
			var all = users.join();
			socket.emit('notice', {message:all});
			break;
		case 'help':
			var message = "Following commands are available: \n1)nick - to change the nickname\n2)pm - to send a private message\n3)all - to get list of active users";
			socket.emit('notice', {message:message});
			break;
		case 'bot':
			var sender = getUserNick(socket);
			var sessionID = sessionIDs[userSock.indexOf(socket)];

			var request = app.textRequest(arg, {sessionId: sessionID});
			request.on('response', function(response) {
				var message = JSON.stringify(response.result.fulfillment.speech, null, '  ');
				io.to(socket.id).emit('tell', {message: message, to:sender, from: 'bot'});
			});
			request.on('error', function(error) {
    			var message = "Oops! Something went wrong"
				io.to(socket.id).emit('tell', {message: message, to:sender, from: 'bot'});
			});
			request.end();
			break;
		default:
			notice = "That is not a valid command."
			socket.emit('notice', {message: notice});
	}
}

function getUserNick(socket) {
	var i = userSock.indexOf(socket);
	var nick = users[i];
	return nick;
}

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 36; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}