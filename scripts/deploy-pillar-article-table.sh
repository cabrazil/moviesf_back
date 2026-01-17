#!/bin/bash

# ============================================
# Script de Deploy - MoviePillarArticle Table
# Data: 2026-01-17
# Descrição: Deploy seguro da tabela MoviePillarArticle em produção
# ============================================

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy da tabela MoviePillarArticle..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se o arquivo .env.production existe
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Erro: Arquivo .env.production não encontrado!${NC}"
    exit 1
fi

# Carregar variáveis de ambiente
source .env.production

# Verificar se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Erro: DATABASE_URL não está definida no .env.production!${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Configurações:${NC}"
echo "   Database: PostgreSQL (VPS Produção)"
echo "   Migration: create_movie_pillar_article_table.sql"
echo ""

# Confirmar antes de executar
read -p "⚠️  Deseja continuar com o deploy? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}⏸️  Deploy cancelado pelo usuário.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🔄 Executando migration...${NC}"

# Executar migration usando psql
psql "$DATABASE_URL" -f migrations/create_movie_pillar_article_table.sql

# Verificar se a execução foi bem-sucedida
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Migration executada com sucesso!${NC}"
    echo ""
    echo -e "${GREEN}📊 Verificando estrutura criada...${NC}"
    
    # Verificar se a tabela existe
    psql "$DATABASE_URL" -c "SELECT COUNT(*) as total_columns FROM information_schema.columns WHERE table_name = 'MoviePillarArticle';"
    
    echo ""
    echo -e "${GREEN}🎉 Deploy concluído com sucesso!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Testar a API em produção"
    echo "2. Inserir dados de teste usando o script insert_pillar_articles.sql"
    echo "3. Verificar a exibição na landing page"
else
    echo ""
    echo -e "${RED}❌ Erro ao executar migration!${NC}"
    echo "Verifique os logs acima para mais detalhes."
    exit 1
fi
