#!/bin/bash

# ============================================
# Setup de Backup PostgreSQL - User vibesfilm
# Executar como ROOT no servidor VPS
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🗄️  Setup de Backup PostgreSQL${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Este script deve ser executado como root${NC}"
    echo "Execute: sudo bash $0"
    exit 1
fi

echo -e "${YELLOW}📋 Configuração:${NC}"
echo "   Usuário: vibesfilm"
echo "   Home: /home/vibesfilm"
echo "   Backups: /home/vibesfilm/backups/postgres"
echo "   Scripts: /home/vibesfilm/scripts"
echo "   Logs: /home/vibesfilm/backups/logs"
echo ""

# 1. Criar estrutura de diretórios
echo -e "${YELLOW}📁 Criando estrutura de diretórios...${NC}"
mkdir -p /home/vibesfilm/backups/postgres/{vibesfilm,blog}
mkdir -p /home/vibesfilm/backups/logs
mkdir -p /home/vibesfilm/scripts

# Ajustar permissões
chown -R vibesfilm:vibesfilm /home/vibesfilm/backups
chown -R vibesfilm:vibesfilm /home/vibesfilm/scripts
chmod 755 /home/vibesfilm/backups
chmod 755 /home/vibesfilm/scripts

echo -e "${GREEN}✅ Diretórios criados${NC}"
echo ""

# 2. Verificar se os scripts existem no projeto
SCRIPT_SOURCE="/home/cabrazil/newprojs/fav_movies/moviesf_back/scripts"

if [ ! -f "$SCRIPT_SOURCE/backup-postgres.sh" ]; then
    echo -e "${RED}❌ Scripts não encontrados em $SCRIPT_SOURCE${NC}"
    echo "Execute este script a partir do servidor VPS após fazer git pull do projeto."
    exit 1
fi

# 3. Copiar scripts
echo -e "${YELLOW}📋 Copiando scripts...${NC}"
cp "$SCRIPT_SOURCE/backup-postgres.sh" /home/vibesfilm/scripts/
cp "$SCRIPT_SOURCE/restore-postgres.sh" /home/vibesfilm/scripts/
cp "$SCRIPT_SOURCE/BACKUP_GUIDE.md" /home/vibesfilm/scripts/

# Ajustar caminhos nos scripts para usar /home/vibesfilm
sed -i 's|/home/cabrazil|/home/vibesfilm|g' /home/vibesfilm/scripts/backup-postgres.sh
sed -i 's|/home/cabrazil|/home/vibesfilm|g' /home/vibesfilm/scripts/restore-postgres.sh

# Ajustar permissões
chown vibesfilm:vibesfilm /home/vibesfilm/scripts/*
chmod +x /home/vibesfilm/scripts/backup-postgres.sh
chmod +x /home/vibesfilm/scripts/restore-postgres.sh

echo -e "${GREEN}✅ Scripts copiados e configurados${NC}"
echo ""

# 4. Verificar se .env.production existe
ENV_FILE="/home/cabrazil/newprojs/fav_movies/moviesf_back/.env.production"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env.production não encontrado em:${NC}"
    echo "   $ENV_FILE"
    echo ""
    echo "Certifique-se de que o arquivo existe antes de executar o backup."
else
    echo -e "${GREEN}✅ Arquivo .env.production encontrado${NC}"
fi
echo ""

# 5. Configurar cron para o usuário vibesfilm
echo -e "${YELLOW}⏰ Configurando cron para usuário vibesfilm...${NC}"

# Criar arquivo temporário com o cron
TEMP_CRON=$(mktemp)
crontab -u vibesfilm -l 2>/dev/null > "$TEMP_CRON" || true

# Remover linha antiga se existir
grep -v "backup-postgres.sh" "$TEMP_CRON" > "${TEMP_CRON}.new" || true
mv "${TEMP_CRON}.new" "$TEMP_CRON"

# Adicionar nova linha
echo "" >> "$TEMP_CRON"
echo "# Backup automático PostgreSQL - Vibesfilm + Blog (todo dia às 3h da manhã)" >> "$TEMP_CRON"
echo "0 3 * * * /home/vibesfilm/scripts/backup-postgres.sh >> /home/vibesfilm/backups/logs/cron.log 2>&1" >> "$TEMP_CRON"

# Aplicar cron
crontab -u vibesfilm "$TEMP_CRON"
rm "$TEMP_CRON"

echo -e "${GREEN}✅ Cron configurado para usuário vibesfilm${NC}"
echo ""

# 6. Testar backup
echo -e "${YELLOW}🧪 Deseja executar um teste de backup agora? (s/N):${NC} "
read -r response

if [[ "$response" =~ ^([sS])$ ]]; then
    echo ""
    echo -e "${BLUE}Executando backup como usuário vibesfilm...${NC}"
    su - vibesfilm -c "/home/vibesfilm/scripts/backup-postgres.sh"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup Concluído!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📊 Resumo:${NC}"
echo "   Usuário: vibesfilm"
echo "   Scripts: /home/vibesfilm/scripts/"
echo "   Backups: /home/vibesfilm/backups/postgres/"
echo "   Logs: /home/vibesfilm/backups/logs/"
echo ""
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo "1. Verificar cron do usuário vibesfilm:"
echo "   crontab -u vibesfilm -l"
echo ""
echo "2. Executar backup manual:"
echo "   su - vibesfilm -c '/home/vibesfilm/scripts/backup-postgres.sh'"
echo ""
echo "3. Ver logs:"
echo "   cat /home/vibesfilm/backups/logs/backup_\$(date +%Y-%m-%d).log"
echo ""
echo "4. Listar backups:"
echo "   su - vibesfilm -c '/home/vibesfilm/scripts/restore-postgres.sh vibesfilm'"
echo ""
