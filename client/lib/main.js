const { Reuqest } = require("sdk/request");
const { data } = require("sdk/self");
const { ToggleButton } = require("sdk/ui/button/toggle");
const { ActionButton } = require("sdk/ui/button/action");
const tabs = require("sdk/tabs");

let currentLink = "";
let paired = false;

let button = ToggleButton({
    id: "main-toggle",
    label: "Paired Link",
    icon: {
      "16": "./firefox-16.png",
      "32": "./firefox-32.png"
    },
    onChange: state => {
        if (paired && currentLink.length !== 0) {
            return tabs.open(currentLink);
        }
        if (state.checked) {
        panel.show({
            position: button
        });
      }
    }
});

ActionButton({
    id: "test-send",
    label: "send link",
    icon: {
      "16": "./firefox-16.png",
      "32": "./firefox-32.png"
    },
    onClick: () => panel.port.emit("sendLink", tabs.activeTab.url)
});

let panel = require("sdk/panel").Panel({
    width: 300,
    height: 120,
    contentURL: data.url("pairing.html"),
    contentScriptFile: [data.url("socket.io.client.js"), data.url("pairing.js")],
    onHide: () => button.state("window", { checked: false })
});

panel.port.on("newUrl",  url => currentLink = url);
panel.port.on("paired", () => paired = true);
panel.port.on("unpaired", () => {
    paired = false;
    currentLink = "";
});