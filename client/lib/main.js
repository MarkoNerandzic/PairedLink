const { Reuqest } = require("sdk/request");
const { data } = require("sdk/self");
const { ToggleButton } = require("sdk/ui/button/toggle");
const { ActionButton } = require("sdk/ui/button/action");
const tabs = require("sdk/tabs");
const notify = require("sdk/notifications");
const MAX_URL_LENGTH = 30;

let button = ToggleButton({
    id: "main-toggle",
    label: "Paired Link",
    icon: {
      "16": "icons/receive16.png",
      "32": "icons/receive32.png"
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

let sendButton = (() => {
    let btn;
    return {
        create: () => {
            btn = ActionButton({
                id: "test-send",
                label: "send link",
                icon: {
                  "16": data.url("icons/send16.png"),
                  "32": data.url("icons/send32.png")
                },
                onClick: () => panel.port.emit("sendLink", tabs.activeTab.url)
            });
        },
        destroy: () => {
            btn.destroy();
        }
    };
})();

let panel = require("sdk/panel").Panel({
    width: 300,
    height: 120,
    contentURL: data.url("pairing.html"),
    contentScriptFile: [data.url("socket.io.client.js"), data.url("pairing.js")],
    onHide: () => button.state("window", { checked: false })
});

panel.port.on("openUrl",  tabs.open);
panel.port.on("notify",  url => notify({
    title: "Paired Link",
    text: "New link!\n" + url.length > MAX_URL_LENGTH ?
        url.slice(0, MAX_URL_LENGTH) + "..." : url,
    onClick: () => tabs.open(url)
}));
panel.port.on("paired", sendButton.create);
panel.port.on("unpaired", sendButton.destroy);