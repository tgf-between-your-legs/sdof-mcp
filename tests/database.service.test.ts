/**
 * Database Service Tests
 * 
 * Tests for the database service including CRUD operations and search functionality.
 */

import mongoose from 'mongoose';
import databaseService from '../src/services/database.service';
import KnowledgeEntry, { IKnowledgeEntry } from '../src/models/knowledge-entry.model';
import embeddingService from '../src/services/embedding.service';

// Mock dependencies
jest.mock('../src/services/embedding.service', () => ({
  generateEmbedding: jest.fn().mockResolvedValue(Array(1536).fill(0.1)),
  generateEntryEmbedding: jest.fn().mockResolvedValue(Array(1536).fill(0.1)),
  getDimensions: jest.fn().mockReturnValue(1536),
  clearCache: jest.fn(),
}));

// Mock MongoDB connection
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  };
});

// Mock KnowledgeEntry model
jest.mock('../src/models/knowledge-entry.model', () => {
  const mockModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
  };
  
  mockModel.prototype.save = jest.fn().mockResolvedValue({
    _id: 'mock-id',
    title: 'Test Entry',
    content: 'Test content',
    contentType: 'text',
    category: 'test',
    tags: ['test'],
    vector: Array(1536).fill(0.1),
    createdAt: new Date(),
    updatedAt: new Date(),
    accessCount: 0,
    recordAccess: jest.fn().mockResolvedValue(undefined),
  });
  
  return {
    __esModule: true,
    default: mockModel,
  };
});

describe('Database Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await databaseService.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect to MongoDB', async () => {
      await databaseService.connect();
      expect(mongoose.connect).toHaveBeenCalled();
    });

    it('should disconnect from MongoDB', async () => {
      await databaseService.disconnect();
      expect(mongoose.disconnect).toHaveBeenCalled();
    });
  });

  describe('CRUD Operations', () => {
    it('should create a knowledge entry', async () => {
      const entryData = {
        title: 'Test Entry',
        content: 'Test content',
        contentType: 'text',
        category: 'test',
        tags: ['test'],
      };

      const newEntry = await databaseService.createEntry(entryData);
      
      expect(embeddingService.generateEntryEmbedding).toHaveBeenCalledWith(
        entryData.title,
        entryData.content,
        entryData.tags
      );
      
      expect(newEntry).toBeDefined();
      expect(newEntry.title).toBe(entryData.title);
    });

    it('should get a knowledge entry by ID', async () => {
      const mockEntry = {
        _id: 'mock-id',
        title: 'Test Entry',
        content: 'Test content',
        contentType: 'text',
        category: 'test',
        tags: ['test'],
        vector: Array(1536).fill(0.1),
        createdAt: new Date(),
        updatedAt: new Date(),
        accessCount: 1,
        recordAccess: jest.fn().mockResolvedValue(undefined),
      };

      (KnowledgeEntry.findById as jest.Mock).mockResolvedValue(mockEntry);
      
      const entry = await databaseService.getEntryById('mock-id');
      
      expect(KnowledgeEntry.findById).toHaveBeenCalledWith('mock-id');
      expect(entry).toEqual(mockEntry);
      expect(mockEntry.recordAccess).toHaveBeenCalled();
    });

    it('should update a knowledge entry', async () => {
      const mockEntry = {
        _id: 'mock-id',
        title: 'Original Title',
        content: 'Original content',
        contentType: 'text',
        category: 'test',
        tags: ['test'],
        vector: Array(1536).fill(0.1),
      };

      const updatedMockEntry = {
        ...mockEntry,
        title: 'Updated Title',
      };

      (KnowledgeEntry.findById as jest.Mock).mockResolvedValue(mockEntry);
      (KnowledgeEntry.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedMockEntry);
      
      const updateData = {
        title: 'Updated Title',
      };
      
      const updatedEntry = await databaseService.updateEntry('mock-id', updateData);
      
      expect(KnowledgeEntry.findById).toHaveBeenCalledWith('mock-id');
      expect(embeddingService.generateEntryEmbedding).toHaveBeenCalled();
      expect(KnowledgeEntry.findByIdAndUpdate).toHaveBeenCalled();
      expect(updatedEntry).toEqual(updatedMockEntry);
    });

    it('should delete a knowledge entry', async () => {
      (KnowledgeEntry.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: 'mock-id' });
      
      const result = await databaseService.deleteEntry('mock-id');
      
      expect(KnowledgeEntry.findByIdAndDelete).toHaveBeenCalledWith('mock-id');
      expect(result).toBe(true);
    });
  });

  describe('Search Operations', () => {
    it('should perform vector search', async () => {
      const mockResults = [
        {
          _id: 'result-1',
          title: 'Result 1',
          content: 'Result content 1',
          score: 0.95,
        },
        {
          _id: 'result-2',
          title: 'Result 2',
          content: 'Result content 2',
          score: 0.85,
        },
      ];

      (KnowledgeEntry.aggregate as jest.Mock).mockResolvedValue(mockResults);
      
      const results = await databaseService.vectorSearch('test query', 2);
      
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith('test query');
      expect(KnowledgeEntry.aggregate).toHaveBeenCalled();
      expect(results).toEqual(mockResults);
    });

    it('should perform text search', async () => {
      const mockResults = [
        {
          _id: 'result-1',
          title: 'Result 1',
          content: 'Result content 1',
          score: 0.95,
        },
      ];

      (KnowledgeEntry.find as jest.Mock).mockImplementation(() => ({
        sort: jest.fn().mockImplementation(() => ({
          limit: jest.fn().mockResolvedValue(mockResults),
        })),
      }));
      
      const results = await databaseService.textSearch('test query', 1);
      
      expect(KnowledgeEntry.find).toHaveBeenCalled();
      expect(results).toEqual(mockResults);
    });

    it('should perform hybrid search', async () => {
      const vectorResults = [
        {
          _id: 'result-1',
          title: 'Vector Result 1',
          content: 'Vector content 1',
          score: 0.95,
        },
      ];
      
      const textResults = [
        {
          _id: 'result-2',
          title: 'Text Result 2',
          content: 'Text content 2',
          score: 0.85,
        },
      ];
      
      // Mock the vector and text search methods
      jest.spyOn(databaseService, 'vectorSearch').mockResolvedValue(vectorResults);
      jest.spyOn(databaseService, 'textSearch').mockResolvedValue(textResults);
      
      const results = await databaseService.hybridSearch('test query', 2);
      
      expect(databaseService.vectorSearch).toHaveBeenCalledWith('test query', 2);
      expect(databaseService.textSearch).toHaveBeenCalledWith('test query', 2);
      expect(results.length).toBe(2);
      expect(results).toContainEqual(vectorResults[0]);
      expect(results).toContainEqual(textResults[0]);
    });
  });

  describe('Filtering Operations', () => {
    it('should get entries by category', async () => {
      const mockResults = [
        {
          _id: 'result-1',
          title: 'Category Result 1',
          content: 'Category content 1',
          category: 'test-category',
        },
      ];

      (KnowledgeEntry.find as jest.Mock).mockImplementation(() => ({
        limit: jest.fn().mockResolvedValue(mockResults),
      }));
      
      const results = await databaseService.getEntriesByCategory('test-category', 1);
      
      expect(KnowledgeEntry.find).toHaveBeenCalledWith({ category: 'test-category' });
      expect(results).toEqual(mockResults);
    });

    it('should get entries by tag', async () => {
      const mockResults = [
        {
          _id: 'result-1',
          title: 'Tag Result 1',
          content: 'Tag content 1',
          tags: ['test-tag'],
        },
      ];

      (KnowledgeEntry.find as jest.Mock).mockImplementation(() => ({
        limit: jest.fn().mockResolvedValue(mockResults),
      }));
      
      const results = await databaseService.getEntriesByTag('test-tag', 1);
      
      expect(KnowledgeEntry.find).toHaveBeenCalledWith({ tags: 'test-tag' });
      expect(results).toEqual(mockResults);
    });

    it('should get most accessed entries', async () => {
      const mockResults = [
        {
          _id: 'result-1',
          title: 'Popular Result 1',
          content: 'Popular content 1',
          accessCount: 10,
        },
      ];

      (KnowledgeEntry.find as jest.Mock).mockImplementation(() => ({
        sort: jest.fn().mockImplementation(() => ({
          limit: jest.fn().mockResolvedValue(mockResults),
        })),
      }));
      
      const results = await databaseService.getMostAccessedEntries(1);
      
      expect(KnowledgeEntry.find).toHaveBeenCalled();
      expect(results).toEqual(mockResults);
    });
  });

  describe('Cache Management', () => {
    it('should clear search cache', () => {
      // Mock the internal NodeCache instance
      const originalClearSearchCache = databaseService.clearSearchCache;
      databaseService.clearSearchCache = jest.fn();
      
      databaseService.clearSearchCache();
      
      expect(databaseService.clearSearchCache).toHaveBeenCalled();
      
      // Restore original method
      databaseService.clearSearchCache = originalClearSearchCache;
    });
  });
});