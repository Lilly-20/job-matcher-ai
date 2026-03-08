document.getElementById("toggleBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 直接发送toggle消息，content.js已由manifest自动注入
  chrome.tabs.sendMessage(tab.id, { action: "toggleOverlay" }, (response) => {
    if (chrome.runtime.lastError) {
      // 如果还没注入（比如扩展刚安装），手动注入一次
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { action: "toggleOverlay" });
        }, 300);
      });
    }
  });

  window.close();
});
