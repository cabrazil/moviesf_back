#!/usr/bin/env python3
"""
Script para aplicar mudanças no analyzeMovieSentiments.ts
Converte de suggestedSubSentiments para matches com type OFFICIAL/SUGGESTION
"""

import re

# Ler arquivo
with open('src/scripts/analyzeMovieSentiments.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Substituir analysis.suggestedSubSentiments por analysis.matches
content = content.replace('analysis.suggestedSubSentiments', 'analysis.matches')

# 2. Adicionar separação de OFFICIAL e SUGGESTION após a chamada da IA (linha ~567)
old_validation_start = '''    console.log('\\n🔍 Validando sugestões da IA com o sentimento de destino (Lógica Inteligente)...');
    const validatedSubSentiments: { suggestion: any; dbMatch: SubSentiment | null }[] = [];

    const allSubSentiments = await prisma.subSentiment.findMany({ where: { mainSentimentId: mainSentimentId } }); // Needed for matching

    for (const suggestion of analysis.matches) {'''

new_validation_start = '''    // Separar OFFICIAL de SUGGESTION
    const officialMatches = analysis.matches.filter(m => m.type === 'OFFICIAL');
    const suggestions = analysis.matches.filter(m => m.type === 'SUGGESTION');

    console.log(`\\n✅ Matches OFICIAIS encontrados: ${officialMatches.length}`);
    officialMatches.forEach(m => {
      console.log(`   - ${m.name} (Relevância: ${m.relevance.toFixed(2)})`);
    });

    if (suggestions.length > 0) {
      console.log(`\\n💡 SUGESTÕES para curador (não serão gravadas automaticamente):`);
      suggestions.forEach(s => {
        console.log(`   - ${s.name} (Relevância: ${s.relevance.toFixed(2)}): ${s.explanation}`);
      });
    }

    console.log('\\n🔍 Validando matches OFICIAIS com o banco de dados...');
    const validatedSubSentiments: { suggestion: any; dbMatch: SubSentiment | null }[] = [];

    const allSubSentiments = await prisma.subSentiment.findMany({ where: { mainSentimentId: mainSentimentId } });

    // Processar apenas OFFICIAL para gravação
    for (const match of officialMatches) {'''

content = content.replace(old_validation_start, new_validation_start)

# 3. Atualizar o loop para usar 'match' em vez de 'suggestion'
content = re.sub(
    r'for \(const suggestion of analysis\.matches\)',
    'for (const match of officialMatches)',
    content
)

# 4. Substituir referências a 'suggestion' por 'match' dentro do loop
# (Isso é mais complexo, então vamos fazer apenas as principais)
content = re.sub(
    r'console\.log\(`\\n🔍 Validando sugestão: "\$\{suggestion\.name\}"',
    'console.log(`\\n🔍 Validando match oficial: "${match.name}" (ID: ${match.id})',
    content
)

# Salvar
with open('src/scripts/analyzeMovieSentiments.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Mudanças aplicadas com sucesso!")
print("⚠️  ATENÇÃO: Revise o arquivo manualmente para garantir que tudo está correto")
