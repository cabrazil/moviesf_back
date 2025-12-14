# Dockerfile para Backend - MoviesF Backend
FROM node:18-alpine

# Instalar dependências do sistema necessárias para Prisma
RUN apk add --no-cache openssl libc6-compat

# Criar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm ci && npm cache clean --force

# Copiar código fonte
COPY . .

# Gerar Prisma Client e fazer build
RUN npx prisma generate && npx prisma generate --schema=./prisma/blog/schema.prisma && npm run build

# Remover devDependencies após build (opcional, para reduzir tamanho)
RUN npm prune --production

# Expor porta
EXPOSE 3333



