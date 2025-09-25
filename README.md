# AI Browser Prototype - AI 瀏覽器原型

這是來自 [PathUnfold.com](https://www.pathunfold.com/mike) 的課程專案 - 一個 AI 驱動的學習社群。

## 不同阶段的 Commits

- Session 3: TypeScript rewrite: <https://github.com/MikeBets/ai-browser-v3/commit/fd509a22d5e80f83eb551c902ee87ea8a1805dbe>

- Session 4: OpenRouter: <https://github.com/MikeBets/ai-browser-v3/commit/f15cbc8a6f1c61acad3dc5522bb16233857d5cf8>

- Session 5: Streamdown for markdown: <https://github.com/MikeBets/ai-browser-v3>

## 關於這門課程

這個專案是 Mike 在 PathUnfold 獨家課程內容的一部分。Mike 是共同創辦人，來自加拿大的知名開發者，專注於幫助普通人運用 AI 透過「vibe coding」將想法快速落地。

## 專案概述

**AI Browser Prototype** 是一個使用 Electron-Vite 構建的 AI 增強瀏覽器應用程式，類似於 Perplexity Comet。它結合了網頁瀏覽和 AI 聊天功能，可進行內容分析和自然語言導航。

### 主要功能

- 🌐 **網頁瀏覽器**：完整的 webview 瀏覽體驗
- 🤖 **AI 助手**：透過 OpenRouter 預設使用 x-ai/grok-4-fast 模型分析網頁內容
- 💬 **聊天紀錄**：完整對話歷史與美觀介面
- 🎯 **智慧導航**：使用自然語言控制瀏覽

### 技術堆疊

- **Electron-Vite**：快速開發與熱重載
- **React**：現代前端框架
- **OpenRouter AI**：透過 Vercel AI SDK 使用多供應商模型（預設 x-ai/grok-4-fast）
- **Web Speech API**：語音識別功能
- **Node.js 18+**：執行環境

### 快速開始

```bash
# 安裝依賴套件
npm install

# 啟動開發伺服器
npm run dev

# 建置生產版本
npm run build
```

### 環境設定

建立 `.env` 檔案並加入您的 API 金鑰：
```
OPENROUTER_API_KEY=your_api_key_here
```

## 課程背景

這個專案展示了 Mike 在 PathUnfold 課程中教授的實用 AI 應用程式開發技術，包括：

- Electron 桌面應用程式開發
- AI SDK 整合與串流
- 語音介面實作
- 中文語言處理
- 現代 React 模式

## 了解更多

造訪 [PathUnfold.com](https://www.pathunfold.com/mike) 加入 Mike 的 AI 開發社群，並存取更多課程：

- Claude Code/Gemini CLI/Codex CLI 101
- AI App Sprint
- Cursor Web App 實戰
- Vibe Coding 核心基礎

---

**PathUnfold Community** - 用 vibe coding，把想法快速落地
