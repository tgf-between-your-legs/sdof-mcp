/**
 * Database Service
 * 
 * This service handles all operations related to the MongoDB database,
 * including connection management and vector search operations.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import KnowledgeEntry, { IKnowledgeEntry } from '../models/knowledge-entry.model.js';
import embeddingService from './embedding.service.js';
import NodeCache from 'node-cache';

dotenv.config();

// Load environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sdof_knowledge_base';
const SEARCH_CACHE_TTL = parseInt(process.env.SEARCH_CACHE_TTL || '300', 10);

// Initialize cache for search results
const searchCache = new NodeCache({
  stdTTL: SEARCH_CACHE_TTL, // Time to live in seconds (default: 5 minutes)
  checkperiod: 60, // Check for expired keys every minute
});

/**
 * Database Service class for managing MongoDB operations
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected: boolean = false;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Connect to MongoDB
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Already connected to MongoDB');
      return;
    }

    try {
      await mongoose.connect(MONGODB_URI);
      this.isConnected = true;
      console.log('Connected to MongoDB');
      
      // Set up vector search index if it doesn't exist yet
      // Note: This would typically be done through the MongoDB Atlas UI
      // or using the MongoDB command line tools
      console.log('Vector search index should be set up manually in MongoDB Atlas');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.log('Not connected to MongoDB');
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Failed to disconnect from MongoDB:', error);
      throw new Error(`Database disconnection failed: ${error}`);
    }
  }

  /**
   * Create a new knowledge entry
   */
  public async createEntry(entryData: Partial<IKnowledgeEntry>): Promise<IKnowledgeEntry> {
    try {
      // Generate embedding if not provided
      if (!entryData.vector) {
        entryData.vector = await embeddingService.generateEntryEmbedding(
          entryData.title || '',
          entryData.content || '',
          entryData.tags
        );
      }

      // Create and save the new entry
      const newEntry = new KnowledgeEntry(entryData);
      await newEntry.save();
      
      // Clear search cache as the knowledge base has changed
      searchCache.flushAll();
      
      return newEntry;
    } catch (error) {
      console.error('Failed to create knowledge entry:', error);
      throw new Error(`Knowledge entry creation failed: ${error}`);
    }
  }

  /**
   * Get a knowledge entry by ID
   */
  public async getEntryById(id: string): Promise<IKnowledgeEntry | null> {
    try {
      const entry = await KnowledgeEntry.findById(id);
      
      // Record access if entry exists
      if (entry) {
        // Manual implementation of recordAccess since the method might not be available
        try {
          entry.accessCount = (entry.accessCount || 0) + 1;
          entry.lastAccessedAt = new Date();
          await entry.save();
        } catch (err) {
          console.warn('Failed to record access:', err);
        }
      }
      
      return entry;
    } catch (error) {
      console.error(`Failed to get knowledge entry with ID ${id}:`, error);
      throw new Error(`Knowledge entry retrieval failed: ${error}`);
    }
  }

  /**
   * Update a knowledge entry
   */
  public async updateEntry(id: string, entryData: Partial<IKnowledgeEntry>): Promise<IKnowledgeEntry | null> {
    try {
      // Check if content or title has changed, and regenerate embedding if needed
      if (entryData.content || entryData.title || entryData.tags) {
        const entry = await KnowledgeEntry.findById(id);
        if (entry) {
          const title = entryData.title || entry.title;
          const content = entryData.content || entry.content;
          const tags = entryData.tags || entry.tags;
          
          entryData.vector = await embeddingService.generateEntryEmbedding(title, content, tags);
        }
      }

      // Update the entry
      const updatedEntry = await KnowledgeEntry.findByIdAndUpdate(
        id,
        { $set: entryData },
        { new: true } // Return the updated document
      );
      
      // Clear search cache as the knowledge base has changed
      searchCache.flushAll();
      
      return updatedEntry;
    } catch (error) {
      console.error(`Failed to update knowledge entry with ID ${id}:`, error);
      throw new Error(`Knowledge entry update failed: ${error}`);
    }
  }

  /**
   * Delete a knowledge entry
   */
  public async deleteEntry(id: string): Promise<boolean> {
    try {
      const result = await KnowledgeEntry.findByIdAndDelete(id);
      
      // Clear search cache as the knowledge base has changed
      searchCache.flushAll();
      
      return !!result;
    } catch (error) {
      console.error(`Failed to delete knowledge entry with ID ${id}:`, error);
      throw new Error(`Knowledge entry deletion failed: ${error}`);
    }
  }

  /**
   * Search for knowledge entries by vector similarity
   */
  public async vectorSearch(queryText: string, limit: number = 5): Promise<IKnowledgeEntry[]> {
    try {
      // Check cache first
      const cacheKey = `vector_search:${queryText}:${limit}`;
      const cachedResults = searchCache.get<IKnowledgeEntry[]>(cacheKey);
      
      if (cachedResults) {
        console.log('Using cached search results');
        return cachedResults;
      }

      // Generate embedding for the query text
      const queryVector = await embeddingService.generateEmbedding(queryText);
      
      // Perform vector search using MongoDB Atlas $vectorSearch
      // Note: This requires a vector search index to be set up in MongoDB Atlas
      const results = await KnowledgeEntry.aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            queryVector,
            path: 'vector',
            numCandidates: limit * 10, // Fetch more candidates for better results
            limit: limit
          }
        }
      ]);
      
      // Cache the results
      searchCache.set(cacheKey, results);
      
      return results;
    } catch (error) {
      console.error('Failed to perform vector search:', error);
      
      // Fallback to text search if vector search fails
      console.log('Falling back to text search');
      return this.textSearch(queryText, limit);
    }
  }

  /**
   * Search for knowledge entries by text similarity (fallback)
   */
  public async textSearch(queryText: string, limit: number = 5): Promise<IKnowledgeEntry[]> {
    try {
      // Check cache first
      const cacheKey = `text_search:${queryText}:${limit}`;
      const cachedResults = searchCache.get<IKnowledgeEntry[]>(cacheKey);
      
      if (cachedResults) {
        console.log('Using cached text search results');
        return cachedResults;
      }

      // Perform text search using MongoDB's text index
      const results = await KnowledgeEntry.find(
        { $text: { $search: queryText } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit);
      
      // Cache the results
      searchCache.set(cacheKey, results);
      
      return results;
    } catch (error) {
      console.error('Failed to perform text search:', error);
      throw new Error(`Text search failed: ${error}`);
    }
  }

  /**
   * Hybrid search combining vector and text search results
   */
  public async hybridSearch(queryText: string, limit: number = 5): Promise<IKnowledgeEntry[]> {
    try {
      // Check cache first
      const cacheKey = `hybrid_search:${queryText}:${limit}`;
      const cachedResults = searchCache.get<IKnowledgeEntry[]>(cacheKey);
      
      if (cachedResults) {
        console.log('Using cached hybrid search results');
        return cachedResults;
      }

      // Get results from both search methods
      const vectorResults = await this.vectorSearch(queryText, limit);
      const textResults = await this.textSearch(queryText, limit);
      
      // Combine and deduplicate results
      const combinedMap = new Map<string, IKnowledgeEntry>();
      
      // Add vector results first (they're usually more relevant)
      vectorResults.forEach(entry => {
        if (entry && entry._id) {
          combinedMap.set(entry._id.toString(), entry);
        }
      });
      
      // Add text results that aren't already included
      textResults.forEach(entry => {
        if (entry && entry._id && !combinedMap.has(entry._id.toString())) {
          combinedMap.set(entry._id.toString(), entry);
        }
      });
      
      // Convert back to array and limit
      const combinedResults = Array.from(combinedMap.values()).slice(0, limit);
      
      // Cache the results
      searchCache.set(cacheKey, combinedResults);
      
      return combinedResults;
    } catch (error) {
      console.error('Failed to perform hybrid search:', error);
      throw new Error(`Hybrid search failed: ${error}`);
    }
  }

  /**
   * Get knowledge entries by category
   */
  public async getEntriesByCategory(category: string, limit: number = 10): Promise<IKnowledgeEntry[]> {
    try {
      return await KnowledgeEntry.find({ category }).limit(limit);
    } catch (error) {
      console.error(`Failed to get entries for category ${category}:`, error);
      throw new Error(`Category search failed: ${error}`);
    }
  }

  /**
   * Get knowledge entries by tag
   */
  public async getEntriesByTag(tag: string, limit: number = 10): Promise<IKnowledgeEntry[]> {
    try {
      return await KnowledgeEntry.find({ tags: tag }).limit(limit);
    } catch (error) {
      console.error(`Failed to get entries for tag ${tag}:`, error);
      throw new Error(`Tag search failed: ${error}`);
    }
  }

  /**
   * Get most frequently accessed entries
   */
  public async getMostAccessedEntries(limit: number = 10): Promise<IKnowledgeEntry[]> {
    try {
      return await KnowledgeEntry.find().sort({ accessCount: -1 }).limit(limit);
    } catch (error) {
      console.error('Failed to get most accessed entries:', error);
      throw new Error(`Most accessed retrieval failed: ${error}`);
    }
  }

  /**
   * Clear the search cache
   */
  public clearSearchCache(): void {
    searchCache.flushAll();
    console.log('Search cache cleared');
  }
}

// Export singleton instance
export default DatabaseService.getInstance();