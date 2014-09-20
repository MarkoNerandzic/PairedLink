function buttonClick () {
    self.port.emit("pair-with", getid);
    self.port.emit("get-code");
}
document.getElementByid("pair-button").onclick = buttonClick;
self.port.on("pair-code", code => {
    document.getElementByid("code-input").value = code;
});
self.port.on("pair-success",);
self.port.on("pair-failed",);

/*
read x-notifier for right click and css number thing
*/