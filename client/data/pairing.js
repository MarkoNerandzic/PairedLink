const textBox = document.getElementById("code-input");
const button = document.getElementById("pair-button");
const pairingError = "Error";

const socket = io("http://localhost:1010");

socket.on("connect", id => {  // enable button upon obtaining id
    button.disabled = false;
});

socket.on("disconnect", () => socket.id = null);

let expectedRequestId = 0;

function buttonClick () {
    if (textBox.value.length === 0) {
        expectedRequestId++;
        return socket.emit("pairCode::request", expectedRequestId);
    }
    socket.emit("pairing::request", textBox.value, expectedRequestId);
}
button.onclick = buttonClick;
socket.on("pairCode::response", (code, requestId) => {
    // response of "get-code"
    if (requestId === pairingError) {
        // show dup ui
    }
    if (requestId === expectedRequestId) {
        textBox.value = code;
    }
});

self.port.on("sendLink", urlToSend =>
    socket.emit("shareLink::toPartner", urlToSend));

socket.on("shareLink::fromPartner", newUrl => self.port.emit("newUrl", newUrl));

/*
read x-notifier for right click and css number thing
*/