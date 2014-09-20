const { Reuqest } = require("sdk/request");
const { data } = require("sdk/self");
const { ActionButton } = require("sdk/ui/button/toggle");
const serverUrl = "http://localhost:1010";

var button = ActionButton({
    id: "main-toggle",
    label: "Paired Link",
    icon: {
      "16": "./firefox-16.png",
      "32": "./firefox-32.png"
    },
    onChange: buttonOnClick
});

let panel = require("sdk/panel").Panel({
  width: 300,
  height: 160,
  contentURL: data.url("pairing.html"),
  // contentScriptFile: [data.url("socket.io.client.js"), data.url("pairing.js")],
});

function buttonOnClick (state) {
    if (button.checked) {
        return panel.hide();
    }
    panel.show({ position: button });
}