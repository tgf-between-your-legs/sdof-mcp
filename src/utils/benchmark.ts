/**
 * Performance Benchmark Utility
 * 
 * This script measures the performance of the knowledge base operations,
 * particularly focusing on vector search and embedding generation.
 */

import dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import databaseService from '../services/database.service.js';
import embeddingService from '../services/embedding.service.js';
import { chunkText, sleep } from './helpers.js';

// Load environment variables
dotenv.config();

// Sample data for benchmarking
const sampleEntries = [
  {
    title: 'Vector Database Implementation',
    content: 'Vector databases store data as high-dimensional vectors, enabling efficient similarity search. They are particularly useful for applications requiring semantic search capabilities, like natural language processing, image recognition, and recommendation systems.',
    contentType: 'text',
    category: 'implementation',
    tags: ['vector-db', 'implementation', 'architecture'],
  },
  {
    title: 'Embedding Generation Techniques',
    content: 'Text embedding models convert text into numerical vector representations that capture semantic meaning. These vectors allow machines to understand relationships between words and concepts, enabling semantic search, clustering, and other NLP tasks.',
    contentType: 'text',
    category: 'implementation',
    tags: ['embeddings', 'nlp', 'implementation'],
  },
  {
    title: 'MongoDB Vector Search',
    content: 'MongoDB Atlas Vector Search provides capabilities for storing and querying vector embeddings alongside structured data. It supports k-nearest neighbors (KNN) search using various distance metrics like cosine similarity and euclidean distance.',
    contentType: 'text',
    category: 'implementation',
    tags: ['mongodb', 'vector-search', 'database'],
  },
  {
    title: 'Hybrid Search Implementation',
    content: 'Hybrid search combines traditional keyword-based search with vector similarity search. This approach leverages the strengths of both methods: keyword search excels at exact matches, while vector search captures semantic relationships.',
    contentType: 'text',
    category: 'implementation',
    tags: ['hybrid-search', 'search', 'implementation'],
  },
  {
    title: 'Caching Strategies for Embeddings',
    content: 'Implementing caching for embeddings can significantly improve performance by avoiding redundant computation. Time-based expiration policies help balance memory usage with freshness of cached data.',
    contentType: 'text',
    category: 'optimization',
    tags: ['caching', 'performance', 'optimization'],
  },
];

// Sample queries for benchmarking
const sampleQueries = [
  'How to implement vector search?',
  'What are text embeddings?',
  'MongoDB vector database capabilities',
  'Combining keyword and semantic search',
  'Optimizing embedding generation performance',
  'Vector database architecture',
  'Caching strategies for performance',
  'Semantic search implementation',
  'Storage options for vector embeddings',
  'Text similarity search techniques',
];

/**
 * Measure execution time of a function
 */
async function measureExecutionTime<T>(
  fn: () => Promise<T>,
  label: string
): Promise<{ result: T; time: number }> {
  console.log(`Starting: ${label}`);
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const time = end - start;
  console.log(`Completed: ${label} in ${time.toFixed(2)} ms`);
  return { result, time };
}

/**
 * Run embedding generation benchmark
 */
async function runEmbeddingBenchmark() {
  console.log('\n=== EMBEDDING GENERATION BENCHMARK ===\n');
  
  const results = [];
  
  // Benchmark single embedding generation
  for (let i = 0; i < 3; i++) {
    const testText = `Test text for embedding generation benchmark, iteration ${i}. This text should be long enough to be representative of real-world usage but not so long that it takes too much time to process.`;
    
    const { time } = await measureExecutionTime(
      () => embeddingService.generateEmbedding(testText),
      `Single embedding generation (${testText.length} chars) - Run ${i + 1}`
    );
    
    results.push({
      type: 'single',
      textLength: testText.length,
      time,
    });
    
    // Small delay between API calls
    await sleep(500);
  }
  
  // Benchmark longer text embedding generation
  const longText = sampleEntries.map(entry => `${entry.title}\n${entry.content}`).join('\n\n');
  
  const { time: longTextTime } = await measureExecutionTime(
    () => embeddingService.generateEmbedding(longText),
    `Long text embedding generation (${longText.length} chars)`
  );
  
  results.push({
    type: 'long',
    textLength: longText.length,
    time: longTextTime,
  });
  
  // Benchmark chunked text embedding generation
  const chunks = chunkText(longText, 1000);
  
  const { time: chunkedTime } = await measureExecutionTime(
    async () => {
      const embeddings = [];
      for (const chunk of chunks) {
        const embedding = await embeddingService.generateEmbedding(chunk);
        embeddings.push(embedding);
        await sleep(100);
      }
      return embeddings;
    },
    `Chunked text embedding generation (${chunks.length} chunks)`
  );
  
  results.push({
    type: 'chunked',
    chunks: chunks.length,
    totalLength: longText.length,
    time: chunkedTime,
  });
  
  // Calculate and display average times
  const singleEmbeddingTimes = results
    .filter(r => r.type === 'single')
    .map(r => r.time);
  
  const avgSingleTime = singleEmbeddingTimes.reduce((sum, time) => sum + time, 0) / singleEmbeddingTimes.length;
  
  console.log('\n=== EMBEDDING BENCHMARK RESULTS ===\n');
  console.log(`Average time for single embedding: ${avgSingleTime.toFixed(2)} ms`);
  console.log(`Time for long text (${longText.length} chars): ${longTextTime.toFixed(2)} ms`);
  console.log(`Time for chunked text (${chunks.length} chunks): ${chunkedTime.toFixed(2)} ms`);
  console.log(`Chunking efficiency: ${(longTextTime / chunkedTime).toFixed(2)}x`);
  
  return results;
}

/**
 * Run database operations benchmark
 */
async function runDatabaseBenchmark() {
  console.log('\n=== DATABASE OPERATIONS BENCHMARK ===\n');
  
  try {
    // Connect to database
    await databaseService.connect();
    
    const results = {
      create: [] as number[],
      vectorSearch: [] as number[],
      textSearch: [] as number[],
      hybridSearch: [] as number[],
      categoryFilter: [] as number[],
      tagFilter: [] as number[],
    };
    
    // Create test entries
    const createdEntries = [];
    
    for (const entry of sampleEntries) {
      const { time, result } = await measureExecutionTime(
        () => databaseService.createEntry(entry),
        `Create entry: ${entry.title}`
      );
      
      results.create.push(time);
      createdEntries.push(result);
      
      // Small delay between operations
      await sleep(500);
    }
    
    // Run vector search benchmark
    for (const query of sampleQueries.slice(0, 5)) {
      const { time } = await measureExecutionTime(
        () => databaseService.vectorSearch(query, 3),
        `Vector search: "${query}"`
      );
      
      results.vectorSearch.push(time);
      
      // Small delay between operations
      await sleep(300);
    }
    
    // Run text search benchmark
    for (const query of sampleQueries.slice(0, 5)) {
      const { time } = await measureExecutionTime(
        () => databaseService.textSearch(query, 3),
        `Text search: "${query}"`
      );
      
      results.textSearch.push(time);
      
      // Small delay between operations
      await sleep(300);
    }
    
    // Run hybrid search benchmark
    for (const query of sampleQueries.slice(0, 5)) {
      const { time } = await measureExecutionTime(
        () => databaseService.hybridSearch(query, 3),
        `Hybrid search: "${query}"`
      );
      
      results.hybridSearch.push(time);
      
      // Small delay between operations
      await sleep(300);
    }
    
    // Run category filter benchmark
    const { time: categoryTime } = await measureExecutionTime(
      () => databaseService.getEntriesByCategory('implementation', 10),
      'Filter by category: "implementation"'
    );
    
    results.categoryFilter.push(categoryTime);
    
    // Run tag filter benchmark
    const { time: tagTime } = await measureExecutionTime(
      () => databaseService.getEntriesByTag('vector-search', 10),
      'Filter by tag: "vector-search"'
    );
    
    results.tagFilter.push(tagTime);
    
    // Calculate and display average times
    const avgCreateTime = results.create.reduce((sum, time) => sum + time, 0) / results.create.length;
    const avgVectorSearchTime = results.vectorSearch.reduce((sum, time) => sum + time, 0) / results.vectorSearch.length;
    const avgTextSearchTime = results.textSearch.reduce((sum, time) => sum + time, 0) / results.textSearch.length;
    const avgHybridSearchTime = results.hybridSearch.reduce((sum, time) => sum + time, 0) / results.hybridSearch.length;
    
    console.log('\n=== DATABASE BENCHMARK RESULTS ===\n');
    console.log(`Average time for entry creation: ${avgCreateTime.toFixed(2)} ms`);
    console.log(`Average time for vector search: ${avgVectorSearchTime.toFixed(2)} ms`);
    console.log(`Average time for text search: ${avgTextSearchTime.toFixed(2)} ms`);
    console.log(`Average time for hybrid search: ${avgHybridSearchTime.toFixed(2)} ms`);
    console.log(`Time for category filter: ${results.categoryFilter[0].toFixed(2)} ms`);
    console.log(`Time for tag filter: ${results.tagFilter[0].toFixed(2)} ms`);
    
    // Compare search methods
    console.log('\n=== SEARCH METHOD COMPARISON ===\n');
    console.log(`Vector vs Text search: ${(avgTextSearchTime / avgVectorSearchTime).toFixed(2)}x`);
    console.log(`Hybrid vs Vector search: ${(avgVectorSearchTime / avgHybridSearchTime).toFixed(2)}x`);
    console.log(`Hybrid vs Text search: ${(avgTextSearchTime / avgHybridSearchTime).toFixed(2)}x`);
    
    // Clean up test data
    console.log('\n=== CLEANING UP TEST DATA ===\n');
    for (const entry of createdEntries) {
      // Handle the type issue with entry._id
      if (entry && entry._id) {
        const entryId = typeof entry._id.toString === 'function' ? 
          entry._id.toString() : 
          String(entry._id);
        
        await databaseService.deleteEntry(entryId);
        console.log(`Deleted entry: ${entry.title || 'Unnamed entry'}`);
      }
    }
    
    return results;
  } finally {
    // Disconnect from database
    await databaseService.disconnect();
  }
}

/**
 * Run cache performance benchmark
 */
async function runCacheBenchmark() {
  console.log('\n=== CACHE PERFORMANCE BENCHMARK ===\n');
  
  const results = {
    firstCall: [] as number[],
    cachedCall: [] as number[],
  };
  
  // Test embedding cache
  for (const text of sampleQueries.slice(0, 3)) {
    // First call (uncached)
    const { time: firstTime } = await measureExecutionTime(
      () => embeddingService.generateEmbedding(text),
      `First embedding call: "${text}"`
    );
    
    results.firstCall.push(firstTime);
    
    // Second call (should be cached)
    const { time: cachedTime } = await measureExecutionTime(
      () => embeddingService.generateEmbedding(text),
      `Cached embedding call: "${text}"`
    );
    
    results.cachedCall.push(cachedTime);
    
    // Small delay between tests
    await sleep(300);
  }
  
  // Connect to database for search cache tests
  await databaseService.connect();
  
  try {
    // Test search cache
    for (const query of sampleQueries.slice(0, 3)) {
      // First call (uncached)
      const { time: firstTime } = await measureExecutionTime(
        () => databaseService.hybridSearch(query, 3),
        `First search call: "${query}"`
      );
      
      results.firstCall.push(firstTime);
      
      // Second call (should be cached)
      const { time: cachedTime } = await measureExecutionTime(
        () => databaseService.hybridSearch(query, 3),
        `Cached search call: "${query}"`
      );
      
      results.cachedCall.push(cachedTime);
      
      // Small delay between tests
      await sleep(300);
    }
    
    // Calculate average times and speedup
    const avgFirstTime = results.firstCall.reduce((sum, time) => sum + time, 0) / results.firstCall.length;
    const avgCachedTime = results.cachedCall.reduce((sum, time) => sum + time, 0) / results.cachedCall.length;
    const speedup = avgFirstTime / avgCachedTime;
    
    console.log('\n=== CACHE BENCHMARK RESULTS ===\n');
    console.log(`Average time for first call: ${avgFirstTime.toFixed(2)} ms`);
    console.log(`Average time for cached call: ${avgCachedTime.toFixed(2)} ms`);
    console.log(`Cache speedup: ${speedup.toFixed(2)}x`);
    
    return results;
  } finally {
    // Disconnect from database
    await databaseService.disconnect();
  }
}

/**
 * Run the full benchmark suite
 */
async function runBenchmarks() {
  console.log('=== SDOF KNOWLEDGE BASE PERFORMANCE BENCHMARKS ===\n');
  
  const startTime = performance.now();
  
  try {
    // Run individual benchmarks
    const embeddingResults = await runEmbeddingBenchmark();
    const databaseResults = await runDatabaseBenchmark();
    const cacheResults = await runCacheBenchmark();
    
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log(`\n=== BENCHMARK SUMMARY ===\n`);
    console.log(`Total benchmark time: ${totalTime.toFixed(2)} seconds`);
    
    // Return comprehensive results
    return {
      embedding: embeddingResults,
      database: databaseResults,
      cache: cacheResults,
      totalTime,
    };
  } catch (error) {
    console.error('Error running benchmarks:', error);
    throw error;
  }
}

// Execute benchmarks if this file is run directly
if (typeof require !== 'undefined' && require.main === module) {
  runBenchmarks()
    .then(() => {
      console.log('Benchmarks completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}

export default runBenchmarks;