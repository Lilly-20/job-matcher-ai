// 标签切换
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.remove("hidden");
  });
});

// 加载已保存的设置
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["aboutMe", "rejectKeywords", "apiKey"], (data) => {
    if (data.aboutMe) document.getElementById("aboutMe").value = data.aboutMe;
    if (data.rejectKeywords) document.getElementById("rejectKeywords").value = data.rejectKeywords;
    if (data.apiKey) document.getElementById("apiKey").value = data.apiKey;
  });
});

// 保存设置
document.getElementById("saveBtn").addEventListener("click", () => {
  const aboutMe = document.getElementById("aboutMe").value;
  const reject = document.getElementById("rejectKeywords").value;
  const apiKey = document.getElementById("apiKey").value;
  chrome.storage.local.set({ aboutMe, rejectKeywords: reject, apiKey });
  const msg = document.getElementById("saveMsg");
  msg.textContent = "✅ 已保存！";
  setTimeout(() => msg.textContent = "", 2000);
});

// 自动注入content script
async function getPageText(tabId) {
  try {
    return await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: "getPageText" }, (response) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(response);
      });
    });
  } catch (e) {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: "getPageText" }, (response) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(response);
      });
    });
  }
}

// 分析职位
document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");

  // 从storage读取设置（不依赖当前页面填的内容）
  chrome.storage.local.get(["aboutMe", "rejectKeywords", "apiKey"], async (data) => {
    const aboutMe = data.aboutMe || "";
    const reject = data.rejectKeywords || "";
    const apiKey = data.apiKey || "";

    if (!apiKey) {
      resultDiv.textContent = "❗ 请先去「⚙️ 我的设置」填写API Key并保存！";
      resultDiv.className = "no-match";
      return;
    }

    if (!aboutMe) {
      resultDiv.textContent = "❗ 请先去「⚙️ 我的设置」填写你的简历或自我介绍！";
      resultDiv.className = "no-match";
      return;
    }

    resultDiv.textContent = "⏳ AI分析中，请稍候...";
    resultDiv.className = "loading";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let response;
    try {
      response = await getPageText(tab.id);
    } catch (e) {
      resultDiv.textContent = "❗ 无法读取页面内容：" + e.message;
      resultDiv.className = "no-match";
      return;
    }

    if (!response || !response.text) {
      resultDiv.textContent = "❗ 页面内容为空，请确认当前页面是招聘页面。";
      resultDiv.className = "no-match";
      return;
    }

    const pageText = response.text;

    const prompt = `
你是一个资深求职顾问。请根据用户的背景信息，判断以下职位是否适合他/她投递。

【用户背景】
${aboutMe}

${reject ? `【用户明确不想要的条件】\n${reject}\n` : ""}

【招聘页面内容】
${pageText}

请综合考虑用户的学历背景、技能、性格、兴趣方向，做出判断。
不要只做关键词匹配，要真正理解用户适合什么、这个职位需要什么。

请用中文回答，严格按照以下格式输出：
【匹配结果】✅ 匹配 或 ❌ 不匹配
【匹配分数】X/10
【职位名称】（从页面提取）
【为什么适合/不适合你】
- 理由1
- 理由2
- 理由3
【这个职位对你的成长价值】（1-2句，说明能积累什么经验，未来能往哪走）
【投递建议】（一句话结论）
    `;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://job-matcher-extension",
          "X-Title": "Job Matcher AI"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;

      if (text) {
        resultDiv.textContent = text;
        resultDiv.className = text.includes("✅") ? "match" : "no-match";
      } else {
        resultDiv.textContent = "❗ AI没有返回结果，请检查API Key是否正确。\n\n详情：" + JSON.stringify(data);
        resultDiv.className = "no-match";
      }
    } catch (err) {
      resultDiv.textContent = "❗ 网络错误：" + err.message;
      resultDiv.className = "no-match";
    }
  });
});
