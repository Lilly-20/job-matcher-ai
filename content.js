// ─────────────────────────────────────────
//  Job Matcher AI — content script v2
//  悬浮窗直接嵌入页面，切换标签不会消失
// ─────────────────────────────────────────

// prevent double-injection
if (typeof window.__jmLoaded !== "undefined") { throw new Error("JM already loaded"); }
window.__jmLoaded = true;

var overlayEl = null;
var currentTab = "analyze";

// ── 安全调用 chrome API（插件更新后上下文失效时优雅处理）──
function safeChrome(fn) {
  try {
    if (!chrome.runtime?.id) {
      // 上下文已失效，提示用户刷新页面
      showContextInvalid();
      return;
    }
    fn();
  } catch(e) {
    if (e.message?.includes("Extension context invalidated")) {
      showContextInvalid();
    } else {
      throw e;
    }
  }
}

function showContextInvalid() {
  const overlay = document.getElementById("jm-overlay");
  if (overlay) {
    const body = overlay.querySelector("#jm-body");
    if (body) {
      body.innerHTML = `<div style="padding:16px;text-align:center;color:#ef4444">
        ⚠️ 插件已更新，请刷新页面后重新使用。<br>
        <small style="color:#9ca3af">Extension updated, please refresh the page.</small>
      </div>`;
    }
  }
}

// ── 初始化悬浮窗 ──
function initOverlay() {
  if (document.getElementById("jm-overlay")) return;

  overlayEl = document.createElement("div");
  overlayEl.id = "jm-overlay";
  overlayEl.innerHTML = `
    <div id="jm-header">
      <span id="jm-title">🎯 Job Matcher AI</span>
      <div id="jm-header-btns">
        <button class="jm-icon-btn" id="jm-minimize">—</button>
        <button class="jm-icon-btn" id="jm-close">✕</button>
      </div>
    </div>
    <div id="jm-tabs">
      <button class="jm-tab active" data-tab="analyze">🔍 精析</button>
      <button class="jm-tab" data-tab="scan">⚡ 粗筛</button>
      <button class="jm-tab" data-tab="history">📋 历史</button>
      <button class="jm-tab" data-tab="settings">⚙️ 设置</button>
    </div>
    <div id="jm-body">
      ${renderAnalyzeTab()}
    </div>
  `;

  document.body.appendChild(overlayEl);
  makeDraggable(overlayEl, document.getElementById("jm-header"));
  bindEvents();
}

function renderAnalyzeTab() {
  return `
    <p class="jm-hint">打开某个职位详情页，点击分析获取完整匹配报告。</p>
    <button class="jm-btn analyze" id="jm-analyze-btn">🔍 分析这个职位</button>
    <div id="jm-result"></div>
  `;
}

function renderScanTab() {
  return `
    <p class="jm-hint">在职位列表页使用，AI快速识别哪些岗位值得点进去看。</p>
    <button class="jm-btn scan" id="jm-scan-btn">⚡ 粗筛这个页面的职位</button>
    <div id="jm-scan-result"></div>
  `;
}

function renderHistoryTab(history) {
  if (!history || history.length === 0) {
    return `<div class="jm-empty">暂无历史记录</div>`;
  }
  return `
    <button class="jm-clear-btn" id="jm-clear-history">清空</button>
    <div style="clear:both"></div>
    ${history.map((h, i) => `
      <div class="jm-history-item ${h.matched ? 'match' : 'no-match'}" data-i="${i}">
        <div class="jm-history-top">
          <span>${h.matched ? "✅" : "❌"} ${h.title || "未知职位"}</span>
          <span>${h.score || "?"}/10</span>
        </div>
        <div class="jm-history-time">${new Date(h.time).toLocaleDateString("zh-CN")} · ${h.host || ""}</div>
        <div class="jm-history-detail">${h.result || ""}</div>
      </div>
    `).join("")}
  `;
}

function renderSettingsTab(data) {
  return `
    <label class="jm-label">👤 关于我（简历或自我介绍）</label>
    <textarea class="jm-textarea" id="jm-about" rows="6" placeholder="粘贴简历或写几句自我介绍...">${data.aboutMe || ""}</textarea>
    <label class="jm-label">❌ 一定不要的条件（可选）</label>
    <input class="jm-input" id="jm-reject" type="text" placeholder="例如：销售, 外勤, 纯开发" value="${data.rejectKeywords || ""}"/>
    <label class="jm-label">🔑 OpenRouter API Key</label>
    <input class="jm-input" id="jm-apikey" type="password" placeholder="粘贴你的API Key" value="${data.apiKey || ""}"/>
    <button class="jm-save-btn" id="jm-save-btn">💾 保存设置</button>
    <div class="jm-save-msg" id="jm-save-msg"></div>
  `;
}

// ── 绑定所有事件 ──
function bindEvents() {
  // 关闭
  document.getElementById("jm-close").addEventListener("click", () => {
    overlayEl.remove();
    overlayEl = null;
  });

  // 最小化
  const body = document.getElementById("jm-body");
  const tabs = document.getElementById("jm-tabs");
  document.getElementById("jm-minimize").addEventListener("click", () => {
    const minimized = body.style.display === "none";
    body.style.display = minimized ? "" : "none";
    tabs.style.display = minimized ? "" : "none";
    document.getElementById("jm-minimize").textContent = minimized ? "—" : "□";
  });

  // Tab切换
  document.querySelectorAll(".jm-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      currentTab = tab.dataset.tab;
      document.querySelectorAll(".jm-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      switchTab(currentTab);
    });
  });
}

function switchTab(tab) {
  const body = document.getElementById("jm-body");
  if (tab === "analyze") {
    body.innerHTML = renderAnalyzeTab();
    bindAnalyze();
  } else if (tab === "scan") {
    body.innerHTML = renderScanTab();
    bindScan();
  } else if (tab === "history") {
    safeChrome(() => chrome.storage.local.get(["history"], (data) => {
      body.innerHTML = renderHistoryTab(data.history);
      // 展开/收起历史
      body.querySelectorAll(".jm-history-item").forEach(item => {
        item.addEventListener("click", () => item.classList.toggle("open"));
      });
      const clearBtn = document.getElementById("jm-clear-history");
      if (clearBtn) {
        clearBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          safeChrome(() => chrome.storage.local.set({ history: [] }));
          body.innerHTML = `<div class="jm-empty">暂无历史记录</div>`;
        });
      }
    });
  } else if (tab === "settings") {
    safeChrome(() => chrome.storage.local.get(["aboutMe", "rejectKeywords", "apiKey"], (data) => {
      body.innerHTML = renderSettingsTab(data);
      document.getElementById("jm-save-btn").addEventListener("click", () => {
        const aboutMe = document.getElementById("jm-about").value;
        const rejectKeywords = document.getElementById("jm-reject").value;
        const apiKey = document.getElementById("jm-apikey").value;
        safeChrome(() => chrome.storage.local.set({ aboutMe, rejectKeywords, apiKey }));
        const msg = document.getElementById("jm-save-msg");
        msg.textContent = "✅ 已保存！";
        setTimeout(() => msg.textContent = "", 2000);
      });
    });
  }
}

// ── 精析 ──
function bindAnalyze() {
  document.getElementById("jm-analyze-btn").addEventListener("click", () => {
    const resultDiv = document.getElementById("jm-result");
    safeChrome(() => chrome.storage.local.get(["aboutMe", "rejectKeywords", "apiKey"], async (data) => {
      const { aboutMe = "", rejectKeywords = "", apiKey = "" } = data;
      if (!apiKey) return showMsg(resultDiv, "请先去「⚙️ 设置」填写API Key！", "no-match");
      if (!aboutMe) return showMsg(resultDiv, "请先去「⚙️ 设置」填写你的简历！", "no-match");

      showMsg(resultDiv, "⏳ AI分析中，请稍候...", "loading");

      const pageText = document.body.innerText.slice(0, 8000);
      const prompt = `
你是一个资深求职顾问。根据用户背景判断以下职位是否值得投递。
无论职位描述是中文还是英文，请全部用中文回答。

【用户背景】
${aboutMe}
${rejectKeywords ? `\n【绝对不要的条件】\n${rejectKeywords}` : ""}

【招聘页面内容】
${pageText}

请严格按以下格式输出：
【匹配结果】✅ 匹配 或 ❌ 不匹配
【匹配分数】X/10
【职位名称】（从页面提取）
【为什么适合/不适合你】
- 理由1
- 理由2
- 理由3
【这个职位对你的成长价值】（1-2句）
【投递建议】（一句话结论）
      `;

      try {
        showMsg(resultDiv, "⏳ AI分析中，失败会自动重试（最多3次）...", "loading");
        const text = await callAI(apiKey, prompt);
        if (!text) return showMsg(resultDiv, "❌ AI无返回，请稍后再试。", "no-match");

        const matched = text.includes("✅");
        showMsg(resultDiv, text, matched ? "match" : "no-match");

        const titleMatch = text.match(/【职位名称】[：:]?\s*(.+)/);
        const scoreMatch = text.match(/【匹配分数】[：:]?\s*(\d+)/);
        saveHistory({
          title: titleMatch?.[1]?.trim() || document.title,
          score: scoreMatch?.[1] || "?",
          matched,
          result: text,
          host: location.hostname
        });
      } catch (e) {
        const msg = e.message || "";
        if (msg.includes("429") || msg.includes("rate") || msg.includes("limit")) {
          showMsg(resultDiv, "⏳ 免费模型限流中，请等待1-2分钟后重试。", "no-match");
        } else if (msg.includes("401") || msg.includes("auth") || msg.includes("key")) {
          showMsg(resultDiv, "🔑 API Key无效，请在设置中检查。", "no-match");
        } else {
          showMsg(resultDiv, "❌ 请求失败：" + msg.slice(0, 80), "no-match");
        }
      }
    });
  });
}

// ── 粗筛 ──
function bindScan() {
  document.getElementById("jm-scan-btn").addEventListener("click", () => {
    const scanDiv = document.getElementById("jm-scan-result");
    safeChrome(() => chrome.storage.local.get(["aboutMe", "rejectKeywords", "apiKey"], async (data) => {
      const { aboutMe = "", rejectKeywords = "", apiKey = "" } = data;
      if (!apiKey) return showMsg(scanDiv, "请先去「⚙️ 设置」填写API Key！", "no-match");
      if (!aboutMe) return showMsg(scanDiv, "请先去「⚙️ 设置」填写你的简历！", "no-match");

      showMsg(scanDiv, "⏳ 正在抓取职位列表...", "loading");

      // 优化：只抓取真正的职位标题，过滤导航/筛选文字
      const jobTitles = extractJobTitles();

      if (jobTitles.length === 0) {
        return showMsg(scanDiv, "未找到职位标题，请确认在职位列表页。", "no-match");
      }

      showMsg(scanDiv, `⏳ 找到 ${jobTitles.length} 个职位，AI筛选中...`, "loading");

      const prompt = `
你是求职助手。根据用户背景，从以下职位名称中筛选出值得点进去看的岗位。
无论职位名称是中文还是英文，请全部用中文回答。

【用户背景摘要】
${aboutMe.slice(0, 600)}
${rejectKeywords ? `\n【绝对不要的条件】${rejectKeywords}` : ""}

【职位名称列表】
${jobTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

输出格式（每行一条，不要额外说明）：
✅ 职位名称 — 一句话说明为什么值得看
如果全部不匹配，输出：暂无明显匹配职位，建议查看下一页。
❌ 不相关的职位直接跳过不列出。
      `;

      try {
        showMsg(scanDiv, `⏳ 找到 ${jobTitles.length} 个职位，AI筛选中（失败自动重试）...`, "loading");
        const text = await callAI(apiKey, prompt);
        if (!text) return showMsg(scanDiv, "❌ AI无返回，请稍后再试。", "no-match");
        showMsg(scanDiv, `📋 从 ${jobTitles.length} 个职位中筛出：\n\n` + text, "scan-result");
      } catch (e) {
        const msg = e.message || "";
        if (msg.includes("429") || msg.includes("rate") || msg.includes("limit")) {
          showMsg(scanDiv, "⏳ 免费模型限流中，请等待1-2分钟后重试。", "no-match");
        } else if (msg.includes("401") || msg.includes("auth") || msg.includes("key")) {
          showMsg(scanDiv, "🔑 API Key无效，请在设置中检查。", "no-match");
        } else {
          showMsg(scanDiv, "❌ 请求失败：" + msg.slice(0, 80), "no-match");
        }
      }
    });
  });
}

// ── 智能提取职位标题 ──
function extractJobTitles() {
  const results = new Set();

  // 策略1：优先找 <a> 或 heading 标签里的短文字（最像职位标题）
  const primaryTags = document.querySelectorAll("h1, h2, h3, h4, a");
  primaryTags.forEach(el => {
    const text = el.innerText?.trim().replace(/\s+/g, " ");
    if (isValidJobTitle(text)) results.add(text);
  });

  // 策略2：找包含"工程师|经理|专员|分析|运营|产品|设计|研究|算法|开发"等职位关键词的元素
  const allEls = document.querySelectorAll("div, span, li, td, p");
  const jobKeywords = /工程师|经理|专员|分析师|运营|产品|设计师|研究员|算法|开发|策划|顾问|architect|engineer|manager|analyst|designer|developer|intern|scientist|coordinator/i;
  allEls.forEach(el => {
    // 只看直接文字内容，不递归子节点（避免抓到整段描述）
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim())
      .join(" ")
      .trim();
    if (isValidJobTitle(directText) && jobKeywords.test(directText)) {
      results.add(directText);
    }
  });

  return Array.from(results).slice(0, 50);
}

function isValidJobTitle(text) {
  if (!text || text.length < 4 || text.length > 50) return false;
  if (/^\d+$/.test(text)) return false;
  // 过滤常见导航/筛选词
  const navWords = /^(登录|注册|搜索|筛选|清除|更多|查看|返回|首页|下一页|上一页|城市|类型|部门|全部|正式|实习|校招|社招|submit|login|next|prev|home|filter|search|apply|back|menu|close|open|职能|支持|研发|运营|产品|销售|设计|市场|游戏|工作地点|北京|上海|深圳|杭州|成都|广州)$/i;
  if (navWords.test(text)) return false;
  return true;
}

// ── 调用 OpenRouter（自动重试3次）──
async function callAI(apiKey, prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
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
          model: "openrouter/auto",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const d = await res.json();

      // 有真实内容，直接返回
      if (d.choices?.[0]?.message?.content) {
        return d.choices[0].message.content;
      }

      // 解析错误信息
      const errMsg = d.error?.message || d.error?.code || JSON.stringify(d);

      // 429限流 或 503服务不可用 → 等待后重试
      if ((d.error?.code === 429 || res.status === 503 || res.status === 429) && attempt < retries) {
        const wait = attempt * 2000; // 2s, 4s
        throw new Error(`RETRY:${wait}:${errMsg}`);
      }

      // 其他错误直接抛出
      throw new Error(errMsg);

    } catch (e) {
      const msg = e.message || "";
      if (msg.startsWith("RETRY:") && attempt < retries) {
        const parts = msg.split(":");
        const waitMs = parseInt(parts[1]) || 2000;
        const reason = parts.slice(2).join(":");
        console.warn(`[JobMatcher] 第${attempt}次失败，${waitMs/1000}秒后重试。原因: ${reason}`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      if (attempt === retries) throw e;
    }
  }
  return null;
}

// ── 工具函数 ──
function showMsg(el, text, cls) {
  el.textContent = text;
  el.className = "jm-result " + cls;
}

function saveHistory(entry) {
  safeChrome(() => chrome.storage.local.get(["history"], (data) => {
    const history = data.history || [];
    history.unshift({ ...entry, time: Date.now() });
    chrome.storage.local.set({ history: history.slice(0, 20) });
  }));
}

// ── 拖拽功能 ──
function makeDraggable(el, handle) {
  let startX, startY, startLeft, startTop;
  handle.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("jm-icon-btn")) return;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    el.classList.add("jm-dragging");
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.left = startLeft + "px";
    el.style.top = startTop + "px";

    function onMove(e) {
      el.style.left = (startLeft + e.clientX - startX) + "px";
      el.style.top  = (startTop  + e.clientY - startY) + "px";
    }
    function onUp() {
      el.classList.remove("jm-dragging");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

// ── 监听来自 popup 的指令 ──
chrome.runtime.onMessage.addListener((req) => {
  if (req.action === "toggleOverlay") {
    if (document.getElementById("jm-overlay")) {
      document.getElementById("jm-overlay").remove();
      overlayEl = null;
    } else {
      initOverlay();
      bindAnalyze();
    }
  }
});

// 悬浮窗不自动初始化，只在点击插件图标后由 popup.js 触发
