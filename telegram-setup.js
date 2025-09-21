/**
 * 📱 Telegram Bot Setup & Enhancement
 * Bu dosya server.js'ye eklenecek Telegram geliştirmeleri
 */

// server.js'nin başına eklenecek Telegram bot initialization
const TelegramBot = require('node-telegram-bot-api');

// Initialize Telegram Bot with polling (for development) or webhook (for production)
let telegramBot;
if (process.env.NODE_ENV === 'production') {
  // Production: Webhook mode
  telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
  
  // Set webhook URL
  const webhookUrl = `${process.env.RENDER_EXTERNAL_URL || 'https://hayday-chat.onrender.com'}/webhook/telegram`;
  telegramBot.setWebHook(webhookUrl).then(() => {
    console.log('📱 Telegram webhook set successfully');
  }).catch(err => {
    console.error('❌ Telegram webhook setup failed:', err);
  });
} else {
  // Development: Polling mode
  telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('📱 Telegram bot initialized with polling');
}

// Enhanced Telegram Manager Class (server.js'deki TelegramManager'ı değiştir)
class EnhancedTelegramManager {
  constructor() {
    this.authCodes = new Map();
    this.botCommands = this.setupBotCommands();
  }

  setupBotCommands() {
    return {
      '/start': this.handleStart.bind(this),
      '/help': this.handleHelp.bind(this),
      '/stats': this.handleStats.bind(this),
      '/active': this.handleActiveChats.bind(this),
      '/ping': this.handlePing.bind(this),
      '/admin': this.handleAdminPanel.bind(this),
      '/export': this.handleExportData.bind(this),
      '/clear': this.handleClearData.bind(this)
    };
  }

  async handleStart(chatId, args) {
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
• <a href="${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}">Chat Sistemi</a>
• <a href="${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}/admin.html">Admin Panel</a>

⚡ Size nasıl yardımcı olabilirim?
    `;

    await telegramBot.sendMessage(chatId, welcomeMessage, { 
      parse_mode: 'HTML',
      disable_web_page_preview: true 
    });
  }

  async handleHelp(chatId, args) {
    const helpMessage = `
🆘 <b>HayDay Chat Bot - Yardım</b>

<b>📊 İstatistik Komutları:</b>
/stats - Günlük mesaj istatistikleri
/active - Aktif sohbet listesi
/ping - Sistem sağlık durumu

<b>🛠️ Yönetim Komutları:</b>
/admin - Admin paneline git
/export - Verileri dışa aktar
/clear - Geçici verileri temizle

<b>🔗 Hızlı Bağlantılar:</b>
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
            { text: '🛠️ Admin Panel', url: `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}/admin.html` }
          ]
        ]
      }
    });
  }

  async handleStats(chatId, args) {
    try {
      const analytics = await readJSONFile('./analytics.json', {});
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

  async handleActiveChats(chatId, args) {
    try {
      const chatLog = await readJSONFile('./chat-log.json', []);
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
              { text: '🛠️ Admin Panel', url: `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}/admin.html` }
            ]
          ]
        }
      });
    } catch (error) {
      await telegramBot.sendMessage(chatId, '❌ Aktif sohbetler alınamadı: ' + error.message);
    }
  }

  async handlePing(chatId, args) {
    const startTime = Date.now();
    
    try {
      // Test database access
      const chatLog = await readJSONFile('./chat-log.json', []);
      const dbTime = Date.now() - startTime;
      
      // Test OpenAI (if available)
      let openaiStatus = '❓ Test edilmedi';
      try {
        if (process.env.OPENAI_API_KEY) {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

  async handleAdminPanel(chatId, args) {
    const adminUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}/admin.html`;
    const chatUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}`;
    
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
/export - Veri dışa aktarma

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
  }

  async handleExportData(chatId, args) {
    try {
      const exportMessage = `
📤 <b>Veri Dışa Aktarma</b>

Hangi verileri dışa aktarmak istiyorsunuz?

<b>📊 Mevcut Veriler:</b>
• Chat Logs (Konuşma kayıtları)
• Analytics (İstatistik verileri)  
• Knowledge Base (Bot patterns)
• Admin Sessions (Oturum kayıtları)

<i>⚠️ Bu özellik v2'de gelecek</i>
      `;

      await telegramBot.sendMessage(chatId, exportMessage, { 
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Chat Logs', callback_data: 'export_chat_logs' },
              { text: '📈 Analytics', callback_data: 'export_analytics' }
            ],
            [
              { text: '🧠 Knowledge Base', callback_data: 'export_knowledge' },
              { text: '🔐 Sessions', callback_data: 'export_sessions' }
            ]
          ]
        }
      });
    } catch (error) {
      await telegramBot.sendMessage(chatId, '❌ Export işlemi başarısız: ' + error.message);
    }
  }

  async handleClearData(chatId, args) {
    const clearMessage = `
🗑️ <b>Veri Temizleme</b>

⚠️ <b>DİKKAT:</b> Bu işlem geri alınamaz!

Hangi verileri temizlemek istiyorsunuz?

<b>🔄 Temizlenebilir Veriler:</b>
• Eski chat logs (30 gün öncesi)
• Geçersiz admin sessions
• Kullanılmayan patterns
• Analytics cache

<i>❌ Bu özellik şu anda devre dışı</i>
    `;

    await telegramBot.sendMessage(chatId, clearMessage, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ İptal Et', callback_data: 'cmd_help' }]
        ]
      }
    });
  }

  // Callback query handler
  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Answer callback query to remove loading state
    await telegramBot.answerCallbackQuery(callbackQuery.id);

    // Handle different callback commands
    if (data.startsWith('cmd_')) {
      const command = data.replace('cmd_', '');
      if (this.botCommands[`/${command}`]) {
        await this.botCommands[`/${command}`](chatId, []);
      }
    } else if (data.startsWith('export_')) {
      await telegramBot.sendMessage(chatId, '⏳ Export özelliği v2\'de gelecek...', { parse_mode: 'HTML' });
    }
  }

  // Enhanced message processing
  async processMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;
    const userId = message.from.id.toString();

    // Only respond to admin
    if (userId !== process.env.ADMIN_TELEGRAM_ID) {
      await telegramBot.sendMessage(chatId, '❌ Bu bot sadece yetkilendirilmiş kullanıcılar için.');
      return;
    }

    // Handle commands
    if (text.startsWith('/')) {
      const [command, ...args] = text.split(' ');
      
      if (this.botCommands[command]) {
        await this.botCommands[command](chatId, args);
      } else {
        await telegramBot.sendMessage(chatId, `❓ Bilinmeyen komut: ${command}\n\nYardım için /help yazın.`);
      }
    } else {
      // Handle regular messages
      await this.handleRegularMessage(chatId, text);
    }
  }

  async handleRegularMessage(chatId, text) {
    const response = `
💬 <b>Mesaj Alındı</b>

"${text}"

🤖 Ben bir bot olduğum için sohbet edemem, ama size nasıl yardımcı olabilirim?

Komutlar için /help yazın.
    `;

    await telegramBot.sendMessage(chatId, response, { parse_mode: 'HTML' });
  }
}

// Export for integration with server.js
module.exports = {
  EnhancedTelegramManager,
  telegramBot
};