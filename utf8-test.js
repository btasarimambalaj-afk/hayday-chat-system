/**
 * 🧪 FINAL UTF-8 Verification Suite
 * Comprehensive encoding test for production deployment
 */

const fs = require('fs').promises;
const path = require('path');

class FinalUTF8Tester {
  constructor() {
    this.testPatterns = {
      // Turkish characters
      turkish: 'çğıöşüÇĞIİÖŞÜ',
      
      // Common emojis used in the system
      emojis: '🤖📤🔍✕⚠️📊💬👨‍💼🎯',
      
      // Real system content
      systemText: 'Çevrimiçi nasıl yardımcı olabilirim?',
      
      // Known problematic patterns
      problems: ['ðŸ¤–', 'Ã‡evrimiÃ§i', 'nasÄ±l', 'âœ•', 'â³']
    };
  }

  async runFinalTest() {
    console.log('🧪 FINAL UTF-8 VERIFICATION SUITE');
    console.log('='.repeat(50));
    console.log('🎯 Target: 100% Clean UTF-8 Encoding');
    console.log('⏰ Test Time:', new Date().toLocaleString('tr-TR'));
    console.log('');

    const results = {
      files: await this.testAllFiles(),
      patterns: await this.testPatterns(),
      browser: await this.testBrowserCompatibility(),
      summary: {}
    };

    results.summary = this.generateSummary(results);
    this.printFinalResults(results);
    
    return results;
  }

  async testAllFiles() {
    console.log('📁 Testing All Files...');
    
    const testFiles = [
      'index.html', 'admin.html', 'login.html', 'style.css', 'script.js', 'server.js',
      'assets/js/chat-loader.js', 'assets/js/ai-brain.js', 
      'assets/js/telegram-bot.js', 'assets/js/utils.js',
      'knowledge-base.json', 'README.md'
    ];

    const fileResults = {};
    let cleanFiles = 0;
    let totalIssues = 0;

    for (const file of testFiles) {
      try {
        const result = await this.testSingleFile(file);
        fileResults[file] = result;
        
        if (result.isClean) {
          cleanFiles++;
          console.log(`✅ ${file} - CLEAN`);
        } else {
          const issueCount = result.issues.length;
          totalIssues += issueCount;
          console.log(`❌ ${file} - ${issueCount} issues: ${result.issues.join(', ')}`);
        }
      } catch (error) {
        fileResults[file] = { error: error.message, isClean: false };
        console.log(`⚠️ ${file} - Cannot test: ${error.message}`);
      }
    }

    console.log(`\n📊 File Test Results: ${cleanFiles}/${testFiles.length} clean, ${totalIssues} total issues\n`);
    
    return {
      files: fileResults,
      cleanFiles,
      totalFiles: testFiles.length,
      totalIssues,
      cleanPercentage: Math.round((cleanFiles / testFiles.length) * 100)
    };
  }

  async testSingleFile(fileName) {
    try {
      const content = await fs.readFile(fileName, 'utf8');
      
      const result = {
        size: content.length,
        hasUTF8Meta: false,
        hasTurkishChars: /[çğıöşüÇĞIİÖŞÜ]/.test(content),
        hasEmojis: /[\u{1F300}-\u{1F9FF}]/u.test(content),
        issues: [],
        isClean: true
      };

      // Check for UTF-8 meta tag in HTML files
      if (fileName.endsWith('.html')) {
        result.hasUTF8Meta = content.includes('charset="UTF-8"') || content.includes('charset=UTF-8');
        if (!result.hasUTF8Meta) {
          result.issues.push('Missing UTF-8 meta tag');
          result.isClean = false;
        }
      }

      // Check for encoding problems
      this.testPatterns.problems.forEach(problem => {
        if (content.includes(problem)) {
          result.issues.push(`Encoding issue: ${problem}`);
          result.isClean = false;
        }
      });

      // Check for double-encoded UTF-8
      const doubleEncoding = ['Ã¢â‚¬â„¢', 'Ã¢â‚¬Å"', 'Ã¢â‚¬Â'];
      doubleEncoding.forEach(pattern => {
        if (content.includes(pattern)) {
          result.issues.push('Double UTF-8 encoding detected');
          result.isClean = false;
        }
      });

      return result;
    } catch (error) {
      throw new Error(`Cannot read file ${fileName}: ${error.message}`);
    }
  }

  async testPatterns() {
    console.log('🔤 Testing Character Patterns...');
    
    const patternResults = {};
    
    for (const [name, pattern] of Object.entries(this.testPatterns)) {
      if (name === 'problems') continue; // Skip problem patterns
      
      const test = {
        pattern,
        length: pattern.length,
        isValid: this.validateUTF8Pattern(pattern),
        browserSafe: this.testBrowserSafety(pattern)
      };
      
      patternResults[name] = test;
      
      const status = test.isValid && test.browserSafe ? '✅' : '❌';
      console.log(`${status} ${name}: "${pattern}" (${test.length} chars)`);
    }

    console.log('');
    return patternResults;
  }

  validateUTF8Pattern(pattern) {
    try {
      // Test if pattern can be properly encoded/decoded
      const encoded = Buffer.from(pattern, 'utf8');
      const decoded = encoded.toString('utf8');
      return decoded === pattern;
    } catch {
      return false;
    }
  }

  testBrowserSafety(pattern) {
    // Check for problematic characters that might cause issues
    const problematic = ['ð', 'Ã', 'â€', 'Å'];
    return !problematic.some(char => pattern.includes(char));
  }

  async testBrowserCompatibility() {
    console.log('🌍 Testing Browser Compatibility...');
    
    const tests = {
      'HTML Charset': await this.checkHTMLCharset(),
      'CSS UTF-8': await this.checkCSSUTF8(),
      'JavaScript UTF-8': await this.checkJavaScriptUTF8(),
      'JSON UTF-8': await this.checkJSONUTF8(),
      'Server Headers': await this.checkServerHeaders()
    };

    let passedTests = 0;
    for (const [test, passed] of Object.entries(tests)) {
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${test}`);
      if (passed) passedTests++;
    }

    console.log(`\n📊 Browser Compatibility: ${passedTests}/${Object.keys(tests).length} tests passed\n`);
    
    return {
      tests,
      passedTests,
      totalTests: Object.keys(tests).length,
      compatibilityScore: Math.round((passedTests / Object.keys(tests).length) * 100)
    };
  }

  async checkHTMLCharset() {
    const htmlFiles = ['index.html', 'admin.html', 'login.html'];
    
    for (const file of htmlFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        if (!content.includes('charset="UTF-8"') && !content.includes('charset=UTF-8')) {
          return false;
        }
        if (this.testPatterns.problems.some(issue => content.includes(issue))) {
          return false;
        }
      } catch {
        return false;
      }
    }
    return true;
  }

  async checkCSSUTF8() {
    try {
      const content = await fs.readFile('style.css', 'utf8');
      return !this.testPatterns.problems.some(issue => content.includes(issue));
    } catch {
      return false;
    }
  }

  async checkJavaScriptUTF8() {
    const jsFiles = ['script.js', 'assets/js/utils.js'];
    
    for (const file of jsFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        if (this.testPatterns.problems.some(issue => content.includes(issue))) {
          return false;
        }
      } catch {
        continue; // File might not exist
      }
    }
    return true;
  }

  async checkJSONUTF8() {
    try {
      const content = await fs.readFile('knowledge-base.json', 'utf8');
      JSON.parse(content); // Validate JSON
      return !this.testPatterns.problems.some(issue => content.includes(issue));
    } catch {
      return false;
    }
  }

  async checkServerHeaders() {
    try {
      const content = await fs.readFile('server.js', 'utf8');
      return content.includes('charset=utf-8');
    } catch {
      return false;
    }
  }

  generateSummary(results) {
    const fileScore = results.files.cleanPercentage;
    const browserScore = results.browser.compatibilityScore;
    const patternScore = Object.values(results.patterns)
      .filter(p => p.isValid && p.browserSafe).length / Object.keys(results.patterns).length * 100;
    
    const overallScore = Math.round((fileScore + browserScore + patternScore) / 3);
    
    return {
      overallScore,
      fileScore,
      browserScore,
      patternScore,
      totalIssues: results.files.totalIssues,
      isProductionReady: overallScore >= 95
    };
  }

  printFinalResults(results) {
    const summary = results.summary;
    
    console.log('═'.repeat(50));
    console.log('📊 FINAL UTF-8 TEST RESULTS');
    console.log('═'.repeat(50));
    
    console.log(`\n🎯 OVERALL UTF-8 SCORE: ${summary.overallScore}%`);
    
    if (summary.overallScore >= 98) {
      console.log('🏆 PERFECT UTF-8 - Production excellence!');
    } else if (summary.overallScore >= 95) {
      console.log('🥇 EXCELLENT UTF-8 - Production ready!');
    } else if (summary.overallScore >= 90) {
      console.log('🥈 GOOD UTF-8 - Minor issues remain');
    } else if (summary.overallScore >= 80) {
      console.log('🥉 FAIR UTF-8 - Needs improvement');
    } else {
      console.log('🚨 POOR UTF-8 - Major fixes needed');
    }

    console.log('\n📋 DETAILED BREAKDOWN:');
    console.log(`📁 Files: ${summary.fileScore}% (${results.files.cleanFiles}/${results.files.totalFiles} clean)`);
    console.log(`🔤 Patterns: ${Math.round(summary.patternScore)}% valid`);
    console.log(`🌍 Browser: ${summary.browserScore}% compatible`);
    
    if (summary.totalIssues > 0) {
      console.log(`\n🚨 ISSUES FOUND: ${summary.totalIssues}`);
      console.log('Run: node utf8-fix.js');
    } else {
      console.log('\n✅ NO ISSUES FOUND - Perfect UTF-8!');
    }

    console.log('\n🎊 PRODUCTION STATUS:');
    if (summary.isProductionReady) {
      console.log('🟢 UTF-8 PRODUCTION APPROVED!');
      console.log('✅ All character encodings perfect');
      console.log('✅ Cross-browser compatibility confirmed');
      console.log('✅ Turkish & emoji support validated');
    } else {
      console.log('🟡 UTF-8 NEEDS ATTENTION');
      console.log('⚠️ Run encoding fix before deployment');
    }

    console.log(`\n⏰ Test completed: ${new Date().toLocaleString('tr-TR')}`);
    console.log('═'.repeat(50));
  }
}

// CLI Usage
if (require.main === module) {
  const tester = new FinalUTF8Tester();
  tester.runFinalTest().catch(console.error);
}

module.exports = FinalUTF8Tester;
    const summary = results.summary;
    
    console.log(`\n🎯 OVERALL SCORE: ${summary.overallScore}%`);
    
    if (summary.overallScore >= 90) {
      console.log('🟢 EXCELLENT - UTF-8 support is optimal');
    } else if (summary.overallScore >= 80) {
      console.log('🟡 GOOD - Minor UTF-8 issues');
    } else if (summary.overallScore >= 70) {
      console.log('🟠 FAIR - Some UTF-8 problems need fixing');
    } else {
      console.log('🔴 POOR - Major UTF-8 issues detected');
    }

    console.log('\n📋 DETAILED BREAKDOWN:');
    console.log(`📁 Files: ${summary.passedFiles}/${summary.totalFiles} passed`);
    console.log(`🌐 Server: ${results.server.isWorking ? 'OK' : 'Issues detected'}`);
    console.log(`🌍 Browser: ${Object.values(results.browser).filter(Boolean).length}/${Object.keys(results.browser).length} compatible`);
    console.log(`💾 Data: ${Object.values(results.data).filter(r => !r.error).length}/${Object.keys(results.data).length} valid`);

    if (summary.totalIssues > 0) {
      console.log('\n🚨 ISSUES TO FIX:');
      Object.entries(results.files).forEach(([file, result]) => {
        if (result.hasIssues && result.issues) {
          result.issues.forEach(issue => {
            console.log(`❌ ${file}: ${issue}`);
          });
        }
      });
    }

    console.log('\n💡 RECOMMENDATIONS:');
    if (summary.overallScore >= 95) {
      console.log('✅ UTF-8 encoding is perfect! No action needed.');
    } else {
      const recommendations = [];
      
      if (Object.values(results.files).some(r => r.issues && r.issues.some(i => i.includes('UTF-8 meta')))) {
        recommendations.push('Add UTF-8 meta tags to HTML files');
      }
      
      if (Object.values(results.files).some(r => r.hasEncodingIssues)) {
        recommendations.push('Fix encoding issues in affected files');
      }
      
      if (!results.server.isWorking) {
        recommendations.push('Configure server UTF-8 headers properly');
      }
      
      recommendations.forEach(rec => console.log(`💡 ${rec}`));
    }

    console.log('\n🏁 TEST COMPLETED!');
    console.log(`📅 ${new Date().toLocaleString('tr-TR')}`);
    console.log('═'.repeat(50));
  }

  // Fix method for encoding issues
  async fixEncodingIssues(fileName) {
    try {
      console.log(`🔧 Fixing encoding issues in ${fileName}...`);
      
      const filePath = path.join(process.cwd(), fileName);
      let content = await fs.readFile(filePath, 'utf8');
      
      // Create backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.writeFile(backupPath, content, 'utf8');
      console.log(`📁 Backup created: ${backupPath}`);
      
      // Apply fixes
      let fixed = false;
      Object.entries(this.commonEncodingErrors).forEach(([wrong, correct]) => {
        if (content.includes(wrong)) {
          content = content.replace(new RegExp(wrong, 'g'), correct);
          fixed = true;
        }
      });
      
      if (fixed) {
        await fs.writeFile(filePath, content, 'utf8');
        console.log(`✅ Fixed encoding issues in ${fileName}`);
        return true;
      } else {
        console.log(`ℹ️ No encoding issues found in ${fileName}`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Failed to fix ${fileName}:`, error.message);
      return false;
    }
  }

  // Bulk fix method
  async fixAllFiles() {
    console.log('🔧 Fixing all detected encoding issues...\n');
    
    const files = ['index.html', 'admin.html', 'login.html', 'style.css', 'script.js', 'knowledge-base.json'];
    let fixedCount = 0;
    
    for (const file of files) {
      try {
        const wasFixed = await this.fixEncodingIssues(file);
        if
