#!/bin/bash

# ============================================
# Script de Restauração de Backup - PostgreSQL
# Uso: ./restore-postgres.sh [vibesfilm|blog] [arquivo_backup]
# ============================================

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar argumentos
if [ $# -lt 1 ]; then
    echo -e "${RED}Uso: $0 [vibesfilm|blog] [arquivo_backup]${NC}"
    echo ""
    echo "Exemplos:"
    echo "  $0 vibesfilm                          # Lista backups disponíveis"
    echo "  $0 vibesfilm /path/to/backup.sql.gz   # Restaura backup específico"
    exit 1
fi

DB_NAME=$1
BACKUP_FILE=$2
BACKUP_DIR="/home/cabrazil/backups/postgres"

# Carregar variáveis de ambiente
if [ -f /home/cabrazil/newprojs/fav_movies/moviesf_back/.env.production ]; then
    source /home/cabrazil/newprojs/fav_movies/moviesf_back/.env.production
else
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    exit 1
fi

# Definir DATABASE_URL baseado no banco
case $DB_NAME in
    vibesfilm)
        DB_URL=$DATABASE_URL
        BACKUP_PATH="$BACKUP_DIR/vibesfilm"
        ;;
    blog)
        DB_URL=$BLOG_DATABASE_URL
        BACKUP_PATH="$BACKUP_DIR/blog"
        ;;
    *)
        echo -e "${RED}❌ Banco inválido. Use: vibesfilm ou blog${NC}"
        exit 1
        ;;
esac

# Se não foi fornecido arquivo, listar backups disponíveis
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${BLUE}📋 Backups disponíveis para $DB_NAME:${NC}"
    echo ""
    
    if [ ! -d "$BACKUP_PATH" ]; then
        echo -e "${RED}❌ Nenhum backup encontrado em $BACKUP_PATH${NC}"
        exit 1
    fi
    
    # Listar backups ordenados por data (mais recente primeiro)
    find "$BACKUP_PATH" -name "*.sql.gz" -type f -printf "%T@ %p\n" | sort -rn | while read timestamp file; do
        size=$(du -h "$file" | cut -f1)
        date=$(date -d "@${timestamp%.*}" '+%Y-%m-%d %H:%M:%S')
        echo -e "${GREEN}📦${NC} $(basename "$file")"
        echo -e "   Tamanho: $size"
        echo -e "   Data: $date"
        echo -e "   Caminho: $file"
        echo ""
    done
    
    echo -e "${YELLOW}Para restaurar, execute:${NC}"
    echo -e "  $0 $DB_NAME /caminho/completo/do/backup.sql.gz"
    exit 0
fi

# Verificar se o arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Arquivo de backup não encontrado: $BACKUP_FILE${NC}"
    exit 1
fi

# Verificar integridade do arquivo
echo -e "${BLUE}🔍 Verificando integridade do backup...${NC}"
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${RED}❌ Arquivo de backup corrompido!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backup íntegro${NC}"
echo ""

# Confirmação
echo -e "${YELLOW}⚠️  ATENÇÃO: Esta operação irá SUBSTITUIR todos os dados do banco $DB_NAME!${NC}"
echo -e "${YELLOW}   Arquivo: $BACKUP_FILE${NC}"
echo ""
read -p "Deseja continuar? (digite 'SIM' para confirmar): " -r
echo

if [ "$REPLY" != "SIM" ]; then
    echo -e "${YELLOW}⏸️  Restauração cancelada.${NC}"
    exit 0
fi

# Fazer backup de segurança antes de restaurar
echo -e "${BLUE}📦 Criando backup de segurança antes da restauração...${NC}"
SAFETY_BACKUP="$BACKUP_PATH/${DB_NAME}_pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
pg_dump "$DB_URL" | gzip > "$SAFETY_BACKUP"
echo -e "${GREEN}✅ Backup de segurança criado: $SAFETY_BACKUP${NC}"
echo ""

# Restaurar backup
echo -e "${BLUE}🔄 Restaurando backup...${NC}"
if gunzip -c "$BACKUP_FILE" | psql "$DB_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backup restaurado com sucesso!${NC}"
    echo ""
    echo -e "${GREEN}📊 Resumo:${NC}"
    echo -e "   Banco: $DB_NAME"
    echo -e "   Backup restaurado: $(basename "$BACKUP_FILE")"
    echo -e "   Backup de segurança: $SAFETY_BACKUP"
else
    echo -e "${RED}❌ Erro ao restaurar backup!${NC}"
    echo -e "${YELLOW}💡 Você pode tentar restaurar o backup de segurança:${NC}"
    echo -e "   gunzip -c $SAFETY_BACKUP | psql \$DATABASE_URL"
    exit 1
fi
