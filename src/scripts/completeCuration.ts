import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function completeCuration() {
  try {
    const movieId = 'c1bf044d-925f-4cb3-862c-9d7da664b6d3'; // Para Sempre
    const journeyOptionFlowId = 81; // Opção final da jornada
    
    console.log('🎯 Completando curadoria do filme "Para Sempre"...');
    
    // Verificar se já existe
    const existingSuggestion = await prisma.movieSuggestionFlow.findFirst({
      where: {
        movieId,
        journeyOptionFlowId
      }
    });
    
    if (existingSuggestion) {
      console.log('✅ Filme já está na tabela MovieSuggestionFlow');
      return;
    }
    
    // Buscar informações do filme
    const movie = await prisma.movie.findUnique({
      where: { id: movieId }
    });
    
    if (!movie) {
      console.log('❌ Filme não encontrado');
      return;
    }
    
    // Buscar opção da jornada
    const journeyOption = await prisma.journeyOptionFlow.findUnique({
      where: { id: journeyOptionFlowId }
    });
    
    if (!journeyOption) {
      console.log('❌ Opção da jornada não encontrada');
      return;
    }
    
    // Gerar reflexão para o filme
    const reflection = `Uma jornada emocional sobre amor, memória e reconstrução. "${movie.title}" mergulha suavemente na complexidade das relações humanas através da história de um casal que precisa redescobrir seu amor após um acidente traumático. O filme explora temas de esperança, superação e a força dos laços familiares com sensibilidade e profundidade.`;
    
    // Adicionar à tabela MovieSuggestionFlow
    const suggestion = await prisma.movieSuggestionFlow.create({
      data: {
        movieId,
        journeyOptionFlowId,
        reason: reflection,
        relevance: 5, // Relevância alta
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Filme adicionado à tabela MovieSuggestionFlow:');
    console.log(`   - Filme: ${movie.title} (${movie.year})`);
    console.log(`   - Opção: ${journeyOption.text}`);
    console.log(`   - ID: ${suggestion.id}`);
    console.log(`   - Relevância: ${suggestion.relevance}`);
    
  } catch (error) {
    console.error('❌ Erro ao completar curadoria:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  completeCuration();
} 