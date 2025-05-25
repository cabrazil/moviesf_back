interface KeywordWeight {
  keyword: string;
  weight: number;
  relatedKeywords: string[];
}

interface SentimentKeywords {
  [key: string]: KeywordWeight[];
}

export const sentimentKeywords: SentimentKeywords = {
  "Neutro / Indiferente": [
    {
      keyword: "contemplação",
      weight: 1.0,
      relatedKeywords: ["análise", "estudo", "observação", "reflexão", "ciência", "pesquisa", "investigação"]
    },
    {
      keyword: "análise",
      weight: 1.0,
      relatedKeywords: ["ciência", "pesquisa", "investigação", "estudo", "mecânica", "física", "quântica"]
    },
    {
      keyword: "objetividade",
      weight: 1.0,
      relatedKeywords: ["racionalidade", "lógica", "imparcialidade", "neutralidade", "ciência", "pesquisa"]
    },
    {
      keyword: "equilíbrio",
      weight: 1.0,
      relatedKeywords: ["harmonia", "serenidade", "paz", "tranquilidade", "controle", "estabilidade"]
    },
    {
      keyword: "distanciamento",
      weight: 1.0,
      relatedKeywords: ["objetividade", "imparcialidade", "neutralidade", "controle", "racionalidade"]
    },
    {
      keyword: "introspecção",
      weight: 1.0,
      relatedKeywords: ["reflexão", "contemplação", "análise", "autoconhecimento", "autodescoberta"]
    },
    {
      keyword: "neutralidade",
      weight: 1.0,
      relatedKeywords: ["objetividade", "imparcialidade", "equilíbrio", "controle", "racionalidade"]
    },
    {
      keyword: "indiferença",
      weight: 0.8,
      relatedKeywords: ["desapego", "desprendimento", "distanciamento", "frieza", "ausência"]
    },
    {
      keyword: "apatia",
      weight: 0.8,
      relatedKeywords: ["desinteresse", "desmotivação", "passividade", "inércia", "estagnação"]
    },
    {
      keyword: "desinteresse",
      weight: 0.8,
      relatedKeywords: ["apatia", "desmotivação", "passividade", "inércia", "estagnação"]
    }
  ]
};

export function calculateMatchScore(movieKeywords: string[], sentimentKeywords: KeywordWeight[]): number {
  let score = 0;
  const processedKeywords = new Set<string>();
  
  for (const movieKeyword of movieKeywords) {
    for (const sentimentKeyword of sentimentKeywords) {
      // Match direto
      if (movieKeyword.toLowerCase().includes(sentimentKeyword.keyword.toLowerCase()) || 
          sentimentKeyword.keyword.toLowerCase().includes(movieKeyword.toLowerCase())) {
        if (!processedKeywords.has(movieKeyword)) {
          score += sentimentKeyword.weight;
          processedKeywords.add(movieKeyword);
        }
      }
      
      // Match com keywords relacionadas
      for (const relatedKeyword of sentimentKeyword.relatedKeywords) {
        if (movieKeyword.toLowerCase().includes(relatedKeyword.toLowerCase()) || 
            relatedKeyword.toLowerCase().includes(movieKeyword.toLowerCase())) {
          if (!processedKeywords.has(movieKeyword)) {
            score += sentimentKeyword.weight * 0.5;
            processedKeywords.add(movieKeyword);
          }
        }
      }
    }
  }
  
  return score;
}

export function getSentimentKeywords(sentimentName: string): KeywordWeight[] {
  return sentimentKeywords[sentimentName] || [];
} 