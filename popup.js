let toggleSwitch, refreshButton, recordedPages, currentPage, helpLink;

document.addEventListener('DOMContentLoaded', function () {
    toggleSwitch = document.getElementById('toggleSwitch');
    refreshButton = document.getElementById('refreshButton');
    helpLink = document.getElementById('helpLink');
    chrome.storage.sync.get("recordedPages", function (result) {
        recordedPages = result.recordedPages || [];
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            const tabUrl = new URL(tabs[0].url);
            currentPage = tabUrl.hostname + (tabUrl.port ? ':' + tabUrl.port : '') + tabUrl.pathname;
            toggleSwitch.checked = recordedPages.includes(currentPage);
        });
    });
    toggleSwitch.addEventListener('change', toggleSwitchListener);
    refreshButton.addEventListener('click', refreshButtonListener);
    helpLink.addEventListener('click', helpLinkListener);
});

function toggleSwitchListener() {
    if (toggleSwitch.checked) {
        if (!recordedPages.includes(currentPage)) {
            recordedPages.push(currentPage);
            chrome.storage.sync.set({ recordedPages: recordedPages }, function() {});
        }
    } else {
        let indexToRemove = recordedPages.indexOf(currentPage);
        if (indexToRemove !== -1) {
            recordedPages.splice(indexToRemove, 1);
            chrome.storage.sync.set({ recordedPages: recordedPages }, function() {});
        }
    }
    refreshButton.style.display = 'block';
}

function refreshButtonListener() {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.reload(tabs[0].id, function () {
            chrome.extension.getViews({type: "popup"})[0].close();
        });
    });
}

function helpLinkListener() {
    chrome.runtime.openOptionsPage();
}
