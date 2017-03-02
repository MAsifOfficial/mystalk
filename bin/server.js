/** TO DO **/
/*
1) When server shuts, disconnet all clients first
*/
/**********/



var socketio = require("socket.io")();

//Listen on port 8080
var io = socketio.listen(8080);
var users = [];
var userSock = [];
console.log("Server started on port 8080");

io.on('connection', function(socket) {
	var clientIpAddress = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
	console.log("Got connection from: " + clientIpAddress);

	socket.on('join', function(name) {
		if(users.indexOf(name) == -1) {
			users.push(name);
			userSock.push(socket);
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
		userSock.slice(i,1);
		users.slice(i,1);
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
