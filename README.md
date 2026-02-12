# SmartMail AI - Gmail Chrome Extension

An AI-powered Gmail extension that enhances your email writing experience with intelligent features.

## 🚀 Features

### ✨ Smart Polish
- **AI-Powered Email Enhancement** - Improve your emails with one click
- **Multiple Tones** - Choose from Formal, Casual, or Concise
- **Context-Aware** - Reads previous emails in the thread for better responses
- **Undo Feature** - Revert to original text if you don't like the result

### 📧 Smart Composition
- **Auto-Recipient Detection** - Automatically detects if you're writing to a person or organization
- **Smart Greetings** - Adds appropriate greetings based on recipient type
- **Auto-Signature** - Automatically adds your name, title, and custom signature
- **Profile Settings** - Configure your personal details once, use everywhere

### 📊 Email Management
- **Side Panel** - Quick access to recent emails
- **Email Categorization** - Automatically categorizes emails
- **Quick Actions** - Reply and delete directly from the side panel

## 🔧 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Chrome browser

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "Day -2 (Email Chrome extension)"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Keys**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   ⚠️ **IMPORTANT**: Never commit your `.env` file to git!

4. **Build the extension**
   ```bash
   npm run build
   ```

5. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## 🎯 Usage

### First Time Setup
1. Click the extension icon in Chrome
2. Go to Settings
3. Configure:
   - OpenAI API Key
   - Your Name
   - Your Title (optional)
   - Custom Signature (optional)

### Using Smart Polish
1. Open Gmail and compose a new email
2. Write your draft
3. Click the sparkle icon (✨) next to the formatting button
4. Select your preferred tone:
   - **Formal** - Professional business communication
   - **Casual** - Friendly, conversational tone
   - **Concise** - Brief and to the point
5. Your text will be enhanced automatically
6. Click "Undo Polish" within 10 seconds if you want to revert

### Profile Features
- The extension automatically adds appropriate greetings
- Your signature is added to the end of emails
- Recipient detection works automatically

## 🛠️ Development

### Project Structure
```
src/
├── background/      # Background service worker
├── components/      # React components
├── content/         # Content scripts (Gmail integration)
├── services/        # AI and API services
└── sidepanel/       # Side panel UI
```

### Available Scripts
- `npm run dev` - Development mode with hot reload
- `npm run build` - Production build
- `npm run preview` - Preview production build

### Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS
- **Build Tool**: Vite
- **AI**: OpenAI GPT-4
- **Storage**: Chrome Storage API

## 🔒 Security

### API Key Safety
- ✅ `.env` file is gitignored
- ✅ API keys stored in Chrome's secure storage
- ✅ Keys never exposed in client-side code
- ✅ All API calls go through background service worker

### Best Practices
1. Never commit `.env` file
2. Rotate API keys regularly
3. Use environment-specific keys
4. Monitor API usage

## 📝 Configuration

### User Settings (Stored Locally)
- OpenAI API Key
- User Name
- User Title
- Custom Signature

### Extension Permissions
- `storage` - Save user preferences
- `sidePanel` - Display email management panel
- `activeTab` - Interact with Gmail

## 🐛 Troubleshooting

### Polish Feature Not Working
1. Check if API key is configured in Settings
2. Open Console (F12) and look for errors
3. Verify you're on `mail.google.com`
4. Reload the extension

### Button Not Appearing
1. Refresh Gmail page
2. Close and reopen compose window
3. Check if extension is enabled
4. Reload extension in `chrome://extensions`

### API Errors
- Verify API key is valid
- Check OpenAI account has credits
- Look for rate limit errors in console

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

## ⚠️ Disclaimer

This extension uses OpenAI's API which incurs costs. Monitor your usage and set appropriate limits.

---

*Built with ❤️ for a more intelligent inbox.*
