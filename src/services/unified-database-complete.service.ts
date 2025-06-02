import { Database } from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import OpenAI from 'openai';
import crypto from 'crypto';

// ==================== COMPLETE INTERFACE DEFINITIONS ====================

export interface DecisionEntry {
  id?: number;
  summary: string;
  rationale?: string;
  implementation_details?: string;
  tags?: string[];
  timestamp?: string;
  vector_embedding?: Buffer;
  embedding_model?: string;
  embedding_created_at?: string;
  embedding_hash?: string;
}

export interface CustomDataEntry {
  id?: number;
  category: string;
  key: string;
  value: any;
  metadata?: any;
  timestamp?: string;
  vector_embedding?: Buffer;
  embedding_model?: string;
  embedding_created_at?: string;
  embedding_hash?: string;
}

export interface SystemPatternEntry {
  id?: number;
  name: string;
  description?: string;
  tags?: string[];
  timestamp?: string;
  vector_embedding?: Buffer;
  embedding_model?: string;
  embedding_created_at?: string;
  embedding_hash?: string;
}

export interface ProgressEntry {
  id?: number;
  description: string;
  status: string;
  parent_id?: number;
  linked_item_type?: string;
  linked_item_id?: string;
  link_relationship_type?: string;
  timestamp?: string;
  vector_embedding?: Buffer;
  embedding_model?: string;
  embedding_created_at?: string;
  embedding_hash?: string;
}

export interface ContextEntry {
  id?: number;
  type: 'product_context' | 'active_context';
  content: any;
  version: number;
  timestamp: string;
}

export interface LinkSuggestion {
  suggestion_id?: number;
  source_item_type: string;
  source_item_id: string;
  target_item_type: string;
  target_item_id: string;
  suggested_relationship_type?: string;
  ai_confidence_score?: number;
  ai_reasoning?: string;
  status: string;
  created_timestamp?: string;
  updated_timestamp?: string;
  user_feedback?: string;
  reviewed_by?: string;
  model_version?: string;
}

export interface MetadataSuggestion {
  suggestion_id?: number;
  item_type: string;
  item_id: string;
  metadata_type: string;
  suggested_content: string;
  ai_confidence_score?: number;
  ai_reasoning?: string;
  status: string;
  created_timestamp?: string;
  updated_timestamp?: string;
  user_feedback?: string;
  reviewed_by?: string;
  model_version?: string;
}

export interface RagFeedback {
  feedback_id?: number;
  rag_query_id?: string;
  query_text: string;
  generated_answer: string;
  feedback_data: any;
  retrieved_context_summary?: string;
  evaluator_id?: string;
  created_timestamp?: string;
}

export interface ItemLink {
  link_id?: number;
  source_item_type: string;
  source_item_id: string;
  target_item_type: string;
  target_item_id: string;
  relationship_type: string;
  description?: string;
  created_timestamp?: string;
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

export interface EmbeddingStats {
  item_type: string;
  total_items: number;
  items_with_embeddings: number;
  items_without_embeddings: number;
  embedding_coverage_percentage: number;
  latest_embedding_created: string | null;
}

export interface RecentActivitySummary {
  decisions: DecisionEntry[];
  progress_entries: ProgressEntry[];
  system_patterns: SystemPatternEntry[];
  custom_data: CustomDataEntry[];
  context_updates: ContextEntry[];
}

// ==================== COMPLETE DATABASE SERVICE ====================

export class UnifiedDatabaseService {
  private db: Database;
  private openai?: OpenAI;
  private dbPath: string;
  private embeddingModel = 'text-embedding-3-small';

  constructor(workspaceId: string) {
    this.dbPath = path.join(workspaceId, 'sdof_unified_knowledge.db');
    
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    
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
      // Core tables with vector embedding support
      `CREATE TABLE IF NOT EXISTS decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summary TEXT NOT NULL,
        rationale TEXT,
        implementation_details TEXT,
        tags TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        vector_embedding BLOB,
        embedding_model TEXT,
        embedding_created_at DATETIME,
        embedding_hash TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS custom_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        metadata TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        vector_embedding BLOB,
        embedding_model TEXT,
        embedding_created_at DATETIME,
        embedding_hash TEXT,
        UNIQUE(category, key)
      )`,

      `CREATE TABLE IF NOT EXISTS system_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        tags TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        vector_embedding BLOB,
        embedding_model TEXT,
        embedding_created_at DATETIME,
        embedding_hash TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS progress_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        parent_id INTEGER,
        linked_item_type TEXT,
        linked_item_id TEXT,
        link_relationship_type TEXT DEFAULT 'relates_to_progress',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        vector_embedding BLOB,
        embedding_model TEXT,
        embedding_created_at DATETIME,
        embedding_hash TEXT,
        FOREIGN KEY (parent_id) REFERENCES progress_entries (id)
      )`,

      `CREATE TABLE IF NOT EXISTS context_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('product_context', 'active_context')),
        content TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // AI Enrichment tables
      `CREATE TABLE IF NOT EXISTS conport_link_suggestions (
        suggestion_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_item_type TEXT NOT NULL,
        source_item_id TEXT NOT NULL,
        target_item_type TEXT NOT NULL,
        target_item_id TEXT NOT NULL,
        suggested_relationship_type TEXT,
        ai_confidence_score REAL,
        ai_reasoning TEXT,
        status TEXT DEFAULT 'pending',
        created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_feedback TEXT,
        reviewed_by TEXT,
        model_version TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS conport_metadata_suggestions (
        suggestion_id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        metadata_type TEXT NOT NULL,
        suggested_content TEXT NOT NULL,
        ai_confidence_score REAL,
        ai_reasoning TEXT,
        status TEXT DEFAULT 'pending',
        created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_feedback TEXT,
        reviewed_by TEXT,
        model_version TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS conport_rag_feedback (
        feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
        rag_query_id TEXT,
        query_text TEXT NOT NULL,
        generated_answer TEXT NOT NULL,
        feedback_data TEXT NOT NULL,
        retrieved_context_summary TEXT,
        evaluator_id TEXT,
        created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS item_links (
        link_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_item_type TEXT NOT NULL,
        source_item_id TEXT NOT NULL,
        target_item_type TEXT NOT NULL,
        target_item_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        description TEXT,
        created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // SQLite-vec vector search table
      `CREATE VIRTUAL TABLE IF NOT EXISTS vec_embeddings USING vec0(
        item_type TEXT,
        item_id TEXT,
        embedding FLOAT[1536],
        content_text TEXT,
        metadata TEXT
      )`
    ];

    tables.forEach((sql, index) => {
      this.db.run(sql, (err) => {
        if (err) {
          console.error(`Error creating table ${index + 1}:`, err);
        }
      });
    });

    // Initialize context entries with empty records
    this.db.run(`INSERT OR IGNORE INTO context_entries (id, type, content, version) VALUES 
      (1, 'product_context', '{}', 1),
      (2, 'active_context', '{}', 1)`);
  }

  // ==================== CORE CONTEXT METHODS ====================

  getProductContext(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT content FROM context_entries WHERE type = 'product_context' ORDER BY version DESC LIMIT 1`,
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row ? JSON.parse(row.content) : {});
        }
      );
    });
  }

  updateProductContext(content?: any, patchContent?: any): Promise<{ status: string; message: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const currentContent = await this.getProductContext();
        let newContent: any;

        if (content !== undefined) {
          newContent = content;
        } else if (patchContent !== undefined) {
          newContent = { ...currentContent };
          for (const [key, value] of Object.entries(patchContent)) {
            if (value === '__DELETE__') {
              delete newContent[key];
            } else {
              newContent[key] = value;
            }
          }
        } else {
          return reject(new Error('Either content or patch_content must be provided'));
        }

        const version = await this.getNextVersion('product_context');
        this.db.run(`INSERT INTO context_entries (type, content, version) VALUES (?, ?, ?)`,
          ['product_context', JSON.stringify(newContent), version],
          function(err) {
            if (err) reject(err);
            else resolve({ status: 'success', message: 'Product context updated successfully' });
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  getActiveContext(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT content FROM context_entries WHERE type = 'active_context' ORDER BY version DESC LIMIT 1`,
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row ? JSON.parse(row.content) : {});
        }
      );
    });
  }

  updateActiveContext(content?: any, patchContent?: any): Promise<{ status: string; message: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const currentContent = await this.getActiveContext();
        let newContent: any;

        if (content !== undefined) {
          newContent = content;
        } else if (patchContent !== undefined) {
          newContent = { ...currentContent };
          for (const [key, value] of Object.entries(patchContent)) {
            if (value === '__DELETE__') {
              delete newContent[key];
            } else {
              newContent[key] = value;
            }
          }
        } else {
          return reject(new Error('Either content or patch_content must be provided'));
        }

        const version = await this.getNextVersion('active_context');
        this.db.run(`INSERT INTO context_entries (type, content, version) VALUES (?, ?, ?)`,
          ['active_context', JSON.stringify(newContent), version],
          function(err) {
            if (err) reject(err);
            else resolve({ status: 'success', message: 'Active context updated successfully' });
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  // ==================== DECISION METHODS ====================

  async logDecision(entry: DecisionEntry): Promise<DecisionEntry> {
    return new Promise(async (resolve, reject) => {
      const timestamp = new Date().toISOString();
      const tagsJson = entry.tags ? JSON.stringify(entry.tags) : null;

      this.db.run(`INSERT INTO decisions (summary, rationale, implementation_details, tags, timestamp)
                   VALUES (?, ?, ?, ?, ?)`,
        [entry.summary, entry.rationale, entry.implementation_details, tagsJson, timestamp],
        async (err: any) => {
          if (err) {
            reject(err);
          } else {
            const insertResult = this as any;
            const newEntry: DecisionEntry = {
              id: insertResult.lastID,
              ...entry,
              timestamp
            };

            // Generate embedding for the decision
            try {
              await this.generateAndStoreEmbedding('decision', insertResult.lastID.toString(), {
                summary: entry.summary,
                rationale: entry.rationale,
                implementation_details: entry.implementation_details
              });
            } catch (embErr) {
              console.warn('Failed to generate embedding for decision:', embErr);
            }

            resolve(newEntry);
          }
        }
      );
    });
  }

  getDecisions(limit?: number, tagsFilterIncludeAll?: string[], tagsFilterIncludeAny?: string[]): Promise<DecisionEntry[]> {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM decisions';
      const params: any[] = [];
      const conditions: string[] = [];

      if (tagsFilterIncludeAll && tagsFilterIncludeAll.length > 0) {
        const tagConditions = tagsFilterIncludeAll.map(() => "json_extract(tags, '$') LIKE ?");
        conditions.push(`(${tagConditions.join(' AND ')})`);
        tagsFilterIncludeAll.forEach(tag => params.push(`%"${tag}"%`));
      }

      if (tagsFilterIncludeAny && tagsFilterIncludeAny.length > 0) {
        const tagConditions = tagsFilterIncludeAny.map(() => "json_extract(tags, '$') LIKE ?");
        conditions.push(`(${tagConditions.join(' OR ')})`);
        tagsFilterIncludeAny.forEach(tag => params.push(`%"${tag}"%`));
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY timestamp DESC';
      if (limit) {
        sql += ' LIMIT ?';
        params.push(limit);
      }

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const decisions = rows.map(row => ({
            ...row,
            tags: row.tags ? JSON.parse(row.tags) : []
          }));
          resolve(decisions);
        }
      });
    });
  }

  searchDecisionsFts(queryTerm: string, limit: number = 10): Promise<DecisionEntry[]> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM decisions 
                   WHERE summary LIKE ? OR rationale LIKE ? OR implementation_details LIKE ?
                   ORDER BY timestamp DESC LIMIT ?`;
      const searchTerm = `%${queryTerm}%`;
      
      this.db.all(sql, [searchTerm, searchTerm, searchTerm, limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const decisions = rows.map(row => ({
            ...row,
            tags: row.tags ? JSON.parse(row.tags) : []
          }));
          resolve(decisions);
        }
      });
    });
  }

  deleteDecisionById(id: number): Promise<{ status: string; message: string }> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM decisions WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error(`Decision with ID ${id} not found`));
        } else {
          resolve({ status: 'success', message: `Decision ${id} deleted successfully` });
        }
      });
    });
  }

  // ==================== CUSTOM DATA METHODS ====================

  async logCustomData(entry: CustomDataEntry): Promise<CustomDataEntry> {
    return new Promise(async (resolve, reject) => {
      const timestamp = new Date().toISOString();
      const valueJson = JSON.stringify(entry.value);
      const metadataJson = entry.metadata ? JSON.stringify(entry.metadata) : null;

      this.db.run(`INSERT OR REPLACE INTO custom_data (category, key, value, metadata, timestamp)
                   VALUES (?, ?, ?, ?, ?)`,
        [entry.category, entry.key, valueJson, metadataJson, timestamp],
        async (err: any) => {
          if (err) {
            reject(err);
          } else {
            const insertResult = this as any;
            const newEntry: CustomDataEntry = {
              id: insertResult.lastID,
              ...entry,
              timestamp
            };

            // Generate embedding for custom data
            try {
              await this.generateAndStoreEmbedding('custom_data', insertResult.lastID.toString(), {
                category: entry.category,
                key: entry.key,
                value: entry.value
              });
            } catch (embErr) {
              console.warn('Failed to generate embedding for custom data:', embErr);
            }

            resolve(newEntry);
          }
        }
      );
    });
  }

  getCustomData(category?: string, key?: string): Promise<CustomDataEntry[]> {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM custom_data';
      const params: any[] = [];

      if (category && key) {
        sql += ' WHERE category = ? AND key = ?';
        params.push(category, key);
      } else if (category) {
        sql += ' WHERE category = ?';
        params.push(category);
      }

      sql += ' ORDER BY timestamp DESC';

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const customData = rows.map(row => ({
            ...row,
            value: JSON.parse(row.value),
            metadata: row.metadata ? JSON.parse(row.metadata) : null
          }));
          resolve(customData);
        }
      });
    });
  }

  deleteCustomData(category: string, key: string): Promise<{ status: string; message: string }> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM custom_data WHERE category = ? AND key = ?', [category, key], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error(`Custom data with category "${category}" and key "${key}" not found`));
        } else {
          resolve({ status: 'success', message: `Custom data deleted successfully` });
        }
      });
    });
  }

  searchCustomDataValuesFts(queryTerm: string, categoryFilter?: string, limit: number = 10): Promise<CustomDataEntry[]> {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM custom_data 
                 WHERE category LIKE ? OR key LIKE ? OR value LIKE ?`;
      const params = [`%${queryTerm}%`, `%${queryTerm}%`, `%${queryTerm}%`];

      if (categoryFilter) {
        sql += ' AND category = ?';
        params.push(categoryFilter);
      }

      sql += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit.toString());

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const customData = rows.map(row => ({
            ...row,
            value: JSON.parse(row.value),
            metadata: row.metadata ? JSON.parse(row.metadata) : null
          }));
          resolve(customData);
        }
      });
    });
  }

  searchProjectGlossaryFts(queryTerm: string, limit: number = 10): Promise<CustomDataEntry[]> {
    return this.searchCustomDataValuesFts(queryTerm, 'ProjectGlossary', limit);
  }

  // ==================== EMBEDDING AND VECTOR METHODS ====================

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI not configured - cannot generate embeddings');
    }

    const response = await this.openai.embeddings.create({
      model: this.embeddingModel,
      input: text.substring(0, 8000) // Truncate to avoid token limits
    });

    return response.data[0].embedding;
  }

  private generateContentHash(content: any): string {
    return crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
  }

  private async generateAndStoreEmbedding(itemType: string, itemId: string, content: any): Promise<void> {
    if (!this.openai) return;

    try {
      const contentText = this.extractTextForEmbedding(content);
      const contentHash = this.generateContentHash(content);
      
      // Check if embedding already exists with same hash
      const existingHash = await this.getEmbeddingHash(itemType, itemId);
      if (existingHash === contentHash) {
        return; // No need to regenerate
      }

      const embedding = await this.generateEmbedding(contentText);
      const now = new Date().toISOString();

      // Store in vector table
      await this.storeVectorEmbedding(itemType, itemId, embedding, contentText, content);

      // Update main table with embedding metadata
      const updateSql = `UPDATE ${this.getTableName(itemType)} 
                         SET embedding_hash = ?, embedding_model = ?, embedding_created_at = ? 
                         WHERE id = ?`;
      
      this.db.run(updateSql, [contentHash, this.embeddingModel, now, itemId]);

    } catch (error) {
      console.error(`Failed to generate embedding for ${itemType} ${itemId}:`, error);
      throw error;
    }
  }

  private extractTextForEmbedding(content: any): string {
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
      return Object.values(content).filter(v => typeof v === 'string').join(' ');
    }
    return String(content);
  }

  private getTableName(itemType: string): string {
    const mapping: Record<string, string> = {
      'decision': 'decisions',
      'custom_data': 'custom_data',
      'system_pattern': 'system_patterns',
      'progress_entry': 'progress_entries'
    };
    return mapping[itemType] || itemType;
  }

  private getEmbeddingHash(itemType: string, itemId: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const tableName = this.getTableName(itemType);
      this.db.get(`SELECT embedding_hash FROM ${tableName} WHERE id = ?`, [itemId], (err, row: any) => {
        if (err) reject(err);
        else resolve(row?.embedding_hash || null);
      });
    });
  }

  async storeVectorEmbedding(itemType: string, itemId: string, vector: number[], contentText: string, metadata: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const metadataJson = JSON.stringify(metadata);
      
      this.db.run(`INSERT OR REPLACE INTO vec_embeddings (item_type, item_id, embedding, content_text, metadata) 
                   VALUES (?, ?, ?, ?, ?)`,
        [itemType, itemId, JSON.stringify(vector), contentText, metadataJson],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async searchVectors(query: string, limit: number = 10): Promise<SemanticSearchResult[]> {
    if (!this.openai) {
      throw new Error('OpenAI not configured - cannot perform vector search');
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      return new Promise((resolve, reject) => {
        // Use SQLite-vec for similarity search
        const sql = `SELECT item_type, item_id, content_text, metadata,
                            vec_distance_cosine(embedding, ?) as distance
                     FROM vec_embeddings 
                     ORDER BY distance ASC 
                     LIMIT ?`;
        
        this.db.all(sql, [JSON.stringify(queryEmbedding), limit], (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const results: SemanticSearchResult[] = rows.map(row => ({
              item_id: parseInt(row.item_id),
              item_type: row.item_type,
              content_text: row.content_text,
              similarity_score: 1 - row.distance, // Convert distance to similarity
              metadata: JSON.parse(row.metadata || '{}')
            }));
            resolve(results);
          }
        });
      });
    } catch (error) {
      console.error('Vector search failed:', error);
      throw error;
    }
  }

  async batchProcessEmbeddings(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
      // Process each item type
      const itemTypes = ['decision', 'custom_data', 'system_pattern', 'progress_entry'];
      
      for (const itemType of itemTypes) {
        const items = await this.getItemsWithoutEmbeddings(itemType);
        
        for (const item of items) {
          try {
            await this.generateAndStoreEmbedding(itemType, item.id.toString(), item);
            processed++;
          } catch (error) {
            console.error(`Failed to process embedding for ${itemType} ${item.id}:`, error);
            errors++;
          }
        }
      }

      return { processed, errors };
    } catch (error) {
      console.error('Batch embedding processing failed:', error);
      throw error;
    }
  }

  private getItemsWithoutEmbeddings(itemType: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const tableName = this.getTableName(itemType);
      const sql = `SELECT * FROM ${tableName} WHERE embedding_hash IS NULL`;
      
      this.db.all(sql, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getEmbeddingStats(): Promise<EmbeddingStats[]> {
    const itemTypes = ['decision', 'custom_data', 'system_pattern', 'progress_entry'];
    const stats: EmbeddingStats[] = [];

    for (const itemType of itemTypes) {
      const tableName = this.getTableName(itemType);
      
      const totalItems = await this.getCount(tableName);
      const itemsWithEmbeddings = await this.getCount(tableName, 'embedding_hash IS NOT NULL');
      const itemsWithoutEmbeddings = totalItems - itemsWithEmbeddings;
      const coverage = totalItems > 0 ? (itemsWithEmbeddings / totalItems) * 100 : 0;
      
      const latestEmbedding = await this.getLatestEmbeddingDate(tableName);

      stats.push({
        item_type: itemType,
        total_items: totalItems,
        items_with_embeddings: itemsWithEmbeddings,
        items_without_embeddings: itemsWithoutEmbeddings,
        embedding_coverage_percentage: Math.round(coverage * 100) / 100,
        latest_embedding_created: latestEmbedding
      });
    }

    return stats;
  }

  private getCount(tableName: string, condition?: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as count FROM ${tableName}${condition ? ' WHERE ' + condition : ''}`;
      this.db.get(sql, (err, row: any) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  private getLatestEmbeddingDate(tableName: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT MAX(embedding_created_at) as latest FROM ${tableName} WHERE embedding_hash IS NOT NULL`;
      this.db.get(sql, (err, row: any) => {
        if (err) reject(err);
        else resolve(row.latest);
      });
    });
  }

  // ==================== HELPER METHODS ====================

  private getNextVersion(contextType: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT MAX(version) as max_version FROM context_entries WHERE type = ?`, [contextType],
        (err, row: any) => {
          if (err) reject(err);
          else resolve((row?.max_version || 0) + 1);
        }
      );
    });
  }

  // ==================== SEMANTIC SEARCH ====================

  async semanticSearchConport(queryText: string, topK: number = 5, filterItemTypes?: string[], 
                             filterTagsIncludeAny?: string[], filterTagsIncludeAll?: string[],
                             filterCustomDataCategories?: string[]): Promise<SemanticSearchResult[]> {
    if (!this.openai) {
      console.warn('OpenAI not configured - falling back to keyword search');
      return this.fallbackKeywordSearch(queryText, topK);
    }

    try {
      const queryEmbedding = await this.generateEmbedding(queryText);
      
      return new Promise((resolve, reject) => {
        let sql = `SELECT item_type, item_id, content_text, metadata,
                          vec_distance_cosine(embedding, ?) as distance
                   FROM vec_embeddings`;
        const params = [JSON.stringify(queryEmbedding)];
        const conditions: string[] = [];

        if (filterItemTypes && filterItemTypes.length > 0) {
          conditions.push(`item_type IN (${filterItemTypes.map(() => '?').join(',')})`);
          params.push(...filterItemTypes);
        }

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY distance ASC LIMIT ?';
        params.push(topK.toString());

        this.db.all(sql, params, (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const results: SemanticSearchResult[] = rows.map(row => ({
              item_id: parseInt(row.item_id),
              item_type: row.item_type,
              content_text: row.content_text,
              similarity_score: 1 - row.distance,
              metadata: JSON.parse(row.metadata || '{}')
            }));
            resolve(results);
          }
        });
      });
    } catch (error) {
      console.error('Semantic search failed, falling back to keyword search:', error);
      return this.fallbackKeywordSearch(queryText, topK);
    }
  }

  private async fallbackKeywordSearch(queryText: string, limit: number): Promise<SemanticSearchResult[]> {
    // Implement basic keyword search across all tables
    const results: SemanticSearchResult[] = [];
    
    // Search decisions
    const decisions = await this.searchDecisionsFts(queryText, limit);
    decisions.forEach(d => {
      results.push({
        item_id: d.id!,
        item_type: 'decision',
        content_text: `${d.summary} ${d.rationale || ''} ${d.implementation_details || ''}`,
        similarity_score: 0.8, // Fixed score for keyword match
        metadata: { tags: d.tags },
        timestamp: d.timestamp || new Date().toISOString()
      });
    });

    return results.slice(0, limit);
  }

  // Close database connection
  close(): void {
    this.db.close();
  }
}