/**
 * 🧠 HayDay ChatBot Brain + AI Logic
 * Frontend AI utilities and chatbot brain functions
 */

// AI Brain namespace
window.HayDayChat = window.HayDayChat || {};
window.HayDayChat.AI = {

  // Configuration
  config: {
    confidenceThreshold: 0.7,
    learningRate: 0.1,
    maxResponseTime: 10000, // 10 seconds
    retryAttempts: 3
  },

  // Local pattern cache
  patterns: [],
  lastUpdate: null,

  /**
   * 🤖 ChatBot Brain Functions
   */
  ChatBot: {
    // Initialize chatbot with patterns
    init: async function() {
      try {
        await this.loadPatterns();
        console.log('🤖 ChatBot Brain initialized');
      } catch (error) {
        console.error('ChatBot init error:', error);
      }
    },

    // Load patterns from server
    loadPatterns: async function() {
      try {
        const response = await fetch('/api/ai/patterns');
        const data = await response.json();
        
        if (response.ok) {
          HayDayChat.AI.patterns = data.patterns || [];
          HayDayChat.AI.lastUpdate = Date.now();
          return true;
        }
      } catch (error) {
        console.error('Pattern loading error:', error);
      }
      return false;
    },

    // Analyze message locally (quick pre-check)
    analyzeMessage: function(message) {
      const lowerMessage = message.toLowerCase();
      let bestMatch = null;
      let highestConfidence = 0;

      // Check against cached patterns
      for (const pattern of HayDayChat.AI.patterns) {
        let matchCount = 0;
        
        for (const keyword of pattern.keywords) {
          if (lowerMessage.includes(keyword.toLowerCase())) {
            matchCount++;
          }
        }

        if (matchCount > 0) {
          const confidence = (matchCount / pattern.keywords.length) * (pattern.confidence || 0.8);
          
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              ...pattern,
              calculatedConfidence: confidence,
              matchedKeywords: matchCount
            };
          }
        }
      }

      return {
        match: bestMatch,
        confidence: highestConfidence,
        shouldEscalate: highestConfidence < HayDayChat.AI.config.confidenceThreshold,
        analysisTime: Date.now()
      };
    },

    // Get quick response for common patterns
    getQuickResponse: function(message) {
      const analysis = this.analyzeMessage(message);
      
      if (analysis.match && analysis.confidence >= 0.8) {
        return {
          response: analysis.match.response,
          confidence: analysis.confidence,
          source: 'local_pattern',
          role: 'chatbot'
        };
      }

      return null;
    },

    // Update pattern usage
    updatePatternUsage: function(patternKeywords, feedback) {
      const pattern = HayDayChat.AI.patterns.find(p => 
        JSON.stringify(p.keywords) === JSON.stringify(patternKeywords)
      );

      if (pattern) {
        pattern.usage = (pattern.usage || 0) + 1;
        
        if (feedback === 'positive') {
          pattern.successRate = Math.min(1.0, (pattern.successRate || 0.5) + 0.05);
        } else if (feedback === 'negative') {
          pattern.successRate = Math.max(0.1, (pattern.successRate || 0.5) - 0.05);
        }

        // Update server-side pattern
        this.syncPatternToServer(pattern);
      }
    },

    // Sync pattern changes to server
    syncPatternToServer: async function(pattern) {
      try {
        await fetch('/api/ai/patterns/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pattern)
        });
      } catch (error) {
        console.error('Pattern sync error:', error);
      }
    }
  },

  /**
   * 🧠 AI Integration Functions
   */
  GPT: {
    // Send message to AI with context
    processMessage: async function(message, context = {}) {
      const startTime = Date.now();
      
      try {
        const response = await fetch('/api/ai/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            context: {
              timestamp: Date.now(),
              userAgent: navigator.userAgent,
              referrer: document.referrer,
              currentPage: window.location.pathname,
              ...context
            }
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          return {
            ...data,
            responseTime: Date.now() - startTime,
            role: 'ai'
          };
        } else {
          throw new Error(data.error || 'AI processing failed');
        }

      } catch (error) {
        console.error('AI processing error:', error);
        
        // Fallback response
        return {
          response: 'Üzgünüm, şu anda teknik bir sorun yaşıyorum. Lütfen Sorular & İletişim sayfamızdan bize ulaşın.',
          confidence: 0.3,
          error: error.message,
          responseTime: Date.now() - startTime,
          role: 'system'
        };
      }
    },

    // Check AI availability
    checkAvailability: async function() {
      try {
        const response = await fetch('/api/ai/health', {
          method: 'GET',
          timeout: 5000
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  },

  /**
   * 🔄 Message Processing Pipeline
   */
  MessageProcessor: {
    // Main message processing function
    processMessage: async function(message, clientId) {
      const processing = {
        startTime: Date.now(),
        steps: [],
        finalResponse: null
      };

      try {
        // Step 1: Quick local analysis
        processing.steps.push('local_analysis');
        const quickResponse = HayDayChat.AI.ChatBot.getQuickResponse(message);
        
        if (quickResponse) {
          processing.finalResponse = quickResponse;
          processing.steps.push('local_response');
          return this.formatResponse(processing);
        }

        // Step 2: Check if AI is available
        processing.steps.push('ai_availability_check');
        const aiAvailable = await HayDayChat.AI.GPT.checkAvailability();
        
        if (!aiAvailable) {
          processing.finalResponse = this.getFallbackResponse(message);
          processing.steps.push('fallback_response');
          return this.formatResponse(processing);
        }

        // Step 3: Send to AI
        processing.steps.push('ai_processing');
        const aiResponse = await HayDayChat.AI.GPT.processMessage(message, {
          clientId: clientId,
          previousSteps: processing.steps
        });

        processing.finalResponse = aiResponse;
        processing.steps.push('ai_response');

        // Step 4: Learn from AI response
        if (aiResponse.confidence > 0.8) {
          this.learnFromAIResponse(message, aiResponse);
          processing.steps.push('learning');
        }

        return this.formatResponse(processing);

      } catch (error) {
        console.error('Message processing error:', error);
        
        processing.finalResponse = this.getFallbackResponse(message);
        processing.steps.push('error_fallback');
        
        return this.formatResponse(processing);
      }
    },

    // Get fallback response for errors
    getFallbackResponse: function(message) {
      const fallbacks = [
        'Size yardımcı olmaya çalışıyorum. Lütfen sorunuzu daha detaylı sorabilir misiniz?',
        'Bu konuda size nasıl yardımcı olabilirim? Sorular & İletişim sayfamızdan da detaylı bilgi alabilirsiniz.',
        'HayDay oyunu hakkında size yardımcı olmak istiyorum. Hangi konuda bilgi almak istiyorsunuz?'
      ];

      return {
        response: fallbacks[Math.floor(Math.random() * fallbacks.length)],
        confidence: 0.5,
        role: 'chatbot',
        source: 'fallback'
      };
    },

    // Learn from successful AI responses
    learnFromAIResponse: function(userMessage, aiResponse) {
      // Extract keywords from user message
      const keywords = this.extractKeywords(userMessage);
      
      if (keywords.length >= 2) {
        // Create new pattern or strengthen existing one
        const newPattern = {
          keywords: keywords,
          response: aiResponse.response,
          confidence: 0.7, // Start with medium confidence
          usage: 1,
          successRate: 0.8,
          createdAt: Date.now(),
          source: 'ai_learning'
        };

        // Add to local patterns
        HayDayChat.AI.patterns.push(newPattern);

        // Sync to server
        HayDayChat.AI.ChatBot.syncPatternToServer(newPattern);
      }
    },

    // Extract keywords from message
    extractKeywords: function(message) {
      const stopWords = [
        'ben', 'sen', 'o', 'biz', 'siz', 'onlar',
        'bir', 'bu', 'şu', 'hangi', 'ne', 'nasıl',
        'için', 'ile', 've', 'veya', 'ama', 'fakat',
        'çok', 'az', 'biraz', 'şey', 'gibi', 'kadar'
      ];

      return message
        .toLowerCase()
        .replace(/[^\w\söçğıüş]/g, '') // Turkish chars support
        .split(/\s+/)
        .filter(word => word.length > 2)
        .filter(word => !stopWords.includes(word))
        .slice(0, 5); // Max 5 keywords
    },

    // Format final response
    formatResponse: function(processing) {
      return {
        ...processing.finalResponse,
        processingTime: Date.now() - processing.startTime,
        processingSteps: processing.steps,
        timestamp: Date.now()
      };
    }
  },

  /**
   * 📊 Analytics & Monitoring
   */
  Analytics: {
    // Track message processing metrics
    trackProcessing: function(messageData, responseData) {
      const metrics = {
        timestamp: Date.now(),
        messageLength: messageData.message.length,
        responseTime: responseData.processingTime,
        confidence: responseData.confidence,
        role: responseData.role,
        processingSteps: responseData.processingSteps,
        success: responseData.confidence > 0.5
      };

      // Store in session storage for admin analytics
      const existing = JSON.parse(sessionStorage.getItem('chat_metrics') || '[]');
      existing.push(metrics);
      
      // Keep only last 50 metrics
      if (existing.length > 50) {
        existing.splice(0, existing.length - 50);
      }
      
      sessionStorage.setItem('chat_metrics', JSON.stringify(existing));
    },

    // Get current session metrics
    getSessionMetrics: function() {
      return JSON.parse(sessionStorage.getItem('chat_metrics') || '[]');
    },

    // Calculate performance stats
    getPerformanceStats: function() {
      const metrics = this.getSessionMetrics();
      
      if (metrics.length === 0) {
        return null;
      }

      const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
      const avgConfidence = metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length;
      const successRate = metrics.filter(m => m.success).length / metrics.length;
      
      const roleDistribution = metrics.reduce((acc, m) => {
        acc[m.role] = (acc[m.role] || 0) + 1;
        return acc;
      }, {});

      return {
        totalMessages: metrics.length,
        avgResponseTime: Math.round(avgResponseTime),
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        roleDistribution: roleDistribution,
        lastUpdate: Date.now()
      };
    }
  },

  /**
   * 🔧 Utility Functions
   */
  Utils: {
    // Validate message before processing
    validateMessage: function(message) {
      if (!message || typeof message !== 'string') {
        return { valid: false, error: 'Message must be a string' };
      }

      if (message.trim().length === 0) {
        return { valid: false, error: 'Message cannot be empty' };
      }

      if (message.length > 1000) {
        return { valid: false, error: 'Message too long (max 1000 characters)' };
      }

      return { valid: true };
    },

    // Check if message is spam
    isSpam: function(message, recentMessages = []) {
      // Check for repeated messages
      const recentCount = recentMessages.filter(m => 
        m.toLowerCase() === message.toLowerCase()
      ).length;

      if (recentCount >= 3) {
        return true;
      }

      // Check for excessive caps
      const capsRatio = (message.match(/[A-ZÇĞIİÖŞÜ]/g) || []).length / message.length;
      if (capsRatio > 0.7 && message.length > 10) {
        return true;
      }

      // Check for excessive punctuation
      const punctRatio = (message.match(/[!?.,;:]/g) || []).length / message.length;
      if (punctRatio > 0.3) {
        return true;
      }

      return false;
    },

    // Clean message for processing
    cleanMessage: function(message) {
      return message
        .trim()
        .replace(/\s+/g, ' ') // Multiple spaces to single
        .replace(/(.)\1{3,}/g, '$1$1') // Repeated chars (aaaa -> aa)
        .substring(0, 1000); // Limit length
    }
  }
};

// Initialize AI Brain on load
document.addEventListener('DOMContentLoaded', () => {
  HayDayChat.AI.ChatBot.init();
});

console.log('🧠 HayDay AI Brain loaded');