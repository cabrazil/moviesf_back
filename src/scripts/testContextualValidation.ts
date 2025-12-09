// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Função para validar compatibilidade contextual entre filme e opção
async function validateContextualCompatibility(
  movie: any, 
  optionId: number, 
  optionText: string
): Promise<{ compatible: boolean; reason?: string }> {
  
  // Buscar detalhes da opção
  const option = await prisma.journeyOptionFlow.findUnique({
    where: { id: optionId }
  });

  if (!option) {
    return { compatible: false, reason: "Opção não encontrada" };
  }

  const movieGenres = movie.genres?.map((g: any) => g.name?.toLowerCase()) || [];
  const movieKeywords = movie.keywords?.map((k: string) => k?.toLowerCase()) || [];
  const optionTextLower = optionText.toLowerCase();

  console.log(`\n🔍 Validando compatibilidade contextual:`);
  console.log(`Filme: ${movie.title} (${movie.year})`);
  console.log(`Gêneros: ${movieGenres.join(', ')}`);
  console.log(`Opção: ${optionText}`);
  console.log(`Keywords do filme: ${movieKeywords.slice(0, 10).join(', ')}...`);

  // Regras de incompatibilidade
  const incompatibilityRules = [
    {
      optionKeywords: ['animação', 'animacao', 'divertida', 'colorida', 'leve', 'bobinha', 'comédia', 'comedia'],
      incompatibleGenres: ['drama', 'guerra', 'thriller', 'terror', 'crime', 'biografia'],
      incompatibleKeywords: ['holocausto', 'nazista', 'guerra', 'morte', 'tragédia', 'tragedia', 'violência', 'violencia', 'perseguição', 'perseguicao'],
      reason: "Filme sério/dramático não compatível com opção de entretenimento leve"
    },
    {
      optionKeywords: ['ação', 'acao', 'aventura', 'empolgante', 'energético', 'energetico'],
      incompatibleGenres: ['romance', 'comédia', 'comedia', 'drama'],
      incompatibleKeywords: ['romântico', 'romantico', 'amor', 'casamento', 'família', 'familia'],
      reason: "Filme romântico/familiar não compatível com opção de ação/aventura"
    },
    {
      optionKeywords: ['reflexão', 'reflexao', 'filosófica', 'filosofica', 'profunda', 'contemplação', 'contemplacao'],
      incompatibleGenres: ['comédia', 'comedia', 'ação', 'acao', 'aventura'],
      incompatibleKeywords: ['divertido', 'engraçado', 'engracado', 'ação', 'acao', 'aventura'],
      reason: "Filme de entretenimento não compatível com opção de reflexão profunda"
    }
  ];

  // Verificar regras de incompatibilidade
  for (const rule of incompatibilityRules) {
    const hasIncompatibleOption = rule.optionKeywords.some(keyword => 
      optionTextLower.includes(keyword)
    );
    
    const hasIncompatibleGenre = movieGenres.some((genre: string) => 
      rule.incompatibleGenres.includes(genre)
    );
    
    const hasIncompatibleKeyword = movieKeywords.some((keyword: string) => 
      rule.incompatibleKeywords.some(incompatible => 
        keyword.includes(incompatible)
      )
    );

    if (hasIncompatibleOption && (hasIncompatibleGenre || hasIncompatibleKeyword)) {
      console.log(`❌ Incompatibilidade detectada: ${rule.reason}`);
      return { 
        compatible: false, 
        reason: rule.reason 
      };
    }
  }

  console.log(`✅ Compatibilidade contextual validada`);
  return { compatible: true };
}

async function testContextualValidation() {
  try {
    console.log("🧪 === TESTE DE VALIDAÇÃO CONTEXTUAL ===");

    // Teste 1: O Pianista + Animação divertida (DEVE FALHAR)
    console.log("\n📋 Teste 1: O Pianista + Animação divertida");
    const oPianista = await prisma.movie.findFirst({
      where: { title: { contains: "O Pianista", mode: 'insensitive' } }
    });

    if (oPianista) {
      const result1 = await validateContextualCompatibility(
        oPianista, 
        159, // ID da opção "animação divertida e colorida"
        "...uma animação divertida e colorida"
      );
      
      console.log(`Resultado: ${result1.compatible ? '✅ COMPATÍVEL' : '❌ INCOMPATÍVEL'}`);
      if (!result1.compatible) {
        console.log(`Motivo: ${result1.reason}`);
      }
    }

    // Teste 2: Robô Selvagem + Animação divertida (DEVE PASSAR)
    console.log("\n📋 Teste 2: Robô Selvagem + Animação divertida");
    const roboSelvagem = await prisma.movie.findFirst({
      where: { title: { contains: "Robô Selvagem", mode: 'insensitive' } }
    });

    if (roboSelvagem) {
      const result2 = await validateContextualCompatibility(
        roboSelvagem, 
        159, // ID da opção "animação divertida e colorida"
        "...uma animação divertida e colorida"
      );
      
      console.log(`Resultado: ${result2.compatible ? '✅ COMPATÍVEL' : '❌ INCOMPATÍVEL'}`);
      if (!result2.compatible) {
        console.log(`Motivo: ${result2.reason}`);
      }
    }

    // Teste 3: Filme de ação + Reflexão filosófica (DEVE FALHAR)
    console.log("\n📋 Teste 3: Filme de ação + Reflexão filosófica");
    const filmeAcao = {
      title: "Velozes e Furiosos",
      year: 2001,
      genres: [{ name: "Ação" }, { name: "Aventura" }],
      keywords: ["carros", "corrida", "ação", "adrenalina", "velocidade"]
    };

    const result3 = await validateContextualCompatibility(
      filmeAcao, 
      999, // ID fictício
      "...uma reflexão filosófica profunda sobre a condição humana"
    );
    
    console.log(`Resultado: ${result3.compatible ? '✅ COMPATÍVEL' : '❌ INCOMPATÍVEL'}`);
    if (!result3.compatible) {
      console.log(`Motivo: ${result3.reason}`);
    }

    console.log("\n🎉 Testes de validação contextual concluídos!");

  } catch (error) {
    console.error('Erro nos testes:', error);
  }
}

testContextualValidation()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 