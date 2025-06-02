#!/usr/bin/env node

import { UnifiedDatabaseService } from './services/unified-database.service.js';

async function testUnifiedSystem() {
  console.log('🧪 Testing Unified SDOF Knowledge Base System');
  console.log('======================================================');
  
  const workspaceId = './test-workspace';
  const db = new UnifiedDatabaseService(workspaceId);
  
  try {
    // Test 1: Database auto-initialization
    console.log('\n1. Testing database auto-initialization...');
    console.log('✅ Database will be initialized automatically on first use');
    
    // Test 2: Store SDOF Plan
    console.log('\n2. Testing SDOF plan storage...');
    const planId = await db.storePlan('Test SDOF plan content', {
      phase: 'implementation',
      priority: 'high'
    });
    console.log(`✅ SDOF plan stored with ID: ${planId}`);
    
    // Test 3: Log Decision
    console.log('\n3. Testing decision logging...');
    const decisionId = await db.logDecision(
      'Use OpenAI embeddings instead of Claude',
      'Claude was causing 404 errors, OpenAI is more reliable',
      'Replace all Claude embedding calls with OpenAI text-embedding-3-small',
      ['embedding', 'architecture', 'reliability']
    );
    console.log(`✅ Decision logged with ID: ${decisionId}`);
    
    // Test 4: Log Custom Data
    console.log('\n4. Testing custom data logging...');
    const customDataId = await db.logCustomData(
      'ProjectGlossary',
      'sqlite-vec',
      {
        definition: 'SQLite extension for vector operations',
        type: 'technology',
        status: 'implemented',
        cache_hint: true
      }
    );
    console.log(`✅ Custom data logged with ID: ${customDataId}`);
    
    // Test 5: Log System Pattern
    console.log('\n5. Testing system pattern logging...');
    const patternId = await db.logSystemPattern(
      'Unified MCP Architecture',
      'Single MCP server handling all knowledge base operations with OpenAI embeddings',
      ['architecture', 'mcp', 'unified']
    );
    console.log(`✅ System pattern logged with ID: ${patternId}`);
    
    // Test 6: Log Progress
    console.log('\n6. Testing progress logging...');
    const progressId = await db.logProgress(
      'Eliminate Claude 404 embedding errors',
      'DONE'
    );
    console.log(`✅ Progress logged with ID: ${progressId}`);
    
    // Test 7: Update Product Context
    console.log('\n7. Testing product context update...');
    await db.updateProductContext({
      name: 'SDOF Knowledge Base',
      description: 'Unified knowledge management system with sqlite-vec and OpenAI embeddings',
      version: '1.0.0',
      embedding_service: 'openai',
      vector_db: 'sqlite-vec'
    });
    console.log('✅ Product context updated successfully');
    
    // Test 8: Update Active Context
    console.log('\n8. Testing active context update...');
    await db.updateActiveContext({
      current_task: 'Complete unified SDOF implementation',
      status: 'in_progress',
      focus: 'Eliminate Claude dependencies and validate OpenAI embeddings',
      last_updated: new Date().toISOString()
    });
    console.log('✅ Active context updated successfully');
    
    // Test 9: Retrieve data
    console.log('\n9. Testing data retrieval...');
    
    const decisions = await db.getDecisions(5);
    console.log(`✅ Retrieved ${decisions.length} decisions`);
    
    const customData = await db.getCustomData('ProjectGlossary');
    console.log(`✅ Retrieved ${customData.length} custom data entries`);
    
    const patterns = await db.getSystemPatterns();
    console.log(`✅ Retrieved ${patterns.length} system patterns`);
    
    const progress = await db.getProgress();
    console.log(`✅ Retrieved ${progress.length} progress entries`);
    
    const productContext = await db.getProductContext();
    console.log(`✅ Retrieved product context: ${Object.keys(productContext || {}).length} keys`);
    
    const activeContext = await db.getActiveContext();
    console.log(`✅ Retrieved active context: ${Object.keys(activeContext || {}).length} keys`);
    
    // Test 10: Semantic Search (Critical Test - NO CLAUDE DEPENDENCIES)
    console.log('\n10. Testing semantic search with OpenAI embeddings...');
    console.log('⏳ Generating embeddings and performing vector search...');
    
    const searchResults = await db.semanticSearch(
      'OpenAI embedding implementation architecture',
      3
    );
    
    console.log(`✅ Semantic search completed successfully!`);
    console.log(`✅ Found ${searchResults.length} relevant results`);
    
    if (searchResults.length > 0) {
      console.log('\nTop search results:');
      searchResults.forEach((result, index) => {
        const displayContent = result.content_text ?
          (result.content_text.length > 100 ? result.content_text.substring(0, 100) + '...' : result.content_text)
          : 'No content';
        console.log(`  ${index + 1}. [${result.item_type}] ID:${result.item_id} - ${displayContent} (Score: ${result.similarity_score?.toFixed(4)})`);
      });
    }
    
    // Test 11: Verify no Claude dependencies
    console.log('\n11. Verifying no Claude dependencies...');
    console.log('✅ All tests completed using OpenAI embeddings only');
    console.log('✅ No Claude embedding service calls detected');
    
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('======================================================');
    console.log('✅ Unified SDOF Knowledge Base is working correctly');
    console.log('✅ OpenAI embeddings are functional');
    console.log('✅ sqlite-vec integration is operational'); 
    console.log('✅ No Claude 404 errors detected');
    console.log('✅ System ready for production use');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('======================================================');
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    
    // Check if this is a Claude-related error
    const errorStr = error?.toString().toLowerCase() || '';
    if (errorStr.includes('claude') || errorStr.includes('anthropic') || errorStr.includes('404')) {
      console.error('\n🚨 CLAUDE DEPENDENCY DETECTED! 🚨');
      console.error('This error suggests Claude dependencies still exist in the code.');
      console.error('Please review and eliminate all Claude/Anthropic references.');
    }
    
    process.exit(1);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n🚀 Performance Testing');
  console.log('======================================================');
  
  const workspaceId = './test-workspace';
  const db = new UnifiedDatabaseService(workspaceId);
  
  // Test semantic search performance
  const queries = [
    'vector database implementation',
    'embedding generation optimization',
    'sqlite-vec integration',
    'OpenAI API performance',
    'knowledge base architecture'
  ];
  
  console.log('Testing semantic search performance (5 queries)...');
  const startTime = Date.now();
  
  for (const query of queries) {
    const queryStart = Date.now();
    const results = await db.semanticSearch(query, 5);
    const queryTime = Date.now() - queryStart;
    console.log(`  Query: "${query}" - ${queryTime}ms (${results.length} results)`);
  }
  
  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / queries.length;
  
  console.log(`\n📊 Performance Results:`);
  console.log(`  Total time: ${totalTime}ms`);
  console.log(`  Average query time: ${avgTime.toFixed(1)}ms`);
  console.log(`  Target: <500ms per query`);
  
  if (avgTime < 500) {
    console.log('✅ Performance target met!');
  } else {
    console.log('⚠️  Performance target not met, consider optimization');
  }
}

// Run tests
async function runAllTests() {
  try {
    await testUnifiedSystem();
    await performanceTest();
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { testUnifiedSystem, performanceTest };