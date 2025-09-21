// Admin polling endpoint for real-time updates
app.get('/api/chat/poll/admin', async (req, res) => {
  const { after } = req.query;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Verify admin session
  const sessions = await readJSONFile(FILES.adminSessions, {});
  if (!sessions[token] || sessions[token].expires < Date.now()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const afterTimestamp = parseInt(after) || 0;
    
    const newMessages = chatLog.filter(msg => 
      msg.timestamp > afterTimestamp
    );
    
    res.json({ 
      newMessages: newMessages,
      lastTimestamp: newMessages.length > 0 ? 
        Math.max(...newMessages.map(m => m.timestamp)) : afterTimestamp
    });
  } catch (error) {
    console.error('Admin polling error:', error);
    res.status(500).json({ error: 'Could not fetch updates' });
  }
});

// Analytics endpoints
app.get('/api/analytics/stats', async (req, res) => {
  const { period = 'daily' } = req.query;
  
  try {
    const analytics = await readJSONFile(FILES.analytics, {});
    const chatLog = await readJSONFile(FILES.chatLog, []);
    
    let stats = {};
    const now = moment();
    
    switch (period) {
      case 'daily':
        const today = now.format('YYYY-MM-DD');
        stats = analytics[today] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
        break;
        
      case 'weekly':
        const weekStart = now.startOf('week');
        let weeklyTotal = { total: 0, chatbot: 0, ai: 0, admin: 0 };
        for (let i = 0; i < 7; i++) {
          const day = weekStart.clone().add(i, 'days').format('YYYY-MM-DD');
          const dayStats = analytics[day] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
          weeklyTotal.total += dayStats.total;
          weeklyTotal.chatbot += dayStats.chatbot;
          weeklyTotal.ai += dayStats.ai;
          weeklyTotal.admin += dayStats.admin;
        }
        stats = weeklyTotal;
        break;
        
      case 'monthly':
        const monthStart = now.startOf('month');
        const monthEnd = now.endOf('month');
        let monthlyTotal = { total: 0, chatbot: 0, ai: 0, admin: 0 };
        
        let current = monthStart.clone();
        while (current.isSameOrBefore(monthEnd, 'day')) {
          const day = current.format('YYYY-MM-DD');
          const dayStats = analytics[day] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
          monthlyTotal.total += dayStats.total;
          monthlyTotal.chatbot += dayStats.chatbot;
          monthlyTotal.ai += dayStats.ai;
          monthlyTotal.admin += dayStats.admin;
          current.add(1, 'day');
        }
        stats = monthlyTotal;
        break;
    }
    
    // Add role distribution percentages
    if (stats.total > 0) {
      stats.roleDistribution = {
        chatbot: Math.round((stats.chatbot / stats.total) * 100),
        ai: Math.round((stats.ai / stats.total) * 100),
        admin: Math.round((stats.admin / stats.total) * 100)
      };
    }
    
    res.json({
      period: period,
      stats: stats,
      messageCount: chatLog.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    res.status(500).json({ error: 'Could not fetch analytics' });
  }
});

app.get('/api/analytics/performance', async (req, res) => {
  try {
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const analytics = await readJSONFile(FILES.analytics, {});
    
    // Calculate response times from recent conversations
    const recent = chatLog.filter(msg => 
      msg.timestamp > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
    );
    
    // Group by conversation and calculate response times
    const conversations = {};
    recent.forEach(msg => {
      if (!conversations[msg.clientId]) {
        conversations[msg.clientId] = [];
      }
      conversations[msg.clientId].push(msg);
    });
    
    const responseTimes = [];
    Object.values(conversations).forEach(conv => {
      for (let i = 1; i < conv.length; i++) {
        if (conv[i].role !== 'user' && conv[i-1].role === 'user') {
          responseTimes.push(conv[i].timestamp - conv[i-1].timestamp);
        }
      }
    });
    
    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    
    // Calculate escalation rate
    const today = moment().format('YYYY-MM-DD');
    const todayStats = analytics[today] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
    const escalationRate = todayStats.total > 0 ? 
      Math.round(((todayStats.ai + todayStats.admin) / todayStats.total) * 100) : 0;
    
    res.json({
      responseTime: Math.round(avgResponseTime / 1000), // Convert to seconds
      escalationRate: escalationRate,
      uptime: Math.round(process.uptime()),
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      totalMessages: chatLog.length,
      activeConnections: Object.keys(conversations).length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({ error: 'Could not fetch performance data' });
  }
});

// System health endpoint
app.get('/api/system/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
    
    // Test file system
    try {
      await readJSONFile(FILES.chatLog, []);
      health.database = 'operational';
    } catch {
      health.database = 'error';
      health.status = 'degraded';
    }
    
    // Test OpenAI (if configured)
    if (process.env.OPENAI_API_KEY) {
      try {
        await openai.models.list();
        health.openai = 'operational';
      } catch {
        health.openai = 'error';
        health.status = 'degraded';
      }
    } else {
      health.openai = 'not_configured';
    }
    
    // Test Telegram (if configured)
    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        await telegramBot.getMe();
        health.telegram = 'operational';
      } catch {
        health.telegram = 'error';
        health.status = 'degraded';
      }
    } else {
      health.telegram = 'not_configured';
    }
    
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Enhanced Telegram webhook endpoint
app.post('/webhook/telegram', async (req, res) => {
  try {
    const update = req.body;
    
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id.toString();
      const text = message.text;
      
      // Only respond to admin
      if (userId !== ADMIN_TELEGRAM_ID) {
        await telegramBot.sendMessage(chatId, '❌ Bu bot sadece yetkilendirilmiş kullanıcılar için.');
        res.sendStatus(200);
        return;
      }
      
      // Handle commands
      if (text && text.startsWith('/')) {
        const [command, ...args] = text.split(' ');
        
        switch (command) {
          case '/start':
            await handleTelegramStart(chatId);
            break;
          case '/help':
            await handleTelegramHelp(chatId);
            break;
          case '/stats':
            await handleTelegramStats(chatId);
            break;
          case '/active':
            await handleTelegramActiveChats(chatId);
            break;
          case '/ping':
            await handleTelegramPing(chatId);
            break;
          case '/admin':
            await handleTelegramAdmin(chatId);
            break;
          default:
            await telegramBot.sendMessage(chatId, `❓ Bilinmeyen komut: ${command}\n\nYardım için /help yazın.`);
        }
      } else if (text) {
        // Handle regular messages
        await telegramBot.sendMessage(chatId, `
💬 <b>Mesaj Alındı</b>

"${text}"

🤖 Ben bir bot olduğum için sohbet edemem, ama size nasıl yardımcı olabilirim?

Komutlar için /help yazın.
        `, { parse_mode: 'HTML' });
      }
    } else if (update.callback_query) {
      // Handle inline keyboard callbacks
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      
      // Answer callback query
      await telegramBot.answerCallbackQuery(callbackQuery.id);
      
      // Handle callback commands
      if (data.startsWith('cmd_')) {
        const command = data.replace('cmd_', '');
        switch (command) {
          case 'stats':
            await handleTelegramStats(chatId);
            break;
          case 'active':
            await handleTelegramActiveChats(chatId);
            break;
          case 'ping':
            await handleTelegramPing(chatId);
            break;
        }
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.sendStatus(500);
  }
});

// Enhanced Telegram command handlers
async function handleTelegramStart(chatId) {
  const welcomeMessage = `
🤖 <b>HayDay Chat Bot'a Hoş Geldiniz!</b>

Ben HayDay Malzemeleri'nin resmi destek botuyum.

<b>📋 Mevcut Komutlar:</b>
/help - Yardım menüsü
/stats - Sistem istatistikleri  
/active - Aktif sohbetler
/admin - Admin paneli
/ping - Sistem durumu

<b>🔗 Bağlantılar:</b>
• <a href="${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}">Chat Sistemi</a>
• <a href="${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/admin.html">Admin Panel</a>

⚡ Size nasıl yardımcı olabilirim?
  `;

  await telegramBot.sendMessage(chatId, welcomeMessage, { 
    parse_mode: 'HTML',
    disable_web_page_preview: true 
  });
}

async function handleTelegramHelp(chatId) {
  const helpMessage = `
🆘 <b>HayDay Chat Bot - Yardım</b>

<b>📊 İstatistik Komutları:</b>
/stats - Günlük mesaj istatistikleri
/active - Aktif sohbet listesi
/ping - Sistem sağlık durumu

<b>🛠️ Yönetim Komutları:</b>
/admin - Admin paneline git
/start - Ana menü
/help - Bu yardım mesajı

<b>💬 Özellikler:</b>
• Real-time bildirimler
• Otomatik istatistikler
• Sistem monitoring
• Admin müdahale alerts

⚡ <i>Komutları kullanmak için / ile başlayın</i>
  `;

  await telegramBot.sendMessage(chatId, helpMessage, { 
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 İstatistikler', callback_data: 'cmd_stats' },
          { text: '💬 Aktif Chatler', callback_data: 'cmd_active' }
        ],
        [
          { text: '🛠️ Admin Panel', url: `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/admin.html` }
        ]
      ]
    }
  });
}

async function handleTelegramStats(chatId) {
  try {
    const analytics = await readJSONFile(FILES.analytics, {});
    const today = moment().format('YYYY-MM-DD');
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    
    const todayStats = analytics[today] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
    const yesterdayStats = analytics[yesterday] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
    
    // Calculate weekly stats
    const weekStart = moment().startOf('week');
    let weeklyTotal = 0;
    for (let i = 0; i < 7; i++) {
      const day = weekStart.clone().add(i, 'days').format('YYYY-MM-DD');
      weeklyTotal += (analytics[day]?.total || 0);
    }

    const statsMessage = `
📊 <b>Sistem İstatistikleri</b>

<b>📈 Bugün (${moment().format('DD/MM')})</b>
💬 Toplam: ${todayStats.total} mesaj
🤖 ChatBot: ${todayStats.chatbot} (${todayStats.total > 0 ? Math.round(todayStats.chatbot/todayStats.total*100) : 0}%)
🧠 AI: ${todayStats.ai} (${todayStats.total > 0 ? Math.round(todayStats.ai/todayStats.total*100) : 0}%)
👨‍💼 Admin: ${todayStats.admin} (${todayStats.total > 0 ? Math.round(todayStats.admin/todayStats.total*100) : 0}%)

<b>📊 Dün (${moment().subtract(1, 'day').format('DD/MM')})</b>
💬 Toplam: ${yesterdayStats.total} mesaj
${todayStats.total > yesterdayStats.total ? '📈' : todayStats.total < yesterdayStats.total ? '📉' : '➡️'} ${todayStats.total > yesterdayStats.total ? '+' : ''}${todayStats.total - yesterdayStats.total}

<b>📅 Bu Hafta</b>
💬 Toplam: ${weeklyTotal} mesaj
📊 Günlük Ort: ${Math.round(weeklyTotal / 7)} mesaj

⏰ Son güncelleme: ${moment().format('HH:mm:ss')}
    `;

    await telegramBot.sendMessage(chatId, statsMessage, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Yenile', callback_data: 'cmd_stats' },
            { text: '💬 Aktif Chatler', callback_data: 'cmd_active' }
          ]
        ]
      }
    });
  } catch (error) {
    await telegramBot.sendMessage(chatId, '❌ İstatistikler alınamadı: ' + error.message);
  }
}

async function handleTelegramActiveChats(chatId) {
  try {
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const activeThreshold = Date.now() - (30 * 60 * 1000); // 30 minutes
    
    const activeConversations = chatLog
      .filter(msg => msg.timestamp > activeThreshold)
      .reduce((acc, msg) => {
        if (!acc[msg.clientId]) {
          acc[msg.clientId] = { 
            messages: [], 
            lastActivity: msg.timestamp,
            roles: new Set()
          };
        }
        acc[msg.clientId].messages.push(msg);
        acc[msg.clientId].lastActivity = Math.max(acc[msg.clientId].lastActivity, msg.timestamp);
        acc[msg.clientId].roles.add(msg.role);
        return acc;
      }, {});
    
    const activeCount = Object.keys(activeConversations).length;
    
    if (activeCount === 0) {
      await telegramBot.sendMessage(chatId, '🌙 <b>Aktif sohbet yok</b>\n\nSon 30 dakikada hiç mesaj alınmadı.', { 
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Yenile', callback_data: 'cmd_active' }]
          ]
        }
      });
      return;
    }
    
    let message = `💬 <b>Aktif Sohbetler (${activeCount})</b>\n\n`;
    
    Object.entries(activeConversations)
      .sort(([,a], [,b]) => b.lastActivity - a.lastActivity)
      .slice(0, 10)
      .forEach(([clientId, data], index) => {
        const shortId = clientId.substring(clientId.length - 6);
        const time = moment(data.lastActivity).format('HH:mm');
        const lastMsg = data.messages[data.messages.length - 1];
        const preview = lastMsg?.content?.substring(0, 40) || 'Mesaj yok';
        const roleIcons = Array.from(data.roles).map(role => {
          switch(role) {
            case 'user': return '👤';
            case 'chatbot': return '🤖';
            case 'ai': return '🧠';
            case 'admin': return '👨‍💼';
            default: return '❓';
          }
        }).join('');
        
        message += `${index + 1}. <b>${shortId}</b> ${roleIcons}\n`;
        message += `   ⏰ ${time} • ${data.messages.length} mesaj\n`;
        message += `   💭 "${preview}${preview.length >= 40 ? '...' : ''}"\n\n`;
      });
    
    if (activeCount > 10) {
      message += `<i>... ve ${activeCount - 10} sohbet daha</i>\n\n`;
    }
    
    message += `🔄 Son güncelleme: ${moment().format('HH:mm:ss')}`;

    await telegramBot.sendMessage(chatId, message, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Yenile', callback_data: 'cmd_active' },
            { text: '📊 İstatistikler', callback_data: 'cmd_stats' }
          ],
          [
            { text: '🛠️ Admin Panel', url: `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/admin.html` }
          ]
        ]
      }
    });
  } catch (error) {
    await telegramBot.sendMessage(chatId, '❌ Aktif sohbetler alınamadı: ' + error.message);
  }
}

async function handleTelegramPing(chatId) {
  const startTime = Date.now();
  
  try {
    // Test database access
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const dbTime = Date.now() - startTime;
    
    // Test OpenAI (if available)
    let openaiStatus = '❓ Test edilmedi';
    try {
      if (process.env.OPENAI_API_KEY) {
        await openai.models.list();
        openaiStatus = '✅ Bağlı';
      }
    } catch {
      openaiStatus = '❌ Bağlantı sorunu';
    }
    
    const uptime = process.uptime();
    const uptimeFormatted = moment.duration(uptime * 1000).humanize();
    
    const pingMessage = `
🏥 <b>Sistem Durumu</b>

<b>⚡ Performans</b>
🏃‍♂️ Response Time: ${Date.now() - startTime}ms
💾 Database: ${dbTime}ms
🧠 OpenAI: ${openaiStatus}

<b>📊 Sistem</b>
⏰ Uptime: ${uptimeFormatted}
💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
📈 Mesaj Sayısı: ${chatLog.length}

<b>🔗 Servisler</b>
🤖 Chat API: ✅ Aktif
📱 Telegram Bot: ✅ Aktif  
🛠️ Admin Panel: ✅ Aktif

✅ <b>Tüm sistemler normal çalışıyor</b>

🕐 Kontrol zamanı: ${moment().format('HH:mm:ss')}
    `;

    await telegramBot.sendMessage(chatId, pingMessage, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Tekrar Test Et', callback_data: 'cmd_ping' }]
        ]
      }
    });
  } catch (error) {
    await telegramBot.sendMessage(chatId, `❌ <b>Sistem Hatası</b>\n\n${error.message}`, { parse_mode: 'HTML' });
  }
}

async function handleTelegramAdmin(chatId) {
  const adminUrl = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/admin.html`;
  const chatUrl = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`;
  
  const adminMessage = `
🛠️ <b>HayDay Chat Admin</b>

<b>🔗 Hızlı Bağlantılar:</b>
• <a href="${adminUrl}">Admin Dashboard</a>
• <a href="${chatUrl}">Chat Sistemi</a>
• <a href="${chatUrl}/login.html">Admin Girişi</a>

<b>📱 Telegram Komutları:</b>
/stats - İstatistikler
/active - Aktif sohbetler  
/ping - Sistem durumu
/help - Yardım menüsü

<b>⚡ Hızlı Eylemler:</b>
  `;

  await telegramBot.sendMessage(chatId, adminMessage, { 
    parse_mode: 'HTML',
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🛠️ Admin Panel', url: adminUrl },
          { text: '💬 Chat Sistemi', url: chatUrl }
        ],
        [
          { text: '📊 İstatistikler', callback_data: 'cmd_stats' },
          { text: '🏥 Sistem Durumu', callback_data: 'cmd_ping' }
        ]
      ]
    }
  });
}const express = require('express');
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
app.use(helmet());
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

📚 Site sayfaları:
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

// Chat endpoints
app.post('/api/chat/send', [
  body('clientId').isUUID().withMessage('Invalid client ID'),
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
    const thisWeek = moment().startOf('week').format('YYYY-MM-DD');
    const thisMonth = moment().startOf('month').format('YYYY-MM-DD');
    
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

// Missing endpoints implementation

// Chat feedback endpoint
app.post('/api/chat/feedback', [
  body('messageId').isNumeric().withMessage('Invalid message ID'),
  body('rating').isIn(['positive', 'negative', 'neutral']).withMessage('Invalid rating'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment too long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { messageId, rating, comment, clientId } = req.body;
  
  try {
    // Find the message and update pattern based on feedback
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const messageIndex = parseInt(messageId);
    
    if (messageIndex >= 0 && messageIndex < chatLog.length) {
      const message = chatLog[messageIndex];
      
      // Update pattern success rate based on feedback
      if (message.role === 'chatbot' && rating) {
        await chatBot.updatePattern({ keywords: ['feedback'] }, rating);
      }
      
      // Store feedback
      const analytics = await readJSONFile(FILES.analytics, {});
      if (!analytics.feedback) analytics.feedback = [];
      
      analytics.feedback.push({
        messageId: messageIndex,
        rating: rating,
        comment: comment,
        timestamp: Date.now(),
        clientId: clientId
      });
      
      await writeJSONFile(FILES.analytics, analytics);
      
      res.json({ success: true, message: 'Feedback received' });
    } else {
      res.status(404).json({ error: 'Message not found' });
    }
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Could not process feedback' });
  }
});

// Real-time polling endpoint
app.get('/api/chat/poll/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { after } = req.query; // timestamp after which to get messages
  
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

// Admin takeover endpoint
app.post('/api/admin/takeover', [
  body('conversationId').notEmpty().withMessage('Conversation ID required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { conversationId } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Verify admin session
  const sessions = await readJSONFile(FILES.adminSessions, {});
  if (!sessions[token] || sessions[token].expires < Date.now()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Mark conversation as admin-controlled
    const analytics = await readJSONFile(FILES.analytics, {});
    if (!analytics.adminTakeovers) analytics.adminTakeovers = {};
    
    analytics.adminTakeovers[conversationId] = {
      timestamp: Date.now(),
      adminId: sessions[token].telegramId,
      status: 'active'
    };
    
    await writeJSONFile(FILES.analytics, analytics);
    
    // Notify user that admin has taken over
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const adminMessage = {
      timestamp: Date.now(),
      clientId: conversationId,
      role: 'admin',
      content: 'Merhaba! Ben gerçek bir destek uzmanıyım. Size nasıl yardımcı olabilirim?',
      confidence: 1.0
    };
    
    chatLog.push(adminMessage);
    await writeJSONFile(FILES.chatLog, chatLog);
    
    res.json({ success: true, message: 'Conversation taken over' });
  } catch (error) {
    console.error('Takeover error:', error);
    res.status(500).json({ error: 'Could not take over conversation' });
  }
});

// Admin respond endpoint
app.post('/api/admin/respond', [
  body('conversationId').notEmpty().withMessage('Conversation ID required'),
  body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { conversationId, message } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Verify admin session
  const sessions = await readJSONFile(FILES.adminSessions, {});
  if (!sessions[token] || sessions[token].expires < Date.now()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Add admin message to chat log
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const adminMessage = {
      timestamp: Date.now(),
      clientId: conversationId,
      role: 'admin',
      content: message,
      confidence: 1.0,
      adminId: sessions[token].telegramId
    };
    
    chatLog.push(adminMessage);
    await writeJSONFile(FILES.chatLog, chatLog);
    
    // Update analytics
    const analytics = await readJSONFile(FILES.analytics, {});
    const today = moment().format('YYYY-MM-DD');
    if (!analytics[today]) {
      analytics[today] = { total: 0, chatbot: 0, ai: 0, admin: 0 };
    }
    analytics[today].total += 1;
    analytics[today].admin += 1;
    await writeJSONFile(FILES.analytics, analytics);
    
    res.json({ 
      success: true, 
      message: 'Message sent',
      timestamp: adminMessage.timestamp
    });
  } catch (error) {
    console.error('Admin respond error:', error);
    res.status(500).json({ error: 'Could not send message' });
  }
});

// Admin conversations list
app.get('/api/admin/conversations', async (req, res) => {
  const { page = 1, limit = 20, filter } = req.query;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Verify admin session
  const sessions = await readJSONFile(FILES.adminSessions, {});
  if (!sessions[token] || sessions[token].expires < Date.now()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const chatLog = await readJSONFile(FILES.chatLog, []);
    
    // Group by conversation
    const conversations = {};
    chatLog.forEach(msg => {
      if (!conversations[msg.clientId]) {
        conversations[msg.clientId] = {
          clientId: msg.clientId,
          messages: [],
          startTime: msg.timestamp,
          lastActivity: msg.timestamp,
          messageCount: 0
        };
      }
      conversations[msg.clientId].messages.push(msg);
      conversations[msg.clientId].lastActivity = Math.max(
        conversations[msg.clientId].lastActivity, 
        msg.timestamp
      );
      conversations[msg.clientId].messageCount++;
    });
    
    let conversationList = Object.values(conversations);
    
    // Apply filters
    if (filter) {
      conversationList = conversationList.filter(conv => 
        conv.clientId.includes(filter) ||
        conv.messages.some(msg => 
          msg.content.toLowerCase().includes(filter.toLowerCase())
        )
      );
    }
    
    // Sort by last activity
    conversationList.sort((a, b) => b.lastActivity - a.lastActivity);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedConversations = conversationList.slice(startIndex, startIndex + parseInt(limit));
    
    res.json({
      conversations: paginatedConversations,
      total: conversationList.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Conversations fetch error:', error);
    res.status(500).json({ error: 'Could not fetch conversations' });
  }
});

// Admin training endpoint
app.post('/api/admin/train', [
  body('keywords').isArray().withMessage('Keywords must be an array'),
  body('response').isLength({ min: 1, max: 1000 }).withMessage('Response must be 1-1000 characters'),
  body('confidence').optional().isFloat({ min: 0, max: 1 }).withMessage('Confidence must be between 0 and 1')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { keywords, response, confidence = 0.8 } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Verify admin session
  const sessions = await readJSONFile(FILES.adminSessions, {});
  if (!sessions[token] || sessions[token].expires < Date.now()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const knowledgeBase = await readJSONFile(FILES.knowledgeBase, []);
    
    const newPattern = {
      keywords: keywords,
      response: response,
      confidence: confidence,
      usage: 0,
      successRate: 0.8,
      createdAt: Date.now(),
      createdBy: 'admin',
      adminId: sessions[token].telegramId
    };
    
    knowledgeBase.push(newPattern);
    await writeJSONFile(FILES.knowledgeBase, knowledgeBase);
    
    // Reload patterns in chatbot
    await chatBot.loadKnowledgeBase();
    
    res.json({ 
      success: true, 
      patternId: knowledgeBase.length - 1,
      message: 'Pattern added successfully'
    });
  } catch (error) {
    console.error('Training error:', error);
    res.status(500).json({ error: 'Could not add pattern' });
  }
});

// AI patterns endpoint
app.get('/api/ai/patterns', async (req, res) => {
  try {
    const knowledgeBase = await readJSONFile(FILES.knowledgeBase, []);
    
    const stats = {
      totalPatterns: knowledgeBase.length,
      avgConfidence: knowledgeBase.length > 0 ? 
        knowledgeBase.reduce((sum, p) => sum + (p.confidence || 0.8), 0) / knowledgeBase.length : 0,
      totalUsage: knowledgeBase.reduce((sum, p) => sum + (p.usage || 0), 0),
      avgSuccessRate: knowledgeBase.length > 0 ?
        knowledgeBase.reduce((sum, p) => sum + (p.successRate || 0.8), 0) / knowledgeBase.length : 0
    };
    
    res.json({
      patterns: knowledgeBase,
      stats: stats
    });
  } catch (error) {
    console.error('Patterns fetch error:', error);
    res.status(500).json({ error: 'Could not fetch patterns' });
  }
});

// AI learning endpoint
app.post('/api/ai/learn', [
  body('interaction').isObject().withMessage('Interaction data required'),
  body('feedback').isIn(['positive', 'negative', 'neutral']).withMessage('Invalid feedback')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { interaction, feedback } = req.body;
  
  try {
    // Extract keywords from user message
    const userMessage = interaction.userMessage || '';
    const keywords = userMessage.toLowerCase()
      .replace(/[^\w\söçğıüş]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 5);
    
    if (keywords.length >= 2) {
      const knowledgeBase = await readJSONFile(FILES.knowledgeBase, []);
      
      // Find existing pattern or create new one
      let existingPattern = knowledgeBase.find(p => 
        p.keywords.some(k => keywords.includes(k))
      );
      
      if (existingPattern) {
        // Update existing pattern
        if (feedback === 'positive') {
          existingPattern.successRate = Math.min(1.0, existingPattern.successRate + 0.05);
          existingPattern.confidence = Math.min(1.0, existingPattern.confidence + 0.02);
        } else if (feedback === 'negative') {
          existingPattern.successRate = Math.max(0.1, existingPattern.successRate - 0.05);
          existingPattern.confidence = Math.max(0.1, existingPattern.confidence - 0.02);
        }
        existingPattern.usage = (existingPattern.usage || 0) + 1;
      } else if (feedback === 'positive' && interaction.aiResponse) {
        // Create new pattern from successful AI response
        const newPattern = {
          keywords: keywords,
          response: interaction.aiResponse,
          confidence: 0.7,
          usage: 1,
          successRate: 0.8,
          createdAt: Date.now(),
          source: 'ai_learning'
        };
        knowledgeBase.push(newPattern);
      }
      
      await writeJSONFile(FILES.knowledgeBase, knowledgeBase);
      await chatBot.loadKnowledgeBase();
    }
    
    res.json({ success: true, message: 'Learning completed' });
  } catch (error) {
    console.error('Learning error:', error);
    res.status(500).json({ error: 'Could not process learning' });
  }
});

// Telegram webhook endpoint
app.post('/webhook/telegram', async (req, res) => {
  try {
    const update = req.body;
    
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text;
      
      // Only respond to admin
      if (chatId.toString() === ADMIN_TELEGRAM_ID) {
        let response = '';
        
        if (text.startsWith('/')) {
          // Handle commands
          const command = text.split(' ')[0];
          const args = text.split(' ').slice(1);
          
          switch (command) {
            case '/stats':
              response = await this.getTelegramStats();
              break;
            case '/active':
              response = await this.getActiveTelegramChats();
              break;
            case '/help':
              response = this.getTelegramHelp();
              break;
            default:
              response = 'Bilinmeyen komut. /help yazın.';
          }
          
          // Send response
          await telegramBot.sendMessage(chatId, response, { parse_mode: 'HTML' });
        }
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.sendStatus(500);
  }
});

// Telegram command helpers
async function getTelegramStats() {
  try {
    const analytics = await readJSONFile(FILES.analytics, {});
    const today = moment().format('YYYY-MM-DD');
    const todayStats = analytics[today] || { total: 0, chatbot: 0, ai: 0, admin: 0 };
    
    return `
📊 <b>Sistem İstatistikleri</b>
📈 Bugün: ${todayStats.total} mesaj
🤖 Bot: ${todayStats.chatbot}
🧠 AI: ${todayStats.ai}
👨‍💼 Admin: ${todayStats.admin}
⏰ ${new Date().toLocaleTimeString('tr-TR')}
    `.trim();
  } catch {
    return '❌ İstatistikler alınamadı';
  }
}

async function getActiveTelegramChats() {
  try {
    const chatLog = await readJSONFile(FILES.chatLog, []);
    const activeThreshold = Date.now() - (30 * 60 * 1000); // 30 minutes
    
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
    
    const activeCount = Object.keys(activeConversations).length;
    
    if (activeCount === 0) {
      return '🌙 Aktif sohbet yok';
    }
    
    let message = `💬 <b>Aktif Sohbetler (${activeCount})</b>\n\n`;
    
    Object.entries(activeConversations).slice(0, 5).forEach(([clientId, data], index) => {
      const shortId = clientId.substring(clientId.length - 6);
      const time = new Date(data.lastActivity).toLocaleTimeString('tr-TR');
      const lastMsg = data.messages[data.messages.length - 1];
      const preview = lastMsg?.content?.substring(0, 30) || 'Mesaj yok';
      
      message += `${index + 1}. 👤 ${shortId}\n`;
      message += `   ⏰ ${time}\n`;
      message += `   💬 "${preview}..."\n\n`;
    });
    
    return message.trim();
  } catch {
    return '❌ Aktif sohbetler alınamadı';
  }
}

function getTelegramHelp() {
  return `
🤖 <b>HayDay Chat Bot Komutları</b>

/stats - Sistem istatistikleri
/active - Aktif sohbetler  
/help - Bu yardım mesajı

🔗 <a href="${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}/admin.html">Admin Panel</a>
  `.trim();
}

// Start server
app.listen(PORT, () => {
  console.log(`🤖 HayDay Chat System running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/ping`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});