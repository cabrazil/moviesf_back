// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { prismaApp as prisma } from '../prisma';
import { AIProvider } from '../utils/aiProvider';
import {
  evaluateMovie,
  commitCurations,
  computeScore,
  enrichMovieKeywords,
  saveSuggestionFlow,
  generateLandingPageHook,
  JofEvaluationResult
} from '../services/curationEngine';

export {
  evaluateMovie,
  commitCurations,
  computeScore,
  enrichMovieKeywords,
  saveSuggestionFlow,
  generateLandingPageHook,
  JofEvaluationResult
};

async function main() {
  const args = process.argv.slice(2);
  let searchTitle: string | undefined;
  let searchYear: number | undefined;
  let tmdbId: number | undefined;
  let targetSentiment: string | undefined;
  let targetIntention: string | undefined;
  let forcedJofId: number | undefined;
  let provider: AIProvider = 'deepseek';
  let threshold = 0.55;
  let topCount = 3;
  let previewOnly = false;
  let replaceExisting = false;

  for (const arg of args) {
    if (arg.startsWith('--title=')) {
      searchTitle = arg.split('=')[1].replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--year=') || arg.startsWith('-y=')) {
      searchYear = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--tmdb=') || arg.startsWith('--tmdbId=')) {
      tmdbId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--sentiment=') || arg.startsWith('-s=')) {
      targetSentiment = arg.split('=')[1].toLowerCase().trim();
    } else if (arg.startsWith('--intention=') || arg.startsWith('-i=')) {
      targetIntention = arg.split('=')[1].toLowerCase().trim();
    } else if (arg.startsWith('--jof=') || arg.startsWith('--jofId=')) {
      forcedJofId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--provider=') || arg.startsWith('-p=')) {
      const p = arg.split('=')[1].toLowerCase();
      if (p === 'openai' || p === 'deepseek' || p === 'gemini') {
        provider = p as AIProvider;
      }
    } else if (arg.startsWith('--thresh=') || arg.startsWith('--threshold=')) {
      const val = parseFloat(arg.split('=')[1]);
      if (!isNaN(val) && val > 0 && val <= 1) threshold = val;
    } else if (arg.startsWith('--top=')) {
      topCount = parseInt(arg.split('=')[1], 10) || 3;
    } else if (arg === '--preview' || arg === '--dry-run') {
      previewOnly = true;
    } else if (arg === '--replace' || arg === '--reprocess') {
      replaceExisting = true;
    } else if (!arg.startsWith('--') && !searchTitle) {
      searchTitle = arg;
    }
  }

  if (!searchTitle && !tmdbId) {
    console.log(`
🎬 === CURATE MOVIE: CURADORIA INTELIGENTE VIBESFILM ===
Uso:
  npx ts-node src/scripts/curateMovie.ts --title="Nome do Filme" --year=2024 [opções]

Opções:
  --sentiment="feliz"    Filtra pelas jornadas desse sentimento inicial (calmo, introspectivo, animado, ansioso, cansado, etc.)
  --intention="maintain" Filtra pela intenção emocional (maintain, process, transform, explore)
  --jofId=54             Força a análise e gravação em uma JOF específica
  --provider=deepseek    Provider de IA para reflexão e metadados (deepseek, openai, gemini)
  --threshold=0.55       Limiar de ativação dos subsentimentos na Jev Engine (padrão: 0.55)
  --top=3                Quantidade de melhores jornadas para exibir (padrão: 3)
  --preview              Apenas simula a avaliação e exibe o ranking sem gravar no banco
  --replace              Remove vínculos antigos do filme antes de gravar as novas opções
`);
    process.exit(0);
  }

  const startTime = Date.now();
  console.log(`\n🎬 === INICIANDO CURADORIA INTELIGENTE: ${searchTitle || `TMDB ${tmdbId}`} ===`);
  console.log(`🤖 AI Provider: ${provider.toUpperCase()} | ⚙️ Threshold Jev: ${(threshold * 100).toFixed(0)}%`);
  if (targetSentiment) console.log(`🎭 Filtro Sentimento: "${targetSentiment}"`);
  if (targetIntention) console.log(`🎯 Filtro Intenção: "${targetIntention.toUpperCase()}"`);

  // ==========================================
  // ETAPAS 1 a 3: AVALIAÇÃO VIA CURATION ENGINE
  // ==========================================
  const evalResult = await evaluateMovie(searchTitle || '', searchYear, {
    tmdbId,
    sentiment: targetSentiment,
    intention: targetIntention,
    jofId: forcedJofId,
    replace: replaceExisting,
    provider,
    threshold,
    verbose: true
  });

  const { movie, topSelections, allResults } = evalResult;
  const topResults = allResults.slice(0, topCount);

  console.log(`\n\n🏆 === TOP ${topResults.length} JORNADAS IDENTIFICADAS ===`);
  console.table(
    topResults.map((r, idx) => ({
      '#': `${idx + 1}º`,
      'JOF ID': r.jofId,
      'Score': r.score.toFixed(3),
      'Afinidade': r.jofAffinity !== undefined ? `${(r.jofAffinity * 100).toFixed(0)}%` : 'N/A',
      'Patamar': r.tier,
      'Cobertura': `${(r.coverageRatio * 100).toFixed(0)}% (${r.matchesCount}/${r.totalExpected})`,
      'Média': r.averageRelevance.toFixed(2),
      'Lente': r.mainSentimentName,
      'Intenção': r.intentionType,
      'Texto': r.jofText.length > 45 ? r.jofText.substring(0, 42) + '...' : r.jofText
    }))
  );

  // Se nenhum sentimento foi filtrado, exibir o melhor de cada Sentimento Inicial
  if (!targetSentiment && allResults.length > 0) {
    const bestBySentiment = new Map<string, JofEvaluationResult>();
    for (const r of allResults) {
      if (!bestBySentiment.has(r.mainSentimentName) || bestBySentiment.get(r.mainSentimentName)!.score < r.score) {
        bestBySentiment.set(r.mainSentimentName, r);
      }
    }

    console.log(`\n🌟 === MELHOR OPÇÃO POR SENTIMENTO INICIAL ===`);
    console.table(
      Array.from(bestBySentiment.values()).map(r => ({
        'Sentimento Inicial': r.mainSentimentName,
        'JOF ID': r.jofId,
        'Intenção': r.intentionType,
        'Score': r.score.toFixed(3),
        'Patamar': r.tier,
        'Texto da Jornada': r.jofText.length > 50 ? r.jofText.substring(0, 47) + '...' : r.jofText
      }))
    );
  }

  const champion = topSelections[0];
  if (!champion) {
    console.error(`❌ Nenhuma jornada atingiu ativação mínima.`);
    process.exit(1);
  }

  console.log(`\n🥇 CAMPEÃ ELEITA: [JOF ${champion.jofId}] (${champion.mainSentimentName} ➔ ${champion.intentionType})`);
  if (champion.intentionDescription) {
    console.log(`   🎯 Intenção: "${champion.intentionDescription}"`);
  }
  console.log(`   📝 Jornada: "${champion.jofText}"`);
  console.log(`   Score Oficial: ${champion.score.toFixed(3)} | Patamar: ${champion.tier}`);
  console.log(`   SubSentimentos Comprovados:`);
  champion.activeAlignments.forEach(a => {
    console.log(`     ✅ ${a.name.padEnd(35)} ${(a.relevance * 100).toFixed(0)}%`);
  });

  // ==========================================
  // ETAPA 4: PREVIEW OU GRAVAÇÃO
  // ==========================================
  if (previewOnly) {
    const previewPayload = {
      success: true,
      mode: 'preview',
      movie: {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        tmdbId: movie.tmdbId
      },
      topOptions: topSelections.map(opt => ({
        jofId: opt.jofId,
        score: Number(opt.score.toFixed(3)),
        jofAffinity: opt.jofAffinity,
        tier: opt.tier,
        sentiment: opt.mainSentimentName,
        intention: opt.intentionType,
        intentionDescription: opt.intentionDescription,
        journeyText: opt.jofText,
        coverage: `${(opt.coverageRatio * 100).toFixed(0)}%`,
        activeCount: opt.matchesCount
      }))
    };

    console.log('\n---JSON_RESULT_START---');
    console.log(JSON.stringify(previewPayload, null, 2));
    console.log('---JSON_RESULT_END---\n');

    console.log(`\n👁️ Modo --preview ativo: Nenhuma alteração foi persistida no banco.`);
    process.exit(0);
  }

  const savedOutput = await commitCurations(
    movie.id,
    topSelections,
    provider,
    replaceExisting,
    true
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 === CURADORIA FINALIZADA COM SUCESSO EM ${durationSec}s! ===`);
  console.log(`Filme: "${savedOutput.movie.title}" (${savedOutput.movie.year || 'N/A'})`);
  for (const s of savedOutput.savedSuggestions) {
    console.log(`\n📌 ${s.label}:`);
    console.log(`   JOF: ${s.jofId} | Humor: ${s.sentiment} ➔ ${s.intention}`);
    console.log(`   Jornada: "${s.journeyText}"`);
    console.log(`   Score: ${s.score.toFixed(3)} (${s.tier})`);
    console.log(`   Reflexão: "${s.reflection}"`);
  }
  console.log('');

  const savedPayload = {
    success: true,
    mode: 'saved',
    movie: savedOutput.movie,
    savedSuggestions: savedOutput.savedSuggestions.map(s => ({
      ...s,
      score: Number(s.score.toFixed(3))
    }))
  };

  console.log('\n---JSON_RESULT_START---');
  console.log(JSON.stringify(savedPayload, null, 2));
  console.log('---JSON_RESULT_END---\n');
}

if (require.main === module) {
  main()
    .catch(err => {
      console.error('❌ Erro fatal na curadoria:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
