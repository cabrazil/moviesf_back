import { writeFile, appendFile, mkdir } from 'fs/promises';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  movieTitle?: string;
  movieYear?: number;
  step?: string;
}

export class CurationLogger {
  private logPath: string;
  private sessionId: string;
  
  constructor(logPath: string = '../logs') {
    this.logPath = logPath;
    this.sessionId = this.generateSessionId();
    this.ensureLogDirectory();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await mkdir(path.dirname(this.logPath), { recursive: true });
    } catch (error) {
      // Diretório já existe ou erro de permissão
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.category}]`;
    const movieInfo = entry.movieTitle ? ` [${entry.movieTitle}${entry.movieYear ? ` (${entry.movieYear})` : ''}]` : '';
    const stepInfo = entry.step ? ` [${entry.step}]` : '';
    
    let message = `${prefix}${movieInfo}${stepInfo} ${entry.message}`;
    
    if (entry.data) {
      message += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }
    
    return message;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    const logFileName = `curation-${new Date().toISOString().split('T')[0]}.log`;
    const fullPath = path.join(this.logPath, logFileName);
    
    try {
      const formattedEntry = this.formatLogEntry(entry) + '\n';
      await appendFile(fullPath, formattedEntry);
    } catch (error) {
      console.error('Erro ao escrever log:', error);
    }
  }

  async logMovieProcessing(
    level: LogLevel,
    step: string,
    message: string,
    movieTitle?: string,
    movieYear?: number,
    data?: any
  ): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category: 'MOVIE_PROCESSING',
      message,
      data,
      movieTitle,
      movieYear,
      step
    };

    await this.writeLog(entry);
    
    // Também log no console para debugging
    const consoleMessage = `[${step}] ${movieTitle ? `${movieTitle}${movieYear ? ` (${movieYear})` : ''}: ` : ''}${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`🔍 ${consoleMessage}`);
        break;
      case LogLevel.INFO:
        console.info(`ℹ️ ${consoleMessage}`);
        break;
      case LogLevel.WARN:
        console.warn(`⚠️ ${consoleMessage}`);
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${consoleMessage}`);
        break;
    }
  }

  async logSentimentAnalysis(
    level: LogLevel,
    message: string,
    movieTitle: string,
    movieYear: number,
    analysisData?: any
  ): Promise<void> {
    await this.logMovieProcessing(
      level,
      'SENTIMENT_ANALYSIS',
      message,
      movieTitle,
      movieYear,
      analysisData
    );
  }

  async logTmdbSearch(
    level: LogLevel,
    message: string,
    searchTitle: string,
    searchYear?: number,
    searchData?: any
  ): Promise<void> {
    await this.logMovieProcessing(
      level,
      'TMDB_SEARCH',
      message,
      searchTitle,
      searchYear,
      searchData
    );
  }

  async logDatabaseOperation(
    level: LogLevel,
    operation: string,
    message: string,
    data?: any
  ): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category: 'DATABASE',
      message: `${operation}: ${message}`,
      data,
      step: 'DATABASE_OPERATION'
    };

    await this.writeLog(entry);
  }

  async logOpenAIRequest(
    level: LogLevel,
    message: string,
    movieTitle: string,
    movieYear: number,
    requestData?: any
  ): Promise<void> {
    await this.logMovieProcessing(
      level,
      'OPENAI_REQUEST',
      message,
      movieTitle,
      movieYear,
      requestData
    );
  }

  async logBatchProcessing(
    level: LogLevel,
    message: string,
    batchInfo?: any
  ): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category: 'BATCH_PROCESSING',
      message,
      data: batchInfo,
      step: 'BATCH_PROCESSING'
    };

    await this.writeLog(entry);
  }

  async logProcessingStats(movieCount: number, successCount: number, errorCount: number): Promise<void> {
    const stats = {
      totalMovies: movieCount,
      successful: successCount,
      failed: errorCount,
      successRate: `${((successCount / movieCount) * 100).toFixed(1)}%`,
      sessionId: this.sessionId
    };

    await this.logBatchProcessing(
      LogLevel.INFO,
      'Estatísticas de processamento',
      stats
    );
  }

  async createSessionSummary(
    movieCount: number,
    successCount: number,
    errorCount: number,
    duration: number
  ): Promise<void> {
    const summary = {
      sessionId: this.sessionId,
      startTime: new Date().toISOString(),
      duration: `${duration}ms`,
      processed: movieCount,
      successful: successCount,
      failed: errorCount,
      successRate: `${((successCount / movieCount) * 100).toFixed(1)}%`
    };

    const summaryFileName = `session-summary-${this.sessionId}.json`;
    const fullPath = path.join(this.logPath, summaryFileName);
    
    try {
      await writeFile(fullPath, JSON.stringify(summary, null, 2));
    } catch (error) {
      console.error('Erro ao criar resumo da sessão:', error);
    }
  }
}

// Singleton para uso global
export const curationLogger = new CurationLogger(); 