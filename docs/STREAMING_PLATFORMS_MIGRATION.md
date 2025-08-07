# Migração de Streaming Platforms

## 📋 Visão Geral

Este documento descreve a migração completa do sistema de streaming platforms de uma estrutura simples (`Movie.streamingPlatforms: String[]`) para uma estrutura relacional robusta com access types específicos.

## 🏗️ Nova Estrutura

### Enums Criados

#### `AccessType`
```prisma
enum AccessType {
  INCLUDED_WITH_SUBSCRIPTION  // Netflix, Disney+, HBO Max
  RENTAL                      // Aluguel (Google Play, Apple TV)
  PURCHASE                    // Compra (Google Play, Apple TV)
  FREE_WITH_ADS              // YouTube, Pluto TV
  HYBRID_OR_UNKNOWN          // Plataformas híbridas
  OTHER                       // Outros casos
}
```

#### `PlatformCategory`
```prisma
enum PlatformCategory {
  SUBSCRIPTION_PRIMARY        // Netflix, Disney+, HBO Max
  RENTAL_PURCHASE_PRIMARY    // Google Play, Apple TV, Microsoft Store
  FREE_PRIMARY               // YouTube, Pluto TV
  HYBRID                     // Prime Video (assinatura + aluguel)
}
```

### Models Criados

#### `StreamingPlatform`
```prisma
model StreamingPlatform {
  id        Int              @id @default(autoincrement())
  name      String           @unique @db.VarChar(255)
  category  PlatformCategory
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
  movies    MovieStreamingPlatform[]
}
```

#### `MovieStreamingPlatform`
```prisma
model MovieStreamingPlatform {
  movieId             String           @db.Uuid
  streamingPlatformId Int
  accessType          AccessType
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  movie               Movie            @relation(fields: [movieId], references: [id])
  streamingPlatform   StreamingPlatform @relation(fields: [streamingPlatformId], references: [id])
  @@id([movieId, streamingPlatformId, accessType])
  @@index([movieId])
  @@index([streamingPlatformId])
  @@index([accessType])
}
```

## 📊 Resultados da Migração

### Estatísticas Finais
- **Total de filmes processados:** 314
- **Filmes com providers:** 289 (92% taxa de sucesso)
- **Total de relações criadas:** 1,743
- **Novos providers adicionados:** 8

### Distribuição de Access Types
- **PURCHASE:** 559 relações (36.63%)
- **RENTAL:** 531 relações (34.80%)
- **INCLUDED_WITH_SUBSCRIPTION:** 436 relações (28.57%)

### Plataformas Principais
- **Google Play:** 182 PURCHASE + 171 RENTAL
- **Apple TV (Loja):** 192 PURCHASE + 179 RENTAL
- **Netflix:** 436 INCLUDED_WITH_SUBSCRIPTION
- **Prime Video:** Misto (assinatura + aluguel)

## 🔧 Scripts de Migração

### 1. Backup e Preparação
```sql
-- Backup da tabela Movie
CREATE TABLE "Movie_backup_06082025" AS SELECT * FROM "Movie";

-- População inicial de plataformas
INSERT INTO "StreamingPlatform" (name, category, "createdAt", "updatedAt") VALUES
('Netflix', 'SUBSCRIPTION_PRIMARY', NOW(), NOW()),
('Prime Video', 'HYBRID', NOW(), NOW()),
-- ... outras plataformas
```

### 2. Migração de Dados
```typescript
// migrateStreamingPlatforms.ts
// Migra dados do campo streamingPlatforms[] para MovieStreamingPlatform
```

### 3. Enriquecimento via TMDB
```typescript
// enrichStreamingPlatformsTMDB.ts
// Busca dados adicionais de streaming via API TMDB
```

## 🎯 Mapeamento TMDB → Sistema

### Providers de Compra/Aluguel
```typescript
'Google Play Movies': { name: 'Google Play' }, // accessType removido - usar fallback
'Apple TV': { name: 'Apple TV (Loja)' }, // accessType removido - usar fallback
'Microsoft Store': { name: 'Microsoft Store' }, // accessType removido - usar fallback
```

### Providers de Assinatura
```typescript
'Netflix': { name: 'Netflix', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
'Disney Plus': { name: 'Disney+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
'HBO Max': { name: 'HBO Max', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
```

### Providers Gratuitos
```typescript
'YouTube': { name: 'YouTube (Gratuito)', accessType: 'FREE_WITH_ADS' },
'Pluto TV': { name: 'Pluto TV', accessType: 'FREE_WITH_ADS' },
```

## 🆕 Novos Providers Adicionados

### Amazon Channels (Normalizados)
- **Sony One Amazon Channel** → `Sony One`
- **Filmelier Plus Amazon Channel** → `Filmelier+`
- **Apple TV Plus Amazon Channel** → `Apple TV+`

### Plataformas Independentes
- **Plex** / **Plex Channel** → `Plex`
- **Univer Video** → `Univer Video`
- **Belas Artes à La Carte** → `Belas Artes à La Carte`
- **GOSPEL PLAY** → `GOSPEL PLAY`

## 🔄 Função de Mapeamento

```typescript
function getAccessTypeFromTMDB(providerType: 'flatrate' | 'buy' | 'rent' | 'free', providerName: string): string {
  // Primeiro, verificar mapeamento específico
  const mapped = TMDB_PROVIDER_MAPPING[providerName];
  if (mapped && mapped.accessType) {
    return mapped.accessType; // Usar accessType explícito se definido
  }

  // Fallback baseado no tipo
  switch (providerType) {
    case 'flatrate': return 'INCLUDED_WITH_SUBSCRIPTION';
    case 'buy': return 'PURCHASE';
    case 'rent': return 'RENTAL';
    case 'free': return 'FREE_WITH_ADS';
    default: return 'HYBRID_OR_UNKNOWN';
  }
}
```

## 📈 Benefícios da Nova Estrutura

### 1. Access Types Específicos
- **PURCHASE:** Filmes disponíveis para compra
- **RENTAL:** Filmes disponíveis para aluguel
- **INCLUDED_WITH_SUBSCRIPTION:** Filmes incluídos na assinatura
- **FREE_WITH_ADS:** Filmes gratuitos com anúncios

### 2. Flexibilidade
- Um filme pode estar disponível em múltiplas plataformas
- Cada plataforma pode ter diferentes access types
- Fácil expansão para novas plataformas

### 3. Performance
- Índices otimizados para consultas
- Relacionamentos eficientes
- Consultas mais rápidas

## 🚀 Próximos Passos

### 1. Atualizar Scripts de Adição de Filmes
- Modificar scripts para usar a nova estrutura
- Remover referências ao campo `streamingPlatforms[]`

### 2. Atualizar Frontend
- Implementar filtros por access type
- Exibir informações de streaming corretamente

### 3. Limpeza Final
- Remover campo `streamingPlatforms[]` do schema
- Atualizar documentação da API

## 📝 Notas Importantes

### Rate Limiting
- TMDB API: 4 requests/second
- Implementado delay de 250ms entre requests

### Tratamento de Erros
- Providers não mapeados são registrados
- Relações duplicadas são tratadas com `upsert`
- Logs detalhados para debugging

### Validação de Dados
- Verificação de TMDB ID antes do processamento
- Filtros para dados inconsistentes
- Backup antes de operações críticas

---

**Data da Migração:** 06/08/2025  
**Versão:** 1.0  
**Status:** ✅ Concluída com Sucesso 