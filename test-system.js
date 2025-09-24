/**
 * 🧪 HayDay Chat System - Production Readiness Test Suite
 * Comprehensive testing for deployment verification
 */

const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

class ProductionTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🧪 HAYDAY CHAT SYSTEM - PRODUCTION TEST SUITE');
    console.log('═'.repeat(55));
    console.log('⏰ Test Start:', new Date().toLocaleString('tr-TR'));
    console.log('🎯 Target: Production Deployment Verification');
    console.log('');
    
    await this.testFileStructure();
    await this.testEnvironmentConfiguration();
    await this.testPackageConfiguration();
    await this.testDataFiles();
    await this.testStaticAssets();
    await this.testCodeQuality();
    await this.testSecurity();
    await this.testPerformance();
    
    this.printFinalResults();
    return this.results.failed === 0;
  }

  test(description, condition, type = 'test') {
    const result = {
      description,
      passed: !!condition,
      type,
      timestamp: Date.now()
    };

    this.results.tests.push(result);

    if (condition) {
      this.results.passed++;
      console.log(`✅ ${description}`);
    } else {
      if (type === 'warning') {
        this.results.warnings++;
        console.log(`⚠️ ${description}`);
      } else {
        this.results.failed++;
        console.log(`❌ ${description}`);
      }
    }

    return result;
  }

  async testFileStructure() {
    console.log('📁 Testing File Structure...');
    
    const criticalFiles = {
      core: ['package.json', 'server.js', 'render.yaml', '.env.example', '.gitignore'],
      frontend: ['index.html', 'admin.html', 'login.html', 'style.css', 'script.js'],
      data: ['chat-log.json', 'knowledge-base.json', 'analytics.json', 'admin-sessions.json'],
      assets: [
        'assets/js/chat-loader.js', 
        'assets/js/ai-brain.js', 
        'assets/js/telegram-bot.js', 
        'assets/js/utils.js'
      ],
      docs: ['README.md', 'PRODUCTION-READY-CHECKLIST.md']
    };

    let totalFiles = 0;
    let foundFiles = 0;

    for (const [category, files] of Object.entries(criticalFiles)) {
      console.log(`\n  📂 ${category.toUpperCase()} Files:`);
      
      for (const file of files) {
        totalFiles++;
        try {
          const stats = await fs.stat(file);
          foundFiles++;
          this.test(`${file} exists (${this.formatSize(stats.size)})`, true);
        } catch {
          this.test(`${file} exists`, false);
        }
      }
    }

    this.test(`File completeness: ${foundFiles}/${totalFiles}`, foundFiles >= totalFiles * 0.9);
    console.log('');
  }

  async testEnvironmentConfiguration() {
    console.log('🔧 Testing Environment Configuration...');
    
    // Load environment files
    const envFiles = [
      { path: '.env.example', name: '.env.example' },
      { path: '.env', name: '.env (if exists)' }
    ];

    for (const file of envFiles) {
      try {
        await fs.access(file.path);
        dotenv.config({ path: file.path, override: true });
        this.test(`${file.name} exists`, true);
      } catch {
        if (file.path === '.env') {
          this.test(`${file.name} exists`, false, 'warning');
        } else {
          this.test(`${file.name} exists`, false);
        }
      }
    }

    // Test required environment variables
    const requiredVars = [
      { key: 'NODE_ENV', required: false },
      { key: 'PORT', required: false },
      { key: 'OPENAI_API_KEY', required: true },
      { key: 'TELEGRAM_BOT_TOKEN', required: true },
      { key: 'ADMIN_TELEGRAM_ID', required: true },
      { key: 'RENDER_EXTERNAL_URL', required: false }
    ];

    console.log('\n  🔑 Environment Variables:');
    
    for (const envVar of requiredVars) {
      const value = process.env[envVar.key];
      const hasValue = !!value;
      
      if (envVar.required) {
        this.test(`${envVar.key} is set`, hasValue);
      } else {
        this.test(`${envVar.key} is set`, hasValue, 'warning');
      }

      // Format validation
      if (hasValue) {
        switch (envVar.key) {
          case 'OPENAI_API_KEY':
            this.test(`${envVar.key} format valid`, value.startsWith('sk-'));
            break;
          case 'TELEGRAM_BOT_TOKEN':
            this.test(`${envVar.key} format valid`, /^\d+:[A-Za-z0-9_-]+$/.test(value));
            break;
          case 'ADMIN_TELEGRAM_ID':
            this.test(`${envVar.key} format valid`, /^\d{8,12}$/.test(value));
            break;
          case 'PORT':
            const port = parseInt(value);
            this.test(`${envVar.key} is valid number`, !isNaN(port) && port > 0 && port < 65536);
            break;
        }
      }
    }

    console.log('');
  }

  async testPackageConfiguration() {
    console.log('📦 Testing Package Configuration...');
    
    try {
      const pkgContent = await fs.readFile('package.json', 'utf8');
      const pkg = JSON.parse(pkgContent);
      
      this.test('package.json is valid JSON', true);
      this.test('Has name field', !!pkg.name);
      this.test('Has version field', !!pkg.version);
      this.test('Has main field', !!pkg.main);
      
      // Scripts
      console.log('\n  🛠️ Scripts:');
      this.test('Has start script', !!pkg.scripts?.start);
      this.test('Start script points to server.js', pkg.scripts?.start?.includes('server.js'));
      
      // Dependencies
      console.log('\n  📚 Dependencies:');
      const requiredDeps = [
        'express', 'cors', 'helmet', 'express-rate-limit',
        'dotenv', 'openai', 'node-telegram-bot-api', 
        'uuid', 'moment', 'express-validator'
      ];

      for (const dep of requiredDeps) {
        this.test(`Has ${dep} dependency`, !!pkg.dependencies?.[dep]);
      }

      // Engine requirements
      console.log('\n  🚀 Engine:');
      this.test('Has Node.js engine requirement', !!pkg.engines?.node);
      
      if (pkg.engines?.node) {
        this.test('Node.js version >= 18', pkg.engines.node.includes('18') || pkg.engines.node.includes('>=18'));
      }

    } catch (error) {
      this.test('package.json is valid', false);
      console.error('Package.json error:', error.message);
    }

    console.log('');
  }

  async testDataFiles() {
    console.log('💾 Testing Data Files...');
    
    const dataFiles = [
      { file: 'chat-log.json', defaultContent: '[]' },
      { file: 'knowledge-base.json', requiresContent: true },
      { file: 'analytics.json', defaultContent: '{}' },
      { file: 'admin-sessions.json', defaultContent: '{}' }
    ];

    for (const dataFile of dataFiles) {
      try {
        const content = await fs.readFile(dataFile.file, 'utf8');
        this.test(`${dataFile.file} exists`, true);
        
        try {
          const parsed = JSON.parse(content);
          this.test(`${dataFile.file} is valid JSON`, true);
          
          if (dataFile.requiresContent) {
            const hasContent = Array.isArray(parsed) ? parsed.length > 0 : Object.keys(parsed).length > 0;
            this.test(`${dataFile.file} has content`, hasContent);
          }
        } catch {
          this.test(`${dataFile.file} is valid JSON`, false);
        }
      } catch {
        this.test(`${dataFile.file} exists`, false, 'warning');
      }
    }

    console.log('');
  }

  async testStaticAssets() {
    console.log('🎨 Testing Static Assets...');
    
    const assetTests = [
      { file: 'style.css', test: content => content.includes(':root') && content.includes('--primary') },
      { file: 'script.js', test: content => content.includes('HayDayChat') && content.includes('Utils') },
      { file: 'index.html', test: content => content.includes('<!DOCTYPE html') && content.includes('UTF-8') },
      { file: 'admin.html', test: content => content.includes('Admin Panel') && content.includes('UTF-8') },
      { file: 'login.html', test: content => content.includes('Telegram') && content.includes('UTF-8') }
    ];

    for (const asset of assetTests) {
      try {
        const content = await fs.readFile(asset.file, 'utf8');
        this.test(`${asset.file} exists`, true);
        
        if (asset.test) {
          this.test(`${asset.file} has required content`, asset.test(content));
        }

        // UTF-8 encoding test
        const hasEncodingIssues = this.hasUTF8Issues(content);
        this.test(`${asset.file} UTF-8 clean`, !hasEncodingIssues);
        
      } catch {
        this.test(`${asset.file} exists`, false);
      }
    }

    console.log('');
  }

  async testCodeQuality() {
    console.log('🔍 Testing Code Quality...');
    
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      
      // Basic structure tests
      this.test('Server has Express setup', serverContent.includes('express()'));
      this.test('Server has middleware setup', serverContent.includes('app.use'));
      this.test('Server has error handling', serverContent.includes('try') && serverContent.includes('catch'));
      this.test('Server has logging', serverContent.includes('Logger') || serverContent.includes('console.log'));
      this.test('Server has graceful shutdown', serverContent.includes('SIGTERM') || serverContent.includes('SIGINT'));
      
      // API endpoints
      const apiEndpoints = [
        '/api/chat/send',
        '/api/chat/history',
        '/api/admin/dashboard',
        '/ping'
      ];

      console.log('\n  🌐 API Endpoints:');
      for (const endpoint of apiEndpoints) {
        this.test(`Has ${endpoint} endpoint`, serverContent.includes(endpoint));
      }

    } catch {
      this.test('Server.js code quality check', false);
    }

    console.log('');
  }

  async testSecurity() {
    console.log('🔒 Testing Security Configuration...');
    
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      
      // Security middleware
      this.test('Has Helmet security headers', serverContent.includes('helmet'));
      this.test('Has CORS configuration', serverContent.includes('cors'));
      this.test('Has rate limiting', serverContent.includes('rateLimit'));
      this.test('Has input validation', serverContent.includes('validationResult') || serverContent.includes('body('));
      this.test('Has authentication middleware', serverContent.includes('authenticateAdmin') || serverContent.includes('auth'));
      
      // Security practices
      this.test('Uses environment variables', serverContent.includes('process.env'));
      this.test('Has session management', serverContent.includes('session'));
      
    } catch {
      this.test('Security configuration check', false);
    }

    console.log('');
  }

  async testPerformance() {
    console.log('⚡ Testing Performance Configuration...');
    
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      
      // Performance features
      this.test('Has file locking mechanism', serverContent.includes('FileLock') || serverContent.includes('lock'));
      this.test('Has async/await patterns', serverContent.includes('async') && serverContent.includes('await'));
      this.test('Has proper JSON handling', serverContent.includes('express.json'));
      this.test('Has UTF-8 charset headers', serverContent.includes('charset=utf-8'));
      
    } catch {
      this.test('Performance configuration check', false);
    }

    console.log('');
  }

  hasUTF8Issues(content) {
    const commonIssues = [
      'ðŸ¤–', 'ðŸ"¤', 'ðŸ"', 'Ã‡evrimiÃ§i', 'nasÄ±l', 
      'âœ•', 'â³', 'Ã§', 'Ã¶', 'ÃŸ', 'Ã¼'
    ];
    return commonIssues.some(issue => content.includes(issue));
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  printFinalResults() {
    const duration = Date.now() - this.startTime;
    
    console.log('═'.repeat(55));
    console.log('📊 PRODUCTION TEST RESULTS');
    console.log('═'.repeat(55));
    
    const total = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = Math.round((this.results.passed / total) * 100);
    
    console.log(`\n🎯 OVERALL SCORE: ${successRate}%`);
    
    if (successRate >= 95) {
      console.log('🏆 EXCELLENT - Production ready!');
    } else if (successRate >= 90) {
      console.log('🥇 VERY GOOD - Minor issues only');
    } else if (successRate >= 80) {
      console.log('🥈 GOOD - Some improvements needed');
    } else if (successRate >= 70) {
      console.log('🥉 FAIR - Several issues to address');
    } else {
      console.log('🚨 POOR - Major improvements required');
    }
    
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️ Warnings: ${this.results.warnings}`);
    console.log(`📊 Total: ${total} tests`);
    
    console.log('\n🎊 DEPLOYMENT STATUS:');
    if (this.results.failed === 0) {
      console.log('🟢 DEPLOY APPROVED!');
      console.log('✅ All critical tests passed');
      console.log('🚀 System ready for production deployment');
      
      if (this.results.warnings > 0) {
        console.log(`⚠️ Note: ${this.results.warnings} warnings found (non-critical)`);
      }
    } else {
      console.log('🔴 DEPLOY NOT RECOMMENDED');
      console.log(`❌ ${this.results.failed} critical issues found`);
      console.log('🔧 Fix failing tests before deployment');
    }
    
    if (this.results.failed > 0) {
      console.log('\n🚨 FAILED TESTS:');
      this.results.tests
        .filter(test => !test.passed && test.type !== 'warning')
        .forEach(test => {
          console.log(`❌ ${test.description}`);
        });
    }
    
    if (this.results.warnings > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.results.tests
        .filter(test => !test.passed && test.type === 'warning')
        .slice(0, 5)
        .forEach(test => {
          console.log(`⚠️ ${test.description}`);
        });
        
      if (this.results.warnings > 5) {
        console.log(`... and ${this.results.warnings - 5} more warnings`);
      }
    }
    
    console.log(`\n⏰ Test Duration: ${duration}ms`);
    console.log(`📅 Completed: ${new Date().toLocaleString('tr-TR')}`);
    console.log('═'.repeat(55));
  }
}

// CLI Usage
if (require.main === module) {
  const tester = new ProductionTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = ProductionTester;
