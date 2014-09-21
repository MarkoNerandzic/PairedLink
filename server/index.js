var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var pairingError = "Error";

app.get('/', function(req, res){
	res.send("<p>Hi</p>");
});


http.listen(3000, function(){
	console.log('Listening on *:3000');
});

var pairings = {};

io.on("connection", function(socket){
	console.log("Someone has connected");
	socket.pairing = "";

	socket.on("pairCode::request", function(requestId){
		if (pairingExists(socket.pairingCode)) {
			sendClosePairingMessageToPartner(socket.id, socket.pairingCode);
			closePairing(socket.pairingCode);
		}
		var newPairing = createNewPairing(socket.id);
		console.log("Here's the new pairing code: " + newPairing);
		if (newPairing != -1) {
			socket.pairingCode = newPairing;
			console.log(socket.pairingCode);
			socket.emit("pairCode::response", newPairing, requestId);
		} else {
			console.log("Error creating new pairing!");
			socket.emit("pairCode::response", "", pairingError)
		}
	});

	socket.on("shareLink::toPartner", function(sendUrl, requestId){
		var partnerId = getPartnerId(socket.id, socket.pairingCode);
		if (partnerId != -1) {
			var partnerSocket = getPartnerSocket(partnerId);
			if (partnerSocket != null) {
				partnerSocket.emit("shareLink::fromPartner", sendUrl);
			} else {
				console.log("Error sending url, found partnerId: " + partnerId + " but partner socket doesn't exist!")
			}
		} else {
			console.log("Error sending url, couldn't find partnerId with pairing: " + socket.pairingCode + " and sender id: " + socket.id);
		}
	});

	socket.on("pairing::request", function(pairingCode, requestId){
		if (pairingExists(pairingCode)) {
			var successfulSocketAddition = addSocketIdToPairing(socket.id, pairingCode);
			socket.pairingCode = pairingCode;
			if (successfulSocketAddition) {
				socket.emit("pairing::success", requestId);
				var partnerId = getPartnerId(socket.id, socket.pairingCode);
				if (partnerId != -1) {
					var partnerSocket = getPartnerSocket(partnerId);
					if (partnerSocket != null) {
						partnerSocket.emit("pairing::partnerJoined");
					} else {
						console.log("Error notifying original member that the new member was added");
					}
				}
			} else {
				console.log("Error adding user to pairing!");
				socket.emit("pairing::failure", requestId);
			}
		} else {
			console.log("Error adding user to pairing, pairing code: " + socket.pairingCode + " not found");
			socket.emit("pairing::failure", requestId);
		}
	});

	socket.on("disconnect", function(){
		console.log("Someone disconnected!");
		if(socket.pairingCode !== ""){
			sendClosePairingMessageToPartner(socket.id, socket.pairingCode);
			closePairing(socket.pairingCode);
		}
	});
});

function pairingExists(pairing){
	if (pairing in pairings) {
		return true;
	} else {
		return false;
	}
}

function sendClosePairingMessageToPartner(socketId, pairing){
	var partnerId = getPartnerId(socketId, pairing);
	if(partnerId !== ""){
		var partnerSocket = getPartnerSocket(partnerId);
		sendClosePairingMessage(partnerSocket);
	}
}

function getPartnerId(socketId, pairing){
	partnerId = "";
	console.log(pairings);
	console.log(pairing);
	console.log(pairings[pairing]);
	for (var counter = 0; counter < pairings[pairing].length; counter++){
		if(pairings[pairing][counter] != socketId){
			partnerId = pairings[pairing][counter];
		}
	}
	return partnerId;
}

function getPartnerSocket (socketId) {
	var partnerSocket = null;
	console.log(io.sockets.sockets);
	for (var counter = 1; counter < io.sockets.sockets.length; counter++) {
		if(io.sockets.sockets[counter].id === socketId){
			partnerSocket = io.sockets.sockets[counter];
		}
	}
	return partnerSocket;
}

function sendClosePairingMessage(socket){
	socket.emit("pairing::close");
}

function closePairing(pairing){
	if(pairingExists(pairing)){
		delete pairings[pairing];
	}
}

function createNewPairing(socketId){
	var newPairing = generateNewPairing();
	var insertPairingSuccessful = insertNewPairing(newPairing);
	if (insertPairingSuccessful) {
		var successfulSocketAddition = addSocketIdToPairing(socketId, newPairing);
		if (successfulSocketAddition) {
			return newPairing;
		} else {
			return -1;
		}
	} else {
		return -1;
	}
}

function generateNewPairing(){
	var newPairing = 0;
	for(var counter = 0; counter < 5; counter++){
		newPairing += Math.round(Math.random()*10);
		newPairing = newPairing*10;
	}
	newPairing = newPairing/10;
	if(pairingExists(newPairing)){
		return generateNewPairing();
	} else {
		return newPairing;
	}
}

function insertNewPairing (pairing) {
	if (pairingExists(pairing)) {
		console.log("There already exists a pairing with pairing code: " + pairing);
		return false;
	} else {
		var successfulInsertion = true;
		pairings[pairing] = [];
		return successfulInsertion;
	}
}

function addSocketIdToPairing (socketId, newPairing) {
	pairings[newPairing].push(socketId);
	return true;
}