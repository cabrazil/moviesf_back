/**
 * 🗄️ Utilitário de Conexão com Banco de Dados
 * 
 * Gerencia conexões com PostgreSQL de forma eficiente e segura
 */

import { Pool, PoolClient } from 'pg';
import { DatabaseConfig } from '../types/movieHero.types';
import { loadEnvironment } from '../config/env-loader';

// Carregar variáveis de ambiente ANTES de qualquer uso
loadEnvironment();

// ===== CONFIGURAÇÃO =====

// Função para obter connection string (avaliada quando necessário)
function getConnectionString(): string {
  const directUrl = process.env.DIRECT_URL;
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!directUrl && !databaseUrl) {
    console.error('❌ DATABASE_URL ou DIRECT_URL não configurados!');
    throw new Error('Variáveis de ambiente do banco de dados não configuradas');
  }
  
  const connectionString = directUrl || databaseUrl || '';
  
  // Log de debug (apenas em desenvolvimento)
  if (process.env.NODE_ENV !== 'production') {
    const host = connectionString.match(/@([^:]+)/)?.[1];
    console.log(`✅ Database configurado - Host: ${host || 'não encontrado'}`);
  }
  
  return connectionString;
}

import { getSSLConfig } from './ssl-config';

const databaseConfig: DatabaseConfig = {
  get connectionString() {
    return getConnectionString();
  },
  get ssl() {
    return getSSLConfig(getConnectionString());
  }
};

// ===== SINGLETON POOL =====

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Obtém ou cria o pool de conexões
   */
  public getPool(): Pool {
    if (!this.pool) {
      // Garantir que variáveis de ambiente estão carregadas
      const connectionString = getConnectionString();
      
      if (!connectionString) {
        throw new Error('DATABASE_URL ou DIRECT_URL não configurados');
      }
      
      console.log(`🔌 Criando pool de conexões com host: ${connectionString.match(/@([^:]+)/)?.[1] || 'desconhecido'}`);
      
      this.pool = new Pool({
        connectionString: connectionString,
        ssl: getSSLConfig(connectionString),
        // Otimizações de performance
        max: 10,                    // Máximo de conexões no pool (reduzido)
        min: 2,                     // Mínimo de conexões no pool
        idleTimeoutMillis: 60000,   // 60s para fechar conexões idle (aumentado)
        connectionTimeoutMillis: 5000, // 5s timeout para conexão (aumentado)
        // Desabilitar logs em produção
        ...(process.env.NODE_ENV === 'production' ? {} : {
          // Logs apenas em desenvolvimento
        })
      });
      
      // Configurar eventos do pool (apenas em desenvolvimento)
      if (process.env.NODE_ENV !== 'production') {
        this.pool.on('error', (err) => {
          console.error('❌ Erro inesperado no pool de conexões:', err);
        });

        this.pool.on('connect', () => {
          // Log apenas quando pool está vazio (primeira conexão)
          if (this.pool && this.pool.totalCount === 1) {
            console.log('✅ Pool de conexões inicializado');
          }
        });

        this.pool.on('remove', () => {
          // Log apenas quando pool está sendo esvaziado
          if (this.pool && this.pool.totalCount === 0) {
            console.log('🔌 Pool de conexões esvaziado');
          }
        });
      }
    }

    return this.pool;
  }

  /**
   * Executa uma consulta com retry automático
   */
  public async query<T = any>(
    text: string, 
    params?: any[], 
    retries: number = 3
  ): Promise<{ rows: T[] }> {
    const pool = this.getPool();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Log apenas para queries importantes (não para todas)
        if (process.env.NODE_ENV !== 'production' && attempt === 1 && text.includes('SELECT m.id, m.title')) {
          console.log(`🔍 Executando consulta principal (tentativa ${attempt}/${retries})`);
        }
        
        const result = await pool.query(text, params);
        
        // Log apenas para queries importantes
        if (process.env.NODE_ENV !== 'production' && text.includes('SELECT m.id, m.title')) {
          console.log(`✅ Consulta principal executada: ${result.rows.length} registros`);
        }
        return result;
      } catch (error) {
        console.error(`❌ Erro na consulta (tentativa ${attempt}/${retries}):`, error);
        
        if (attempt === retries) {
          throw new Error(`Falha ao executar consulta após ${retries} tentativas: ${error}`);
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('Número máximo de tentativas excedido');
  }

  /**
   * Executa múltiplas consultas em paralelo
   */
  public async queryParallel<T = any>(
    queries: Array<{ text: string; params?: any[] }>
  ): Promise<Array<{ rows: T[] }>> {
    console.log(`🚀 Executando ${queries.length} consultas em paralelo`);
    
    const promises = queries.map(({ text, params }) => 
      this.query<T>(text, params)
    );

    try {
      const results = await Promise.all(promises);
      console.log(`✅ Todas as ${queries.length} consultas executadas com sucesso`);
      return results;
    } catch (error) {
      console.error('❌ Erro ao executar consultas em paralelo:', error);
      throw error;
    }
  }

  /**
   * Obtém uma conexão do pool para transações
   */
  public async getClient(): Promise<PoolClient> {
    const pool = this.getPool();
    return await pool.connect();
  }

  /**
   * Fecha o pool de conexões
   */
  public async close(): Promise<void> {
    if (this.pool) {
      console.log('🔌 Fechando pool de conexões...');
      await this.pool.end();
      this.pool = null;
      console.log('✅ Pool de conexões fechado');
    }
  }

  /**
   * Verifica se o pool está ativo
   */
  public isConnected(): boolean {
    return this.pool !== null && !this.pool.ended;
  }

  /**
   * Obtém estatísticas do pool
   */
  public getPoolStats() {
    if (!this.pool) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

// ===== EXPORT =====

export const dbConnection = DatabaseConnection.getInstance();
export default dbConnection;
