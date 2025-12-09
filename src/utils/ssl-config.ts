/**
 * Utilitário para determinar configuração SSL baseado na URL de conexão
 * SSL é necessário apenas para Supabase, não para VPS local
 */

export function getSSLConfig(connectionString?: string): boolean | { rejectUnauthorized: false } {
  if (!connectionString) return false;
  
  // Se a URL contém "supabase", usar SSL
  if (connectionString.includes('supabase')) {
    return { rejectUnauthorized: false };
  }
  
  // Para VPS local (IP ou localhost), não usar SSL
  return false;
}

