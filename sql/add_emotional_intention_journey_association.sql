-- ===== EXTENSÃO DA ESTRUTURA PARA INTENÇÕES EMOCIONAIS NA JORNADA =====

-- 1. Tabela para associar Intenções Emocionais com Steps específicos da jornada
CREATE TABLE "EmotionalIntentionJourneyStep" (
    "id" SERIAL PRIMARY KEY,
    "emotionalIntentionId" INTEGER NOT NULL,
    "journeyStepFlowId" INTEGER NOT NULL,
    "priority" INTEGER DEFAULT 1, -- Prioridade do step para esta intenção (1 = mais importante)
    "isRequired" BOOLEAN DEFAULT false, -- Se este step é obrigatório para esta intenção
    "customQuestion" TEXT, -- Pergunta personalizada para esta intenção (opcional)
    "contextualHint" TEXT, -- Dica contextual para o usuário
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "EmotionalIntentionJourneyStep_emotionalIntentionId_fkey" 
        FOREIGN KEY ("emotionalIntentionId") REFERENCES "EmotionalIntention"("id") ON DELETE CASCADE,
    CONSTRAINT "EmotionalIntentionJourneyStep_journeyStepFlowId_fkey" 
        FOREIGN KEY ("journeyStepFlowId") REFERENCES "JourneyStepFlow"("id") ON DELETE CASCADE
);

-- 2. Tabela para personalizar opções específicas por intenção emocional
CREATE TABLE "EmotionalIntentionJourneyOption" (
    "id" SERIAL PRIMARY KEY,
    "emotionalIntentionId" INTEGER NOT NULL,
    "journeyOptionFlowId" INTEGER NOT NULL,
    "weight" DECIMAL(3,2) DEFAULT 1.0, -- Peso desta opção para esta intenção
    "isRecommended" BOOLEAN DEFAULT false, -- Se esta opção é recomendada para esta intenção
    "isHidden" BOOLEAN DEFAULT false, -- Se esta opção deve ser ocultada para esta intenção
    "customText" TEXT, -- Texto personalizado da opção para esta intenção
    "reasonForRecommendation" TEXT, -- Razão pela qual esta opção é recomendada
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "EmotionalIntentionJourneyOption_emotionalIntentionId_fkey" 
        FOREIGN KEY ("emotionalIntentionId") REFERENCES "EmotionalIntention"("id") ON DELETE CASCADE,
    CONSTRAINT "EmotionalIntentionJourneyOption_journeyOptionFlowId_fkey" 
        FOREIGN KEY ("journeyOptionFlowId") REFERENCES "JourneyOptionFlow"("id") ON DELETE CASCADE
);

-- 3. Tabela para filtros dinâmicos baseados em intenção emocional
CREATE TABLE "EmotionalIntentionFilter" (
    "id" SERIAL PRIMARY KEY,
    "emotionalIntentionId" INTEGER NOT NULL,
    "filterType" VARCHAR(50) NOT NULL, -- 'genre', 'mood', 'decade', 'duration', etc.
    "filterValue" VARCHAR(255) NOT NULL, -- Valor do filtro
    "operation" VARCHAR(20) DEFAULT 'include', -- 'include', 'exclude', 'prefer', 'avoid'
    "weight" DECIMAL(3,2) DEFAULT 1.0, -- Peso do filtro
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "EmotionalIntentionFilter_emotionalIntentionId_fkey" 
        FOREIGN KEY ("emotionalIntentionId") REFERENCES "EmotionalIntention"("id") ON DELETE CASCADE
);

-- 4. Índices para performance
CREATE INDEX "EmotionalIntentionJourneyStep_emotionalIntentionId_idx" ON "EmotionalIntentionJourneyStep"("emotionalIntentionId");
CREATE INDEX "EmotionalIntentionJourneyStep_journeyStepFlowId_idx" ON "EmotionalIntentionJourneyStep"("journeyStepFlowId");
CREATE INDEX "EmotionalIntentionJourneyStep_priority_idx" ON "EmotionalIntentionJourneyStep"("priority");

CREATE INDEX "EmotionalIntentionJourneyOption_emotionalIntentionId_idx" ON "EmotionalIntentionJourneyOption"("emotionalIntentionId");
CREATE INDEX "EmotionalIntentionJourneyOption_journeyOptionFlowId_idx" ON "EmotionalIntentionJourneyOption"("journeyOptionFlowId");
CREATE INDEX "EmotionalIntentionJourneyOption_weight_idx" ON "EmotionalIntentionJourneyOption"("weight");

CREATE INDEX "EmotionalIntentionFilter_emotionalIntentionId_idx" ON "EmotionalIntentionFilter"("emotionalIntentionId");
CREATE INDEX "EmotionalIntentionFilter_filterType_idx" ON "EmotionalIntentionFilter"("filterType");
CREATE INDEX "EmotionalIntentionFilter_isActive_idx" ON "EmotionalIntentionFilter"("isActive");

-- 5. Constraints únicos para evitar duplicatas
CREATE UNIQUE INDEX "EmotionalIntentionJourneyStep_unique" ON "EmotionalIntentionJourneyStep"("emotionalIntentionId", "journeyStepFlowId");
CREATE UNIQUE INDEX "EmotionalIntentionJourneyOption_unique" ON "EmotionalIntentionJourneyOption"("emotionalIntentionId", "journeyOptionFlowId");
CREATE UNIQUE INDEX "EmotionalIntentionFilter_unique" ON "EmotionalIntentionFilter"("emotionalIntentionId", "filterType", "filterValue");

-- ===== DADOS DE EXEMPLO PARA TESTAR =====

-- Exemplo: Associar intenção "PROCESS" do sentimento "Triste" com steps específicos
-- (Assumindo que já existem dados nas tabelas EmotionalIntention e JourneyStepFlow)

-- Inserir associações de steps para intenção PROCESS + Triste
INSERT INTO "EmotionalIntentionJourneyStep" ("emotionalIntentionId", "journeyStepFlowId", "priority", "isRequired", "customQuestion", "contextualHint")
SELECT 
    ei.id,
    jsf.id,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' THEN 1
        WHEN jsf.question ILIKE '%década%' THEN 2
        WHEN jsf.question ILIKE '%duração%' THEN 3
        ELSE 4
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' THEN true
        ELSE false
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' THEN 'Que tipo de filme te ajudaria a processar esse sentimento?'
        ELSE NULL
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' THEN 'Escolha gêneros que permitam reflexão e elaboração emocional'
        ELSE NULL
    END
FROM "EmotionalIntention" ei
CROSS JOIN "JourneyStepFlow" jsf
INNER JOIN "JourneyFlow" jf ON jsf."journeyFlowId" = jf.id
INNER JOIN "MainSentiment" ms ON jf."mainSentimentId" = ms.id
WHERE ei."intentionType" = 'PROCESS' 
AND ms.name ILIKE '%triste%'
ON CONFLICT DO NOTHING;

-- Inserir personalizações de opções para intenção PROCESS + Triste
INSERT INTO "EmotionalIntentionJourneyOption" ("emotionalIntentionId", "journeyOptionFlowId", "weight", "isRecommended", "reasonForRecommendation")
SELECT 
    ei.id,
    jof.id,
    CASE 
        WHEN jof.text ILIKE '%drama%' THEN 2.0
        WHEN jof.text ILIKE '%biografia%' THEN 1.8
        WHEN jof.text ILIKE '%romance%' THEN 1.5
        WHEN jof.text ILIKE '%comédia%' THEN 0.3
        WHEN jof.text ILIKE '%ação%' THEN 0.2
        ELSE 1.0
    END,
    CASE 
        WHEN jof.text ILIKE '%drama%' OR jof.text ILIKE '%biografia%' THEN true
        ELSE false
    END,
    CASE 
        WHEN jof.text ILIKE '%drama%' THEN 'Dramas ajudam no processo de elaboração emocional'
        WHEN jof.text ILIKE '%biografia%' THEN 'Biografias oferecem perspectivas inspiradoras sobre superação'
        ELSE NULL
    END
FROM "EmotionalIntention" ei
CROSS JOIN "JourneyOptionFlow" jof
INNER JOIN "JourneyStepFlow" jsf ON jof."journeyStepFlowId" = jsf.id
INNER JOIN "JourneyFlow" jf ON jsf."journeyFlowId" = jf.id
INNER JOIN "MainSentiment" ms ON jf."mainSentimentId" = ms.id
WHERE ei."intentionType" = 'PROCESS' 
AND ms.name ILIKE '%triste%'
ON CONFLICT DO NOTHING;

-- Inserir filtros para intenção PROCESS + Triste
INSERT INTO "EmotionalIntentionFilter" ("emotionalIntentionId", "filterType", "filterValue", "operation", "weight")
SELECT ei.id, 'genre', 'Drama', 'prefer', 2.0
FROM "EmotionalIntention" ei
INNER JOIN "MainSentiment" ms ON ei."mainSentimentId" = ms.id
WHERE ei."intentionType" = 'PROCESS' AND ms.name ILIKE '%triste%'
ON CONFLICT DO NOTHING;

INSERT INTO "EmotionalIntentionFilter" ("emotionalIntentionId", "filterType", "filterValue", "operation", "weight")
SELECT ei.id, 'genre', 'Comédia', 'avoid', 0.2
FROM "EmotionalIntention" ei
INNER JOIN "MainSentiment" ms ON ei."mainSentimentId" = ms.id
WHERE ei."intentionType" = 'PROCESS' AND ms.name ILIKE '%triste%'
ON CONFLICT DO NOTHING;

INSERT INTO "EmotionalIntentionFilter" ("emotionalIntentionId", "filterType", "filterValue", "operation", "weight")
SELECT ei.id, 'mood', 'contemplativo', 'prefer', 1.8
FROM "EmotionalIntention" ei
INNER JOIN "MainSentiment" ms ON ei."mainSentimentId" = ms.id
WHERE ei."intentionType" = 'PROCESS' AND ms.name ILIKE '%triste%'
ON CONFLICT DO NOTHING;

-- ===== COMENTÁRIOS SOBRE O USO =====

/*
COMO USAR ESSAS TABELAS:

1. EmotionalIntentionJourneyStep:
   - Define quais steps da jornada são relevantes para cada intenção emocional
   - Permite personalizar perguntas e adicionar dicas contextuais
   - Priority define a ordem de importância dos steps

2. EmotionalIntentionJourneyOption:
   - Personaliza as opções disponíveis em cada step baseado na intenção
   - Weight define o quanto uma opção é relevante para a intenção
   - isRecommended marca opções que devem ser destacadas
   - isHidden permite ocultar opções irrelevantes

3. EmotionalIntentionFilter:
   - Define filtros automáticos que são aplicados baseados na intenção
   - Permite incluir/excluir/preferir/evitar certos tipos de conteúdo
   - Funciona como um sistema de recomendação inteligente

EXEMPLO DE QUERY PARA BUSCAR JORNADA PERSONALIZADA:

SELECT 
    jsf.*,
    eijs.priority,
    eijs.customQuestion,
    eijs.contextualHint
FROM "JourneyStepFlow" jsf
INNER JOIN "EmotionalIntentionJourneyStep" eijs ON jsf.id = eijs."journeyStepFlowId"
WHERE eijs."emotionalIntentionId" = ?
ORDER BY eijs.priority, jsf.order;

EXEMPLO DE QUERY PARA BUSCAR OPÇÕES PERSONALIZADAS:

SELECT 
    jof.*,
    eijo.weight,
    eijo.isRecommended,
    eijo.customText,
    eijo.reasonForRecommendation
FROM "JourneyOptionFlow" jof
INNER JOIN "EmotionalIntentionJourneyOption" eijo ON jof.id = eijo."journeyOptionFlowId"
WHERE eijo."emotionalIntentionId" = ?
AND eijo.isHidden = false
ORDER BY eijo.weight DESC, eijo.isRecommended DESC;
*/ 