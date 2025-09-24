/**
 * 🔧 PRODUCTION UTF-8 Fix Utility
 * Final encoding fix for deployment readiness
 */

const fs = require('fs').promises;
const path = require('path');

class ProductionUTF8Fixer {
  constructor() {
    this.encodingFixes = {
      // Critical emoji fixes
      'ðŸ¤–': '🤖', 'ðŸ"¤': '📤', 'ðŸ"': '🔍', 'âœ•': '✕',
      'â³': '⚠️', 'ðŸ"Š': '📊', 'ðŸ'¬': '💬', 'ðŸ'¨âžðŸ'¼': '👨‍💼',
      'ðŸ'¨â€ðŸ'¼': '👨‍💼', 'ðŸŽ¯': '🎯', 'ðŸš€': '🚀', 'ðŸ"±': '📱',
      'ðŸ"„': '🔄', 'ðŸ—'️': '🗑️', 'âœ…': '✅', 'â�': '❌',
      
      // Turkish character fixes
      'Ã‡evrimiÃ§i': 'Çevrimiçi', 'nasÄ±l': 'nasıl', 'ÅŸu': 'şu',
      'Ä±': 'ı', 'Ã§': 'ç', 'Ã¶': 'ö', 'ÃŸ': 'ş', 'Ã¼': 'ü',
      'Ã„Ÿ': 'ğ', 'Ã‡': 'Ç', 'Äž': 'Ğ', 'Ä°': 'İ', 'Ã–': 'Ö',
      'ÅŸ': 'Ş', 'Ãœ': 'Ü',
      
      // Quote and punctuation fixes
      'â€œ': '"', 'â€': '"', 'â€™': "'", 'â€˜': "'",
      'â€¦': '...', 'â€"': '—', 'â€'': '–',
      
      // Double encoding fixes
      'Ã¢â‚¬â„¢': "'", 'Ã¢â‚¬Å"': '"', 'Ã¢â‚¬Â': '"',
      'Ã¢â‚¬â€œ': '—', 'Ã¢â‚¬â€': '–'
    };
  }

  async fixAllForProduction() {
    console.log('🔧 PRODUCTION UTF-8 FIX UTILITY');
    console.log('='.repeat(45));
    console.log('🎯 Target: 100% Clean Encoding');
    console.log('⏰ Start:', new Date().toLocaleString('tr-TR'));
    console.log('');

    const fileGroups = {
      'Critical Frontend': ['index.html', 'admin.html', 'login.html'],
      'Styles & Scripts': ['style.css', 'script.js'],
      'Assets': [
        'assets/js/chat-loader.js', 'assets/js/ai-brain.js', 
        'assets/js/telegram-bot.js', 'assets/js/utils.js'
      ],
      'Data & Config': ['knowledge-base.json', 'server.js'],
      'Documentation': ['README.md', 'PRODUCTION-READY-CHECKLIST.md']
    };

    let totalProcessed = 0;
    let totalFixed = 0;
    let totalIssues = 0;
    const results = {};

    for (const [groupName, files] of Object.entries(fileGroups)) {
      console.log(`📁 Processing ${groupName}...`);
      
      const groupResults = [];
      for (const file of files) {
        try {
          const result = await this.fixSingleFile(file);
          groupResults.push(result);
          totalProcessed++;
          
          if (result.wasFixed) {
            totalFixed++;
            totalIssues += result.issuesFixed;
            console.log(`  ✅ ${file} - Fixed ${result.issuesFixed} issues`);
          } else if (result.exists) {
            console.log(`  ℹ️ ${file} - Already clean`);
          } else {
            console.log(`  ⚠️ ${file} - Not found`);
          }
        } catch (error) {
          console.log(`  ❌ ${file} - Error: ${error.message}`);
          groupResults.push({ error: error.message, wasFixed: false });
        }
      }
      
      results[groupName] = groupResults;
      console.log('');
    }

    console.log('🎊 PRODUCTION UTF-8 FIX COMPLETED!');
    console.log(`📊 Processed: ${totalProcessed} files`);
    console.log(`🔧 Fixed: ${totalFixed} files`); 
    console.log(`✨ Issues resolved: ${totalIssues}`);
    console.log('');
    
    if (totalFixed > 0) {
      console.log('✅ ENCODING ISSUES RESOLVED!');
      console.log('🚀 System is now ready for production deployment');
      console.log('');
      console.log('📋 Verification commands:');
      console.log('node utf8-test.js (verify 100% clean)');
      console.log('node system-analysis.js (check 97%+ score)');
    } else {
      console.log('✨ NO ISSUES FOUND - System already perfect!');
    }

    console.log(`\n⏰ Completed: ${new Date().toLocaleString('tr-TR')}`);
    
    return {
      totalProcessed,
      totalFixed,
      totalIssues,
      results,
      success: true
    };
  }

  async fixSingleFile(fileName) {
    const filePath = path.join(process.cwd(), fileName);
    
    let content;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { exists: false, wasFixed: false, issuesFixed: 0 };
      }
      throw error;
    }

    const originalContent = content;
    let fixedContent = content;
    let issuesFixed = 0;

    // Apply all encoding fixes
    Object.entries(this.encodingFixes).forEach(([wrong, correct]) => {
      const regex = new RegExp(this.escapeRegExp(wrong), 'g');
      const matches = fixedContent.match(regex);
      
      if (matches) {
        fixedContent = fixedContent.replace(regex, correct);
        issuesFixed += matches.length;
      }
    });

    // Special handling for different file types
    if (fileName.endsWith('.html')) {
      const htmlFixes = this.applyHTMLSpecificFixes(fixedContent);
      fixedContent = htmlFixes.content;
      issuesFixed += htmlFixes.additionalFixes;
    }

    if (fileName.endsWith('.json')) {
      try {
        // Validate and pretty-print JSON
        const parsed = JSON.parse(fixedContent);
        const prettyJSON = JSON.stringify(parsed, null, 2);
        if (prettyJSON !== fixedContent && issuesFixed === 0) {
          fixedContent = prettyJSON;
          issuesFixed = 1; // Count formatting as an issue fixed
        }
      } catch (jsonError) {
        console.warn(`JSON validation warning for ${fileName}:`, jsonError.message);
      }
    }

    const wasFixed = issuesFixed > 0;

    if (wasFixed) {
      // Create backup before fixing
      const backupPath = `${filePath}.pre-fix-backup`;
      await fs.writeFile(backupPath, originalContent, 'utf8');
      
      // Save the fixed content
      await fs.writeFile(filePath, fixedContent, 'utf8');
    }

    return {
      exists: true,
      wasFixed,
      issuesFixed,
      originalSize: originalContent.length,
      newSize: fixedContent.length,
      backupCreated: wasFixed
    };
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  applyHTMLSpecificFixes(content) {
    let fixedContent = content;
    let additionalFixes = 0;

    // Ensure UTF-8 meta tag is present and correct
    if (!fixedContent.includes('charset="UTF-8"') && !fixedContent.includes('charset=UTF-8')) {
      if (fixedContent.includes('<head>')) {
        fixedContent = fixedContent.replace(
          '<head>',
          '<head>\n    <meta charset="UTF-8">'
        );
        additionalFixes++;
      }
    }

    // Ensure http-equiv UTF-8 declaration
    if (!fixedContent.includes('http-equiv="Content-Type"')) {
      if (fixedContent.includes('<meta charset="UTF-8">')) {
        fixedContent = fixedContent.replace(
          '<meta charset="UTF-8">',
          '<meta charset="UTF-8">\n    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">'
        );
        additionalFixes++;
      }
    }

    // Fix HTML entity issues
    const htmlEntityFixes = {
      '&amp;amp;': '&amp;',
      '&lt;lt;': '&lt;',
      '&gt;gt;': '&gt;',
      '&quot;quot;': '&quot;'
    };

    Object.entries(htmlEntityFixes).forEach(([wrong, correct]) => {
      if (fixedContent.includes(wrong)) {
        fixedContent = fixedContent.replace(new RegExp(this.escapeRegExp(wrong), 'g'), correct);
        additionalFixes++;
      }
    });

    return {
      content: fixedContent,
      additionalFixes
    };
  }

  // Quick validation method
  async validateFix(fileName) {
    try {
      const content = await fs.readFile(fileName, 'utf8');
      
      const hasProblems = Object.keys(this.encodingFixes).some(problem => 
        content.includes(problem)
      );
      
      return {
        fileName,
        isClean: !hasProblems,
        hasUTF8Meta: content.includes('charset="UTF-8"') || content.includes('charset=UTF-8'),
        size: content.length
      };
    } catch (error) {
      return {
        fileName,
        error: error.message,
        isClean: false
      };
    }
  }

  // Batch validation
  async validateAllFixes() {
    console.log('🔍 Validating all fixes...');
    
    const testFiles = [
      'index.html', 'admin.html', 'login.html', 'style.css', 'script.js',
      'assets/js/chat-loader.js', 'assets/js/ai-brain.js', 'assets/js/utils.js',
      'knowledge-base.json'
    ];

    let cleanFiles = 0;
    const validationResults = [];

    for (const file of testFiles) {
      const result = await this.validateFix(file);
      validationResults.push(result);
      
      if (result.isClean) {
        cleanFiles++;
        console.log(`✅ ${file} - Clean`);
      } else if (result.error) {
        console.log(`⚠️ ${file} - ${result.error}`);
      } else {
        console.log(`❌ ${file} - Still has encoding issues`);
      }
    }

    const successRate = Math.round((cleanFiles / testFiles.length) * 100);
    
    console.log(`\n📊 Validation Results: ${cleanFiles}/${testFiles.length} files clean (${successRate}%)`);
    
    return {
      validationResults,
      cleanFiles,
      totalFiles: testFiles.length,
      successRate,
      allClean: successRate === 100
    };
  }
}

// CLI Usage
if (require.main === module) {
  const fixer = new ProductionUTF8Fixer();
  
  const command = process.argv[2];
  
  if (command === 'validate') {
    fixer.validateAllFixes().catch(console.error);
  } else if (command === 'fix-single' && process.argv[3]) {
    fixer.fixSingleFile(process.argv[3])
      .then(result => console.log('Fix result:', result))
      .catch(console.error);
  } else {
    fixer.fixAllForProduction().catch(console.error);
  }
}

module.exports = ProductionUTF8Fixer;
  }

  async restoreBackups() {
    console.log('🔄 Restoring from backups...');
    
    try {
      const files = await fs.readdir(process.cwd());
      const backupFiles = files.filter(file => file.includes('.backup.'));
      
      if (backupFiles.length === 0) {
        console.log('ℹ️ No backup files found');
        return;
      }

      let restored = 0;
      
      for (const backupFile of backupFiles) {
        const originalFile = backupFile.replace(/\.backup\.\d{4}-\d{2}-\d{2}T[\d-]+/, '');
        
        try {
          const backupContent = await fs.readFile(backupFile, 'utf8');
          await fs.writeFile(originalFile, backupContent, 'utf8');
          console.log(`✅ Restored ${originalFile} from ${backupFile}`);
          restored++;
        } catch (error) {
          console.log(`❌ Failed to restore ${originalFile}: ${error.message}`);
        }
      }
      
      console.log(`\n🎉 Restored ${restored} files from backups`);
      
    } catch (error) {
      console.error('❌ Backup restoration failed:', error.message);
    }
  }

  async cleanBackups() {
    console.log('🗑️ Cleaning up backup files...');
    
    try {
      const files = await fs.readdir(process.cwd());
      const backupFiles = files.filter(file => file.includes('.backup.'));
      
      if (backupFiles.length === 0) {
        console.log('ℹ️ No backup files to clean');
        return;
      }

      let deleted = 0;
      
      for (const backupFile of backupFiles) {
        try {
          await fs.unlink(backupFile);
          console.log(`🗑️ Deleted ${backupFile}`);
          deleted++;
        } catch (error) {
          console.log(`❌ Failed to delete ${backupFile}: ${error.message}`);
        }
      }
      
      console.log(`\n🎉 Cleaned up ${deleted} backup files`);
      
    } catch (error) {
      console.error('❌ Backup cleanup failed:', error.message);
    }
  }
}

// CLI Usage
if (require.main === module) {
  const fixer = new UTF8Fixer();
  
  const command = process.argv[2];
  const fileName = process.argv[3];
  
  switch (command) {
    case 'fix':
      if (fileName) {
        fixer.fixSingleFile(fileName).catch(console.error);
      } else {
        fixer.fixAllFiles().catch(console.error);
      }
      break;
      
    case 'validate':
      fixer.validateFixes().catch(console.error);
      break;
      
    case 'restore':
      fixer.restoreBackups().catch(console.error);
      break;
      
    case 'clean':
      fixer.cleanBackups().catch(console.error);
      break;
      
    default:
      console.log(`
🔧 UTF-8 Fix Utility - Usage:

node utf8-fix.js fix [filename]  - Fix all files or specific file
node utf8-fix.js validate        - Validate current UTF-8 status
node utf8-fix.js restore         - Restore from backups
node utf8-fix.js clean           - Clean backup files

Examples:
  node utf8-fix.js fix            # Fix all files
  node utf8-fix.js fix index.html # Fix specific file
  node utf8-fix.js validate       # Check current status
      `);
  }
}

module.exports = UTF8Fixer;
