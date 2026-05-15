#!/bin/bash
# =============================================================
# sync_obsidian.sh — Sync de notas Obsidian do VPS para local
# Executar via cron: 0 8 * * * /path/to/sync_obsidian.sh
# =============================================================

# --- CONFIGURAÇÕES (ajuste conforme seu ambiente) ---
VPS_USER="deploy"                                        # usuário SSH no VPS
VPS_HOST="178.156.178.145"                               # IP do VPS
VPS_EXPORT_PATH="/home/deploy/obsidian-export"           # OBSIDIAN_EXPORT_PATH no .env do VPS
LOCAL_VAULT_PATH="$HOME/Obsidian/VibesFilm"              # pasta destino no seu vault local

LOG_FILE="$HOME/.sync_obsidian.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# --- EXECUÇÃO ---
echo "[$TIMESTAMP] Iniciando sync Obsidian..." | tee -a "$LOG_FILE"

# Verificar conectividade com o VPS
if ! ssh -o ConnectTimeout=5 -q "$VPS_USER@$VPS_HOST" exit 2>/dev/null; then
  echo "[$TIMESTAMP] ❌ Erro: VPS inacessível ($VPS_HOST). Abortando." | tee -a "$LOG_FILE"
  exit 1
fi

# Sincronizar Filmes
rsync -avz --update \
  "$VPS_USER@$VPS_HOST:$VPS_EXPORT_PATH/Filmes/" \
  "$LOCAL_VAULT_PATH/Filmes/" \
  >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
  COUNT=$(rsync -avz --dry-run --update \
    "$VPS_USER@$VPS_HOST:$VPS_EXPORT_PATH/Filmes/" \
    "$LOCAL_VAULT_PATH/Filmes/" 2>/dev/null | grep '\.md$' | wc -l)
  echo "[$TIMESTAMP] ✅ Sync concluído. Arquivos transferidos: $COUNT" | tee -a "$LOG_FILE"
else
  echo "[$TIMESTAMP] ❌ Erro durante o sync. Verifique $LOG_FILE." | tee -a "$LOG_FILE"
  exit 1
fi

echo "[$TIMESTAMP] ---" >> "$LOG_FILE"
