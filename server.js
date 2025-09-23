const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Telegram Bot
let telegramBot;
if (process.env.NODE_ENV === 'production') {
  // Production: Webhook mode
  telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
  
  // Set webhook URL after server starts
  setTimeout(() => {
    const webhookUrl = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/webhook/telegram`;
    telegramBot.setWebHook(webhookUrl).then(() => {
      console.log('📱 Telegram webhook set successfully');
    }).catch(err => {
      console.error('❌ Telegram webhook setup failed:', err);
    });
  }, 5000);
} else {
  // Development: Polling mode  
  telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('📱 Telegram bot initialized with polling');
}

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// File paths
const FILES = {
  chatLog: './chat-log.json',
  knowledgeBase: './knowledge-base.json',
  analytics: './analytics.json',
  adminSessions: './admin-sessions.json'
};

// Utility functions
async function readJSONFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    await writeJSONFile(filePath, defaultValue);
    return defaultValue;
  }
}

async function writeJSONFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('File write error:', error);
    return false;
  }
}

// ChatBot Brain
class ChatBotBrain {
  constructor() {
    this.knowledgeBase = [];
    this.confidenceThreshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.7;
    this.loadKnowledgeBase();
  }

  async loadKnowledgeBase() {
    this.knowledgeBase = await readJSONFile(FILES.knowledgeBase, []);
    
    // Default patterns if empty
    if (this.knowledgeBase.length === 0) {
      this.knowledgeBase = [
        {
          keywords: ['merhaba', 'selam', 'hey', 'hi'],
          response: 'Merhaba! HayDay Malzemeleri destek ekibine hoş geldiniz. Size nasıl yardımcı olabilirim?',
          confidence: 0.9,
          usage: 0
        },
        {
          keywords: ['altın', 'para', 'transfer'],
          response: 'Altın transferi hakkında detaylı bilgi için "Sorular & İletişim" sayfamızı ziyaret edebilirsiniz. Size yardımcı olmak için buradayım!',
          confidence: 0.8,
          usage: 0
        },
        {
          keywords: ['fiyat', 'ücret', 'ne kadar'],
          response: 'Ürün fiyatları için "Ürün Listenizi Oluşturun" sayfasını inceleyebilirsiniz. Güncel fiyatlarımız orada yer almaktadır.',
          confidence: 0.8,
          usage: 0
        },
        {
          keywords: ['depolama', 'ağıl', 'ambar'],
          response: 'Depolama hesaplamaları için özel hesaplayıcımızı kullanabilirsiniz: "Depolama Hesaplayıcısı" sayfamızı ziyaret edin.',
          confidence: 0.8,
          usage: 0
        },
        {
          keywords: ['makine', 'üretim', 'seviye'],
          response: 'Makine bilgileri ve seviyeleri hakkında "Makineler" sayfamızdan detaylı bilgi alabilirsiniz.',
          confidence: 0.8,
          usage: 0
        }
      ];
      await writeJSONFile(FILES.knowledgeBase, this.knowledgeBase);
    }
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

  async updatePattern(pattern, feedback) {
    const index = this.knowledgeBase.findIndex(p => 
      JSON.stringify(p.keywords) === JSON.stringify(pattern.keywords)
    );
    
    if (index !== -1) {
      this.knowledgeBase[index].usage += 1;
      if (feedback === 'positive') {
        this.knowledgeBase[index].confidence = Math.min(1.0, this.knowledgeBase[index].confidence + 0.05);
      } else if (feedback === 'negative') {
        this.knowledgeBase[index].confidence = Math.max(0.1, this.knowledgeBase[index].confidence - 0.05);
      }
      await writeJSONFile(FILES.knowledgeBase, this.knowledgeBase);
    }
  }
}

// AI Integration
class AIProcessor {
  constructor() {
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.MAX_TOKENS_PER_REQUEST) || 150;
  }

  async processMessage(message, context = {}) {
    try {
      const systemPrompt = `Sen HayDay oyununun uzmanı ve HayDay Malzemeleri sitesinin müşteri destek asistanısın.

🎯 Görevin:
- HayDay oyunu ile ilgili soruları yanıtlamak
- Müşterileri doğru sayfalara yönlendirmek
- Türkçe, kibar ve kısa yanıtlar vermek

📄 Site sayfaları:
- Altın/para konuları: "Sorular & İletişim" sayfası
- Ürün fiyatları: "Ürün Listenizi Oluşturun" sayfası  
- Depolama hesaplama: "Depolama Hesaplayıcısı" sayfası
- Makine bilgileri: "Makineler" sayfası

🚫 HayDay dışı konularda yardım etme, kibarca reddet.

Mesaj: "${message}"`;

      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7
      });

      return {
        response: completion.choices[0].message.content,
        confidence: 0.85,
        tokensUsed: completion.usage.total_tokens
      };
    } catch (error) {
      console.error('OpenAI Error:', error);
      return {
        response: 'Üzgünüm, şu anda teknik bir sorun yaşıyorum. Lütfen biraz sonra tekrar deneyin veya Sorular & İletişim sayfamızdan bize ulaşın.',
        confidence: 0.3,
        tokensUsed: 0
      };
    }
  }
}

// Telegram Integration
class TelegramManager {
  constructor() {
    this.authCodes = new Map();
  }

  async sendAuthCode(telegramId) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.authCodes.set(telegramId, {
      code: code,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    const message = `🔐 HayDay Admin Panel\n\n🔑 Giriş kodunuz: ${code}\n⏰ 5 dakika geçerli`;
    
    try {
      await telegramBot.sendMessage(telegramId, message);
      return true;
    } catch (error) {
      console.error('Telegram send error:', error);
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
    const message = `💬 Yeni mesaj aldınız\n\n👤 Kullanıcı: "${userMessage}"\n🤖 ${role === 'chatbot' ? 'Bot' : role === 'ai' ? 'AI' : 'Admin'}: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`;
    
    try {
      await telegramBot.sendMessage(ADMIN_TELEGRAM_ID, message);
    } catch (error) {
      console.error('Telegram notification error:', error);
    }
  }
}

// Initialize systems
const chatBot = new ChatBotBrain();
const aiProcessor = new AIProcessor();
const telegramManager = new TelegramManager();

// API Routes

// Health check
app.get('/ping', (req, res) => {
  res.json({ 
    ok: true, 
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Chat endpoints - UUID validation relaxed for compatibility
app.post('/api/chat/send', [
  body('clientId').isLength({ min: 5, max: 50 }).withMessage('Invalid client ID format'),
  body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { clientId, message } = req.body;
  
  try {
    // Add user message to log
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const userMessage = {
      timestamp: Date.now(),
      clientId: clientId,
      role: 'user',
      content: message
    };
    chatLog.push(userMessage);

    // Process with ChatBot
    const botAnalysis = chatBot.analyzeMessage(message);
    let response, role;

    if (!botAnalysis.shouldEscalate && botAnalysis.match) {
      // ChatBot handles it
      response = botAnalysis.match.response;
      role = 'chatbot';
      
      // Update pattern usage
      await chatBot.updatePattern(botAnalysis.match, 'positive');
    } else {
      // Escalate to AI
      const aiResult = await aiProcessor.processMessage(message);
      response = aiResult.response;
      role = 'ai';
    }

    // Add bot/ai response to log
    const botMessage = {
      timestamp: Date.now(),
      clientId: clientId,
      role: role,
      content: response,
      confidence: botAnalysis.confidence || 0.85
    };
    chatLog.push(botMessage);

    // Save chat log
    await writeJSONFile(FILES.chatLog, chatLog);

    // Update analytics
    const analytics = await readJSONFile(FILES.analytics, {});
    const today = moment().format('YYYY-MM-DD');
    if (!analytics[today]) {
      analytics[today] = { total: 0, chatbot: 0, ai: 0, admin: 0 };
    }
    analytics[today].total += 1;
    analytics[today][role] += 1;
    await writeJSONFile(FILES.analytics, analytics);

    // Notify admin via Telegram
    await telegramManager.notifyNewMessage(message, response, role);

    res.json({ 
      reply: response, 
      role: role,
      confidence: botAnalysis.confidence || 0.85,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      reply: 'Üzgünüm, bir hata oluştu. Lütfen Sorular & İletişim sayfamızdan bize ulaşın.',
      role: 'system'
    });
  }
});

app.get('/api/chat/history/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const userHistory = chatLog.filter(msg => msg.clientId === clientId);
    
    res.json({ history: userHistory });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Could not fetch history' });
  }
});

// Admin endpoints
app.post('/api/admin/request-code', [
  body('telegramId').isNumeric().withMessage('Invalid Telegram ID')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { telegramId } = req.body;
  
  if (telegramId !== ADMIN_TELEGRAM_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const sent = await telegramManager.sendAuthCode(telegramId);
  res.json({ success: sent });
});

app.post('/api/admin/verify-code', [
  body('telegramId').isNumeric().withMessage('Invalid Telegram ID'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { telegramId, code } = req.body;
  
  if (telegramId !== ADMIN_TELEGRAM_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const isValid = telegramManager.verifyAuthCode(telegramId, code);
  
  if (isValid) {
    const sessionToken = uuidv4();
    const sessions = await readJSONFile(FILES.adminSessions, {});
    sessions[sessionToken] = {
      telegramId: telegramId,
      created: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    await writeJSONFile(FILES.adminSessions, sessions);
    
    res.json({ success: true, token: sessionToken });
  } else {
    res.status(400).json({ error: 'Invalid or expired code' });
  }
});

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const analytics = await readJSONFile(FILES.analytics, {});
    
    const today = moment().format('YYYY-MM-DD');
    
    // Calculate stats
    const todayStats = analytics[today] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
    
    // Active conversations (last 30 minutes)
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
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Could not fetch dashboard data' });
  }
});

// Real-time polling endpoint
app.get('/api/chat/poll/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { after } = req.query;
  
  try {
    const chatLog = await readJSONFile(FILES.chatLog, []);
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
    console.error('Polling error:', error);
    res.status(500).json({ error: 'Could not fetch new messages' });
  }
});

// Telegram webhook endpoint
app.post('/webhook/telegram', async (req, res) => {
  try {
    const update = req.body;
    
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id.toString();
      const text = message.text;
      
      // Only respond to admin
      if (userId === ADMIN_TELEGRAM_ID) {
        if (text && text.startsWith('/')) {
          const [command] = text.split(' ');
          
          let response = '';
          switch (command) {
            case '/start':
              response = '🤖 HayDay Chat Bot aktif! /help yazın.';
              break;
            case '/help':
              response = `🤖 Komutlar:\n/stats - İstatistikler\n/ping - Sistem durumu`;
              break;
            case '/stats':
              const analytics = await readJSONFile(FILES.analytics, {});
              const today = moment().format('YYYY-MM-DD');
              const todayStats = analytics[today] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
              response = `📊 Bugün: ${todayStats.total} mesaj\n🤖 Bot: ${todayStats.chatbot}\n🧠 AI: ${todayStats.ai}`;
              break;
            case '/ping':
              response = `✅ Sistem çalışıyor\n⏰ Uptime: ${Math.round(process.uptime())} saniye`;
              break;
            default:
              response = 'Bilinmeyen komut. /help yazın.';
          }
          
          await telegramBot.sendMessage(chatId, response);
        }
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.sendStatus(500);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 HayDay Chat System running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/ping`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
