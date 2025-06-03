/**
 * Test script for SDOF Knowledge Base HTTP API
 * 
 * This script validates that the HTTP API endpoints work correctly
 * and match the expectations of the Python VectorStorageHandler.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const EMBED_ENDPOINT = `${BASE_URL}/api/vectors/embed`;
const HEALTH_ENDPOINT = `${BASE_URL}/health`;

async function testHealthEndpoint() {
    console.log('Testing health endpoint...');
    try {
        const response = await fetch(HEALTH_ENDPOINT);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Health endpoint working:', data);
            return true;
        } else {
            console.log('❌ Health endpoint failed:', response.status, data);
            return false;
        }
    } catch (error) {
        console.log('❌ Health endpoint error:', error.message);
        return false;
    }
}

async function testEmbeddingEndpoint() {
    console.log('Testing embedding endpoint...');
    
    const testText = "This is a test document for generating embeddings using the SDOF knowledge base service.";
    
    try {
        const response = await fetch(EMBED_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: testText })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Embedding endpoint working');
            console.log(`   - Model: ${data.model}`);
            console.log(`   - Dimensions: ${data.dimensions}`);
            console.log(`   - Embedding length: ${data.embedding?.length || 0}`);
            
            // Validate response format matches Python client expectations
            const isValidResponse = (
                data.embedding &&
                Array.isArray(data.embedding) &&
                data.embedding.length > 0 &&
                typeof data.embedding[0] === 'number'
            );
            
            if (isValidResponse) {
                console.log('✅ Response format matches Python client expectations');
                return true;
            } else {
                console.log('❌ Response format invalid for Python client');
                return false;
            }
        } else {
            console.log('❌ Embedding endpoint failed:', response.status, data);
            return false;
        }
    } catch (error) {
        console.log('❌ Embedding endpoint error:', error.message);
        return false;
    }
}

async function testInvalidRequest() {
    console.log('Testing invalid request handling...');
    
    try {
        const response = await fetch(EMBED_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ invalid: 'request' })
        });
        
        const data = await response.json();
        
        if (response.status === 400 && data.error) {
            console.log('✅ Invalid request properly handled:', data.error);
            return true;
        } else {
            console.log('❌ Invalid request not properly handled');
            return false;
        }
    } catch (error) {
        console.log('❌ Invalid request test error:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🧪 SDOF Knowledge Base HTTP API Tests');
    console.log('=====================================\n');
    
    // Wait a moment for server to start
    console.log('Waiting 2 seconds for server startup...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = [];
    
    results.push(await testHealthEndpoint());
    console.log();
    
    results.push(await testEmbeddingEndpoint());
    console.log();
    
    results.push(await testInvalidRequest());
    console.log();
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('=====================================');
    console.log(`Test Results: ${passed}/${total} passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed! HTTP API is ready.');
        process.exit(0);
    } else {
        console.log('💥 Some tests failed. Check server logs.');
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

runTests();