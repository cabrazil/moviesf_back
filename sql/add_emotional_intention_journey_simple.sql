-- ===== ASSOCIAÇÃO SIMPLES ENTRE INTENÇÃO EMOCIONAL E JORNADA =====

-- Tabela para associar Intenções Emocionais com Steps específicos da jornada
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

-- Índices para performance
CREATE INDEX "EmotionalIntentionJourneyStep_emotionalIntentionId_idx" ON "EmotionalIntentionJourneyStep"("emotionalIntentionId");
CREATE INDEX "EmotionalIntentionJourneyStep_journeyStepFlowId_idx" ON "EmotionalIntentionJourneyStep"("journeyStepFlowId");
CREATE INDEX "EmotionalIntentionJourneyStep_priority_idx" ON "EmotionalIntentionJourneyStep"("priority");

-- Constraint único para evitar duplicatas
CREATE UNIQUE INDEX "EmotionalIntentionJourneyStep_unique" ON "EmotionalIntentionJourneyStep"("emotionalIntentionId", "journeyStepFlowId");

-- ===== DADOS DE EXEMPLO PARA TESTAR =====

-- Exemplo: Associar intenção "PROCESS" do sentimento "Triste" com steps específicos
-- (Assumindo que já existem dados nas tabelas EmotionalIntention e JourneyStepFlow)

-- Inserir associações de steps para intenção PROCESS + Triste
INSERT INTO "EmotionalIntentionJourneyStep" ("emotionalIntentionId", "journeyStepFlowId", "priority", "isRequired", "customQuestion", "contextualHint")
SELECT 
    ei.id,
    jsf.id,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 1
        WHEN jsf.question ILIKE '%década%' OR jsf.question ILIKE '%decada%' THEN 2
        WHEN jsf.question ILIKE '%duração%' OR jsf.question ILIKE '%duracao%' THEN 3
        WHEN jsf.question ILIKE '%humor%' OR jsf.question ILIKE '%tom%' THEN 4
        ELSE 5
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN true
        ELSE false
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 'Que tipo de filme te ajudaria a processar esse sentimento?'
        WHEN jsf.question ILIKE '%humor%' OR jsf.question ILIKE '%tom%' THEN 'Você prefere algo mais reflexivo ou que te ajude a elaborar seus sentimentos?'
        ELSE NULL
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 'Escolha gêneros que permitam reflexão e elaboração emocional'
        WHEN jsf.question ILIKE '%humor%' OR jsf.question ILIKE '%tom%' THEN 'Para processar tristeza, filmes dramáticos ou contemplativos são mais eficazes'
        ELSE NULL
    END
FROM "EmotionalIntention" ei
CROSS JOIN "JourneyStepFlow" jsf
INNER JOIN "JourneyFlow" jf ON jsf."journeyFlowId" = jf.id
INNER JOIN "MainSentiment" ms ON jf."mainSentimentId" = ms.id
WHERE ei."intentionType" = 'PROCESS' 
AND ms.name ILIKE '%triste%'
ON CONFLICT DO NOTHING;

-- Inserir associações de steps para intenção TRANSFORM + Triste
INSERT INTO "EmotionalIntentionJourneyStep" ("emotionalIntentionId", "journeyStepFlowId", "priority", "isRequired", "customQuestion", "contextualHint")
SELECT 
    ei.id,
    jsf.id,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 1
        WHEN jsf.question ILIKE '%humor%' OR jsf.question ILIKE '%tom%' THEN 2
        WHEN jsf.question ILIKE '%década%' OR jsf.question ILIKE '%decada%' THEN 3
        ELSE 4
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN true
        WHEN jsf.question ILIKE '%humor%' OR jsf.question ILIKE '%tom%' THEN true
        ELSE false
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 'Que tipo de filme te ajudaria a mudar esse estado emocional?'
        WHEN jsf.question ILIKE '%humor%' OR jsf.question ILIKE '%tom%' THEN 'Você quer algo mais leve e animador?'
        ELSE NULL
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 'Para transformar tristeza, comédias e filmes inspiradores são ideais'
        WHEN jsf.question ILIKE '%humor%' OR jsf.question ILIKE '%tom%' THEN 'Escolha opções que elevem seu humor e energia'
        ELSE NULL
    END
FROM "EmotionalIntention" ei
CROSS JOIN "JourneyStepFlow" jsf
INNER JOIN "JourneyFlow" jf ON jsf."journeyFlowId" = jf.id
INNER JOIN "MainSentiment" ms ON jf."mainSentimentId" = ms.id
WHERE ei."intentionType" = 'TRANSFORM' 
AND ms.name ILIKE '%triste%'
ON CONFLICT DO NOTHING;

-- Inserir associações de steps para intenção MAINTAIN + Triste
INSERT INTO "EmotionalIntentionJourneyStep" ("emotionalIntentionId", "journeyStepFlowId", "priority", "isRequired", "customQuestion", "contextualHint")
SELECT 
    ei.id,
    jsf.id,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 1
        WHEN jsf.question ILIKE '%década%' OR jsf.question ILIKE '%decada%' THEN 2
        ELSE 3
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN true
        ELSE false
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 'Que tipo de filme ressoa com seu estado atual?'
        ELSE NULL
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 'Escolha algo que esteja em sintonia com sua melancolia'
        ELSE NULL
    END
FROM "EmotionalIntention" ei
CROSS JOIN "JourneyStepFlow" jsf
INNER JOIN "JourneyFlow" jf ON jsf."journeyFlowId" = jf.id
INNER JOIN "MainSentiment" ms ON jf."mainSentimentId" = ms.id
WHERE ei."intentionType" = 'MAINTAIN' 
AND ms.name ILIKE '%triste%'
ON CONFLICT DO NOTHING;

-- Inserir associações de steps para intenção EXPLORE + Triste
INSERT INTO "EmotionalIntentionJourneyStep" ("emotionalIntentionId", "journeyStepFlowId", "priority", "isRequired", "customQuestion", "contextualHint")
SELECT 
    ei.id,
    jsf.id,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 1
        WHEN jsf.question ILIKE '%década%' OR jsf.question ILIKE '%decada%' THEN 2
        WHEN jsf.question ILIKE '%duração%' OR jsf.question ILIKE '%duracao%' THEN 3
        ELSE 4
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN true
        ELSE false
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 'Que gêneros te ajudariam a explorar diferentes aspectos da tristeza?'
        ELSE NULL
    END,
    CASE 
        WHEN jsf.question ILIKE '%gênero%' OR jsf.question ILIKE '%genero%' THEN 'Explore diferentes perspectivas e nuances emocionais'
        ELSE NULL
    END
FROM "EmotionalIntention" ei
CROSS JOIN "JourneyStepFlow" jsf
INNER JOIN "JourneyFlow" jf ON jsf."journeyFlowId" = jf.id
INNER JOIN "MainSentiment" ms ON jf."mainSentimentId" = ms.id
WHERE ei."intentionType" = 'EXPLORE' 
AND ms.name ILIKE '%triste%'
ON CONFLICT DO NOTHING;

-- ===== QUERIES DE EXEMPLO PARA USO =====

/*
-- 1. Buscar steps personalizados para uma intenção emocional específica:
SELECT 
    jsf.*,
    eijs.priority,
    eijs.customQuestion,
    eijs.contextualHint,
    eijs.isRequired
FROM "JourneyStepFlow" jsf
INNER JOIN "EmotionalIntentionJourneyStep" eijs ON jsf.id = eijs."journeyStepFlowId"
WHERE eijs."emotionalIntentionId" = ?
ORDER BY eijs.priority ASC, jsf.order ASC;

-- 2. Buscar options de um step (mantém a lógica existente):
SELECT jof.*
FROM "JourneyOptionFlow" jof
WHERE jof."journeyStepFlowId" = ?
ORDER BY jof.id;

-- 3. Verificar se uma intenção tem steps personalizados:
SELECT COUNT(*) as total_steps
FROM "EmotionalIntentionJourneyStep" eijs
WHERE eijs."emotionalIntentionId" = ?;

-- 4. Buscar próximo step baseado na lógica existente:
SELECT jsf.*
FROM "JourneyStepFlow" jsf
WHERE jsf."stepId" = ? -- nextStepId da opção escolhida
AND jsf."journeyFlowId" = ?;
*/ 