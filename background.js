chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "checkPage") {
        chrome.storage.sync.get("recordedPages", (data) => {
            const recordedPages = data.recordedPages || [];
            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                const tabUrl = new URL(tabs[0].url);
                const currentPage = tabUrl.hostname + (tabUrl.port ? ':' + tabUrl.port : '') + tabUrl.pathname;
                const exists = recordedPages.includes(currentPage);
                sendResponse({ exists: exists });
            });
        });
        return true;
    }
});
