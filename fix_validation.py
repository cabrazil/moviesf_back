#!/usr/bin/env python3
import re

file_path = 'src/scripts/analyzeMovieSentiments.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Encontrar e substituir o bloco
old_block = '''    for (const suggestion of (analysis.suggestedSubSentiments || [])) {
      // MELHORIA: SEMPRE tentar matching primeiro, mesmo quando isNew=true
      // A IA pode marcar como novo incorretamente, então validamos sempre
      console.log(`\\n🔍 Validando sugestão: "${suggestion.name}" (IA marcou como ${suggestion.isNew ? 'NOVO' : 'EXISTENTE'})`);

      const bestMatch = findBestMatch(suggestion, allSubSentiments);

      if (bestMatch) {
        if (bestMatch.mainSentimentId === mainSentimentId) {
          console.log(`✅ Match encontrado: IA "${suggestion.name}" -> BD "${bestMatch.name}" (ID: ${bestMatch.id})`);
          // SEMPRE usar o match encontrado, ignorando a flag isNew da IA
          validatedSubSentiments.push({ suggestion, dbMatch: bestMatch });
        } else {
          console.log(`❌ Descartado: Match "${bestMatch.name}" pertence a outro sentimento (ID: ${bestMatch.mainSentimentId})`);
          // Se não encontrou match no sentimento correto, tratar como novo apenas se realmente necessário
          validatedSubSentiments.push({ suggestion, dbMatch: null });
        }
      } else {'''

new_block = '''    for (const suggestion of (analysis.suggestedSubSentiments || [])) {
      console.log(`\\n🔍 Validando sugestão: "${suggestion.name}" (IA marcou como ${suggestion.isNew ? 'NOVO' : 'EXISTENTE'})${suggestion.id ? ` com ID ${suggestion.id}` : ''}`);

      let bestMatch: SubSentiment | null = null;

      // Se a IA retornou um ID (match OFFICIAL), confiar nele
      if (suggestion.id) {
        bestMatch = allSubSentiments.find(ss => ss.id === suggestion.id) || null;
        
        if (bestMatch) {
          console.log(`✅ Match direto por ID: "${suggestion.name}" -> "${bestMatch.name}" (ID: ${bestMatch.id})`);
          validatedSubSentiments.push({ suggestion, dbMatch: bestMatch });
          continue;
        } else {
          console.log(`⚠️ ID ${suggestion.id} não encontrado. Tentando matching semântico...`);
        }
      }

      // Se não tem ID ou ID não encontrado, fazer matching semântico
      bestMatch = findBestMatch(suggestion, allSubSentiments);

      if (bestMatch) {
        console.log(`✅ Match semântico: IA "${suggestion.name}" -> BD "${bestMatch.name}" (ID: ${bestMatch.id})`);
        validatedSubSentiments.push({ suggestion, dbMatch: bestMatch });
      } else {'''

content = content.replace(old_block, new_block)

# Remover o filtro de mainSentimentId do matching agressivo (linha 694)
content = re.sub(
    r'if \(matchingWords\.length > 0 && dbSub\.mainSentimentId === mainSentimentId\)',
    'if (matchingWords.length > 0)',
    content
)

with open(file_path, 'w') as f:
    f.write(content)

print("✅ Arquivo atualizado com sucesso!")
