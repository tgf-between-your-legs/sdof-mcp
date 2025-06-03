#!/usr/bin/env node

/**
 * Validation script to verify SDOF Knowledge Base configuration
 * and test the embedding service functionality
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3001';

async function validateEnvironment() {
  console.log('🔍 Validating environment configuration...');
  
  // Check .env file
  const envPath = '.env';
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const embeddingService = envContent.match(/EMBEDDING_SERVICE=(\w+)/)?.[1];
  const httpPort = envContent.match(/HTTP_PORT=(\d+)/)?.[1];
  
  console.log(`   - EMBEDDING_SERVICE: ${embeddingService}`);
  console.log(`   - HTTP_PORT: ${httpPort}`);
  
  if (embeddingService !== 'openai') {
    console.log('❌ EMBEDDING_SERVICE should be "openai"');
    return false;
  }
  
  if (httpPort !== '3001') {
    console.log('❌ HTTP_PORT should be "3001"');
    return false;
  }
  
  console.log('✅ Environment configuration looks good');
  return true;
}

async function testService() {
  console.log('\n🧪 Testing HTTP API endpoints...');
  
  // Test health endpoint
  try {
    console.log('   Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    
    if (!healthResponse.ok) {
      console.log(`❌ Health endpoint failed: ${healthResponse.status}`);
      return false;
    }
    
    const healthData = await healthResponse.json();
    console.log(`   ✅ Health endpoint working (service: ${healthData.service})`);
    
    // Test embedding endpoint
    console.log('   Testing embedding endpoint...');
    const embedResponse = await fetch(`${BASE_URL}/api/vectors/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Test embedding generation' })
    });
    
    if (!embedResponse.ok) {
      const errorData = await embedResponse.json();
      console.log(`❌ Embedding endpoint failed: ${embedResponse.status} - ${errorData.error}`);
      return false;
    }
    
    const embedData = await embedResponse.json();
    console.log(`   ✅ Embedding endpoint working (model: ${embedData.model}, dimensions: ${embedData.dimensions})`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ Service test failed: ${error.message}`);
    console.log('   Make sure the service is running with: npm run build && npm start');
    return false;
  }
}

async function main() {
  console.log('🚀 SDOF Knowledge Base Configuration Validation\n');
  
  const envValid = await validateEnvironment();
  
  if (!envValid) {
    console.log('\n💥 Environment validation failed. Please fix configuration issues.');
    process.exit(1);
  }
  
  const serviceValid = await testService();
  
  if (!serviceValid) {
    console.log('\n💥 Service test failed. Please restart the service and try again.');
    process.exit(1);
  }
  
  console.log('\n🎉 All validations passed! SDOF Knowledge Base is ready.');
  console.log('\n📋 Summary:');
  console.log('   - Environment configured for OpenAI embeddings');
  console.log('   - HTTP API server responding on port 3001');
  console.log('   - Embedding generation working');
  console.log('   - Ready for store_sdof_plan operations');
}

main().catch(error => {
  console.error('Validation script failed:', error);
  process.exit(1);
});