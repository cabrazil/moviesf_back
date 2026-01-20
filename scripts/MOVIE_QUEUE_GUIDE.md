# 🎬 Guia: Sistema de Fila para Processamento de Filmes

## 📋 Visão Geral

Sistema para processar múltiplos filmes em lote no servidor VPS. Você prepara os comandos durante o dia e agenda para executar à noite.

**🐳 Execução via Docker:** O script detecta automaticamente o container do backend (Dokploy) e executa os comandos dentro dele usando `docker exec`.

---

## 🐳 Como Funciona com Docker

O backend roda em um **container Docker** gerenciado pelo Dokploy. O script:

1. ✅ Detecta automaticamente o container em execução
2. ✅ Executa cada comando dentro do container via `docker exec`
3. ✅ Usa as variáveis de ambiente já configuradas no container
4. ✅ Gera logs detalhados de cada processamento

### **Detecção Automática do Container:**

O script tenta encontrar o container por:
1. Nome contendo "**moviesfback**" (padrão do Dokploy)
2. Label do Docker Compose
3. Lista todos os containers se não encontrar

**Exemplo de nome:** `coolify-moviesfback-abc123`

### **Comando Executado:**

```bash
docker exec <CONTAINER_ID> npm run script:prod -- src/scripts/orchestrator.ts --title="..." --year=...
```

---

## 🚀 Instalação no Servidor VPS

### **1. Copiar scripts:**

```bash
# Do seu computador local
scp /home/cabrazil/newprojs/fav_movies/moviesf_back/scripts/process-movie-queue.sh vibesfilm@seu-servidor-ip:/home/vibesfilm/scripts/

scp /home/cabrazil/newprojs/fav_movies/moviesf_back/scripts/movies_queue_template.txt vibesfilm@seu-servidor-ip:/home/vibesfilm/queue/movies_queue.txt
```

### **2. No servidor VPS, dar permissões:**

```bash
chmod +x /home/vibesfilm/scripts/process-movie-queue.sh
chmod 644 /home/vibesfilm/queue/movies_queue.txt
```

### **3. Criar diretórios:**

```bash
mkdir -p /home/vibesfilm/queue/processed
mkdir -p /home/vibesfilm/logs/orchestrator
```

---

## 🔐 Variáveis de Ambiente

O script `orchestrator.ts` precisa de várias variáveis de ambiente para funcionar. Certifique-se de que o arquivo `.env.production` existe e contém:

### **Localização:**
```
/home/cabrazil/newprojs/fav_movies/moviesf_back/.env.production
```

### **Variáveis Necessárias:**

```bash
# Database
DATABASE_URL="postgresql://..."
BLOG_DATABASE_URL="postgresql://..."

# APIs de IA
GEMINI_API_KEY="..."
DEEPSEEK_API_KEY="..."
OPENAI_API_KEY="..."

# TMDB (The Movie Database)
TMDB_API_KEY="..."

# Outras configurações
NODE_ENV="production"
```

### **Verificar se o arquivo existe:**

```bash
ls -la /home/cabrazil/newprojs/fav_movies/moviesf_back/.env.production
```

### **Testar carregamento:**

```bash
source /home/cabrazil/newprojs/fav_movies/moviesf_back/.env.production
echo $TMDB_API_KEY
```

**⚠️ IMPORTANTE:** O script carrega automaticamente o `.env.production` antes de executar cada comando.

---

## 📝 Como Usar

### **Workflow Diário:**

#### **1. Durante o dia (preparar comandos):**

Edite o arquivo de fila no servidor VPS:

```bash
nano /home/vibesfilm/queue/movies_queue.txt
```

Adicione seus comandos:

```bash
src/scripts/orchestrator.ts --title="Steve" --year=2025 --journeyOptionFlowId=74 --analysisLens=15 --journeyValidation=15 --ai-provider=deepseek
src/scripts/orchestrator.ts --title="É Assim Que Acaba" --year=2024 --journeyOptionFlowId=7 --analysisLens=13 --journeyValidation=13 --ai-provider=deepseek
src/scripts/orchestrator.ts --title="O Segredo dos seus Olhos" --year=2009 --journeyOptionFlowId=98 --analysisLens=16 --journeyValidation=16 --ai-provider=deepseek
```

**Salvar:** `Ctrl+O`, `Enter`, `Ctrl+X`

#### **2. Agendar para executar à noite:**

**Opção A: Executar manualmente**

```bash
/home/vibesfilm/scripts/process-movie-queue.sh
```

**Opção B: Agendar no cron (recomendado)**

```bash
# Editar crontab do vibesfilm
crontab -e
```

Adicionar:

```cron
# Processar fila de filmes todo dia às 23h
0 23 * * * /home/vibesfilm/scripts/process-movie-queue.sh >> /home/vibesfilm/logs/orchestrator/cron.log 2>&1
```

---

## 💡 Exemplos de Uso

### **Exemplo 1: Processar 3 filmes**

```bash
# Editar fila
nano /home/vibesfilm/queue/movies_queue.txt
```

Conteúdo:

```
src/scripts/orchestrator.ts --title="Steve" --year=2025 --journeyOptionFlowId=74 --analysisLens=15 --journeyValidation=15 --ai-provider=deepseek
src/scripts/orchestrator.ts --title="Inception" --year=2010 --journeyOptionFlowId=72 --analysisLens=14 --journeyValidation=14 --ai-provider=deepseek
src/scripts/orchestrator.ts --title="Interstellar" --year=2014 --journeyOptionFlowId=80 --analysisLens=16 --journeyValidation=16 --ai-provider=gemini
```

```bash
# Executar
/home/vibesfilm/scripts/process-movie-queue.sh
```

### **Exemplo 2: Usar comentários para organizar**

```bash
# === FILMES DE DRAMA ===
src/scripts/orchestrator.ts --title="Steve" --year=2025 --journeyOptionFlowId=74 --analysisLens=15 --journeyValidation=15 --ai-provider=deepseek

# === FILMES DE FICÇÃO ===
src/scripts/orchestrator.ts --title="Inception" --year=2010 --journeyOptionFlowId=72 --analysisLens=14 --journeyValidation=14 --ai-provider=deepseek

# === PARA PROCESSAR DEPOIS ===
# src/scripts/orchestrator.ts --title="Matrix" --year=1999 --journeyOptionFlowId=70 --analysisLens=12 --journeyValidation=12 --ai-provider=deepseek
```

---

## 📊 O que o Script Faz

1. ✅ Lê o arquivo `/home/vibesfilm/queue/movies_queue.txt`
2. ✅ Processa cada comando em sequência
3. ✅ Gera log detalhado de cada processamento
4. ✅ Conta sucessos e erros
5. ✅ Faz backup da fila processada
6. ✅ Limpa o arquivo de fila (pronto para novos comandos)
7. ✅ Exibe resumo final

---

## 📂 Estrutura de Arquivos

```
/home/vibesfilm/
├── queue/
│   ├── movies_queue.txt              ✅ Fila atual (editar aqui)
│   └── processed/
│       ├── movies_queue_20260117_230000.txt
│       └── movies_queue_20260118_230000.txt
├── scripts/
│   └── process-movie-queue.sh        ✅ Script de processamento
└── logs/
    └── orchestrator/
        ├── batch_20260117_230000.log
        ├── batch_20260118_230000.log
        └── cron.log
```

---

## 📝 Formato dos Comandos

**Sempre use este formato exato:**

```bash
src/scripts/orchestrator.ts --title="Nome do Filme" --year=YYYY --journeyOptionFlowId=N --analysisLens=N --journeyValidation=N --ai-provider=PROVIDER
```

**Parâmetros:**
- `--title` - Nome do filme (entre aspas)
- `--year` - Ano do filme
- `--journeyOptionFlowId` - ID do fluxo de jornada
- `--analysisLens` - Lens de análise
- `--journeyValidation` - Validação de jornada
- `--ai-provider` - Provedor de IA (deepseek, gemini, etc.)

---

## 🔍 Monitoramento

### **Ver fila atual:**

```bash
cat /home/vibesfilm/queue/movies_queue.txt
```

### **Ver último log:**

```bash
# Último log de processamento
ls -lt /home/vibesfilm/logs/orchestrator/batch_*.log | head -1 | xargs cat
```

### **Ver resumo do último processamento:**

```bash
tail -20 /home/vibesfilm/logs/orchestrator/batch_*.log | tail -1
```

### **Contar filmes na fila:**

```bash
grep -v '^#' /home/vibesfilm/queue/movies_queue.txt | grep -v '^$' | wc -l
```

### **Ver filas processadas:**

```bash
ls -lh /home/vibesfilm/queue/processed/
```

---

## ⏰ Agendamento Recomendado

```cron
# Processar fila de filmes todo dia às 23h (11 PM)
0 23 * * * /home/vibesfilm/scripts/process-movie-queue.sh >> /home/vibesfilm/logs/orchestrator/cron.log 2>&1

# OU às 2h da manhã
0 2 * * * /home/vibesfilm/scripts/process-movie-queue.sh >> /home/vibesfilm/logs/orchestrator/cron.log 2>&1

# OU às 4h da manhã (após backup)
0 4 * * * /home/vibesfilm/scripts/process-movie-queue.sh >> /home/vibesfilm/logs/orchestrator/cron.log 2>&1
```

---

## 🛠️ Troubleshooting

### **Problema: "Arquivo de fila não encontrado"**

```bash
# Criar arquivo
touch /home/vibesfilm/queue/movies_queue.txt
chmod 644 /home/vibesfilm/queue/movies_queue.txt
```

### **Problema: "Arquivo de fila está vazio"**

Adicione comandos ao arquivo:

```bash
nano /home/vibesfilm/queue/movies_queue.txt
```

### **Problema: Erro ao processar filme**

Verifique o log detalhado:

```bash
cat /home/vibesfilm/logs/orchestrator/batch_YYYYMMDD_HHMMSS.log
```

### **Problema: Fila não foi limpa**

O script limpa automaticamente. Se quiser manter a fila, comente a linha no script:

```bash
# > "$QUEUE_FILE"
```

### **Problema: "Container não encontrado"**

Listar containers em execução:

```bash
docker ps
```

Se o container tiver nome diferente, ajuste no script:

```bash
nano /home/vibesfilm/scripts/process-movie-queue.sh
# Alterar linha: CONTAINER_NAME="moviesf_back"
```

Ou encontre o ID manualmente:

```bash
# Ver todos os containers
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}"

# Testar execução manual
docker exec <CONTAINER_ID> npm run script:prod -- src/scripts/orchestrator.ts --help
```

### **Problema: Permissão negada no Docker**

O usuário vibesfilm precisa estar no grupo docker:

```bash
# Como root
sudo usermod -aG docker vibesfilm

# Relogar ou executar
newgrp docker
```

### **Problema: Variáveis de ambiente não carregadas no container**

As variáveis devem estar configuradas no Dokploy. Verificar:

```bash
# Ver variáveis do container
docker exec <CONTAINER_ID> env | grep -E "TMDB|GEMINI|DEEPSEEK"
```

---

## 📋 Workflow Completo

### **Durante o dia:**

1. Prepare suas análises de filmes
2. Copie os comandos para `/home/vibesfilm/queue/movies_queue.txt`
3. Verifique a fila: `cat /home/vibesfilm/queue/movies_queue.txt`

### **À noite (automático via cron):**

1. Cron executa o script às 23h
2. Script processa todos os filmes da fila
3. Gera log detalhado
4. Faz backup da fila processada
5. Limpa a fila para o próximo dia

### **No dia seguinte:**

1. Verificar log: `tail -50 /home/vibesfilm/logs/orchestrator/batch_*.log`
2. Verificar sucessos/erros
3. Preparar nova fila

---

## ✅ Checklist de Instalação

- [ ] Script copiado para `/home/vibesfilm/scripts/`
- [ ] Template de fila copiado para `/home/vibesfilm/queue/`
- [ ] Permissões configuradas
- [ ] Diretórios criados
- [ ] Teste manual executado
- [ ] Cron configurado
- [ ] Primeiro processamento em lote testado

---

## 🎯 Vantagens

✅ **Processamento em lote** - Múltiplos filmes de uma vez
✅ **Agendamento automático** - Executa à noite via cron
✅ **Logs detalhados** - Rastreamento completo
✅ **Backup automático** - Histórico de filas processadas
✅ **Fácil de usar** - Apenas editar um arquivo de texto
✅ **Flexível** - Comentários e organização livre
