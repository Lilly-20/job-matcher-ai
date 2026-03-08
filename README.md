# 🎯 Job Matcher AI — Chrome Extension

> A Chrome extension that uses AI to analyze job postings and match them against your personal background — so you spend less time reading JDs and more time applying to the right ones.

Built by a job seeker, for job seekers. Powered by OpenRouter (free tier available).

---

## ✨ Features

### 🔍 精析 (Deep Analysis)
Open any job posting page and click **Analyze**. The AI reads the full job description and gives you:
- ✅ / ❌ Match result with a score out of 10
- Personalized reasons why this role fits (or doesn't fit) **your specific background**
- Growth value assessment — what skills you'd gain and where it leads
- A one-line recommendation on whether to apply

### ⚡ 粗筛 (Bulk Scan)
On a job listing page with 10–30+ positions, click **Scan** to:
- Automatically extract all job titles from the page
- Let AI filter down to only the roles worth clicking into
- Save you from reading every single listing manually

### 📋 历史 (History)
- Every analyzed job is automatically saved
- View past results, scores, and recommendations
- Click any entry to expand the full analysis
- Keeps up to 20 most recent results

### 🌐 Bilingual Support
- Works on both Chinese and English job pages
- Always responds in Chinese regardless of the language of the posting

### 🪟 Persistent Floating Panel
- Results live **on the page itself**, not in a popup
- Switching tabs or clicking away won't close it
- Draggable — move it anywhere on screen
- Minimize or close manually when done

---

## 🚀 Getting Started

### 1. Get a Free API Key
This extension uses [OpenRouter](https://openrouter.ai) to call AI models.

1. Go to [openrouter.ai](https://openrouter.ai) and sign up (free)
2. Navigate to **API Keys** → **Create Key**
3. Copy your key (starts with `sk-or-...`)

> The extension uses `openrouter/free` which automatically routes to available free models — no cost for normal personal use.

### 2. Install the Extension
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load unpacked** and select the `job-matcher` folder
5. The 🎯 icon will appear in your toolbar

### 3. Set Up Your Profile (One Time Only)
1. Click the 🎯 icon → **Open Floating Panel**
2. Go to **⚙️ 设置 (Settings)**
3. Paste your resume or write a self-introduction in the **关于我** field
4. Optionally add things you want to avoid (e.g. 销售, 纯开发)
5. Paste your API Key
6. Click **Save** — you only need to do this once

### 4. Start Matching Jobs
- **On a job listing page**: Switch to **⚡ 粗筛** tab → click Scan
- **On a job detail page**: Switch to **🔍 精析** tab → click Analyze

---

## 📁 File Structure

```
job-matcher/
├── manifest.json      # Chrome extension config (Manifest V3)
├── content.js         # Injected page script — floating panel UI & logic
├── overlay.css        # Styles for the floating panel
├── popup.html         # Extension popup (toggle button only)
├── popup.js           # Popup logic
└── README.md
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3 |
| UI | Vanilla JS + CSS (injected overlay) |
| AI | OpenRouter API (`openrouter/free`) |
| Storage | Chrome Storage API (local) |
| Language | JavaScript (no build tools needed) |

---

## 💡 Tips for Best Results

**Write a detailed profile** — The more context you give in **关于我**, the more accurate the matching. Include:
- Your degree and major
- Technical skills
- Internship/work experience highlights
- What type of roles you're targeting
- What you want to avoid

**Example profile structure:**
```
我是[姓名]，[学历]，专业[方向]，目标岗位是[产品经理/数据分析/...]。
技能：[Python/统计建模/...]
经验：[简短描述最相关的实习]
偏好：[AI产品、数据驱动、大厂...]
不适合：[纯开发、销售、...]
```

---

## 🔒 Privacy

- Your resume and API key are stored **locally** in your browser only (`chrome.storage.local`)
- No data is sent anywhere except directly to OpenRouter's API for analysis
- OpenRouter's free tier does not store conversation history by default

---

## 📌 Known Limitations

- Bulk scan accuracy depends on the website's HTML structure — some sites may have more noise than others
- Free AI models may occasionally be slower or less accurate than paid alternatives
- The extension reads page text only — it cannot interact with login-gated content

---

## 🗺 Roadmap

- [ ] Export history to CSV
- [ ] Highlight matching keywords directly on the job page
- [ ] Support for uploading resume PDF directly into the panel
- [ ] Rate each result manually (👍/👎) to improve future recommendations

---

## 👩‍💻 Author

Built as a personal productivity tool and portfolio project by a 2026 graduate with a background in Biostatistics and a passion for AI product development.

---

*If this helped you find a job, give it a ⭐*
