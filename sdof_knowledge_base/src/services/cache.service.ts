/**
 * Multi-Provider Prompt Caching Service
 * 
 * Implements intelligent caching for OpenAI, Anthropic, and Google Gemini
 * with semantic similarity matching and automatic cache optimization.
 */

import { OpenAI } from 'openai';
import NodeCache from 'node-cache';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Cache configuration
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '7200'); // 2 hours default
const SEMANTIC_THRESHOLD = parseFloat(process.env.SEMANTIC_THRESHOLD || '0.85');
const MAX_CACHE_SIZE = parseInt(process.env.MAX_CACHE_SIZE || '1000');
const CACHE_HIT_TARGET = parseFloat(process.env.CACHE_HIT_TARGET || '0.80');

export interface CacheEntry {
  id: string;
  content: string;
  embedding?: number[];
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;
  timestamp: Date;
  hitCount: number;
  lastHit: Date;
  responseTime: number;
  tokenCount: number;
  cacheHint?: boolean;
  metadata?: any;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  averageResponseTime: number;
  costSavings: number;
  cacheSize: number;
  evictions: number;
}

export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Multi-Provider Cache Manager
 */
export class MultiProviderCacheService {
  private static instance: MultiProviderCacheService;
  private contentCache: NodeCache;
  private embeddingCache: NodeCache;
  private semanticIndex: Map<string, CacheEntry> = new Map();
  private metrics: CacheMetrics;
  private openai?: OpenAI;
  
  private constructor() {
    // Initialize caches
    this.contentCache = new NodeCache({
      stdTTL: CACHE_TTL,
      maxKeys: MAX_CACHE_SIZE,
      checkperiod: 300, // Check every 5 minutes
      useClones: false, // For performance
    });

    this.embeddingCache = new NodeCache({
      stdTTL: CACHE_TTL * 2, // Embeddings last longer
      maxKeys: MAX_CACHE_SIZE * 2,
      checkperiod: 600, // Check every 10 minutes
    });

    // Initialize metrics
    this.metrics = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      costSavings: 0,
      cacheSize: 0,
      evictions: 0,
    };

    // Initialize OpenAI for embeddings
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }

    // Set up event handlers
    this.setupEventHandlers();
    
    console.log('[CACHE] Multi-provider cache service initialized');
  }

  public static getInstance(): MultiProviderCacheService {
    if (!MultiProviderCacheService.instance) {
      MultiProviderCacheService.instance = new MultiProviderCacheService();
    }
    return MultiProviderCacheService.instance;
  }

  private setupEventHandlers(): void {
    // Handle cache evictions
    this.contentCache.on('del', (key, value) => {
      this.metrics.evictions++;
      this.semanticIndex.delete(key);
    });

    // Handle cache expiration
    this.contentCache.on('expired', (key, value) => {
      this.semanticIndex.delete(key);
    });
  }

  /**
   * Get cached content with semantic similarity matching
   */
  public async getCachedContent(
    content: string,
    provider: 'openai' | 'anthropic' | 'gemini',
    model: string,
    useSemanticMatching: boolean = true
  ): Promise<CacheEntry | null> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // 1. Exact match first
      const exactKey = this.generateCacheKey(content, provider, model);
      const exactMatch = this.contentCache.get<CacheEntry>(exactKey);
      
      if (exactMatch) {
        this.recordHit(exactMatch);
        console.log(`[CACHE] Exact hit for ${provider}/${model}`);
        return exactMatch;
      }

      // 2. Semantic similarity matching if enabled
      if (useSemanticMatching && this.openai) {
        const semanticMatch = await this.findSemanticMatch(content, provider, model);
        if (semanticMatch) {
          this.recordHit(semanticMatch);
          console.log(`[CACHE] Semantic hit for ${provider}/${model} (similarity: ${semanticMatch.metadata?.similarity?.toFixed(3)})`);
          return semanticMatch;
        }
      }

      // 3. Cache miss
      this.metrics.missRate = (this.metrics.missRate * (this.metrics.totalRequests - 1) + 1) / this.metrics.totalRequests;
      console.log(`[CACHE] Miss for ${provider}/${model}`);
      return null;

    } finally {
      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);
    }
  }

  /**
   * Store content in cache with optimization
   */
  public async setCachedContent(
    content: string,
    response: any,
    provider: 'openai' | 'anthropic' | 'gemini',
    model: string,
    metadata?: any
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(content, provider, model);
    
    // Generate embedding for semantic matching
    const embedding = await this.generateEmbedding(content);
    
    const cacheEntry: CacheEntry = {
      id: cacheKey,
      content,
      ...(embedding && { embedding }),
      provider,
      model,
      timestamp: new Date(),
      hitCount: 0,
      lastHit: new Date(),
      responseTime: 0,
      tokenCount: this.estimateTokenCount(content),
      cacheHint: metadata?.cacheHint || false,
      metadata: {
        ...metadata,
        response,
      },
    };

    // Store in content cache
    this.contentCache.set(cacheKey, cacheEntry);
    
    // Add to semantic index if embedding available
    if (embedding) {
      this.semanticIndex.set(cacheKey, cacheEntry);
    }

    // Update cache size metric
    this.metrics.cacheSize = this.contentCache.keys().length;
    
    console.log(`[CACHE] Stored ${provider}/${model} content (${cacheEntry.tokenCount} tokens)`);
    return cacheKey;
  }

  /**
   * Find semantic matches using vector similarity
   */
  private async findSemanticMatch(
    content: string,
    provider: 'openai' | 'anthropic' | 'gemini',
    model: string
  ): Promise<CacheEntry | null> {
    if (!this.openai || this.semanticIndex.size === 0) {
      return null;
    }

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(content);
      if (!queryEmbedding) return null;

      let bestMatch: CacheEntry | null = null;
      let bestSimilarity = 0;

      // Check all cached entries for the same provider/model
      for (const [key, entry] of this.semanticIndex) {
        if (entry.provider !== provider || entry.model !== model || !entry.embedding) {
          continue;
        }

        const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
        
        if (similarity > SEMANTIC_THRESHOLD && similarity > bestSimilarity) {
          bestMatch = entry;
          bestSimilarity = similarity;
        }
      }

      if (bestMatch) {
        bestMatch.metadata = {
          ...bestMatch.metadata,
          similarity: bestSimilarity,
        };
      }

      return bestMatch;
    } catch (error) {
      console.error('[CACHE] Error in semantic matching:', error);
      return null;
    }
  }

  /**
   * Generate embedding for semantic matching
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.openai) return null;

    const cacheKey = `embedding_${crypto.createHash('md5').update(text).digest('hex')}`;
    const cached = this.embeddingCache.get<number[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      const embedding = response.data[0].embedding;
      this.embeddingCache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.error('[CACHE] Error generating embedding:', error);
      return null;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
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

  /**
   * Record cache hit and update metrics
   */
  private recordHit(entry: CacheEntry): void {
    entry.hitCount++;
    entry.lastHit = new Date();
    
    this.metrics.hitRate = (this.metrics.hitRate * (this.metrics.totalRequests - 1) + 1) / this.metrics.totalRequests;
    this.metrics.missRate = 1 - this.metrics.hitRate;
    
    // Estimate cost savings (rough calculation)
    const estimatedCost = this.estimateCost(entry.provider, entry.tokenCount);
    this.metrics.costSavings += estimatedCost;
  }

  /**
   * Update average response time
   */
  private updateResponseTime(responseTime: number): void {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(content: string, provider: string, model: string): string {
    const hash = crypto.createHash('sha256')
      .update(`${provider}:${model}:${content}`)
      .digest('hex');
    return `${provider}_${model}_${hash}`;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate API cost for different providers
   */
  private estimateCost(provider: string, tokenCount: number): number {
    const costPer1kTokens = {
      openai: 0.002, // GPT-4 approximate
      anthropic: 0.003, // Claude approximate
      gemini: 0.001, // Gemini approximate
    };

    return (costPer1kTokens[provider as keyof typeof costPer1kTokens] || 0.002) * (tokenCount / 1000);
  }

  /**
   * Get cache metrics
   */
  public getMetrics(): CacheMetrics {
    this.metrics.cacheSize = this.contentCache.keys().length;
    return { ...this.metrics };
  }

  /**
   * Clear all caches
   */
  public clearAllCaches(): void {
    this.contentCache.flushAll();
    this.embeddingCache.flushAll();
    this.semanticIndex.clear();
    
    // Reset metrics
    this.metrics = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      costSavings: 0,
      cacheSize: 0,
      evictions: 0,
    };
    
    console.log('[CACHE] All caches cleared and metrics reset');
  }

  /**
   * Warm cache with high-value content
   */
  public async warmCache(entries: Array<{
    content: string;
    provider: 'openai' | 'anthropic' | 'gemini';
    model: string;
    response: any;
    metadata?: any;
  }>): Promise<void> {
    console.log(`[CACHE] Warming cache with ${entries.length} entries`);
    
    for (const entry of entries) {
      await this.setCachedContent(
        entry.content,
        entry.response,
        entry.provider,
        entry.model,
        { ...entry.metadata, warmed: true }
      );
    }
    
    console.log('[CACHE] Cache warming completed');
  }

  /**
   * Get cache effectiveness report
   */
  public getCacheReport(): string {
    const metrics = this.getMetrics();
    
    return `
=== SDOF Prompt Cache Report ===
Hit Rate: ${(metrics.hitRate * 100).toFixed(2)}% (Target: ${(CACHE_HIT_TARGET * 100)}%)
Miss Rate: ${(metrics.missRate * 100).toFixed(2)}%
Total Requests: ${metrics.totalRequests}
Average Response Time: ${metrics.averageResponseTime.toFixed(0)}ms
Estimated Cost Savings: $${metrics.costSavings.toFixed(4)}
Cache Size: ${metrics.cacheSize} entries
Cache Evictions: ${metrics.evictions}
Semantic Index Size: ${this.semanticIndex.size} entries
================================
`;
  }
}

// Export singleton instance
export default MultiProviderCacheService.getInstance();