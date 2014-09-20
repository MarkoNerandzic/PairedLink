var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http

var pairingError = "Error";

app.get('/', function(req, res){
	res.send("");
});

io.on("connection", function(socket){
	console.log("Someone has connected");
	socket.pairing = "";

	socket.on("pairCode::request", function(requestId){
		if (pairingExists(socket.pairingCode)) {
			sendClosePairingMessageToPairing(socket.id, socket.pairingCode);
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
		if(partnerId != -1){
			var partnerSocket = getPartnerSocket(partnerId);
			if(partnerSocket != null){
				partnerSocket.emit("shareLink::fromPartner", sendUrl);
			} else {
				console.log("Error sending url, found partnerId: " + partnerId + " but partner socket doesn't exist!")
			}
		} else {
			console.log("Error sending url, couldn't find partnerId with pairing: " + socket.pairingCode + " and sender id: " + socket.id);
		}
	});
});

//TODO: Finish pairingExists function
function pairingExists(pairing){
	return false;
}

//TODO: Finish sendClosePairingMessageToPairing
function sendClosePairingMessageToPairing(socketId, pairing){
	var partnerId = getPartnerId(socketId, pairing);
	sendClosePairingMessage(partnerId);
}

function getPartnerId(socketId, pairing){
	// TODO: insert body here
	return 0;
}

function getPartnerSocket (socketId) {
	// TODO: Insert body here
	return null;
}

//TODO: Finish sendClosePairingMessage function
function sendClosePairingMessage(id){

}

//TODO: Finish closePairing function
function closePairing(pairing){

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
	//TODO: Insert function body here
}

function insertNewPairing (pairing) {
	//TODO: Insert function body here
}

function addSocketIdToPairing (socketId, newPairing) {
	//TODO: Insert function body here
}