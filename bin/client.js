var readline2 = require("readline"),
socketio = require("socket.io-client"),
util = require("util"),
color = require("ansi-color").set;

var host = process.argv[2];
var port = process.argv[3];

var socket = socketio.connect('ws://'+host+':'+port);
socket.on('connect_failed', function() {
  if (typeof console !== "undefined" && console !== null) {
    console.log("Connect failed (port " + socket_port + ")");
  }
});
socket.on('error', function() {
  if (typeof console !== "undefined" && console !== null) {
    console.log("Socket.io reported a generic error");
  }
});

var rl = readline2.createInterface(process.stdin, process.stdout);

// Set the username
rl.question("Please enter a nickname: ", function(name) {
	var nick = name.toLowerCase();
	socket.emit('join', nick);
});
socket.on('joining', function(data) {
	console.log(color(data.message, "green"));
	if(!data.joined){
		socket.disconnect();
		rl.close();
	}
	else {
		rl.prompt(true);
	}
});
rl.on('SIGINT', () => {
  rl.question('Are you sure you want to exit?', (answer) => {
    if (answer.match(/^y(es)?$/i)) {
    	socket.disconnect();
    	rl.close();
    }
  });
});

/* Sender Logics */

rl.on('line', function(line) {
	if (line[0] == "/" && line.length > 1) {
		var cmd = line.match(/[a-z]+\b/)[0];
		var arg = line.substr(cmd.length+2, line.length);
		socket.emit('command', {command: cmd, argument: arg});
		rl.prompt(true);
	} else {
		// send chat message
		socket.emit('say', {message: line});
		rl.prompt(true);
	}
});

 /* Reciever Logics */

socket.on('notice', function(data) {
	console_out(color(data.message, "green"));
});

socket.on('tell', function(data) {
	leader = color("[" + data.from + "->" + data.to + "]", "red");
	message = color(data.message, "yellow");
	console_out(leader + message);
});

socket.on('say', function(data) {
	leader = color("<"+data.nick+">", "green");
	message = color(data.message, "yellow");
	console_out(leader + message);
})


// socket.on('broadcast', function(data) {
// 	var leader;
// 	if(data.type == 'chat' && data.nick != nick) {
// 		leader = color("<"+data.nick+"> ", "green");
// 		console_out(leader + data.message);
// 	}
// 	else if(data.type == 'notice') {
// 		console_out(color(data.message, "cyan"));
// 	}
// 	else if(data.type == "tell" && data.to.toLowerCase() == nick.toLowerCase()) {
// 		leader = color("[" + data.from + "->" + data.to + "]", "red");
// 		console_out(leader + data.message);
// 	}
// 	else if(data.type == "emote") {
// 		console_out(color(data.message, "cyan"));
// 	}
// });

function console_out(msg) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(msg);
    rl.prompt(true);
}

// function chat_command(cmd, arg) {
// 	switch(cmd) {
// 		case 'nick': 
// 			var notice = nick + " changed their name to " + arg;
// 			nick = arg;
// 			socket.emit('send', {type: 'notice', message: notice});
// 			break;
// 		case 'pm':
// 			var to = arg.match(/[a-z]+\b/)[0];
// 			var message = arg.substr(to.length, arg.length);
// 			socket.emit('send', { type: 'tell', message: message, to: to, from: nick});
// 			break;
// 		case 'me':
// 			var emote = nick + " " + arg;
// 			socket.emit('send', {type: 'emote', message: emote});
// 			break;
// 		default:
// 			console_out("That is not a valid command");
// 	}
// }