#!/bin/bash

# ============================================
# Script de Instalação Rápida - Sistema de Backup
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Instalando Sistema de Backup PostgreSQL...${NC}"
echo ""

# 1. Criar diretórios
echo -e "${YELLOW}📁 Criando diretórios...${NC}"
mkdir -p /home/cabrazil/backups/postgres/{vibesfilm,blog}
mkdir -p /home/cabrazil/backups/logs
mkdir -p /home/cabrazil/scripts
echo -e "${GREEN}✅ Diretórios criados${NC}"
echo ""

# 2. Copiar scripts
echo -e "${YELLOW}📋 Copiando scripts...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verificar se os scripts existem no diretório atual
if [ -f "$SCRIPT_DIR/backup-postgres.sh" ]; then
    cp "$SCRIPT_DIR/backup-postgres.sh" /home/cabrazil/scripts/
    echo -e "${GREEN}✅ backup-postgres.sh copiado${NC}"
else
    echo -e "${YELLOW}⚠️  backup-postgres.sh não encontrado no diretório atual${NC}"
fi

if [ -f "$SCRIPT_DIR/restore-postgres.sh" ]; then
    cp "$SCRIPT_DIR/restore-postgres.sh" /home/cabrazil/scripts/
    echo -e "${GREEN}✅ restore-postgres.sh copiado${NC}"
else
    echo -e "${YELLOW}⚠️  restore-postgres.sh não encontrado no diretório atual${NC}"
fi

if [ -f "$SCRIPT_DIR/BACKUP_GUIDE.md" ]; then
    cp "$SCRIPT_DIR/BACKUP_GUIDE.md" /home/cabrazil/scripts/
    echo -e "${GREEN}✅ BACKUP_GUIDE.md copiado${NC}"
fi

echo ""

# 3. Dar permissões
echo -e "${YELLOW}🔐 Configurando permissões...${NC}"
chmod +x /home/cabrazil/scripts/backup-postgres.sh
chmod +x /home/cabrazil/scripts/restore-postgres.sh
echo -e "${GREEN}✅ Permissões configuradas${NC}"
echo ""

# 4. Testar backup
echo -e "${YELLOW}🧪 Deseja executar um teste de backup agora? (s/N):${NC} "
read -r response
if [[ "$response" =~ ^([sS])$ ]]; then
    echo ""
    /home/cabrazil/scripts/backup-postgres.sh
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Instalação concluída!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Configurar cron para backup automático:"
echo "   crontab -e"
echo "   Adicionar: 0 3 * * * /home/cabrazil/scripts/backup-postgres.sh"
echo ""
echo "2. Ver guia completo:"
echo "   cat /home/cabrazil/scripts/BACKUP_GUIDE.md"
echo ""
echo "3. Executar backup manual:"
echo "   /home/cabrazil/scripts/backup-postgres.sh"
echo ""
