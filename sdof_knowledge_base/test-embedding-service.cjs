#!/usr/bin/env node

/**
 * SDOF Knowledge Base Embedding Service Test Script
 * 
 * This script tests the embedding service to ensure OpenAI is being used
 * and validates the service is working correctly.
 */

const http = require('http');
const https = require('https');

console.log('🧪 SDOF Knowledge Base Embedding Service Test');
console.log('='.repeat(50));

// Test data
const testCases = [
    {
        name: 'Basic Embedding Generation',
        endpoint: '/api/embeddings/generate',
        method: 'POST',
        data: {
            text: 'Test embedding generation for SDOF knowledge base',
            metadata: { 
                test: true,
                timestamp: new Date().toISOString()
            }
        }
    },
    {
        name: 'Health Check',
        endpoint: '/api/health',
        method: 'GET',
        data: null
    },
    {
        name: 'Service Info',
        endpoint: '/api/info',
        method: 'GET',
        data: null
    }
];

async function runTests() {
    console.log('\n📋 Starting embedding service tests...\n');
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`🔍 Test ${i + 1}: ${testCase.name}`);
        
        try {
            const result = await makeRequest(testCase);
            console.log(`✅ ${testCase.name} - SUCCESS`);
            
            if (testCase.name === 'Service Info' && result.embeddingService) {
                console.log(`📊 Embedding Service: ${result.embeddingService}`);
                if (result.embeddingService === 'openai') {
                    console.log('🎉 CONFIRMED: Service is using OpenAI embeddings!');
                } else {
                    console.log(`❌ WARNING: Service is using ${result.embeddingService} instead of OpenAI`);
                }
            }
            
            if (testCase.name === 'Basic Embedding Generation' && result.embedding) {
                console.log(`📊 Embedding dimensions: ${result.embedding.length}`);
                console.log(`📊 First 5 values: [${result.embedding.slice(0, 5).join(', ')}...]`);
            }
            
        } catch (error) {
            console.log(`❌ ${testCase.name} - FAILED: ${error.message}`);
        }
        
        console.log(''); // Empty line for readability
    }
}

function makeRequest(testCase) {
    return new Promise((resolve, reject) => {
        const postData = testCase.data ? JSON.stringify(testCase.data) : '';
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: testCase.endpoint,
            method: testCase.method,
            headers: {
                'Content-Type': 'application/json',
                ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
            },
            timeout: 10000
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const response = data ? JSON.parse(data) : { status: 'ok' };
                        resolve(response);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

// Test if service is running
async function checkServiceStatus() {
    console.log('🔍 Checking if service is running on port 3000...');
    
    try {
        await makeRequest({ endpoint: '/api/health', method: 'GET', data: null });
        console.log('✅ Service is running and responding');
        return true;
    } catch (error) {
        console.log(`❌ Service is not responding: ${error.message}`);
        console.log('\n💡 To start the service, run:');
        console.log('   node fix-embedding-service.js');
        console.log('   OR');
        console.log('   fix-embedding-service.bat');
        return false;
    }
}

// Main execution
async function main() {
    const isRunning = await checkServiceStatus();
    
    if (isRunning) {
        await runTests();
        
        console.log('🎯 Test Summary:');
        console.log('- If you see "CONFIRMED: Service is using OpenAI embeddings!", the fix was successful');
        console.log('- If you see a different embedding service, run the fix script again');
        console.log('- Check the service logs for any error messages');
    }
    
    console.log('\n📝 For troubleshooting:');
    console.log('1. Ensure .env file has EMBEDDING_SERVICE=openai');
    console.log('2. Check system environment variables with: echo %EMBEDDING_SERVICE%');
    console.log('3. Run fix-embedding-service.bat to reset everything');
    console.log('4. Check service logs for initialization messages');
}

main().catch(console.error);