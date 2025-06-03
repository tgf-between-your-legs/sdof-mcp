/**
 * Embedding Service
 *
 * This service is responsible for generating vector embeddings from text content
 * using OpenAI's embedding API with caching for performance optimization.
 */

import { OpenAI } from 'openai';
import NodeCache from 'node-cache';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Load environment variables that don't change during runtime
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_CACHE_TTL = parseInt(process.env.EMBEDDING_CACHE_TTL || '3600'); // Default: 1 hour

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Initialize cache for embeddings
const embeddingCache = new NodeCache({
  stdTTL: EMBEDDING_CACHE_TTL, // Time to live in seconds
  checkperiod: 120, // Check for expired keys every 2 minutes
});

/**
 * Embedding Service class for generating and managing vector embeddings
 */
export class EmbeddingService {
  private static instance: EmbeddingService;
  private readonly openaiModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    const embeddingService = process.env.EMBEDDING_SERVICE || 'openai';
    
    // Validate that only supported services are configured
    if (embeddingService === 'claude') {
      throw new Error('Claude embeddings are not supported. Anthropic/Claude does not provide an embeddings API. Please use "openai" as the EMBEDDING_SERVICE.');
    }
    
    if (embeddingService !== 'openai') {
      console.warn(`Unsupported embedding service: ${embeddingService}. Falling back to OpenAI.`);
    }
    
    console.log(`Embedding service initialized with: openai`);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Generate a hash key for caching
   */
  private generateCacheKey(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * Generate embedding vector from text using OpenAI
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    if (!openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await openai.embeddings.create({
      model: this.openaiModel,
      input: text,
    });

    return response.data[0].embedding;
  }


  /**
   * Generate embedding vector from text using OpenAI
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(text);
      const cachedEmbedding = embeddingCache.get<number[]>(cacheKey);
      
      if (cachedEmbedding) {
        console.log('Using cached embedding');
        return cachedEmbedding;
      }

      // Validate embedding service configuration
      const embeddingService = process.env.EMBEDDING_SERVICE || 'openai';
      if (embeddingService === 'claude') {
        throw new Error('Claude embeddings are not supported. Anthropic/Claude does not provide an embeddings API. Please use "openai" as the EMBEDDING_SERVICE.');
      }
      
      console.log(`Generating new embedding using OpenAI`);
      
      // Generate embedding using OpenAI (only supported service)
      const embedding = await this.generateOpenAIEmbedding(text);

      // Cache the result
      embeddingCache.set(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate embedding for a knowledge entry by combining title and content
   */
  public async generateEntryEmbedding(title: string, content: string, tags: string[] = []): Promise<number[]> {
    // Combine title, content, and tags for a more comprehensive embedding
    const combinedText = `${title}\n\n${content}\n\n${tags.join(', ')}`;
    return this.generateEmbedding(combinedText);
  }

  /**
   * Get the dimensions of the OpenAI embedding model
   */
  public getDimensions(): number {
    // OpenAI text-embedding-3-large has 3072 dimensions
    // OpenAI text-embedding-3-small has 1536 dimensions
    const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';
    return model.includes('small') ? 1536 : 3072;
  }

  /**
   * Clear the embedding cache
   */
  public clearCache(): void {
    embeddingCache.flushAll();
    console.log('Embedding cache cleared');
  }
}

// Export singleton instance
export default EmbeddingService.getInstance();