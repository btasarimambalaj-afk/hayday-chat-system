# 🤖 HayDay Chat System

Self-learning AI chat system for HayDay Malzemeleri website.

## 🚀 Features

- 🤖 **Smart ChatBot** - Self-learning pattern recognition
- 🧠 **AI Backup** - GPT-3.5 Turbo integration
- 📱 **Mobile-First** - Responsive design
- 🔄 **Cross-Page** - Continuous conversations
- 📊 **Admin Dashboard** - Real-time monitoring
- 📱 **Telegram Integration** - 2FA + notifications

## 🔧 Setup

### 1. Clone Repository
```bash
git clone https://github.com/USERNAME/hayday-chat-system.git
cd hayday-chat-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Start Development
```bash
npm run dev
```

### 5. Production Deploy
- Push to GitHub
- Connect to Render.com
- Set environment variables in Render dashboard

## 🌐 Site Integration

Add to every page footer:
```html
<script src="https://your-app.onrender.com/assets/js/chat-loader.js" defer></script>
```

## 📊 API Endpoints

- `POST /api/chat/send` - Send message
- `GET /api/chat/history/:id` - Get conversation
- `GET /api/admin/dashboard` - Admin stats
- `GET /ping` - Health check

## 🔑 Environment Variables

```bash
OPENAI_API_KEY=your-openai-key
TELEGRAM_BOT_TOKEN=your-bot-token
ADMIN_TELEGRAM_ID=your-telegram-id
```

## 📱 UptimeRobot Configuration

- URL: `https://your-app.onrender.com/ping`
- Interval: 3 minutes
- Method: GET

---

Made with ❤️ for HayDay Malzemeleri