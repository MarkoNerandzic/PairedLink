const textBox = document.getElementById("code-input");
const button = document.getElementById("pair-button");
const pairingError = "Error";
const textBoxPlaceHolder = "Pairing with...";
const buttonState = (() => {
    let pairButtonClass = "btn btn-success";
    let requestButtonClass = "btn btn-primary";

    let pairButtonText = "Pair";
    let requestButtonText = "Get Code";

    let pairingWaitButtonText = "Waiting for a friend...";
    let pairingWaitButtonClass = requestButtonClass;

    let serverWaitButtonText = "Waiting for the code...";
    let serverWaitButtonClass = requestButtonClass;

    return {
        pair: () => {
            button.textContent = pairButtonText;
            button.className = pairButtonClass;
        },
        request: () => {
            button.textContent = requestButtonText;
            button.className = requestButtonClass;
        },
        serverWait: () => {
            button.textContent = serverWaitButtonText;
            button.className = serverWaitButtonClass;
            button.disabled = true;
        },
        pairWait: () => {
            button.textContent = pairingWaitButtonText;
            button.className = pairingWaitButtonClass;
            button.disabled = true;
        }
    };
})();

textBox.addEventListener("input", event => {
    if (textBox.value.length !== 0) {
        buttonState.pair();
    } else {
        buttonState.request();
    }
}, true);

function resetInputs () {
    textBox.placeholder = textBoxPlaceHolder;
    textBox.disabled = false;
    button.disabled = false;
}

const socket = io("http://10.20.94.222:3000");

socket.on("connect", () => {  // enable button upon obtaining id
    button.disabled = false;
});

socket.on("disconnect", () => {
    resetInputs();
    self.port.emit("unpaired");
});

let expectedRequestId = 0;

function buttonClick () {
    if (textBox.value.length === 0) {
        buttonState.serverWait();
        textBox.disabled = true;
        textBox.placeholder = "";
        expectedRequestId++;
        socket.emit("pairCode::request", expectedRequestId);
    } else {
        socket.emit("pairing::request", textBox.value, expectedRequestId);
    }
}

button.onclick = buttonClick;

socket.on("pairCode::response", (code, requestId) => {
    // response of "get-code"
    if (requestId === pairingError) {
        // show dup ui
    }
    if (requestId === expectedRequestId) {
        textBox.value = code;
        buttonState.pairWait();
    }
});

socket.on("pairing::partnerJoined", () => {
    resetInputs();
    self.port.emit("paired");
});

self.port.on("sendLink", urlToSend =>
    socket.emit("shareLink::toPartner", urlToSend));

socket.on("shareLink::fromPartner", url => self.port.emit("notify", url));

/*
two buttons, one for sending link, one for recieving.
Recieving one has the pairing code and the links
*/