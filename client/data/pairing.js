const textBox = document.getElementById("code-input");
const button = document.getElementById("pair-button");

const socket = io("http://localhost:1010");

socket.on("connect", () => {  // enable button upon connection
    button.disabled = false;
});

let expect_get_code_response = 0;

function buttonClick () {
    self.port.emit("pair-with", textBox.value);
    expect_get_code_response++;
    if (textBox.value.length === 0) {
        return socket.emit("pairCode::request", expect_get_code_response);
    }
    socket.emit("pairing::request", expect_get_code_response);
}
button.onclick = buttonClick;
socket.on("pairCode::response", (code, reponse_id) => {
    // response of "get-code"
    if (reponse_id === "duplicate") {
        // show dup ui
    }
    if (reponse_id === expect_get_code_response) {
        textBox.value = code;
    }
});

// self.port.on("pair-success",);  // display success, main will close planel in while
// self.port.on("pair-failed",);  // highlight text box

/*
read x-notifier for right click and css number thing
*/