/**
 * 🔍 HayDay Chat System - Comprehensive System Analysis
 * Production readiness checker and performance analyzer
 */

const fs = require('fs').promises;
const path = require('path');

class SystemAnalyzer {
  constructor() {
    this.results = {
      fileStructure: {},
      codeQuality: {},
      functionality: {},
      production: {},
      security: {},
      performance: {},
      deployment: {}
    };
    this.startTime = Date.now();
  }

  async runCompleteAnalysis() {
    console.log('🔍 HayDay Chat System - Kapsamlı Sistem Analizi');
    console.log('='.repeat(60));
    console.log('⏰ Başlangıç:', new Date().toLocaleString('tr-TR'));
    console.log('');
    
    try {
      await this.analyzeFileStructure();
      await this.analyzeCodeQuality();
      await this.analyzeFunctionality();
      await this.analyzeProductionReadiness();
      await this.analyzeSecurity();
      await this.analyzePerformance();
      await this.analyzeDeployment();
      
      this.generateComprehensiveReport();
      return this.results;
    } catch (error) {
      console.error('❌ Analiz hatası:', error);
      return null;
    }
  }

  async analyzeFileStructure() {
    console.log('📁 Dosya Yapısı Analizi...');
    
    const requiredFiles = {
      core: ['package.json', 'server.js', 'render.yaml', '.env.example', '.gitignore'],
      frontend: ['index.html', 'admin.html', 'login.html', 'style.css', 'script.js'],
      data: ['chat-log.json', 'knowledge-base.json', 'analytics.json', 'admin-sessions.json'],
      assets: ['assets/js/chat-loader.js', 'assets/js/ai-brain.js', 'assets/js/telegram-bot.js', 'assets/js/utils.js'],
      docs: ['README.md', 'PRODUCTION-READY-CHECKLIST.md']
    };

    let totalFiles = 0;
    let foundFiles = 0;
    const missingFiles = [];
    const fileDetails = {};

    for (const [category, files] of Object.entries(requiredFiles)) {
      fileDetails[category] = { required: files.length, found: 0, missing: [] };
      
      for (const file of files) {
        totalFiles++;
        try {
          const stats = await fs.stat(file);
          foundFiles++;
          fileDetails[category].found++;
          console.log(`✅ ${file} (${this.formatFileSize(stats.size)})`);
        } catch {
          missingFiles.push(file);
          fileDetails[category].missing.push(file);
          console.log(`❌ ${file} - EKSIK`);
        }
      }
    }

    this.results.fileStructure = {
      totalRequired: totalFiles,
      found: foundFiles,
      missing: missingFiles,
      completeness: Math.round((foundFiles / totalFiles) * 100),
      details: fileDetails
    };

    console.log(`📊 Dosya Tamamlanma: ${this.results.fileStructure.completeness}% (${foundFiles}/${totalFiles})\n`);
  }

  async analyzeCodeQuality() {
    console.log('🔧 Kod Kalitesi Analizi...');
    
    const codeFiles = [
      'server.js', 'script.js', 'assets/js/chat-loader.js', 
      'assets/js/ai-brain.js', 'assets/js/telegram-bot.js', 'assets/js/utils.js'
    ];

    let totalLines = 0;
    let functionalFiles = 0;
    let utf8Issues = 0;
    let errorHandling = 0;
    const fileAnalysis = {};

    for (const file of codeFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n').length;
        totalLines += lines;

        const analysis = {
          lines,
          hasContent: lines > 10,
          hasUTF8Issues: this.checkUTF8Issues(content),
          hasErrorHandling: this.checkErrorHandling(content),
          complexity: this.calculateComplexity(content)
        };

        fileAnalysis[file] = analysis;

        if (analysis.hasContent) functionalFiles++;
        if (analysis.hasUTF8Issues) utf8Issues++;
        if (analysis.hasErrorHandling) errorHandling++;

        const status = analysis.hasContent ? '✅' : '⚠️';
        const issues = [];
        if (analysis.hasUTF8Issues) issues.push('UTF-8');
        if (!analysis.hasErrorHandling) issues.push('Error handling');
        
        console.log(`${status} ${file} - ${lines} satır${issues.length ? ` (${issues.join(', ')})` : ''}`);

      } catch (error) {
        console.log(`❌ ${file} - Okunamadı: ${error.message}`);
        fileAnalysis[file] = { error: error.message };
      }
    }

    this.results.codeQuality = {
      totalLines,
      functionalFiles,
      utf8Issues,
      errorHandling,
      score: Math.round(((functionalFiles + errorHandling - utf8Issues) / (codeFiles.length * 2)) * 100),
      details: fileAnalysis
    };

    console.log(`📊 Kod Kalitesi Skoru: ${this.results.codeQuality.score}%\n`);
  }

  async analyzeFunctionality() {
    console.log('⚙️ Fonksiyonalite Analizi...');
    
    const features = {
      'ChatBot System': await this.checkChatBotSystem(),
      'AI Integration': await this.checkAIIntegration(),
      'Telegram Bot': await this.checkTelegramBot(),
      'Admin Panel': await this.checkAdminPanel(),
      'Real-time Features': await this.checkRealTimeFeatures(),
      'Mobile Support': await this.checkMobileSupport(),
      'Cross-page Continuity': await this.checkContinuity(),
      'UTF-8 Support': await this.checkUTF8Support(),
      'File Management': await this.checkFileManagement(),
      'Security Features': await this.checkSecurityFeatures()
    };

    let implementedFeatures = 0;
    for (const [feature, implemented] of Object.entries(features)) {
      const status = implemented ? '✅' : '❌';
      console.log(`${status} ${feature}`);
      if (implemented) implementedFeatures++;
    }

    this.results.functionality = {
      features,
      implemented: implementedFeatures,
      total: Object.keys(features).length,
      percentage: Math.round((implementedFeatures / Object.keys(features).length) * 100)
    };

    console.log(`📊 Fonksiyonalite Tamamlanma: ${this.results.functionality.percentage}%\n`);
  }

  async analyzeProductionReadiness() {
    console.log('🚀 Production Hazırlık Analizi...');
    
    const checks = {
      'Environment Setup': await this.checkEnvironmentSetup(),
      'Render Configuration': await this.checkRenderConfig(),
      'Health Endpoints': await this.checkHealthEndpoints(),
      'Error Handling': await this.checkGlobalErrorHandling(),
      'Rate Limiting': await this.checkRateLimiting(),
      'Logging System': await this.checkLoggingSystem(),
      'File Backup': await this.checkBackupSystem(),
      'Graceful Shutdown': await this.checkGracefulShutdown()
    };

    let readyFeatures = 0;
    for (const [feature, ready] of Object.entries(checks)) {
      const status = ready ? '✅' : '❌';
      console.log(`${status} ${feature}`);
      if (ready) readyFeatures++;
    }

    this.results.production = {
      checks,
      readyFeatures,
      totalChecks: Object.keys(checks).length,
      readiness: Math.round((readyFeatures / Object.keys(checks).length) * 100)
    };

    console.log(`📊 Production Hazırlık: ${this.results.production.readiness}%\n`);
  }

  async analyzeSecurity() {
    console.log('🔒 Güvenlik Analizi...');
    
    const securityChecks = {
      'Input Validation': await this.checkInputValidation(),
      'XSS Protection': await this.checkXSSProtection(),
      'CORS Configuration': await this.checkCORSConfig(),
      'Helmet Security': await this.checkHelmetSecurity(),
      'Admin Authentication': await this.checkAdminAuth(),
      'Session Management': await this.checkSessionManagement(),
      'API Security': await this.checkAPISecurity(),
      'Data Sanitization': await this.checkDataSanitization()
    };

    let secureFeatures = 0;
    for (const [feature, secure] of Object.entries(securityChecks)) {
      const status = secure ? '✅' : '⚠️';
      console.log(`${status} ${feature}`);
      if (secure) secureFeatures++;
    }

    this.results.security = {
      checks: securityChecks,
      secureFeatures,
      totalChecks: Object.keys(securityChecks).length,
      score: Math.round((secureFeatures / Object.keys(securityChecks).length) * 100)
    };

    console.log(`📊 Güvenlik Skoru: ${this.results.security.score}%\n`);
  }

  async analyzePerformance() {
    console.log('⚡ Performans Analizi...');
    
    const perfChecks = {
      'File Locking': await this.checkFileLocking(),
      'Memory Management': await this.checkMemoryManagement(),
      'Database Optimization': await this.checkDatabaseOpt(),
      'Frontend Optimization': await this.checkFrontendOpt(),
      'Caching Strategy': await this.checkCaching(),
      'Resource Compression': await this.checkCompression()
    };

    let optimizedFeatures = 0;
    for (const [feature, optimized] of Object.entries(perfChecks)) {
      const status = optimized ? '✅' : '⚠️';
      console.log(`${status} ${feature}`);
      if (optimized) optimizedFeatures++;
    }

    this.results.performance = {
      checks: perfChecks,
      optimizedFeatures,
      totalChecks: Object.keys(perfChecks).length,
      score: Math.round((optimizedFeatures / Object.keys(perfChecks).length) * 100)
    };

    console.log(`📊 Performans Skoru: ${this.results.performance.score}%\n`);
  }

  async analyzeDeployment() {
    console.log('🌐 Deployment Analizi...');
    
    const deployChecks = {
      'Package.json Valid': await this.checkPackageJson(),
      'Render Config': await this.checkRenderConfig(),
      'Environment Template': await this.checkEnvTemplate(),
      'Git Ignore': await this.checkGitIgnore(),
      'Documentation': await this.checkDocumentation(),
      'Health Check': await this.checkHealthEndpoint()
    };

    let deployReady = 0;
    for (const [feature, ready] of Object.entries(deployChecks)) {
      const status = ready ? '✅' : '❌';
      console.log(`${status} ${feature}`);
      if (ready) deployReady++;
    }

    this.results.deployment = {
      checks: deployChecks,
      readyFeatures: deployReady,
      totalChecks: Object.keys(deployChecks).length,
      readiness: Math.round((deployReady / Object.keys(deployChecks).length) * 100)
    };

    console.log(`📊 Deployment Hazırlık: ${this.results.deployment.readiness}%\n`);
  }

  // Helper Methods
  checkUTF8Issues(content) {
    return content.includes('ð') || content.includes('Ã') || content.includes('â€™');
  }

  checkErrorHandling(content) {
    return content.includes('try {') && content.includes('catch');
  }

  calculateComplexity(content) {
    const conditions = (content.match(/if\s*\(|switch\s*\(|for\s*\(|while\s*\(/g) || []).length;
    const functions = (content.match(/function\s+\w+|=>\s*{|async\s+function/g) || []).length;
    return Math.round((conditions + functions) / 10);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Feature Check Methods
  async checkChatBotSystem() {
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      const knowledgeExists = await this.fileExists('knowledge-base.json');
      return serverContent.includes('ChatBotBrain') && knowledgeExists;
    } catch { return false; }
  }

  async checkAIIntegration() {
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      return serverContent.includes('OpenAI') && serverContent.includes('gpt-3.5-turbo');
    } catch { return false; }
  }

  async checkTelegramBot() {
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      return serverContent.includes('TelegramBot') && serverContent.includes('webhook');
    } catch { return false; }
  }

  async checkAdminPanel() {
    try {
      const adminExists = await this.fileExists('admin.html');
      const loginExists = await this.fileExists('login.html');
      return adminExists && loginExists;
    } catch { return false; }
  }

  async checkRealTimeFeatures() {
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      return serverContent.includes('/api/chat/poll');
    } catch { return false; }
  }

  async checkMobileSupport() {
    try {
      const cssContent = await fs.readFile('style.css', 'utf8');
      return cssContent.includes('@media') && cssContent.includes('mobile');
    } catch { return false; }
  }

  async checkContinuity() {
    try {
      const scriptContent = await fs.readFile('script.js', 'utf8');
      return scriptContent.includes('localStorage') && scriptContent.includes('clientId');
    } catch { return false; }
  }

  async checkUTF8Support() {
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      return serverContent.includes('charset=utf-8') && !this.checkUTF8Issues(serverContent);
    } catch { return false; }
  }

  async checkFileManagement() {
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      return serverContent.includes('FileManager') && serverContent.includes('FileLock');
    } catch { return false; }
  }

  async checkSecurityFeatures() {
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      return serverContent.includes('helmet') && serverContent.includes('rateLimit');
    } catch { return false; }
  }

  // Production checks
  async checkEnvironmentSetup() {
    return await this.fileExists('.env.example');
  }

  async checkRenderConfig() {
    return await this.fileExists('render.yaml');
  }

  async checkHealthEndpoints() {
    return await this.hasInFile('server.js', '/ping');
  }

  async checkGlobalErrorHandling() {
    return await this.hasInFile('server.js', 'process.on');
  }

  async checkRateLimiting() {
    return await this.hasInFile('server.js', 'rateLimit');
  }

  async checkLoggingSystem() {
    return await this.hasInFile('server.js', 'Logger');
  }

  async checkBackupSystem() {
    return await this.hasInFile('server.js', 'backup');
  }

  async checkGracefulShutdown() {
    return await this.hasInFile('server.js', 'SIGTERM');
  }

  // Security checks
  async checkInputValidation() {
    return await this.hasInFile('server.js', 'validationResult');
  }

  async checkXSSProtection() {
    return await this.hasInFile('script.js', 'sanitize');
  }

  async checkCORSConfig() {
    return await this.hasInFile('server.js', 'cors');
  }

  async checkHelmetSecurity() {
    return await this.hasInFile('server.js', 'helmet');
  }

  async checkAdminAuth() {
    return await this.hasInFile('server.js', 'authenticateAdmin');
  }

  async checkSessionManagement() {
    return await this.hasInFile('server.js', 'adminSessions');
  }

  async checkAPISecurity() {
    return await this.hasInFile('server.js', 'Bearer');
  }

  async checkDataSanitization() {
    return await this.hasInFile('script.js', 'sanitize');
  }

  // Performance checks
  async checkFileLocking() {
    return await this.hasInFile('server.js', 'FileLock');
  }

  async checkMemoryManagement() {
    return await this.hasInFile('server.js', 'memoryUsage');
  }

  async checkDatabaseOpt() {
    return await this.hasInFile('server.js', 'atomic');
  }

  async checkFrontendOpt() {
    return await this.hasInFile('style.css', 'transition');
  }

  async checkCaching() {
    return await this.hasInFile('script.js', 'localStorage');
  }

  async checkCompression() {
    return await this.hasInFile('server.js', 'compression');
  }

  // Deployment checks
  async checkPackageJson() {
    return await this.fileExists('package.json');
  }

  async checkEnvTemplate() {
    return await this.fileExists('.env.example');
  }

  async checkGitIgnore() {
    return await this.fileExists('.gitignore');
  }

  async checkDocumentation() {
    const readmeExists = await this.fileExists('README.md');
    const checklistExists = await this.fileExists('PRODUCTION-READY-CHECKLIST.md');
    return readmeExists && checklistExists;
  }

  async checkHealthEndpoint() {
    return await this.hasInFile('server.js', '/ping');
  }

  // Utility methods
  async fileExists(file) {
    try {
      await fs.access(file);
      return true;
    } catch {
      return false;
    }
  }

  async hasInFile(file, searchTerm) {
    try {
      const content = await fs.readFile(file, 'utf8');
      return content.includes(searchTerm);
    } catch {
      return false;
    }
  }

  generateComprehensiveReport() {
    const duration = Date.now() - this.startTime;
    
    console.log('═'.repeat(60));
    console.log('📊 HAYDAY CHAT SYSTEM - KAPSAMLI ANALİZ RAPORU');
    console.log('═'.repeat(60));
    
    // Overall Score Calculation
    const scores = [
      this.results.fileStructure.completeness,
      this.results.codeQuality.score,
      this.results.functionality.percentage,
      this.results.production.readiness,
      this.results.security.score,
      this.results.performance.score,
      this.results.deployment.readiness
    ];
    
    const overallScore = Math.round(scores.reduce((a, b) => a + b) / scores.length);
    
    console.log(`\n🎯 GENEL SKOR: ${overallScore}%`);
    console.log(this.getScoreStatus(overallScore));
    
    console.log('\n📋 DETAYLI SONUÇLAR:');
    console.log(`📁 Dosya Yapısı: ${this.results.fileStructure.completeness}% (${this.results.fileStructure.found}/${this.results.fileStructure.totalRequired})`);
    console.log(`🔧 Kod Kalitesi: ${this.results.codeQuality.score}% (${this.results.codeQuality.totalLines} satır)`);
    console.log(`⚙️ Fonksiyonalite: ${this.results.functionality.percentage}% (${this.results.functionality.implemented}/${this.results.functionality.total})`);
    console.log(`🚀 Production: ${this.results.production.readiness}% (${this.results.production.readyFeatures}/${this.results.production.totalChecks})`);
    console.log(`🔒 Güvenlik: ${this.results.security.score}% (${this.results.security.secureFeatures}/${this.results.security.totalChecks})`);
    console.log(`⚡ Performans: ${this.results.performance.score}% (${this.results.performance.optimizedFeatures}/${this.results.performance.totalChecks})`);
    console.log(`🌐 Deployment: ${this.results.deployment.readiness}% (${this.results.deployment.readyFeatures}/${this.results.deployment.totalChecks})`);

    console.log('\n🎯 DURUM DEĞERLENDİRMESİ:');
    this.printStatusAssessment(overallScore);

    console.log('\n💡 ÖNERİLER:');
    this.printRecommendations();

    console.log('\n🏁 ANALİZ TAMAMLANDI!');
    console.log(`⏱️ Süre: ${duration}ms`);
    console.log(`📅 Tarih: ${new Date().toLocaleString('tr-TR')}`);
    console.log('═'.repeat(60));
  }

  getScoreStatus(score) {
    if (score >= 95) return '🏆 Mükemmel - Production için hazır!';
    if (score >= 90) return '🥇 Çok İyi - Minor iyileştirmeler';
    if (score >= 80) return '🥈 İyi - Birkaç geliştirme gerekli';
    if (score >= 70) return '🥉 Orta - Önemli iyileştirmeler';
    if (score >= 60) return '⚠️ Zayıf - Major geliştirmeler gerekli';
    return '🚨 Kritik - Significant development required';
  }

  printStatusAssessment(score) {
    if (score >= 90) {
      console.log('🟢 SİSTEM PRODUCTION READY!');
      console.log('• GitHub\'a push edilebilir');
      console.log('• Render\'da deploy edilebilir');
      console.log('• UptimeRobot ile monitor edilebilir');
    } else if (score >= 80) {
      console.log('🟡 SİSTEM NEREDEYSE HAZIR');
      console.log('• Küçük düzeltmeler yapılmalı');
      console.log('• Test environment\'da çalıştırılabilir');
    } else {
      console.log('🔴 SİSTEM HAZIR DEĞİL');
      console.log('• Kritik sorunlar giderilmeli');
      console.log('• Geliştirme devam etmeli');
    }
  }

  printRecommendations() {
    const recommendations = [];
    
    if (this.results.fileStructure.completeness < 100) {
      recommendations.push(`Eksik dosyaları tamamla: ${this.results.fileStructure.missing.slice(0, 3).join(', ')}`);
    }
    
    if (this.results.codeQuality.utf8Issues > 0) {
      recommendations.push('UTF-8 encoding sorunlarını çöz');
    }
    
    if (this.results.security.score < 85) {
      recommendations.push('Güvenlik önlemlerini güçlendir');
    }
    
    if (this.results.performance.score < 80) {
      recommendations.push('Performans optimizasyonları yap');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Sistem optimize edilmiş durumda! 🎉');
    }
    
    recommendations.forEach(rec => console.log(`💡 ${rec}`));
  }
}

// CLI Usage
if (require.main === module) {
  const analyzer = new SystemAnalyzer();
  analyzer.runCompleteAnalysis().catch(console.error);
}

module.exports = SystemAnalyzer;
             envContent.includes('TELEGRAM_BOT_TOKEN');
    } catch {
      return false;
    }
  }

  async checkGitIgnore() {
    try {
      const gitignoreContent = await fs.readFile('.gitignore', 'utf8');
      return gitignoreContent.includes('node_modules') && 
             gitignoreContent.includes('.env');
    } catch {
      return false;
    }
  }

  async checkDocumentation() {
    try {
      const readmeContent = await fs.readFile('README.md', 'utf8');
      return readmeContent.includes('## Proje Başlangıcı') && 
             readmeContent.includes('## Kurulum');
    } catch {
      return false;
    }
  }

  async checkHealthEndpoint() {
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      return serverContent.includes('/health') && 
             serverContent.includes('status: "UP"');
    } catch {
      return false;
    }
  }

  generateComprehensiveReport() {
    const duration = Date.now() - this.startTime;
    
    console.log('═'.repeat(60));
    console.log('📊 HAYDAY CHAT SYSTEM - KAPSAMLI ANALİZ RAPORU');
    console.log('═'.repeat(60));
    
    // Overall Score Calculation
    const scores = [
      this.results.fileStructure.completeness,
      this.results.codeQuality.score,
      this.results.functionality.percentage,
      this.results.production.readiness,
      this.results.security.score,
      this.results.performance.score,
      this.results.deployment.readiness
    ];
    
    const overallScore = Math.round(scores.reduce((a, b) => a + b) / scores.length);
    
    console.log(`\n🎯 GENEL SKOR: ${overallScore}%`);
    console.log(this.getScoreStatus(overallScore));
    
    console.log('\n📋 DETAYLI SONUÇLAR:');
    console.log(`📁 Dosya Yapısı: ${this.results.fileStructure.completeness}% (${this.results.fileStructure.found}/${this.results.fileStructure.totalRequired})`);
    console.log(`🔧 Kod Kalitesi: ${this.results.codeQuality.score}% (${this.results.codeQuality.totalLines} satır)`);
    console.log(`⚙️ Fonksiyonalite: ${this.results.functionality.percentage}% (${this.results.functionality.implemented}/${this.results.functionality.total})`);
    console.log(`🚀 Production: ${this.results.production.readiness}% (${this.results.production.readyFeatures}/${this.results.production.totalChecks})`);
    console.log(`🔒 Güvenlik: ${this.results.security.score}% (${this.results.security.secureFeatures}/${this.results.security.totalChecks})`);
    console.log(`⚡ Performans: ${this.results.performance.score}% (${this.results.performance.optimizedFeatures}/${this.results.performance.totalChecks})`);
    console.log(`🌐 Deployment: ${this.results.deployment.readiness}% (${this.results.deployment.readyFeatures}/${this.results.deployment.totalChecks})`);

    console.log('\n🎯 DURUM DEĞERLENDİRMESİ:');
    this.printStatusAssessment(overallScore);

    console.log('\n💡 ÖNERİLER:');
    this.printRecommendations();

    console.log('\n🏁 ANALİZ TAMAMLANDI!');
    console.log(`⏱️ Süre: ${duration}ms`);
    console.log(`📅 Tarih: ${new Date().toLocaleString('tr-TR')}`);
    console.log('═'.repeat(60));
  }

  getScoreStatus(score) {
    if (score >= 95) return '🏆 Mükemmel - Production için hazır!';
    if (score >= 90) return '🥇 Çok İyi - Minor iyileştirmeler';
    if (score >= 80) return '🥈 İyi - Birkaç geliştirme gerekli';
    if (score >= 70) return '🥉 Orta - Önemli iyileştirmeler';
    if (score >= 60) return '⚠️ Zayıf - Major geliştirmeler gerekli';
    return '🚨 Kritik - Significant development required';
  }

  printStatusAssessment(score) {
    if (score >= 90) {
      console.log('🟢 SİSTEM PRODUCTION READY!');
      console.log('• GitHub\'a push edilebilir');
      console.log('• Render\'da deploy edilebilir');
      console.log('• UptimeRobot ile monitor edilebilir');
    } else if (score >= 80) {
      console.log('🟡 SİSTEM NEREDEYSE HAZIR');
      console.log('• Küçük düzeltmeler yapılmalı');
      console.log('• Test environment\'da çalıştırılabilir');
    } else {
      console.log('🔴 SİSTEM HAZIR DEĞİL');
      console.log('• Kritik sorunlar giderilmeli');
      console.log('• Geliştirme devam etmeli');
    }
  }

  printRecommendations() {
    const recommendations = [];
    
    if (this.results.fileStructure.completeness < 100) {
      recommendations.push(`Eksik dosyaları tamamla: ${this.results.fileStructure.missing.slice(0, 3).join(', ')}`);
    }
    
    if (this.results.codeQuality.utf8Issues > 0) {
      recommendations.push('UTF-8 encoding sorunlarını çöz');
    }
    
    if (this.results.security.score < 85) {
      recommendations.push('Güvenlik önlemlerini güçlendir');
    }
    
    if (this.results.performance.score < 80) {
      recommendations.push('Performans optimizasyonları yap');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Sistem optimize edilmiş durumda! 🎉');
    }
    
    recommendations.forEach(rec => console.log(`💡 ${rec}`));
  }
}

// CLI Usage
if (require.main === module) {
  const analyzer = new SystemAnalyzer();
  analyzer.runCompleteAnalysis().catch(console.error);
}

module.exports = SystemAnalyzer;
