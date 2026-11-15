# 個人知識庫（Personal Knowledge Base）

一個零前端框架、純靜態架構的個人主題式知識庫網站，專為 **GitHub Pages** 部署設計。

## 專案特色

- **純靜態零建置（Zero-Build）**：僅使用原生 `HTML5`、`CSS3`、`Vanilla JavaScript`，搭配 CDN 版 `marked.js`、`highlight.js` 與 `KaTeX`，上傳至 GitHub 即可直接運行。
- **技術文件雙欄佈局**：左側固定目錄樹與即時搜尋框，右側寬鬆閱讀區，支援深色／淺色模式切換（`localStorage` 記憶偏好）與手機版響應式選單。
- **雙區塊主題筆記格式**：每份筆記上半部為動態融合的「核心重點總整理」，下半部保留由新到舊的「每日學習紀錄」。
- **純 HTML Q 版動物解說插圖**：內建 `.pkb-illustration-container` 樣式，支援以純 HTML + inline-SVG 繪製 Duolingo 風格角色解說卡片。

## 目錄結構

```text
/
├── index.html          # 單一入口網頁
├── style.css           # 全站樣式與深淺色主題變數
├── app.js              # 動態讀取 manifest.json 與渲染 Markdown 筆記
├── manifest.json       # 主題目錄索引檔
├── AGENTS.md           # AI 協作與筆記整理規範
├── README.md           # 專案說明文件
└── notes/              # 主題式 Markdown 筆記存放區
    └── microrna-gene-regulation.md
```

## GitHub Pages 部署方式

1. 在 GitHub 建立一個新的 Repository（例如 `personal-kb`）。
2. 將本專案所有檔案與 `notes/` 資料夾推送至 `main` 分支根目錄。
3. 前往 Repository 的 **Settings** → **Pages**。
4. 在 **Build and deployment** 下方將 **Source** 設為 `Deploy from a branch`，Branch 選擇 `main` 與 `/ (root)`，點擊 **Save**。
5. 等待約 1 分鐘即可透過 `https://<你的帳號>.github.io/<repo名稱>/` 瀏覽知識庫。

## 本機預覽方式

由於瀏覽器安全性限制（`fetch` 讀取本機 JSON/MD 需透過 HTTP 協定），請於專案根目錄執行任一簡易伺服器指令：

```bash
python3 -m http.server 8000
```

接著開啟瀏覽器造訪 `http://localhost:8000` 即可預覽。
