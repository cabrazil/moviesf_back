-- MovieSentiment:

-- Match: IA "Vida Simples e Reflexiva" -> BD "Vida Simples e Reflexiva"
INSERT INTO "MovieSentiment" ("movieId", "mainSentimentId", "subSentimentId", "createdAt", "updatedAt")
VALUES ('2ecf7fad-a79e-4849-9dc0-7de79d9cd796', 14, 70, NOW(), NOW()) ON CONFLICT DO NOTHING;

-- JourneyOptionFlowSubSentiment:

-- Match: IA "Vida Simples e Reflexiva" -> BD "Vida Simples e Reflexiva"
INSERT INTO "JourneyOptionFlowSubSentiment" ("journeyOptionFlowId", "subSentimentId", "weight", "createdAt", "updatedAt")
VALUES (78, 70, 0.95, NOW(), NOW())
ON CONFLICT ("journeyOptionFlowId", "subSentimentId") DO UPDATE SET weight = EXCLUDED.weight;