/**
 * Utilitários para tradução de premiações
 * Mantém os dados em inglês no banco e traduz apenas na exibição
 */

// Tradução de categorias do Oscar para português
export function translateOscarCategory(category: string): string {
  const translations: { [key: string]: string } = {
    // Categorias principais
    'BEST PICTURE': 'Melhor Filme',
    'BEST DIRECTOR': 'Melhor Diretor',
    'BEST ACTOR': 'Melhor Ator',
    'BEST ACTRESS': 'Melhor Atriz',
    'BEST SUPPORTING ACTOR': 'Melhor Ator Coadjuvante',
    'BEST SUPPORTING ACTRESS': 'Melhor Atriz Coadjuvante',
    'BEST ORIGINAL SCREENPLAY': 'Melhor Roteiro Original',
    'BEST ADAPTED SCREENPLAY': 'Melhor Roteiro Adaptado',
    
    // Categorias técnicas
    'BEST CINEMATOGRAPHY': 'Melhor Fotografia',
    'BEST FILM EDITING': 'Melhor Edição',
    'BEST PRODUCTION DESIGN': 'Melhor Direção de Arte',
    'BEST COSTUME DESIGN': 'Melhor Figurino',
    'BEST MAKEUP AND HAIRSTYLING': 'Melhor Maquiagem e Penteados',
    'BEST SOUND': 'Melhor Som',
    'BEST SOUND EDITING': 'Melhor Edição de Som',
    'BEST SOUND MIXING': 'Melhor Mixagem de Som',
    'BEST VISUAL EFFECTS': 'Melhores Efeitos Visuais',
    
    // Categorias de música
    'BEST ORIGINAL SCORE': 'Melhor Trilha Sonora Original',
    'BEST ORIGINAL SONG': 'Melhor Canção Original',
    
    // Categorias internacionais
    'BEST INTERNATIONAL FEATURE FILM': 'Melhor Filme Internacional',
    'BEST DOCUMENTARY FEATURE': 'Melhor Documentário',
    'BEST DOCUMENTARY SHORT SUBJECT': 'Melhor Documentário em Curta-Metragem',
    'BEST ANIMATED FEATURE FILM': 'Melhor Filme de Animação',
    'BEST ANIMATED SHORT FILM': 'Melhor Curta-Metragem de Animação',
    'BEST LIVE ACTION SHORT FILM': 'Melhor Curta-Metragem de Ação ao Vivo',
    
    // Categorias específicas (formato do site)
    'ACTOR IN A LEADING ROLE': 'Melhor Ator',
    'ACTRESS IN A LEADING ROLE': 'Melhor Atriz',
    'ACTOR IN A SUPPORTING ROLE': 'Melhor Ator Coadjuvante',
    'ACTRESS IN A SUPPORTING ROLE': 'Melhor Atriz Coadjuvante',
    'DIRECTING': 'Melhor Diretor',
    'CINEMATOGRAPHY': 'Melhor Fotografia',
    'FILM EDITING': 'Melhor Edição',
    'PRODUCTION DESIGN': 'Melhor Direção de Arte',
    'COSTUME DESIGN': 'Melhor Figurino',
    'MAKEUP AND HAIRSTYLING': 'Melhor Maquiagem e Penteados',
    'SOUND': 'Melhor Som',
    'VISUAL EFFECTS': 'Melhores Efeitos Visuais',
    'ORIGINAL SCORE': 'Melhor Trilha Sonora Original',
    'ORIGINAL SONG': 'Melhor Canção Original',
    'INTERNATIONAL FEATURE FILM': 'Melhor Filme Internacional',
    'DOCUMENTARY FEATURE': 'Melhor Documentário',
    'ANIMATED FEATURE FILM': 'Melhor Filme de Animação'
  };

  return translations[category] || category;
}

// Formatar resumo de premiações para a Landing Page
export function formatAwardsForLandingPage(wins: number, nominations: number): string {
  if (wins === 0 && nominations === 0) {
    return '';
  }
  
  if (wins === 0) {
    return `${nominations} indicação${nominations > 1 ? 'ões' : ''} ao Oscar`;
  }
  
  if (nominations === 0) {
    return `${wins} Oscar${wins > 1 ? 's' : ''}`;
  }
  
  return `${wins} Oscar${wins > 1 ? 's' : ''} e ${nominations} indicação${nominations > 1 ? 'ões' : ''}`;
}

// Formatar detalhes de premiações para exibição
export function formatAwardDetails(wins: any[], nominations: any[]): string {
  const allAwards = [...wins, ...nominations];
  
  if (allAwards.length === 0) {
    return '';
  }
  
  const categories = allAwards.map(award => {
    const translatedCategory = translateOscarCategory(award.awardCategory.name);
    const isWin = wins.some(win => win.awardCategoryId === award.awardCategoryId);
    return isWin ? `🏆 ${translatedCategory}` : `🎯 ${translatedCategory}`;
  });
  
  return categories.join(', ');
}

// Interface para dados de premiação
export interface AwardSummary {
  wins: number;
  nominations: number;
  details: string;
}

// Calcular resumo de premiações
export function calculateAwardSummary(wins: any[], nominations: any[]): AwardSummary {
  return {
    wins: wins.length,
    nominations: nominations.length,
    details: formatAwardDetails(wins, nominations)
  };
}
