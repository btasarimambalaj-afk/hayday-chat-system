const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced Logging System
class Logger {
  static levels = { error: 0, warn: 1, info: 2, debug: 3 };
  static currentLevel = Logger.levels[process.env.LOG_LEVEL] || Logger.levels.info;

  static log(level, message, meta = {}) {
    if (Logger.levels[level] <= Logger.currentLevel) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta.error ? meta.error.stack : '');
    }
  }

  static error(message, error, meta = {}) {
    Logger.log('error', message, { error, ...meta });
  }

  static warn(message, meta = {}) {
    Logger.log('warn', message, meta);
  }

  static info(message, meta = {}) {
    Logger.log('info', message, meta);
  }

  static debug(message, meta = {}) {
    Logger.log('debug', message, meta);
  }
}

// File Locking Mechanism
class FileLock {
  static locks = new Map();

  static async acquire(filePath) {
    const lockKey = path.resolve(filePath);
    
    if (FileLock.locks.has(lockKey)) {
      // Wait for existing lock to be released
      await new Promise(resolve => {
        const checkLock = () => {
          if (!FileLock.locks.has(lockKey)) {
            resolve();
          } else {
            setTimeout(checkLock, 10);
          }
        };
        checkLock();
      });
    }
    
    FileLock.locks.set(lockKey, Date.now());
    Logger.debug(`File lock acquired: ${lockKey}`);
  }

  static release(filePath) {
    const lockKey = path.resolve(filePath);
    FileLock.locks.delete(lockKey);
    Logger.debug(`File lock released: ${lockKey}`);
  }
}

// Enhanced File Manager
class FileManager {
  static async readJSONFile(filePath, defaultValue = []) {
    try {
      await FileLock.acquire(filePath);
      
      try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        if (error.code === 'ENOENT') {
          await FileManager.writeJSONFile(filePath, defaultValue);
          return defaultValue;
        }
        throw error;
      }
    } catch (error) {
      Logger.error(`Failed to read file: ${filePath}`, error);
      return defaultValue;
    } finally {
      FileLock.release(filePath);
    }
  }

  static async writeJSONFile(filePath, data) {
    try {
      await FileLock.acquire(filePath);
      
      const tempPath = `${filePath}.tmp.${Date.now()}`;
      const jsonData = JSON.stringify(data, null, 2);
      
      await fs.writeFile(tempPath, jsonData, 'utf8');
      await fs.rename(tempPath, filePath);
      
      return true;
    } catch (error) {
      Logger.error(`Failed to write file: ${filePath}`, error);
      return false;
    } finally {
      FileLock.release(filePath);
    }
  }
}

// Initialize OpenAI
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
  try {
    const { OpenAI } = require('openai');
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000,
      maxRetries: 2
    });
    Logger.info('OpenAI initialized successfully');
  } catch (error) {
    Logger.error('OpenAI initialization failed', error);
  }
} else {
  Logger.warn('OpenAI API key not provided');
}

// Initialize Telegram Bot
let telegramBot = null;
let telegramManager = null;

if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'your-telegram-bot-token-here') {
  try {
    const TelegramBot = require('node-telegram-bot-api');
    
    if (process.env.NODE_ENV === 'production') {
      telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
      setTimeout(async () => {
        try {
          const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook/telegram`;
          await telegramBot.setWebHook(webhookUrl);
          Logger.info('Telegram webhook set successfully');
        } catch (err) {
          Logger.error('Telegram webhook setup failed', err);
        }
      }, 5000);
    } else {
      telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
      Logger.info('Telegram bot initialized with polling');
    }
  } catch (error) {
    Logger.error('Telegram bot initialization failed', error);
  }
}

// Enhanced Middleware Setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"]
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.RENDER_EXTERNAL_URL, 'https://www.haydaymalzeme.com']
    : true,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// UTF-8 charset for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Serve static files
app.use(express.static('.', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// Rate limiting
const chatLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  message: { error: 'Too many requests' }
});

app.use('/api/chat/', chatLimiter);

// File paths
const FILES = {
  chatLog: './chat-log.json',
  knowledgeBase: './knowledge-base.json',
  analytics: './analytics.json',
  adminSessions: './admin-sessions.json'
};

// ChatBot Brain
class ChatBotBrain {
  constructor() {
    this.knowledgeBase = [];
    this.confidenceThreshold = 0.7;
    this.loadKnowledgeBase();
  }

  async loadKnowledgeBase() {
    this.knowledgeBase = await FileManager.readJSONFile(FILES.knowledgeBase, [
      {
        keywords: ['merhaba', 'selam', 'hey', 'hi'],
        response: 'Merhaba! HayDay Malzemeleri destek ekibine hoş geldiniz. Size nasıl yardımcı olabilirim?',
        confidence: 0.9,
        usage: 0
      },
      {
        keywords: ['altın', 'para', 'transfer'],
        response: 'Altın transferi hakkında detaylı bilgi için "Sorular & İletişim" sayfamızı ziyaret edebilirsiniz.',
        confidence: 0.8,
        usage: 0
      },
      {
        keywords: ['fiyat', 'ücret', 'ne kadar'],
        response: 'Ürün fiyatları için "Ürün Listenizi Oluşturun" sayfasını inceleyebilirsiniz.',
        confidence: 0.8,
        usage: 0
      },
      {
        keywords: ['depolama', 'ağıl', 'ambar'],
        response: 'Depolama hesaplamaları için "Depolama Hesaplayıcısı" sayfamızı kullanabilirsiniz.',
        confidence: 0.8,
        usage: 0
      },
      {
        keywords: ['makine', 'üretim', 'seviye'],
        response: 'Makine bilgileri için "Makineler" sayfamızdan detaylı bilgi alabilirsiniz.',
        confidence: 0.8,
        usage: 0
      }
    ]);
  }

  analyzeMessage(message) {
    const lowerMessage = message.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;

    for (const pattern of this.knowledgeBase) {
      let score = 0;
      for (const keyword of pattern.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      
      if (score > 0) {
        const confidence = (score / pattern.keywords.length) * pattern.confidence;
        if (confidence > highestScore) {
          highestScore = confidence;
          bestMatch = { ...pattern, calculatedConfidence: confidence };
        }
      }
    }

    return {
      match: bestMatch,
      confidence: highestScore,
      shouldEscalate: highestScore < this.confidenceThreshold
    };
  }
}

// AI Processor
class AIProcessor {
  constructor() {
    this.available = !!openai;
  }

  async processMessage(message) {
    if (!this.available) {
      return {
        response: 'AI sistemi şu anda kullanılamıyor. Lütfen Sorular & İletişim sayfamızdan bize ulaşın.',
        confidence: 0.3,
        tokensUsed: 0
      };
    }

    try {
      const systemPrompt = `Sen HayDay oyununun uzmanı ve HayDay Malzemeleri sitesinin müşteri destek asistanısın.

🎯 Görevin:
- HayDay oyunu ile ilgili soruları yanıtlamak
- Müşterileri doğru sayfalara yönlendirmek
- Türkçe, kibar ve kısa yanıtlar vermek

📚 Site sayfaları:
- Altın/para konuları: "Sorular & İletişim" sayfası
- Ürün fiyatları: "Ürün Listenizi Oluşturun" sayfası
- Depolama hesaplama: "Depolama Hesaplayıcısı" sayfası
- Makine bilgileri: "Makineler" sayfası

🚫 HayDay dışı konularda yardım etme, kibarca reddet.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      return {
        response: completion.choices[0].message.content,
        confidence: 0.85,
        tokensUsed: completion.usage.total_tokens
      };
    } catch (error) {
      Logger.error('OpenAI Error:', error);
      return {
        response: 'Üzgünüm, şu anda teknik bir sorun yaşıyorum. Lütfen biraz sonra tekrar deneyin.',
        confidence: 0.3,
        tokensUsed: 0
      };
    }
  }
}

// Telegram Manager
class TelegramManager {
  constructor() {
    this.authCodes = new Map();
    this.available = !!telegramBot;
  }

  async sendAuthCode(telegramId) {
    if (!this.available) return false;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.authCodes.set(telegramId, {
      code: code,
      expires: Date.now() + 5 * 60 * 1000
    });

    const message = `🔐 HayDay Admin Panel\n\n🔑 Giriş kodunuz: ${code}\n⏰ 5 dakika geçerli`;
    
    try {
      await telegramBot.sendMessage(telegramId, message);
      return true;
    } catch (error) {
      Logger.error('Telegram send error:', error);
      return false;
    }
  }

  verifyAuthCode(telegramId, code) {
    const authData = this.authCodes.get(telegramId);
    if (!authData) return false;
    if (Date.now() > authData.expires) {
      this.authCodes.delete(telegramId);
      return false;
    }
    if (authData.code === code) {
      this.authCodes.delete(telegramId);
      return true;
    }
    return false;
  }

  async notifyNewMessage(userMessage, response, role) {
    if (!this.available || !process.env.ADMIN_TELEGRAM_ID) return;

    const shortMessage = userMessage.length > 50 ? 
      userMessage.substring(0, 50) + '...' : userMessage;
    
    const message = `💬 Yeni mesaj\n\n👤 "${shortMessage}"\n🤖 ${role === 'chatbot' ? 'Bot' : role === 'ai' ? 'AI' : 'Admin'} yanıtladı`;
    
    try {
      await telegramBot.sendMessage(process.env.ADMIN_TELEGRAM_ID, message);
    } catch (error) {
      Logger.error('Telegram notification error:', error);
    }
  }
}

// Initialize systems
const chatBot = new ChatBotBrain();
const aiProcessor = openai ? new AIProcessor() : null;
telegramManager = telegramBot ? new TelegramManager() : null;

// API Routes

// Health check
app.get('/ping', async (req, res) => {
  try {
    const healthCheck = {
      ok: true,
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        openai: !!openai,
        telegram: !!telegramBot
      }
    };

    res.json(healthCheck);
  } catch (error) {
    res.status(500).json({ 
      ok: false, 
      error: 'Health check failed',
      timestamp: Date.now()
    });
  }
});

// Chat endpoints
app.post('/api/chat/send', [
  body('clientId').isLength({ min: 5, max: 50 }),
  body('message').isLength({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { clientId, message } = req.body;
    const sanitizedMessage = message.trim().replace(/\s+/g, ' ');

    // Add user message to log
    const chatLog = await FileManager.readJSONFile(FILES.chatLog, []);
    const userMessage = {
      timestamp: Date.now(),
      clientId: clientId,
      role: 'user',
      content: sanitizedMessage
    };
    chatLog.push(userMessage);

    // Process with ChatBot
    const botAnalysis = chatBot.analyzeMessage(sanitizedMessage);
    let response, role;

    if (!botAnalysis.shouldEscalate && botAnalysis.match) {
      response = botAnalysis.match.response;
      role = 'chatbot';
    } else if (aiProcessor) {
      const aiResult = await aiProcessor.processMessage(sanitizedMessage);
      response = aiResult.response;
      role = 'ai';
    } else {
      response = 'Size yardımcı olmaya çalışıyorum. Sorular & İletişim sayfamızdan bize ulaşabilirsiniz.';
      role = 'chatbot';
    }

    // Add bot response
    const botMessage = {
      timestamp: Date.now(),
      clientId: clientId,
      role: role,
      content: response,
      confidence: botAnalysis.confidence || 0.85
    };
    chatLog.push(botMessage);

    await FileManager.writeJSONFile(FILES.chatLog, chatLog);

    // Update analytics
    const analytics = await FileManager.readJSONFile(FILES.analytics, {});
    const today = moment().format('YYYY-MM-DD');
    if (!analytics[today]) {
      analytics[today] = { total: 0, chatbot: 0, ai: 0, admin: 0 };
    }
    analytics[today].total += 1;
    analytics[today][role] += 1;
    await FileManager.writeJSONFile(FILES.analytics, analytics);

    // Notify admin
    if (telegramManager) {
      await telegramManager.notifyNewMessage(sanitizedMessage, response, role);
    }

    res.json({ 
      reply: response, 
      role: role,
      confidence: botAnalysis.confidence || 0.85,
      timestamp: Date.now()
    });

  } catch (error) {
    Logger.error('Chat processing error', error);
    res.status(500).json({ 
      error: 'Internal server error',
      reply: 'Üzgünüm, bir hata oluştu. Lütfen Sorular & İletişim sayfamızdan bize ulaşın.',
      role: 'system',
      timestamp: Date.now()
    });
  }
});

app.get('/api/chat/history/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const chatLog = await FileManager.readJSONFile(FILES.chatLog, []);
    const userHistory = chatLog.filter(msg => msg.clientId === clientId);
    
    res.json({ history: userHistory });
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch history' });
  }
});

app.get('/api/chat/poll/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { after } = req.query;
  
  try {
    const chatLog = await FileManager.readJSONFile(FILES.chatLog, []);
    const afterTimestamp = parseInt(after) || 0;
    
    const newMessages = chatLog.filter(msg => 
      msg.clientId === clientId && 
      msg.timestamp > afterTimestamp
    );
    
    res.json({ 
      newMessages: newMessages,
      lastTimestamp: newMessages.length > 0 ? 
        Math.max(...newMessages.map(m => m.timestamp)) : afterTimestamp
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch new messages' });
  }
});

// Admin authentication middleware
async function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  try {
    const sessions = await FileManager.readJSONFile(FILES.adminSessions, {});
    const session = sessions[token];
    
    if (!session || Date.now() > session.expires) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.adminSession = session;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Admin endpoints
app.post('/api/admin/request-code', [
  body('telegramId').isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { telegramId } = req.body;
  
  if (telegramId !== process.env.ADMIN_TELEGRAM_ID) {
    return res.status(403).json({ error: 'Unauthorized Telegram ID' });
  }

  if (!telegramManager) {
    return res.status(503).json({ error: 'Telegram service unavailable' });
  }

  const sent = await telegramManager.sendAuthCode(telegramId);
  res.json({ success: sent, message: sent ? 'Code sent' : 'Failed to send code' });
});

app.post('/api/admin/verify-code', [
  body('telegramId').isNumeric(),
  body('code').isLength({ min: 6, max: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { telegramId, code } = req.body;
  
  if (telegramId !== process.env.ADMIN_TELEGRAM_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!telegramManager) {
    return res.status(503).json({ error: 'Telegram service unavailable' });
  }

  const isValid = telegramManager.verifyAuthCode(telegramId, code);
  
  if (isValid) {
    const sessionToken = uuidv4();
    const sessions = await FileManager.readJSONFile(FILES.adminSessions, {});
    sessions[sessionToken] = {
      telegramId: telegramId,
      created: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000),
      lastActivity: Date.now()
    };
    await FileManager.writeJSONFile(FILES.adminSessions, sessions);
    
    res.json({ success: true, token: sessionToken });
  } else {
    res.status(400).json({ error: 'Invalid or expired code' });
  }
});

app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const chatLog = await FileManager.readJSONFile(FILES.chatLog, []);
    const analytics = await FileManager.readJSONFile(FILES.analytics, {});
    
    const today = moment().format('YYYY-MM-DD');
    const todayStats = analytics[today] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
    
    const activeThreshold = Date.now() - (30 * 60 * 1000);
    const activeConversations = chatLog
      .filter(msg => msg.timestamp > activeThreshold)
      .reduce((acc, msg) => {
        if (!acc[msg.clientId]) {
          acc[msg.clientId] = { messages: [], lastActivity: msg.timestamp };
        }
        acc[msg.clientId].messages.push(msg);
        acc[msg.clientId].lastActivity = Math.max(acc[msg.clientId].lastActivity, msg.timestamp);
        return acc;
      }, {});

    res.json({
      stats: {
        today: todayStats,
        activeConversations: Object.keys(activeConversations).length,
        totalConversations: chatLog.length
      },
      activeChats: Object.entries(activeConversations).map(([clientId, data]) => ({
        clientId,
        lastMessage: data.messages[data.messages.length - 1],
        messageCount: data.messages.length,
        lastActivity: data.lastActivity
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch dashboard data' });
  }
});

// Telegram webhook
app.post('/webhook/telegram', async (req, res) => {
  if (!telegramBot) {
    return res.sendStatus(404);
  }

  try {
    const update = req.body;
    
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id.toString();
      const text = message.text;
      
      if (userId === process.env.ADMIN_TELEGRAM_ID && text && text.startsWith('/')) {
        const [command] = text.split(' ');
        
        let response = '';
        switch (command) {
          case '/start':
            response = '🤖 HayDay Chat Bot aktif!\n\nKomutlar:\n/stats - İstatistikler\n/ping - Sistem durumu\n/help - Yardım';
            break;
          case '/stats':
            const analytics = await FileManager.readJSONFile(FILES.analytics, {});
            const today = moment().format('YYYY-MM-DD');
            const todayStats = analytics[today] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
            response = `📊 Bugün: ${todayStats.total} mesaj\n🤖 Bot: ${todayStats.chatbot}\n🧠 AI: ${todayStats.ai}\n👨‍💼 Admin: ${todayStats.admin}`;
            break;
          case '/ping':
            response = `✅ Sistem çalışıyor\n⏰ Uptime: ${Math.round(process.uptime())} saniye\n💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`;
            break;
          default:
            response = 'Bilinmeyen komut. /help yazın.';
        }
        
        await telegramBot.sendMessage(chatId, response);
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    Logger.error('Telegram webhook error:', error);
    res.sendStatus(500);
  }
});

// Error handling
app.use((error, req, res, next) => {
  Logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');  
  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  Logger.info('HayDay Chat System started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    openai: !!openai,
    telegram: !!telegramBot,
    pid: process.pid
  });
  
  console.log(`
🚀 HayDay Chat System v1.0.0
╭─────────────────────────────────────────╮
│  🌐 Server: http://localhost:${PORT}      │
│  🔗 Health: http://localhost:${PORT}/ping │
│  🛠️ Admin: http://localhost:${PORT}/admin.html │
│  📊 Environment: ${process.env.NODE_ENV || 'development'} │
│  ✅ OpenAI: ${openai ? '🟢 Connected' : '🔴 Disabled'} │
│  📱 Telegram: ${telegramBot ? '🟢 Connected' : '🔴 Disabled'} │
╰─────────────────────────────────────────╯
  `);
});

module.exports = { app, server };