#!/usr/bin/env node
/**
 * 🔧 EMERGENCY ENCODING FIX SCRIPT
 * Save this as: fix-encoding.js
 * Run with: node fix-encoding.js
 */

const fs = require('fs');
const path = require('path');

class EncodingFixer {
  constructor() {
    this.fixes = {
      // Turkish characters - CRITICAL FIXES
      'Ã§': 'ç', 'Ã¤': 'ğ', 'Ä±': 'ı', 'Ã¶': 'ö', 'ÅŸ': 'ş', 'Ã¼': 'ü',
      'Ã‡': 'Ç', 'Äž': 'Ğ', 'Ä°': 'İ', 'Ã–': 'Ö', 'Åž': 'Ş', 'Ãœ': 'Ü',
      
      // Emojis - CRITICAL FIXES
      'ðŸ€–': '🤖', 'ðŸ"¤': '📤', 'ðŸ"–': '📖', 'âœ•': '✕', 
      'ðŸ"„': '🔄', 'âš ïž�': '⚠️', 'ðŸ"€': '📤', 'â�Œ': '⚠️',
      
      // Common Turkish words - SPECIFIC FIXES FROM YOUR FILES
      'HoÅŸ': 'Hoş', 'nasÄ±l': 'nasıl', 'yardÄ±mcÄ±': 'yardımcı',
      'BaÄŸlantÄ±': 'Bağlantı', 'yazÄ±yor': 'yazıyor', 'Ã‡evrimiÃ§i': 'Çevrimiçi',
      'oluÅŸtu': 'oluştu', 'SayfayÄ±': 'Sayfayı', 'kuruluyor': 'kuruluyor',
      'Bugรผn': 'Bugün', 'Dรผn': 'Dün', 'sorularÄ±nÄ±zÄ±': 'sorularınızı',
      'Geldiniz': 'Geldiniz', 'desteklenmektedir': 'desteklenmektedir'
    };

    this.filesToFix = [
      'index.html',
      'admin.html', 
      'login.html',
      'script.js',
      'knowledge-base.json',
      'README.md'
    ];
  }

  async fixAllFiles() {
    console.log('🔧 HAYDAY CHAT SYSTEM - EMERGENCY ENCODING FIX');
    console.log('=' .repeat(55));
    console.log('🎯 Target: Fix Turkish characters and emojis');
    console.log('📁 Files to process:', this.filesToFix.length);
    console.log('');

    let totalFixed = 0;
    let totalIssues = 0;

    for (const file of this.filesToFix) {
      const result = await this.fixFile(file);
      if (result.fixed) {
        totalFixed++;
        totalIssues += result.issueCount;
      }
    }

    console.log('\n' + '=' .repeat(55));
    console.log(`✅ ENCODING FIX COMPLETED!`);
    console.log(`📊 Files processed: ${this.filesToFix.length}`);
    console.log(`🔧 Files fixed: ${totalFixed}`);
    console.log(`🐛 Issues resolved: ${totalIssues}`);

    if (totalFixed > 0) {
      console.log('\n🚀 SYSTEM NOW READY FOR DEPLOYMENT!');
      console.log('\n📋 Next steps:');
      console.log('   1. git add .');
      console.log('   2. git commit -m "🔧 Fix UTF-8 encoding issues"');
      console.log('   3. git push origin main');
      console.log('   4. Deploy to Render');
    } else {
      console.log('\n✨ No encoding issues found - system already clean!');
    }
  }

  async fixFile(fileName) {
    try {
      if (!fs.existsSync(fileName)) {
        console.log(`⚠️  ${fileName}: File not found - skipping`);
        return { fixed: false, issueCount: 0 };
      }

      // Read file with explicit encoding handling
      let content;
      try {
        content = fs.readFileSync(fileName, 'utf8');
      } catch (error) {
        // Try latin1 if utf8 fails
        content = fs.readFileSync(fileName, 'latin1');
      }

      const originalContent = content;
      let issueCount = 0;

      // Apply fixes
      Object.keys(this.fixes).forEach(wrong => {
        const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = content.match(regex);
        if (matches) {
          content = content.replace(regex, this.fixes[wrong]);
          issueCount += matches.length;
        }
      });

      // Add UTF-8 meta tag to HTML files if missing
      if (fileName.endsWith('.html')) {
        if (!content.includes('charset="UTF-8"') && !content.includes('charset=UTF-8')) {
          content = content.replace(
            /(<head[^>]*>)/i, 
            '$1\n    <meta charset="UTF-8">'
          );
          issueCount += 1;
          console.log(`   📝 Added UTF-8 meta tag`);
        }
      }

      if (issueCount > 0) {
        // Create backup
        const backupName = `${fileName}.backup-${Date.now()}`;
        fs.writeFileSync(backupName, originalContent);
        
        // Write fixed content with explicit UTF-8
        fs.writeFileSync(fileName, content, { encoding: 'utf8' });
        
        console.log(`✅ ${fileName}: Fixed ${issueCount} issues`);
        console.log(`   💾 Backup: ${backupName}`);
        
        // Show sample of fixes
        this.showSampleFixes(originalContent, content, fileName);
        
        return { fixed: true, issueCount };
      } else {
        console.log(`✅ ${fileName}: Clean - no issues found`);
        return { fixed: false, issueCount: 0 };
      }

    } catch (error) {
      console.log(`❌ ${fileName}: Fix failed - ${error.message}`);
      return { fixed: false, issueCount: 0 };
    }
  }

  showSampleFixes(original, fixed, fileName) {
    // Show first few differences as examples
    const originalLines = original.split('\n');
    const fixedLines = fixed.split('\n');
    let sampleCount = 0;
    const maxSamples = 3;

    for (let i = 0; i < Math.min(originalLines.length, fixedLines.length) && sampleCount < maxSamples; i++) {
      if (originalLines[i] !== fixedLines[i] && originalLines[i].trim() && fixedLines[i].trim()) {
        console.log(`   🔄 "${originalLines[i].trim().substring(0, 40)}..." → "${fixedLines[i].trim().substring(0, 40)}..."`);
        sampleCount++;
      }
    }
  }

  async verifyFixes() {
    console.log('\n🔍 VERIFYING FIXES...\n');
    
    let allClean = true;
    const problematicChars = Object.keys(this.fixes);

    for (const file of this.filesToFix) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const foundIssues = [];

        problematicChars.forEach(badChar => {
          if (content.includes(badChar)) {
            foundIssues.push(badChar);
          }
        });

        if (foundIssues.length > 0) {
          console.log(`❌ ${file}: Still contains: ${foundIssues.join(', ')}`);
          allClean = false;
        } else {
          console.log(`✅ ${file}: Clean`);
        }
      }
    }

    console.log('\n' + '=' .repeat(55));
    if (allClean) {
      console.log('🎉 VERIFICATION PASSED - ALL FILES CLEAN!');
      console.log('🚀 Ready for production deployment!');
    } else {
      console.log('⚠️  VERIFICATION FAILED - Manual review needed');
    }

    return allClean;
  }

  async showStats() {
    console.log('\n📊 FILE ENCODING STATISTICS:\n');
    
    for (const file of this.filesToFix) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const stats = fs.statSync(file);
          
          const hasTurkish = /[çğıöşüÇĞIİÖŞÜ]/.test(content);
          const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(content);
          const hasUTF8Meta = content.includes('charset="UTF-8"') || content.includes('charset=UTF-8');
          
          console.log(`📄 ${file}:`);
          console.log(`   💾 Size: ${(stats.size / 1024).toFixed(2)}KB`);
          console.log(`   🇹🇷 Turkish chars: ${hasTurkish ? '✅' : '❌'}`);
          console.log(`   😊 Emojis: ${hasEmojis ? '✅' : '❌'}`);
          if (file.endsWith('.html')) {
            console.log(`   🔤 UTF-8 meta: ${hasUTF8Meta ? '✅' : '❌'}`);
          }
          console.log('');
          
        } catch (error) {
          console.log(`❌ ${file}: Error reading - ${error.message}\n`);
        }
      } else {
        console.log(`⚠️  ${file}: Not found\n`);
      }
    }
  }
}

// CLI Interface
async function main() {
  const fixer = new EncodingFixer();
  const command = process.argv[2];

  switch (command) {
    case 'verify':
      await fixer.verifyFixes();
      break;
    
    case 'stats':
      await fixer.showStats();
      break;
    
    case 'help':
      console.log(`
🔧 HayDay Chat System - Encoding Fix Tool

Usage:
  node fix-encoding.js          Fix all encoding issues
  node fix-encoding.js verify   Verify fixes were applied
  node fix-encoding.js stats    Show file statistics
  node fix-encoding.js help     Show this help

Examples:
  node fix-encoding.js          # Fix all files
  node fix-encoding.js verify   # Check if clean
      `);
      break;
    
    default:
      await fixer.fixAllFiles();
      console.log('\n🔍 Running verification...');
      await fixer.verifyFixes();
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = EncodingFixer;
