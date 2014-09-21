var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var pairingError = "Error";

var PairingSchema = new Schema({
	pairingCode: String,
	members: Array
});

var PairingModel = mongoose.model('PairingSchema', PairingSchema);

mongoose.connect("mongodb://localhost/");

app.get('/', function(req, res){
	res.send("<p>Hi</p>");
});


http.listen(3000, function(){
	console.log('Listening on *:3000');
});

io.on("connection", function(socket){
	console.log("Someone has connected");
	socket.pairing = "";

	socket.on("pairCode::request", function(requestId){
		if (pairingExists(socket.pairingCode)) {
			sendClosePairingMessageToPartner(socket.id, socket.pairingCode);
			closePairing(socket.pairingCode);
		}
		var newPairing = createNewPairing(socket.id);
		if (newPairing != -1) {
			socket.pairingCode = newPairing;
			socket.emit("pairCode::reponse", newPairing, requestId);
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
			if (successfulSocketAddition) {
				socket.emit("pairing::success", requestId);
				var partnerId = getPartnerId(socket.id, socket.pairingCode);
				if (partnerId != -1) {
					var partnerSocket = getPartnerSocket(partnerId);
					if (partnerSocket != null) {
						partnerSocket.emit("pairing::partnerJoined", sendUrl);
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
		sendClosePairingMessageToPartner(socket.id, socket.pairingCode);
		closePairing(socket.pairingCode);
	});
});

function pairingExists(pairing){
	var pairingInfo = null;
	PairingModel.findOne({'pairingCode': pairing}, function(err, tempPairingInfo){
		if (err) {
			console.log("Error when attempting to search up pairing: " + pairing);
		} else {
			pairingInfo = tempPairingInfo;
		}
	});
	if (tempPairingInfo != null) {
		return true;
	} else {
		return false;
	}
}

function sendClosePairingMessageToPartner(socketId, pairing){
	var partnerId = getPartnerId(socketId, pairing);
	var partnerSocket = getPartnerSocket(partnerId);
	sendClosePairingMessage(partnerSocket);
}

function getPartnerId(socketId, pairing){
	partnerId = "";
	PairingModel.findOne({'pairingCode': pairing}, function(err, pairingInfo){
		if (err) {
			console.log("Error when attempting to search up pairing: " + pairing);
		} else {
			for (var counter = 0; counter < pairingInfo.members; counter++){
				if(pairingInfo.members[counter] != socketId){
					partnerId = pairingInfo.members[counter];
				}
			}
		}
	});
	return partnerId;
}

function getPartnerSocket (socketId) {
	var partnerSocket = null;
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
	if (pairingExists(pairing)) {
		PairingModel.findOneAndRemove({'pairingCode': pairing}, function(err){
			if(err){
				console.log("Error when attempting to delete pairing with code: " + pairing);
			}
		});
	} else {
		console.log("Someone was attempting to close a pairing that didn't exist, with pairing code: " + pairing);
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
		newPairing += Math.round(Math.random*10);
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
		var successfulInsertion = false;
		var pairingInfo = new PairingModel();
		pairing.pairingCode = pairing;
		pairing.members = [];
		pairing.save( function(err) {
			if(err){
				console.log("Error creating a pairing: " + pairing + " with error: " + err);
			} else {
				successfulInsertion = true;
			}
		});
		return successfulInsertion;
	}
}

function addSocketIdToPairing (socketId, newPairing) {
	PairingModel.findOne({'pairingCode': pairing}, function(err, tempPairingInfo){
		if (err) {
			console.log("Error when attempting to search up pairing: " + pairing);
		} else {
			pairingInfo = tempPairingInfo;
			newPairingInfo = PairingModel();
			newPairingInfo.pairingCode = tempPairingInfo.pairingCode;
			newPairingInfo.members = tempPairingInfo.members.push(socketId);
			PairingModel.findOneAndUpdate({'pairingCode': tempPairingInfo.pairingCode}, newPairingInfo);
		}
	});
}