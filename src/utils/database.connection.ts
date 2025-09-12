/**
 * 🗄️ Utilitário de Conexão com Banco de Dados
 * 
 * Gerencia conexões com PostgreSQL de forma eficiente e segura
 */

import { Pool, PoolClient } from 'pg';
import { DatabaseConfig } from '../types/movieHero.types';

// ===== CONFIGURAÇÃO =====

const databaseConfig: DatabaseConfig = {
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  ssl: {
    rejectUnauthorized: false
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
      this.pool = new Pool(databaseConfig);
      
      // Configurar eventos do pool
      this.pool.on('error', (err) => {
        console.error('❌ Erro inesperado no pool de conexões:', err);
      });

      this.pool.on('connect', () => {
        console.log('✅ Nova conexão estabelecida com o banco');
      });

      this.pool.on('remove', () => {
        console.log('🔌 Conexão removida do pool');
      });
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
        console.log(`🔍 Executando consulta (tentativa ${attempt}/${retries})`);
        const result = await pool.query(text, params);
        console.log(`✅ Consulta executada com sucesso: ${result.rows.length} registros`);
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
