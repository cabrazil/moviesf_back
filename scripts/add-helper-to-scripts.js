#!/usr/bin/env node
/**
 * Adiciona import do scripts-helper em todos os scripts que usam Prisma
 */

const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname, '../src/scripts');
const helperImport = "import './scripts-helper';";
const helperComment = "// Carregar variáveis de ambiente antes de qualquer uso do Prisma";

function getAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts') && item !== 'scripts-helper.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

const prismaPatterns = [
  /import.*PrismaClient.*from.*@prisma\/client/,
  /import.*prismaApp.*from/,
  /new PrismaClient\(/,
  /const prisma.*=.*new PrismaClient/,
  /const prisma.*=.*prismaApp/
];

function needsHelper(content) {
  if (content.includes("import './scripts-helper'") || 
      content.includes('import "./scripts-helper"')) {
    return false;
  }
  return prismaPatterns.some(pattern => pattern.test(content));
}

function addHelper(content) {
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('/// <reference')) {
      insertIndex = i + 1;
      break;
    }
    if (lines[i].trim().startsWith('import ')) {
      insertIndex = i;
      break;
    }
  }
  
  if (content.includes('dotenv.config()')) {
    content = content.replace(/import.*dotenv.*\n/g, '');
    content = content.replace(/dotenv\.config\(\);\s*\n?/g, '');
    const newLines = content.split('\n');
    lines.splice(insertIndex, 0, helperComment, helperImport, '');
    return lines.join('\n');
  }
  
  lines.splice(insertIndex, 0, helperComment, helperImport, '');
  return lines.join('\n');
}

const files = getAllTsFiles(scriptsDir);
let updated = 0;
let skipped = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  if (needsHelper(content)) {
    const newContent = addHelper(content);
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`✅ ${path.relative(scriptsDir, file)}`);
    updated++;
  } else {
    skipped++;
  }
});

console.log(`\n📊 ${updated} atualizados, ${skipped} ignorados`);

