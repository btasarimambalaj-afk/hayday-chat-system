/**
 * 📱 HayDay Telegram Bot Integration
 * Frontend utilities for Telegram bot communication
 */

// Telegram Bot namespace
window.HayDayChat = window.HayDayChat || {};
window.HayDayChat.Telegram = {

  // Configuration
  config: {
    botToken: null, // Will be set from server
    adminId: null,  // Will be set from server
    webhookUrl: null,
    apiUrl: 'https://api.telegram.org/bot',
    maxRetries: 3,
    retryDelay: 1000
  },

  // Connection status
  status: {
    connected: false,
    lastPing: null,
    errorCount: 0
  },

  /**
   * 🔐 Authentication Functions
   */
  Auth: {
    // Request authentication code
    requestCode: async function(telegramId) {
      try {
        const response = await fetch('/api/admin/request-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId: telegramId })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          return {
            success: true,
            message: 'Kod Telegram\'a gönderildi'
          };
        } else {
          throw new Error(data.error || 'Kod gönderilemedi');
        }
      } catch (error) {
        console.error('Telegram auth code request error:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    // Verify authentication code
    verifyCode: async function(telegramId, code) {
      try {
        const response = await fetch('/api/admin/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            telegramId: telegramId,
            code: code 
          })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          // Store token
          localStorage.setItem('admin_token', data.token);
          localStorage.setItem('admin_telegram_id', telegramId);
          
          return {
            success: true,
            token: data.token,
            message: 'Giriş başarılı'
          };
        } else {
          throw new Error(data.error || 'Geçersiz kod');
        }
      } catch (error) {
        console.error('Telegram auth verification error:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    // Check if user is authenticated
    isAuthenticated: function() {
      const token = localStorage.getItem('admin_token');
      const telegramId = localStorage.getItem('admin_telegram_id');
      return !!(token && telegramId);
    },

    // Get stored admin info
    getAdminInfo: function() {
      return {
        token: localStorage.getItem('admin_token'),
        telegramId: localStorage.getItem('admin_telegram_id')
      };
    },

    // Logout
    logout: function() {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_telegram_id');
      HayDayChat.Telegram.status.connected = false;
    }
  },

  /**
   * 🔔 Notification Functions
   */
  Notifications: {
    // Send notification to admin
    sendToAdmin: async function(message, options = {}) {
      const adminInfo = HayDayChat.Telegram.Auth.getAdminInfo();
      
      if (!adminInfo.telegramId) {
        console.warn('No admin Telegram ID found');
        return false;
      }

      try {
        const response = await fetch('/api/telegram/send-notification', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminInfo.token}`
          },
          body: JSON.stringify({
            telegramId: adminInfo.telegramId,
            message: message,
            options: {
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              ...options
            }
          })
        });

        return response.ok;
      } catch (error) {
        console.error('Telegram notification error:', error);
        return false;
      }
    },

    // Notify about new message
    notifyNewMessage: function(userMessage, botResponse, clientId) {
      const shortClientId = clientId.substring(clientId.length - 6);
      const shortMessage = userMessage.length > 50 ? 
        userMessage.substring(0, 50) + '...' : userMessage;
      
      const notification = `
💬 <b>Yeni Mesaj</b>
👤 Kullanıcı: ${shortClientId}
📝 "${shortMessage}"
🤖 Bot Yanıtı: ${botResponse.role === 'ai' ? '🧠 AI' : '🤖 ChatBot'}
⏰ ${new Date().toLocaleTimeString('tr-TR')}
      `.trim();

      this.sendToAdmin(notification);
    },

    // Notify about escalation needed
    notifyEscalation: function(userMessage, clientId, reason) {
      const shortClientId = clientId.substring(clientId.length - 6);
      const shortMessage = userMessage.length > 50 ? 
        userMessage.substring(0, 50) + '...' : userMessage;
      
      const notification = `
🆘 <b>Müdahale Gerekli</b>
👤 Kullanıcı: ${shortClientId}
📝 "${shortMessage}"
⚠️ Sebep: ${reason}
⏰ ${new Date().toLocaleTimeString('tr-TR')}

🔗 <a href="${window.location.origin}/admin.html">Admin Panel</a>
      `.trim();

      this.sendToAdmin(notification, {
        reply_markup: {
          inline_keyboard: [[
            { text: '👁️ Görüntüle', url: `${window.location.origin}/admin.html` },
            { text: '✋ Devral', callback_data: `takeover_${clientId}` }
          ]]
        }
      });
    },

    // Send daily summary
    sendDailySummary: function(stats) {
      const notification = `
📊 <b>Günlük Özet</b>
📈 Toplam: ${stats.total} mesaj
🤖 ChatBot: ${stats.chatbot} (${Math.round(stats.chatbot/stats.total*100)}%)
🧠 AI: ${stats.ai} (${Math.round(stats.ai/stats.total*100)}%)
👨‍💼 Admin: ${stats.admin} (${Math.round(stats.admin/stats.total*100)}%)
⭐ Memnuniyet: ${stats.satisfaction || 'N/A'}
📅 ${new Date().toLocaleDateString('tr-TR')}
      `.trim();

      this.sendToAdmin(notification);
    },

    // Test notification
    testNotification: function() {
      const testMessage = `
🧪 <b>Test Bildirimi</b>
✅ Telegram entegrasyonu çalışıyor
⏰ ${new Date().toLocaleString('tr-TR')}
🔗 <a href="${window.location.origin}">Chat Sistemi</a>
      `.trim();

      return this.sendToAdmin(testMessage);
    }
  },

  /**
   * 🎮 Bot Commands (Admin Side)
   */
  Commands: {
    // Handle incoming bot commands
    handleCommand: function(command, args = []) {
      switch (command) {
        case '/stats':
          return this.getStats();
        case '/active':
          return this.getActiveChats();
        case '/help':
          return this.getHelp();
        case '/test':
          return this.testSystem();
        default:
          return 'Bilinmeyen komut. /help yazın.';
      }
    },

    // Get system stats
    getStats: async function() {
      try {
        const response = await fetch('/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${HayDayChat.Telegram.Auth.getAdminInfo().token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const stats = data.stats;
          
          return `
📊 <b>Sistem İstatistikleri</b>
📈 Bugün: ${stats.today?.total || 0} mesaj
🤖 Bot: ${stats.today?.chatbot || 0}
🧠 AI: ${stats.today?.ai || 0}
👨‍💼 Admin: ${stats.today?.admin || 0}
🔴 Aktif: ${stats.activeConversations || 0} sohbet
⏰ ${new Date().toLocaleTimeString('tr-TR')}
          `.trim();
        }
      } catch (error) {
        console.error('Stats fetch error:', error);
      }

      return '❌ İstatistikler alınamadı';
    },

    // Get active chats
    getActiveChats: async function() {
      try {
        const response = await fetch('/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${HayDayChat.Telegram.Auth.getAdminInfo().token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const activeChats = data.activeChats || [];
          
          if (activeChats.length === 0) {
            return '🌙 Aktif sohbet yok';
          }

          let message = `💬 <b>Aktif Sohbetler (${activeChats.length})</b>\n\n`;
          
          activeChats.slice(0, 5).forEach((chat, index) => {
            const shortId = chat.clientId.substring(chat.clientId.length - 6);
            const time = new Date(chat.lastActivity).toLocaleTimeString('tr-TR');
            const preview = chat.lastMessage?.content?.substring(0, 30) || 'Mesaj yok';
            
            message += `${index + 1}. 👤 ${shortId}\n`;
            message += `   ⏰ ${time}\n`;
            message += `   💬 "${preview}..."\n\n`;
          });

          return message.trim();
        }
      } catch (error) {
        console.error('Active chats fetch error:', error);
      }

      return '❌ Aktif sohbetler alınamadı';
    },

    // Get help message
    getHelp: function() {
      return `
🤖 <b>HayDay Chat Bot Komutları</b>

/stats - Sistem istatistikleri
/active - Aktif sohbetler
/test - Sistem testi
/help - Bu yardım mesajı

🔗 <a href="${window.location.origin}/admin.html">Admin Panel</a>
      `.trim();
    },

    // Test system
    testSystem: async function() {
      const tests = [];
      
      // Test API connection
      try {
        const response = await fetch('/ping');
        tests.push(response.ok ? '✅ API Bağlantısı' : '❌ API Bağlantısı');
      } catch {
        tests.push('❌ API Bağlantısı');
      }

      // Test authentication
      const isAuth = HayDayChat.Telegram.Auth.isAuthenticated();
      tests.push(isAuth ? '✅ Kimlik Doğrulama' : '❌ Kimlik Doğrulama');

      // Test local storage
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        tests.push('✅ Local Storage');
      } catch {
        tests.push('❌ Local Storage');
      }

      return `
🧪 <b>Sistem Test Sonuçları</b>

${tests.join('\n')}

⏰ ${new Date().toLocaleString('tr-TR')}
      `.trim();
    }
  },

  /**
   * 🔄 Connection Management
   */
  Connection: {
    // Initialize telegram connection
    init: function() {
      HayDayChat.Telegram.status.connected = true;
      HayDayChat.Telegram.status.lastPing = Date.now();
      console.log('📱 Telegram integration initialized');
    },

    // Check connection status
    checkStatus: async function() {
      try {
        const adminInfo = HayDayChat.Telegram.Auth.getAdminInfo();
        
        if (!adminInfo.token) {
          HayDayChat.Telegram.status.connected = false;
          return false;
        }

        // Simple ping to verify connection
        const response = await fetch('/api/telegram/ping', {
          headers: {
            'Authorization': `Bearer ${adminInfo.token}`
          }
        });

        const isConnected = response.ok;
        HayDayChat.Telegram.status.connected = isConnected;
        HayDayChat.Telegram.status.lastPing = Date.now();
        
        if (!isConnected) {
          HayDayChat.Telegram.status.errorCount++;
        } else {
          HayDayChat.Telegram.status.errorCount = 0;
        }

        return isConnected;
      } catch (error) {
        console.error('Telegram connection check error:', error);
        HayDayChat.Telegram.status.connected = false;
        HayDayChat.Telegram.status.errorCount++;
        return false;
      }
    },

    // Get connection info
    getInfo: function() {
      return {
        ...HayDayChat.Telegram.status,
        adminInfo: HayDayChat.Telegram.Auth.getAdminInfo(),
        lastPingAgo: HayDayChat.Telegram.status.lastPing ? 
          Date.now() - HayDayChat.Telegram.status.lastPing : null
      };
    }
  },

  /**
   * 🛠️ Utility Functions
   */
  Utils: {
    // Format message for Telegram
    formatMessage: function(text, options = {}) {
      // Escape HTML characters for Telegram
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Apply formatting options
      if (options.bold) {
        return `<b>${escaped}</b>`;
      }
      if (options.italic) {
        return `<i>${escaped}</i>`;
      }
      if (options.code) {
        return `<code>${escaped}</code>`;
      }

      return escaped;
    },

    // Create inline keyboard
    createKeyboard: function(buttons) {
      return {
        reply_markup: {
          inline_keyboard: buttons
        }
      };
    },

    // Validate Telegram ID
    validateTelegramId: function(id) {
      return /^\d{8,12}$/.test(id.toString());
    },

    // Get user-friendly error message
    getErrorMessage: function(error) {
      const errorMessages = {
        'Unauthorized': 'Yetkisiz erişim',
        'Bad Request': 'Geçersiz istek',
        'Too Many Requests': 'Çok fazla istek',
        'Internal Server Error': 'Sunucu hatası'
      };

      return errorMessages[error] || error || 'Bilinmeyen hata';
    }
  }
};

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
  HayDayChat.Telegram.Connection.init();
  
  // Check connection status every 5 minutes
  setInterval(() => {
    HayDayChat.Telegram.Connection.checkStatus();
  }, 5 * 60 * 1000);
});

console.log('📱 HayDay Telegram Integration loaded');