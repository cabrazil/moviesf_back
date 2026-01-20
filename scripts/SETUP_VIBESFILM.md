# 🗄️ Setup de Backup PostgreSQL - Usuário vibesfilm

## 📋 Estrutura no Servidor VPS

```
/home/vibesfilm/
├── backups/
│   ├── postgres/
│   │   ├── vibesfilm/     # Backups do banco Vibesfilm
│   │   └── blog/          # Backups do banco Blog
│   └── logs/              # Logs dos backups
├── scripts/
│   ├── backup-postgres.sh     # Script de backup
│   ├── restore-postgres.sh    # Script de restauração
│   └── BACKUP_GUIDE.md        # Guia completo
└── ... (outros arquivos)
```

---

## 🚀 Instalação Rápida (3 Passos)

### **1. No seu computador local, fazer commit e push:**

```bash
cd /home/cabrazil/newprojs/fav_movies/moviesf_back
git add scripts/
git commit -m "feat: adiciona sistema de backup PostgreSQL para usuário vibesfilm"
git push origin main
```

### **2. No servidor VPS, fazer pull do projeto:**

```bash
# SSH no servidor como vibesfilm
ssh vibesfilm@seu-servidor

# Ir para o diretório do projeto (se existir)
cd /path/to/moviesf_back
git pull origin main

# OU se não tiver o projeto clonado, clonar:
cd /home/vibesfilm
git clone https://github.com/cabrazil/moviesf_back.git
```

### **3. No servidor VPS, executar setup como ROOT:**

```bash
# Voltar para root
exit  # ou Ctrl+D

# Executar script de setup
sudo bash /home/vibesfilm/moviesf_back/scripts/setup-backup-vibesfilm.sh
```

**OU se preferir fazer manualmente:**

```bash
# Como root
sudo su

# Copiar e executar
cd /tmp
wget https://raw.githubusercontent.com/cabrazil/moviesf_back/main/scripts/setup-backup-vibesfilm.sh
chmod +x setup-backup-vibesfilm.sh
./setup-backup-vibesfilm.sh
```

---

## 📝 Instalação Manual (Passo a Passo)

Se preferir fazer manualmente, execute como **root**:

```bash
# 1. Criar diretórios
mkdir -p /home/vibesfilm/backups/postgres/{vibesfilm,blog}
mkdir -p /home/vibesfilm/backups/logs
mkdir -p /home/vibesfilm/scripts

# 2. Ajustar permissões
chown -R vibesfilm:vibesfilm /home/vibesfilm/backups
chown -R vibesfilm:vibesfilm /home/vibesfilm/scripts
chmod 755 /home/vibesfilm/backups
chmod 755 /home/vibesfilm/scripts

# 3. Copiar scripts (ajuste o caminho se necessário)
SCRIPT_SOURCE="/home/cabrazil/newprojs/fav_movies/moviesf_back/scripts"
cp $SCRIPT_SOURCE/backup-postgres.sh /home/vibesfilm/scripts/
cp $SCRIPT_SOURCE/restore-postgres.sh /home/vibesfilm/scripts/
cp $SCRIPT_SOURCE/BACKUP_GUIDE.md /home/vibesfilm/scripts/

# 4. Ajustar caminhos nos scripts
sed -i 's|/home/cabrazil|/home/vibesfilm|g' /home/vibesfilm/scripts/backup-postgres.sh
sed -i 's|/home/cabrazil|/home/vibesfilm|g' /home/vibesfilm/scripts/restore-postgres.sh

# 5. Ajustar permissões dos scripts
chown vibesfilm:vibesfilm /home/vibesfilm/scripts/*
chmod +x /home/vibesfilm/scripts/backup-postgres.sh
chmod +x /home/vibesfilm/scripts/restore-postgres.sh

# 6. Configurar cron para usuário vibesfilm
crontab -u vibesfilm -e
```

Adicionar esta linha no crontab:

```cron
# Backup automático PostgreSQL - Vibesfilm + Blog (todo dia às 3h da manhã)
0 3 * * * /home/vibesfilm/scripts/backup-postgres.sh >> /home/vibesfilm/backups/logs/cron.log 2>&1
```

---

## ✅ Verificação

### **1. Verificar estrutura criada:**

```bash
ls -la /home/vibesfilm/scripts/
ls -la /home/vibesfilm/backups/
```

### **2. Verificar cron configurado:**

```bash
crontab -u vibesfilm -l
```

### **3. Testar backup manual:**

```bash
su - vibesfilm -c '/home/vibesfilm/scripts/backup-postgres.sh'
```

### **4. Ver log do backup:**

```bash
cat /home/vibesfilm/backups/logs/backup_$(date +%Y-%m-%d).log
```

### **5. Listar backups criados:**

```bash
ls -lh /home/vibesfilm/backups/postgres/vibesfilm/
ls -lh /home/vibesfilm/backups/postgres/blog/
```

---

## 🔧 Comandos Úteis

```bash
# Ver cron do usuário vibesfilm
crontab -u vibesfilm -l

# Executar backup como vibesfilm
su - vibesfilm -c '/home/vibesfilm/scripts/backup-postgres.sh'

# Listar backups disponíveis
su - vibesfilm -c '/home/vibesfilm/scripts/restore-postgres.sh vibesfilm'
su - vibesfilm -c '/home/vibesfilm/scripts/restore-postgres.sh blog'

# Ver espaço usado pelos backups
du -sh /home/vibesfilm/backups/postgres

# Ver último log
tail -50 /home/vibesfilm/backups/logs/backup_$(date +%Y-%m-%d).log

# Ver log do cron
tail -50 /home/vibesfilm/backups/logs/cron.log
```

---

## 🚨 Troubleshooting

### **Problema: Permissão negada**

```bash
# Ajustar permissões
sudo chown -R vibesfilm:vibesfilm /home/vibesfilm/backups
sudo chown -R vibesfilm:vibesfilm /home/vibesfilm/scripts
sudo chmod +x /home/vibesfilm/scripts/*.sh
```

### **Problema: .env.production não encontrado**

O script busca em: `/home/cabrazil/newprojs/fav_movies/moviesf_back/.env.production`

Se estiver em outro local, edite o script:

```bash
sudo nano /home/vibesfilm/scripts/backup-postgres.sh
# Alterar linha 52 para o caminho correto
```

### **Problema: Cron não está executando**

```bash
# Verificar se cron está rodando
sudo systemctl status cron

# Ver logs do sistema
sudo grep CRON /var/log/syslog | tail -20

# Reiniciar cron
sudo systemctl restart cron
```

---

## 📊 Estrutura Final

Após a instalação, você terá:

```
/home/vibesfilm/
├── backups/
│   ├── postgres/
│   │   ├── vibesfilm/
│   │   │   └── vibesfilm_backup_YYYYMMDD_HHMMSS.sql.gz
│   │   └── blog/
│   │       └── blog_backup_YYYYMMDD_HHMMSS.sql.gz
│   └── logs/
│       ├── backup_YYYY-MM-DD.log
│       └── cron.log
└── scripts/
    ├── backup-postgres.sh
    ├── restore-postgres.sh
    └── BACKUP_GUIDE.md
```

---

## ⏰ Agendamento

**Cron configurado para usuário vibesfilm:**

```
0 3 * * * /home/vibesfilm/scripts/backup-postgres.sh >> /home/vibesfilm/backups/logs/cron.log 2>&1
```

**Execução:** Todo dia às 3h da manhã
**Retenção:** 7 dias (configurável no script)
**Logs:** Salvos em `/home/vibesfilm/backups/logs/`
