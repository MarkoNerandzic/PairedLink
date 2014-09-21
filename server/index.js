var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var when = require('when');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var pairingError = "Error";

var PairingSchema = new Schema({
	pairingCode: String,
	members: Array
});

var PairingModel = mongoose.model('PairingSchema', PairingSchema);

mongoose.connect("mongodb://localhost/PairedLinkData");

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
		createNewPairing(socket.id).then(function (newPairing){
			if (newPairing != -1) {
				socket.pairingCode = newPairing;
				socket.emit("pairCode::reponse", newPairing, requestId);
			} else {
				console.log("Error creating new pairing!");
				socket.emit("pairCode::response", "", pairingError);
			}	
		}, function(){});
	});

	socket.on("shareLink::toPartner", function(sendUrl, requestId){
		var partnerId = getPartnerId(socket.id, socket.pairingCode);
		if (partnerId !== -1) {
			var partnerSocket = getPartnerSocket(partnerId);
			if (partnerSocket !== null) {
				partnerSocket.emit("shareLink::fromPartner", sendUrl);
			} else {
				console.log("Error sending url, found partnerId: " + partnerId + " but partner socket doesn't exist!");
			}
		} else {
			console.log("Error sending url, couldn't find partnerId with pairing: " + socket.pairingCode + " and sender id: " + socket.id);
		}
	});

	socket.on("pairing::request", function(pairingCode, requestId){
		if (pairingExists(pairingCode)) {
			addSocketIdToPairing(socket.id, pairingCode).then(function (succesfulAddition){
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
			});
		} else {
			console.log("Error adding user to pairing, pairing code: " + socket.pairingCode + " not found");
			socket.emit("pairing::failure", requestId);
		}
	});

	socket.on("disconnect", function(){
		if(socket.pairing !== "" && pairingExists(socket.pairing)){
			sendClosePairingMessageToPartner(socket.id, socket.pairingCode);
			closePairing(socket.pairingCode);
		}
	});
});

function pairingExists(pairing){
	return when.promise(function(resolve, reject, notify){
		PairingModel.findOne({'pairingCode': pairing}, function(err, tempPairingInfo){
			if (err) {
				console.log("Error when attempting to search up pairing: " + pairing);
				reject(err);
			} else {
				if (tempPairingInfo !== null) {
					resolve(true);
				} else {
					resolve(false);
				}
			}
		});
	})
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
	var insertPairingSuccessful = false;
	return insertNewPairing(newPairing).then(function(succesfulInsertion){
		insertPairingSuccessful = successfulInsertion;
		console.log(insertPairingSuccessful);
		if (insertPairingSuccessful) {
			var successfulSocketAddition = addSocketIdToPairing(socketId, newPairing);
			if (successfulSocketAddition) {
				return newPairing;
			} else {
				console.log("Error adding a new socket to the pairing");
				return -1;
			}
		} else {
			console.log("Error inserting a new pairing");
			return -1;
		}
	}, function(err){
		console.log("We failed =( . Here's the error: " + err);
	});
}

function generateNewPairing(){
	var newPairing = 0;
	for(var counter = 0; counter < 5; counter++){
		var randomNumber = Math.round(Math.random()*10);
		newPairing += randomNumber;
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
		pairingInfo.pairingCode = pairing;
		pairingInfo.members = [];
		
		return when.promise(function(resolve, reject, notify){
			pairingInfo.save( function(err) {
				if(err){
					console.log("Error creating a pairing: " + pairing + " with error: " + err);
					reject(err);
				} else {
					console.log("...Yeah, we totally didn't break .... btw err is: " + err);
					successfulInsertion = true;
					console.log(successfulInsertion);
				}
				resolve(successfulInsertion);
			});
		});
	}
}

function addSocketIdToPairing (socketId, newPairing) {
	return when.promise(function(resolve, reject, notify){
		PairingModel.findOne({'pairingCode': pairing}, function(err, tempPairingInfo){
			if (err) {
				console.log("Error when attempting to search up pairing: " + pairing + " with error: " + err);
				reject(err);
			} else {
				pairingInfo = tempPairingInfo;
				newPairingInfo = PairingModel();
				newPairingInfo.pairingCode = tempPairingInfo.pairingCode;
				newPairingInfo.members = tempPairingInfo.members.push(socketId);
				PairingModel.findOneAndUpdate({'pairingCode': tempPairingInfo.pairingCode}, newPairingInfo, function(err){
					if(err){
						console.log("Error updating pairing to add socket id: " + err);
						reject(err);
					}
					resolve();
				});
			}
		});
	})
}