# 🗄️ Guia de Configuração - Backup Automático PostgreSQL

## 📋 Visão Geral

Sistema completo de backup automático para os bancos de dados:
- **Vibesfilm** (banco principal)
- **Blog** (banco do blog)

**Características:**
- ✅ Backup diário automático (via cron)
- ✅ Compressão com gzip
- ✅ Verificação de integridade
- ✅ Retenção de 7 dias
- ✅ Logs detalhados
- ✅ Script de restauração incluído

---

## 🚀 Instalação e Configuração

### **1. Dar Permissão de Execução aos Scripts**

```bash
chmod +x /home/cabrazil/scripts/backup-postgres.sh
chmod +x /home/cabrazil/scripts/restore-postgres.sh
```

### **2. Criar Diretórios Necessários**

```bash
mkdir -p /home/cabrazil/backups/postgres/{vibesfilm,blog}
mkdir -p /home/cabrazil/backups/logs
```

### **3. Testar Backup Manual**

Antes de configurar o cron, teste o script manualmente:

```bash
/home/cabrazil/scripts/backup-postgres.sh
```

**Resultado esperado:**
```
==========================================
🗄️  INICIANDO BACKUP AUTOMÁTICO
==========================================
...
✅ Backup de vibesfilm concluído
✅ Backup de blog concluído
==========================================
✅ BACKUP CONCLUÍDO
==========================================
```

### **4. Configurar Cron para Backup Automático**

Editar crontab:

```bash
crontab -e
```

Adicionar a seguinte linha para executar **todo dia às 3h da manhã**:

```cron
# Backup automático PostgreSQL - Vibesfilm + Blog
0 3 * * * /home/cabrazil/scripts/backup-postgres.sh >> /home/cabrazil/backups/logs/cron.log 2>&1
```

**Outras opções de horário:**

```cron
# Todo dia às 2h da manhã
0 2 * * * /home/cabrazil/scripts/backup-postgres.sh

# Todo dia às 4h da manhã
0 4 * * * /home/cabrazil/scripts/backup-postgres.sh

# Duas vezes por dia (3h e 15h)
0 3,15 * * * /home/cabrazil/scripts/backup-postgres.sh

# A cada 6 horas
0 */6 * * * /home/cabrazil/scripts/backup-postgres.sh
```

### **5. Verificar se o Cron Está Ativo**

```bash
# Verificar status do cron
sudo systemctl status cron

# Ver crontab configurado
crontab -l

# Ver logs do cron
tail -f /var/log/syslog | grep CRON
```

---

## 📊 Estrutura de Diretórios

```
/home/cabrazil/
├── backups/
│   ├── postgres/
│   │   ├── vibesfilm/
│   │   │   ├── vibesfilm_backup_20260117_030000.sql.gz
│   │   │   ├── vibesfilm_backup_20260118_030000.sql.gz
│   │   │   └── ...
│   │   └── blog/
│   │       ├── blog_backup_20260117_030000.sql.gz
│   │       ├── blog_backup_20260118_030000.sql.gz
│   │       └── ...
│   └── logs/
│       ├── backup_2026-01-17.log
│       ├── backup_2026-01-18.log
│       ├── cron.log
│       └── ...
└── scripts/
    ├── backup-postgres.sh
    └── restore-postgres.sh
```

---

## 🔄 Como Restaurar um Backup

### **Listar Backups Disponíveis**

```bash
# Listar backups do Vibesfilm
/home/cabrazil/scripts/restore-postgres.sh vibesfilm

# Listar backups do Blog
/home/cabrazil/scripts/restore-postgres.sh blog
```

### **Restaurar Backup Específico**

```bash
# Restaurar Vibesfilm
/home/cabrazil/scripts/restore-postgres.sh vibesfilm /home/cabrazil/backups/postgres/vibesfilm/vibesfilm_backup_20260117_030000.sql.gz

# Restaurar Blog
/home/cabrazil/scripts/restore-postgres.sh blog /home/cabrazil/backups/postgres/blog/blog_backup_20260117_030000.sql.gz
```

**⚠️ ATENÇÃO:** O script irá:
1. Verificar integridade do backup
2. Criar um backup de segurança antes de restaurar
3. Pedir confirmação (digite "SIM")
4. Restaurar o backup

---

## 📝 Monitoramento e Logs

### **Ver Log do Último Backup**

```bash
# Log mais recente
ls -lt /home/cabrazil/backups/logs/backup_*.log | head -1 | xargs cat

# Log de hoje
cat /home/cabrazil/backups/logs/backup_$(date +%Y-%m-%d).log

# Últimas 50 linhas do log do cron
tail -50 /home/cabrazil/backups/logs/cron.log
```

### **Verificar Espaço em Disco**

```bash
# Espaço usado pelos backups
du -sh /home/cabrazil/backups/postgres

# Detalhes por banco
du -sh /home/cabrazil/backups/postgres/*

# Listar todos os backups com tamanho
find /home/cabrazil/backups/postgres -name "*.sql.gz" -exec du -h {} \; | sort -h
```

### **Contar Backups**

```bash
# Total de backups
find /home/cabrazil/backups/postgres -name "*.sql.gz" | wc -l

# Backups por banco
echo "Vibesfilm: $(find /home/cabrazil/backups/postgres/vibesfilm -name "*.sql.gz" | wc -l)"
echo "Blog: $(find /home/cabrazil/backups/postgres/blog -name "*.sql.gz" | wc -l)"
```

---

## 🔧 Configurações Avançadas

### **Alterar Retenção de Backups**

Editar o script `/home/cabrazil/scripts/backup-postgres.sh`:

```bash
# Linha 13 - Alterar de 7 para o número desejado
RETENTION_DAYS=14  # Manter backups por 14 dias
```

### **Adicionar Notificações (Telegram)**

1. Criar bot no Telegram e obter TOKEN
2. Obter CHAT_ID
3. Descomentar e configurar no script (linhas 75-80):

```bash
send_notification() {
    local STATUS=$1
    local MESSAGE=$2
    
    curl -X POST "https://api.telegram.org/bot<SEU_TOKEN>/sendMessage" \
        -d "chat_id=<SEU_CHAT_ID>" \
        -d "text=🗄️ Backup PostgreSQL - $STATUS: $MESSAGE"
}
```

### **Backup para Armazenamento Externo (S3, Google Drive, etc.)**

Adicionar ao final do script `backup-postgres.sh`:

```bash
# Exemplo: Upload para S3
aws s3 sync /home/cabrazil/backups/postgres s3://seu-bucket/backups/postgres/

# Exemplo: Upload para Google Drive (usando rclone)
rclone sync /home/cabrazil/backups/postgres gdrive:backups/postgres/
```

---

## 🧪 Testes e Validação

### **Teste 1: Backup Manual**

```bash
/home/cabrazil/scripts/backup-postgres.sh
```

✅ Deve criar backups em `/home/cabrazil/backups/postgres/`

### **Teste 2: Verificar Integridade**

```bash
# Pegar último backup
LAST_BACKUP=$(find /home/cabrazil/backups/postgres/vibesfilm -name "*.sql.gz" -type f | sort | tail -1)

# Testar integridade
gunzip -t "$LAST_BACKUP" && echo "✅ Backup íntegro" || echo "❌ Backup corrompido"
```

### **Teste 3: Restauração em Ambiente de Teste**

```bash
# Criar banco de teste
createdb vibesfilm_test

# Restaurar backup
gunzip -c /path/to/backup.sql.gz | psql postgresql://user:pass@localhost/vibesfilm_test

# Verificar dados
psql vibesfilm_test -c "SELECT COUNT(*) FROM \"Movie\";"
```

---

## 🚨 Troubleshooting

### **Problema: Cron não está executando**

```bash
# Verificar se cron está rodando
sudo systemctl status cron

# Reiniciar cron
sudo systemctl restart cron

# Ver logs do cron
grep CRON /var/log/syslog
```

### **Problema: Permissão negada**

```bash
# Dar permissão de execução
chmod +x /home/cabrazil/scripts/backup-postgres.sh
chmod +x /home/cabrazil/scripts/restore-postgres.sh

# Verificar permissões dos diretórios
ls -la /home/cabrazil/backups/
```

### **Problema: Espaço em disco cheio**

```bash
# Verificar espaço
df -h

# Limpar backups antigos manualmente
find /home/cabrazil/backups/postgres -name "*.sql.gz" -mtime +30 -delete

# Reduzir RETENTION_DAYS no script
```

### **Problema: DATABASE_URL não encontrada**

Verificar se `.env.production` existe e contém as variáveis:

```bash
cat /home/cabrazil/newprojs/fav_movies/moviesf_back/.env.production | grep DATABASE_URL
```

---

## 📞 Comandos Úteis

```bash
# Executar backup manualmente
/home/cabrazil/scripts/backup-postgres.sh

# Listar backups do Vibesfilm
/home/cabrazil/scripts/restore-postgres.sh vibesfilm

# Listar backups do Blog
/home/cabrazil/scripts/restore-postgres.sh blog

# Ver log de hoje
cat /home/cabrazil/backups/logs/backup_$(date +%Y-%m-%d).log

# Limpar logs antigos (mais de 30 dias)
find /home/cabrazil/backups/logs -name "*.log" -mtime +30 -delete

# Verificar tamanho total dos backups
du -sh /home/cabrazil/backups/postgres
```

---

## ✅ Checklist de Configuração

- [ ] Scripts criados e com permissão de execução
- [ ] Diretórios de backup criados
- [ ] Teste manual executado com sucesso
- [ ] Cron configurado
- [ ] Primeiro backup automático executado
- [ ] Logs verificados
- [ ] Teste de restauração realizado
- [ ] Monitoramento configurado (opcional)
- [ ] Notificações configuradas (opcional)

---

## 📚 Referências

- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Cron Tutorial](https://crontab.guru/)
- [Linux Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
