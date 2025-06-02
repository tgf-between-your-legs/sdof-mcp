import { Database } from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import OpenAI from 'openai';

export interface DecisionEntry {
  id?: number;
  summary: string;
  rationale?: string;
  implementation_details?: string;
  tags?: string[];
  timestamp?: string;
  vector_embedding?: Buffer;
  embedding_hash?: string;
}

export interface CustomDataEntry {
  id?: number;
  category: string;
  key: string;
  value: any;
  tags?: string[];
  timestamp?: string;
  metadata?: any;
  vector_embedding?: Buffer;
  embedding_hash?: string;
}

export interface SystemPatternEntry {
  id?: number;
  name: string;
  description?: string;
  tags?: string[];
  timestamp?: string;
  vector_embedding?: Buffer;
  embedding_hash?: string;
}

export interface ProgressEntry {
  id?: number;
  description: string;
  status: string;
  parent_id?: number;
  timestamp?: string;
  tags?: string[];
  vector_embedding?: Buffer;
  embedding_hash?: string;
}

export interface ContextEntry {
  id?: number;
  type: 'product_context' | 'active_context';
  content: any;
  version: number;
  timestamp: string;
}

export interface SemanticSearchResult {
  item_id: number;
  item_type: string;
  content_text: string;
  similarity_score: number;
  metadata?: any;
  tags?: string[];
  timestamp?: string;
}

export class UnifiedDatabaseService {
  private db: Database;
  private openai?: OpenAI;
  private dbPath: string;

  constructor(workspaceId: string) {
    // Use workspace as database location
    this.dbPath = path.join(workspaceId, 'sdof_knowledge.db');
    
    // Ensure directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    
    // Initialize OpenAI - REMOVE CLAUDE DEPENDENCY
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set - vector embeddings will be disabled');
    } else {
      this.openai = new OpenAI({ apiKey });
    }

    this.initializeTables();
  }

  private initializeTables(): void {
    const tables = [
      // Decisions table
      `CREATE TABLE IF NOT EXISTS decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summary TEXT NOT NULL,
        rationale TEXT,
        implementation_details TEXT,
        tags TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        vector_embedding BLOB,
        embedding_hash TEXT,
        embedding_model TEXT,
        embedding_created_at TEXT
      )`,

      // Custom data table
      `CREATE TABLE IF NOT EXISTS custom_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        tags TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        vector_embedding BLOB,
        embedding_hash TEXT,
        embedding_model TEXT,
        embedding_created_at TEXT,
        UNIQUE(category, key)
      )`,

      // System patterns table
      `CREATE TABLE IF NOT EXISTS system_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        tags TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        vector_embedding BLOB,
        embedding_hash TEXT,
        embedding_model TEXT,
        embedding_created_at TEXT
      )`,

      // Progress entries table
      `CREATE TABLE IF NOT EXISTS progress_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        parent_id INTEGER,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        tags TEXT,
        vector_embedding BLOB,
        embedding_hash TEXT,
        embedding_model TEXT,
        embedding_created_at TEXT,
        FOREIGN KEY (parent_id) REFERENCES progress_entries (id)
      )`,

      // Context storage table
      `CREATE TABLE IF NOT EXISTS context_storage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Knowledge entries table (SDOF specific)
      `CREATE TABLE IF NOT EXISTS knowledge_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_content TEXT NOT NULL,
        metadata TEXT,
        embedding BLOB,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        title TEXT,
        tags TEXT
      )`
    ];

    tables.forEach(table => {
      this.db.run(table, (err) => {
        if (err) {
          console.error('Error creating table:', err);
        }
      });
    });

    // Create indices for performance
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_decisions_tags ON decisions(tags)',
      'CREATE INDEX IF NOT EXISTS idx_custom_data_category ON custom_data(category)',
      'CREATE INDEX IF NOT EXISTS idx_custom_data_key ON custom_data(key)',
      'CREATE INDEX IF NOT EXISTS idx_system_patterns_name ON system_patterns(name)',
      'CREATE INDEX IF NOT EXISTS idx_progress_status ON progress_entries(status)',
      'CREATE INDEX IF NOT EXISTS idx_context_type ON context_storage(type)'
    ];

    indices.forEach(index => {
      this.db.run(index, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('Error creating index:', err);
        }
      });
    });
  }

  // Generate embeddings using OpenAI (NO CLAUDE)
  private async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.openai) {
      return null;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  // Calculate cosine similarity
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // UNIFIED DECISION METHODS
  async logDecision(summary: string, rationale?: string, implementationDetails?: string, tags?: string[]): Promise<number> {
    return new Promise((resolve, reject) => {
      const tagsJson = tags ? JSON.stringify(tags) : null;
      const content = `${summary} ${rationale || ''} ${implementationDetails || ''}`.trim();

      // Generate embedding
      this.generateEmbedding(content).then(embedding => {
        const embeddingBuffer = embedding ? Buffer.from(new Float32Array(embedding).buffer) : null;
        const embeddingHash = embedding ? require('crypto').createHash('md5').update(content).digest('hex') : null;

        this.db.run(
          `INSERT INTO decisions (summary, rationale, implementation_details, tags, vector_embedding, embedding_hash, embedding_model, embedding_created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [summary, rationale, implementationDetails, tagsJson, embeddingBuffer, embeddingHash, 'text-embedding-3-small', new Date().toISOString()],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }).catch(reject);
    });
  }

  async getDecisions(limit?: number, tagsIncludeAll?: string[], tagsIncludeAny?: string[]): Promise<DecisionEntry[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM decisions';
      const params: any[] = [];

      // Add tag filtering if needed
      if (tagsIncludeAll || tagsIncludeAny) {
        const conditions: string[] = [];
        
        if (tagsIncludeAll) {
          tagsIncludeAll.forEach(tag => {
            conditions.push('tags LIKE ?');
            params.push(`%"${tag}"%`);
          });
        }
        
        if (tagsIncludeAny) {
          const orConditions = tagsIncludeAny.map(tag => {
            params.push(`%"${tag}"%`);
            return 'tags LIKE ?';
          });
          conditions.push(`(${orConditions.join(' OR ')})`);
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
      }

      query += ' ORDER BY timestamp DESC';
      
      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const decisions = rows.map(row => ({
            ...row,
            tags: row.tags ? JSON.parse(row.tags) : []
          }));
          resolve(decisions);
        }
      });
    });
  }

  // UNIFIED CUSTOM DATA METHODS
  async logCustomData(category: string, key: string, value: any, metadata?: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      const metadataStr = metadata ? JSON.stringify(metadata) : null;
      const content = `${category} ${key} ${valueStr}`;

      this.generateEmbedding(content).then(embedding => {
        const embeddingBuffer = embedding ? Buffer.from(new Float32Array(embedding).buffer) : null;
        const embeddingHash = embedding ? require('crypto').createHash('md5').update(content).digest('hex') : null;

        this.db.run(
          `INSERT OR REPLACE INTO custom_data (category, key, value, metadata, vector_embedding, embedding_hash, embedding_model, embedding_created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [category, key, valueStr, metadataStr, embeddingBuffer, embeddingHash, 'text-embedding-3-small', new Date().toISOString()],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }).catch(reject);
    });
  }

  async getCustomData(category?: string, key?: string): Promise<CustomDataEntry[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM custom_data';
      const params: any[] = [];

      if (category && key) {
        query += ' WHERE category = ? AND key = ?';
        params.push(category, key);
      } else if (category) {
        query += ' WHERE category = ?';
        params.push(category);
      }

      query += ' ORDER BY timestamp DESC';

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const entries = rows.map(row => ({
            ...row,
            value: this.tryParseJSON(row.value),
            metadata: row.metadata ? this.tryParseJSON(row.metadata) : null
          }));
          resolve(entries);
        }
      });
    });
  }

  // UNIFIED SYSTEM PATTERN METHODS
  async logSystemPattern(name: string, description?: string, tags?: string[]): Promise<number> {
    return new Promise((resolve, reject) => {
      const tagsJson = tags ? JSON.stringify(tags) : null;
      const content = `${name} ${description || ''}`.trim();

      this.generateEmbedding(content).then(embedding => {
        const embeddingBuffer = embedding ? Buffer.from(new Float32Array(embedding).buffer) : null;
        const embeddingHash = embedding ? require('crypto').createHash('md5').update(content).digest('hex') : null;

        this.db.run(
          `INSERT OR REPLACE INTO system_patterns (name, description, tags, vector_embedding, embedding_hash, embedding_model, embedding_created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [name, description, tagsJson, embeddingBuffer, embeddingHash, 'text-embedding-3-small', new Date().toISOString()],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }).catch(reject);
    });
  }

  async getSystemPatterns(tagsIncludeAll?: string[], tagsIncludeAny?: string[]): Promise<SystemPatternEntry[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM system_patterns';
      const params: any[] = [];

      // Add tag filtering logic similar to decisions
      if (tagsIncludeAll || tagsIncludeAny) {
        const conditions: string[] = [];
        
        if (tagsIncludeAll) {
          tagsIncludeAll.forEach(tag => {
            conditions.push('tags LIKE ?');
            params.push(`%"${tag}"%`);
          });
        }
        
        if (tagsIncludeAny) {
          const orConditions = tagsIncludeAny.map(tag => {
            params.push(`%"${tag}"%`);
            return 'tags LIKE ?';
          });
          conditions.push(`(${orConditions.join(' OR ')})`);
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
      }

      query += ' ORDER BY timestamp DESC';

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const patterns = rows.map(row => ({
            ...row,
            tags: row.tags ? JSON.parse(row.tags) : []
          }));
          resolve(patterns);
        }
      });
    });
  }

  // UNIFIED PROGRESS METHODS
  async logProgress(description: string, status: string, parentId?: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const content = `${description} ${status}`;

      this.generateEmbedding(content).then(embedding => {
        const embeddingBuffer = embedding ? Buffer.from(new Float32Array(embedding).buffer) : null;
        const embeddingHash = embedding ? require('crypto').createHash('md5').update(content).digest('hex') : null;

        this.db.run(
          `INSERT INTO progress_entries (description, status, parent_id, vector_embedding, embedding_hash, embedding_model, embedding_created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [description, status, parentId, embeddingBuffer, embeddingHash, 'text-embedding-3-small', new Date().toISOString()],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }).catch(reject);
    });
  }

  async getProgress(statusFilter?: string, parentIdFilter?: number, limit?: number): Promise<ProgressEntry[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM progress_entries';
      const params: any[] = [];
      const conditions: string[] = [];

      if (statusFilter) {
        conditions.push('status = ?');
        params.push(statusFilter);
      }

      if (parentIdFilter !== undefined) {
        conditions.push('parent_id = ?');
        params.push(parentIdFilter);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY timestamp DESC';

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // UNIFIED CONTEXT METHODS
  async updateProductContext(content: any): Promise<void> {
    return this.updateContext('product_context', content);
  }

  async updateActiveContext(content: any): Promise<void> {
    return this.updateContext('active_context', content);
  }

  async getProductContext(): Promise<any> {
    return this.getContext('product_context');
  }

  async getActiveContext(): Promise<any> {
    return this.getContext('active_context');
  }

  private async updateContext(type: 'product_context' | 'active_context', content: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const contentStr = JSON.stringify(content);
      
      // Get current version
      this.db.get(
        'SELECT MAX(version) as max_version FROM context_storage WHERE type = ?',
        [type],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          const newVersion = (row?.max_version || 0) + 1;

          this.db.run(
            'INSERT INTO context_storage (type, content, version) VALUES (?, ?, ?)',
            [type, contentStr, newVersion],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        }
      );
    });
  }

  private async getContext(type: 'product_context' | 'active_context'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT content FROM context_storage WHERE type = ? ORDER BY version DESC LIMIT 1',
        [type],
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row ? this.tryParseJSON(row.content) : null);
        }
      );
    });
  }

  // UNIFIED SEMANTIC SEARCH
  async semanticSearch(
    queryText: string,
    limit: number = 10,
    itemTypes?: string[],
    tagsIncludeAny?: string[],
    tagsIncludeAll?: string[],
    customDataCategories?: string[]
  ): Promise<SemanticSearchResult[]> {
    
    const queryEmbedding = await this.generateEmbedding(queryText);
    if (!queryEmbedding) {
      // Fallback to text search if embeddings unavailable
      return this.textSearchFallback(queryText, limit, itemTypes);
    }

    const results: SemanticSearchResult[] = [];
    const searchTypes = itemTypes || ['decision', 'custom_data', 'system_pattern', 'progress_entry'];

    for (const itemType of searchTypes) {
      const tableName = this.getTableName(itemType);
      
      const rows = await this.getVectorRows(tableName);
      
      for (const row of rows) {
        if (!row.vector_embedding) continue;

        const embedding = this.bufferToArray(row.vector_embedding);
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);

        if (similarity > 0.7) { // Threshold for relevance
          const contentText = this.extractContentText(row, itemType);
          
          results.push({
            item_id: row.id,
            item_type: itemType,
            content_text: contentText,
            similarity_score: similarity,
            metadata: row.metadata ? this.tryParseJSON(row.metadata) : undefined,
            tags: row.tags ? JSON.parse(row.tags) : undefined,
            timestamp: row.timestamp
          });
        }
      }
    }

    // Sort by similarity and apply filters
    results.sort((a, b) => b.similarity_score - a.similarity_score);
    
    return this.applyFilters(results, tagsIncludeAny, tagsIncludeAll, customDataCategories)
      .slice(0, limit);
  }

  // SDOF KNOWLEDGE ENTRY METHODS (existing functionality)
  async storePlan(planContent: string, metadata?: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const embedding = this.generateEmbedding(planContent);
      const metadataStr = metadata ? JSON.stringify(metadata) : null;
      
      embedding.then(embVector => {
        const embeddingBuffer = embVector ? Buffer.from(new Float32Array(embVector).buffer) : null;
        
        this.db.run(
          'INSERT INTO knowledge_entries (plan_content, metadata, embedding, title, tags) VALUES (?, ?, ?, ?, ?)',
          [planContent, metadataStr, embeddingBuffer, metadata?.planTitle || null, metadata?.tags ? JSON.stringify(metadata.tags) : null],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }).catch(reject);
    });
  }

  // Helper methods
  private getTableName(itemType: string): string {
    const tableMap: { [key: string]: string } = {
      'decision': 'decisions',
      'custom_data': 'custom_data',
      'system_pattern': 'system_patterns',
      'progress_entry': 'progress_entries'
    };
    return tableMap[itemType] || itemType;
  }

  private async getVectorRows(tableName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM ${tableName} WHERE vector_embedding IS NOT NULL`,
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  private bufferToArray(buffer: Buffer): number[] {
    const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    return Array.from(float32Array);
  }

  private extractContentText(row: any, itemType: string): string {
    switch (itemType) {
      case 'decision':
        return `${row.summary} ${row.rationale || ''} ${row.implementation_details || ''}`.trim();
      case 'custom_data':
        return `${row.category} ${row.key} ${row.value}`;
      case 'system_pattern':
        return `${row.name} ${row.description || ''}`.trim();
      case 'progress_entry':
        return `${row.description} ${row.status}`;
      default:
        return row.content || row.description || row.summary || '';
    }
  }

  private applyFilters(
    results: SemanticSearchResult[],
    tagsIncludeAny?: string[],
    tagsIncludeAll?: string[],
    customDataCategories?: string[]
  ): SemanticSearchResult[] {
    return results.filter(result => {
      // Apply tag filters
      if (tagsIncludeAll && result.tags) {
        if (!tagsIncludeAll.every(tag => result.tags!.includes(tag))) {
          return false;
        }
      }

      if (tagsIncludeAny && result.tags) {
        if (!tagsIncludeAny.some(tag => result.tags!.includes(tag))) {
          return false;
        }
      }

      // Apply custom data category filter
      if (customDataCategories && result.item_type === 'custom_data') {
        // Would need to query for category - simplified for now
        return true;
      }

      return true;
    });
  }

  private async textSearchFallback(queryText: string, limit: number, itemTypes?: string[]): Promise<SemanticSearchResult[]> {
    // Simple text-based search fallback
    const results: SemanticSearchResult[] = [];
    const searchTypes = itemTypes || ['decision', 'custom_data', 'system_pattern', 'progress_entry'];

    for (const itemType of searchTypes) {
      const tableName = this.getTableName(itemType);
      
      const rows = await new Promise<any[]>((resolve, reject) => {
        this.db.all(
          `SELECT * FROM ${tableName} WHERE 
           summary LIKE ? OR description LIKE ? OR name LIKE ? OR value LIKE ?
           LIMIT ?`,
          [`%${queryText}%`, `%${queryText}%`, `%${queryText}%`, `%${queryText}%`, limit],
          (err, rows: any[]) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      for (const row of rows) {
        const contentText = this.extractContentText(row, itemType);
        results.push({
          item_id: row.id,
          item_type: itemType,
          content_text: contentText,
          similarity_score: 0.8, // Default score for text search
          metadata: row.metadata ? this.tryParseJSON(row.metadata) : undefined,
          tags: row.tags ? JSON.parse(row.tags) : undefined,
          timestamp: row.timestamp
        });
      }
    }

    return results.slice(0, limit);
  }

  private tryParseJSON(str: string): any {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }

  close(): void {
    this.db.close();
  }
}