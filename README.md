# ⚡ SmartMail AI - Next-Gen Email Intelligence

SmartMail AI is a premium Chrome Extension that transforms your Gmail experience with high-performance AI. Built for executives and power users, it provides human-grade summaries, intelligent prioritization, and professional email polishing through a stunning, monochrome "Lofi" interface inspired by professional creative tools.


## ✨ Core Features

### 🧠 Strategic Intelligence
- **Executive Briefing**: Get real, human-like summaries of your inbox state, not just counts. Now with on-demand refresh to save credits.
- **Priority Action Items**: The AI identifies the single most critical task in your inbox so you never miss a deadline.
- **Smart Stream**: Emails are automatically categorized by urgency using advanced semantic analysis.

### ✍️ Professional Polishing
- **Tone Control**: Rewrite drafts to be strictly Formal, Casual, or Concise in one click.
- **AI Response Generation**: Generate high-quality follow-ups based on simple prompts.
- **Contextual Polishing**: Integrated directly into your workflow for seamless editing.

### 🛡️ Privacy-First Security
- **Local Key Management**: Your OpenAI API key is stored locally in your browser's encrypted storage. 
- **Zero Server Retention**: Your emails and keys are never sent to our servers. All AI calls happen directly from your browser to OpenAI.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 6, TypeScript
- **Styling**: Tailwind CSS v4 (Monochrome Lofi Theme)
- **Animations**: Framer Motion & Lucide Icons
- **AI Engine**: 
  - **OpenAI**: `gpt-4o-mini` for all reasoning, generation, and classification tasks.

## 🚀 Getting Started

### 1. Installation
1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Run `npm run build` to generate the production bundle.
4. Open Chrome and navigate to `chrome://extensions/`.
5. Enable **Developer mode** and click **Load unpacked**.
6. Select the `dist` folder from this project.

### 2. Configuration
1. Open the SmartMail AI side panel in Gmail.
2. Click the **Settings Gear** (⚙️) icon.
3. Paste your **OpenAI API Key**.
4. Click **Save OpenAI Key**.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---
*Built with ❤️ for a more intelligent inbox.*
