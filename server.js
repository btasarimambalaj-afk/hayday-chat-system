const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const OpenAI = require('openai');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ GÜVENLIK UYARISI: Environment variables kontrol et!
if (!process.env.OPENAI_API_KEY) {
    console.error('🚨 HATA: OPENAI_API_KEY environment variable tanımlanmamış!');
    console.error('💡 .env dosyasını kontrol edin veya environment variable\'ı ayarlayın.');
    process.exit(1);
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('🚨 HATA: TELEGRAM_BOT_TOKEN environment variable tanımlanmamış!');
    console.error('💡 .env dosyasını kontrol edin veya environment variable\'ı ayarlayın.');
    process.exit(1);
}

console.log('🔐 Environment variables başarıyla yüklendi');
console.log('🛡️ Güvenlik kontrolleri aktif');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Initialize Telegram Bot
const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// File paths - Sensitive files protected by .gitignore
const FILES = {
    chatLog: path.join(__dirname, 'chat-log.json'),
    analytics: path.join(__dirname, 'analytics.json'),
    knowledgeBase: path.join(__dirname, 'knowledge-base.json'),
    adminSessions: path.join(__dirname, 'admin-sessions.json')
};

// Utility functions
async function readJSONFile(filePath, defaultValue = []) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await writeJSONFile(filePath, defaultValue);
            return defaultValue;
        }
        throw error;
    }
}

async function writeJSONFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        throw error;
    }
}

// Knowledge base for HayDay
const haydayKnowledge = {
    altinTransfer: `
🌟 **ALTIN TRANSFER REHBERİ**

💰 **Altın Nasıl Transfer Edilir:**
1. Oyunda arkadaş ekleyin
2. "Altın Gönder" butonuna tıklayın
3. Miktarı girin (minimum 100 altın)
4. Onaylayın

⚠️ **Önemli Notlar:**
- Günlük limit: 10,000 altın
- Transfer ücreti: %2
- İşlem süresi: 5-10 dakika

💡 **İpuçları:**
- Güvenilir oyuncularla işlem yapın
- Screenshot alarak kayıt tutun
`,

    fiyatListesi: `
📊 **HAYDAY FİYAT LİSTESİ** (Güncel)

🌾 **Temel Ürünler:**
• Buğday: 2-3 altın
• Mısır: 3-4 altın  
• Soya: 4-5 altın
• Şeker Kamışı: 6-8 altın

🥕 **Sebzeler:**
• Havuç: 8-10 altın
• Patates: 12-15 altın
• Domates: 15-18 altın

🐄 **Hayvan Ürünleri:**
• Süt: 20-25 altın
• Yumurta: 15-20 altın
• Peynir: 45-50 altın

💎 **Premium Ürünler:**
• Elmas: 500+ altın
• Voucher: 100-200 altın

📈 Fiyatlar değişkendir, güncel durumu kontrol edin!
`,

    depolama: `
📦 **DEPOLAMA HESAPLAMA**

🏠 **Depo Kapasitesi:**
- Başlangıç: 50 slot
- Maksimum: 2,000+ slot
- Her genişleme: +25 slot

💰 **Genişleme Maliyeti:**
- İlk 10 genişleme: Altın
- Sonraki: Elmas gerekli
- 100. slot sonrası: Çok pahalı

🔢 **Hesaplama Formülü:**
Gerekli slot = Ürün sayısı × Stack boyutu

📊 **Optimizasyon:**
- Gereksiz ürünleri satın
- Stack'leri tam doldurun
- Üretimi planlayın

💡 1000 slot önerilir orta seviye için!
`
};

// Authentication system
class AuthSystem {
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
        
        if (!authData) {
            return { success: false, message: 'Kod bulunamadı' };
        }

        if (Date.now() > authData.expires) {
            this.authCodes.delete(telegramId);
            return { success: false, message: 'Kod süresi doldu' };
        }

        if (authData.code !== code) {
            return { success: false, message: 'Geçersiz kod' };
        }

        this.authCodes.delete(telegramId);
        return { success: true, message: 'Giriş başarılı' };
    }

    async createSession(telegramId) {
        const sessionToken = Math.random().toString(36).substr(2) + Date.now().toString(36);
        const session = {
            token: sessionToken,
            telegramId: telegramId,
            created: Date.now(),
            expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            lastActivity: Date.now()
        };

        try {
            const sessions = await readJSONFile(FILES.adminSessions, []);
            sessions.push(session);
            await writeJSONFile(FILES.adminSessions, sessions);
            return sessionToken;
        } catch (error) {
            console.error('Session creation error:', error);
            return null;
        }
    }

    async verifySession(token) {
        try {
            const sessions = await readJSONFile(FILES.adminSessions, []);
            const session = sessions.find(s => s.token === token);

            if (!session) {
                return { valid: false, message: 'Session bulunamadı' };
            }

            if (Date.now() > session.expires) {
                return { valid: false, message: 'Session süresi doldu' };
            }

            // Update last activity
            session.lastActivity = Date.now();
            await writeJSONFile(FILES.adminSessions, sessions);

            return { valid: true, session: session };
        } catch (error) {
            console.error('Session verification error:', error);
            return { valid: false, message: 'Verification hatası' };
        }
    }
}

const authSystem = new AuthSystem();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/ping', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        memory: {
            used: memoryUsage.heapUsed,
            total: memoryUsage.heapTotal,
            external: memoryUsage.external
        },
        environment: process.env.NODE_ENV || 'development'
    });
});

// Chat endpoint
app.post('/api/chat/send', async (req, res) => {
    const { message, clientId } = req.body;

    if (!message || !clientId) {
        return res.status(400).json({ error: 'Message and clientId are required' });
    }

    const timestamp = Date.now();

    try {
        // Load chat log
        const chatLog = await readJSONFile(FILES.chatLog, []);

        // Add user message
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: timestamp,
            clientId: clientId
        };
        chatLog.push(userMessage);

        // Generate AI response
        let aiResponse = '';

        // Check for knowledge base matches first
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('altın') && (lowerMessage.includes('transfer') || lowerMessage.includes('gönder'))) {
            aiResponse = haydayKnowledge.altinTransfer;
        } else if (lowerMessage.includes('fiyat') || lowerMessage.includes('liste')) {
            aiResponse = haydayKnowledge.fiyatListesi;
        } else if (lowerMessage.includes('depo') || lowerMessage.includes('depolama')) {
            aiResponse = haydayKnowledge.depolama;
        } else {
            // Use OpenAI for complex queries
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: `Sen HayDay oyunu için bir destek botusun. Türkçe cevap ver. HayDay ile ilgili sorulara yardımcı ol: altın transfer, fiyat listesi, depolama, üretim, strateji. Kısa ve öz cevaplar ver. Emoji kullan.`
                        },
                        { role: "user", content: message }
                    ],
                    max_tokens: 300,
                    temperature: 0.7
                });

                aiResponse = completion.choices[0]?.message?.content || 'Üzgünüm, şu anda yanıt veremiyorum.';
            } catch (openaiError) {
                console.error('OpenAI error:', openaiError);
                aiResponse = '🤖 Şu anda AI servisinde bir sorun var. Bilgi bankamızdan yardım alabilirsiniz:\n\n💰 "altın transfer" yazın\n💸 "fiyat listesi" yazın\n📦 "depolama" yazın';
            }
        }

        // Add AI response
        const aiMessage = {
            role: 'assistant',
            content: aiResponse,
            timestamp: timestamp + 1,
            clientId: clientId
        };
        chatLog.push(aiMessage);

        // Save chat log
        await writeJSONFile(FILES.chatLog, chatLog);

        // Update analytics
        await updateAnalytics(message, 'ai');

        res.json({ 
            success: true, 
            response: aiResponse,
            timestamp: timestamp + 1
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Analytics function
async function updateAnalytics(message, type) {
    try {
        const analytics = await readJSONFile(FILES.analytics, { 
            totalMessages: 0, 
            chatbotMessages: 0, 
            aiMessages: 0,
            dailyStats: {},
            topKeywords: {}
        });

        analytics.totalMessages++;
        if (type === 'chatbot') analytics.chatbotMessages++;
        if (type === 'ai') analytics.aiMessages++;

        // Daily stats
        const today = new Date().toISOString().split('T')[0];
        if (!analytics.dailyStats[today]) {
            analytics.dailyStats[today] = { total: 0, chatbot: 0, ai: 0 };
        }
        analytics.dailyStats[today].total++;
        analytics.dailyStats[today][type]++;

        // Keyword tracking
        const words = message.toLowerCase().split(' ').filter(word => word.length > 3);
        words.forEach(word => {
            analytics.topKeywords[word] = (analytics.topKeywords[word] || 0) + 1;
        });

        await writeJSONFile(FILES.analytics, analytics);
    } catch (error) {
        console.error('Analytics error:', error);
    }
}

// Authentication endpoints
app.post('/api/auth/request-code', async (req, res) => {
    const { telegramId } = req.body;

    if (!telegramId) {
        return res.status(400).json({ error: 'Telegram ID gerekli' });
    }

    const success = await authSystem.sendAuthCode(telegramId);
    
    if (success) {
        res.json({ success: true, message: 'Kod gönderildi' });
    } else {
        res.status(500).json({ error: 'Kod gönderilemedi' });
    }
});

app.post('/api/auth/verify-code', async (req, res) => {
    const { telegramId, code } = req.body;

    if (!telegramId || !code) {
        return res.status(400).json({ error: 'Telegram ID ve kod gerekli' });
    }

    const verification = authSystem.verifyAuthCode(telegramId, code);
    
    if (verification.success) {
        const sessionToken = await authSystem.createSession(telegramId);
        if (sessionToken) {
            res.json({ 
                success: true, 
                message: verification.message,
                token: sessionToken 
            });
        } else {
            res.status(500).json({ error: 'Session oluşturulamadı' });
        }
    } else {
        res.status(400).json({ error: verification.message });
    }
});

// Admin dashboard endpoint
app.get('/api/admin/dashboard', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Token gerekli' });
    }

    const verification = await authSystem.verifySession(token);
    if (!verification.valid) {
        return res.status(401).json({ error: verification.message });
    }

    try {
        const [chatLog, analytics] = await Promise.all([
            readJSONFile(FILES.chatLog, []),
            readJSONFile(FILES.analytics, { totalMessages: 0, chatbotMessages: 0, aiMessages: 0, dailyStats: {} })
        ]);

        // Get recent chats
        const recentChats = chatLog.slice(-20).reverse();

        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const todayStats = analytics.dailyStats[today] || { total: 0, chatbot: 0, ai: 0 };

        res.json({
            success: true,
            data: {
                totalMessages: analytics.totalMessages,
                todayMessages: todayStats.total,
                recentChats: recentChats,
                analytics: analytics
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Dashboard verileri alınamadı' });
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
        const { message } = req.body;
        
        if (message && message.text) {
            const chatId = message.chat.id;
            const text = message.text;
            
            // Handle admin commands
            if (text.startsWith('/')) {
                let response = '';
                
                switch (text) {
                    case '/start':
                        response = '🌾 HayDay Chat System\n\n🔹 /stats - İstatistikler\n🔹 /active - Aktif sohbetler\n🔹 /ping - Sistem durumu';
                        break;
                    case '/stats':
                        const analytics = await readJSONFile(FILES.analytics, { totalMessages: 0, chatbotMessages: 0, aiMessages: 0, dailyStats: {} });
                        const today = new Date().toISOString().split('T')[0];
                        const todayStats = analytics.dailyStats[today] || { total: 0, chatbot: 0, ai: 0 };
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
    console.log('🔐 Security: All sensitive files protected by .gitignore');
    console.log('⚠️  Remember: Check your .env file for API keys!');
});

module.exports = app;
