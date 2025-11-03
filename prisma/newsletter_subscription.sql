-- SQL para criar a tabela NewsletterSubscription manualmente no Supabase DO BLOG
-- IMPORTANTE: Execute este script no banco de dados do BLOG (BLOG_DATABASE_URL)
-- NÃO execute no banco principal (DATABASE_URL)
-- Execute este script no editor SQL do Supabase do Blog

CREATE TABLE IF NOT EXISTS "NewsletterSubscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "source" VARCHAR(50),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- Criar índice único para email
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");

-- Criar índices para otimização de consultas
CREATE INDEX IF NOT EXISTS "NewsletterSubscription_email_idx" ON "NewsletterSubscription"("email");
CREATE INDEX IF NOT EXISTS "NewsletterSubscription_isActive_idx" ON "NewsletterSubscription"("isActive");
CREATE INDEX IF NOT EXISTS "NewsletterSubscription_subscribedAt_idx" ON "NewsletterSubscription"("subscribedAt");

-- Comentários para documentação
COMMENT ON TABLE "NewsletterSubscription" IS 'Tabela para armazenar assinantes da newsletter do VibesFilm';
COMMENT ON COLUMN "NewsletterSubscription"."email" IS 'Email do assinante (único)';
COMMENT ON COLUMN "NewsletterSubscription"."isActive" IS 'Indica se o assinante está ativo';
COMMENT ON COLUMN "NewsletterSubscription"."source" IS 'Origem da inscrição: blog_home, footer, article';
COMMENT ON COLUMN "NewsletterSubscription"."emailSent" IS 'Flag para indicar se já foi enviado email (para quando iniciar envios)';

