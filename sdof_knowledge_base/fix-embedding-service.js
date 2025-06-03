#!/usr/bin/env node

/**
 * SDOF Knowledge Base Embedding Service Fix Script
 * 
 * This script resolves the persistent Claude embeddings issue by:
 * 1. Killing existing processes on port 3000
 * 2. Clearing system environment variables
 * 3. Starting service with explicit OpenAI configuration
 * 4. Validating the embedding service
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 SDOF Knowledge Base Embedding Service Fix');
console.log('='.repeat(50));

// Step 1: Kill existing processes on port 3000
console.log('\n📋 Step 1: Checking for processes on port 3000...');
try {
    const netstatOutput = execSync('netstat -ano | findstr :3000', { encoding: 'utf-8' });
    console.log('Found processes on port 3000:');
    console.log(netstatOutput);
    
    // Extract PIDs and kill them
    const lines = netstatOutput.split('\n').filter(line => line.trim());
    const pids = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return parts[parts.length - 1];
    }).filter(pid => pid && pid !== '0');
    
    if (pids.length > 0) {
        console.log(`🔥 Killing processes: ${pids.join(', ')}`);
        pids.forEach(pid => {
            try {
                execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
            } catch (error) {
                console.log(`Warning: Could not kill PID ${pid}: ${error.message}`);
            }
        });
    }
} catch (error) {
    console.log('✅ No processes found on port 3000');
}

// Step 2: Clear system environment variable
console.log('\n📋 Step 2: Clearing system environment variable...');
try {
    execSync('set EMBEDDING_SERVICE=', { stdio: 'inherit' });
    console.log('✅ Cleared EMBEDDING_SERVICE system environment variable');
} catch (error) {
    console.log(`Warning: Could not clear system env var: ${error.message}`);
}

// Step 3: Verify .env file
console.log('\n📋 Step 3: Verifying .env configuration...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    console.log('Current .env content:');
    console.log(envContent);
    
    if (envContent.includes('EMBEDDING_SERVICE=openai')) {
        console.log('✅ .env file correctly configured for OpenAI');
    } else {
        console.log('❌ .env file does not contain EMBEDDING_SERVICE=openai');
        process.exit(1);
    }
} else {
    console.log('❌ .env file not found');
    process.exit(1);
}

// Step 4: Rebuild the service
console.log('\n📋 Step 4: Rebuilding service...');
try {
    execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
    console.log('✅ Service rebuilt successfully');
} catch (error) {
    console.log(`❌ Build failed: ${error.message}`);
    process.exit(1);
}

// Step 5: Start service with explicit environment override
console.log('\n📋 Step 5: Starting service with explicit OpenAI configuration...');
console.log('Environment variables being set:');
console.log('  EMBEDDING_SERVICE=openai');
console.log('  HTTP_PORT=3000');

const env = {
    ...process.env,
    EMBEDDING_SERVICE: 'openai',
    HTTP_PORT: '3000'
};

// Remove any conflicting environment variables
delete env.EMBEDDING_SERVICE_SYSTEM;

console.log('\n🚀 Starting SDOF Knowledge Base service...');
console.log('Service will start in 3 seconds...');

setTimeout(() => {
    const child = spawn('node', ['build/index.js'], {
        cwd: __dirname,
        env: env,
        stdio: 'inherit'
    });

    child.on('error', (error) => {
        console.error(`❌ Failed to start service: ${error.message}`);
    });

    child.on('exit', (code) => {
        console.log(`Service exited with code ${code}`);
    });

    // Give the service time to start, then test it
    setTimeout(() => {
        console.log('\n📋 Step 6: Testing embedding service...');
        testEmbeddingService();
    }, 5000);

}, 3000);

function testEmbeddingService() {
    const http = require('http');
    
    const testData = JSON.stringify({
        text: 'Test embedding generation',
        metadata: { test: true }
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/embeddings/generate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(testData)
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log('✅ Embedding service test successful');
                console.log(`Response: ${JSON.stringify(response, null, 2)}`);
            } catch (error) {
                console.log(`❌ Invalid response: ${data}`);
            }
        });
    });

    req.on('error', (error) => {
        console.log(`❌ Test request failed: ${error.message}`);
        console.log('Please check if the service started correctly');
    });

    req.write(testData);
    req.end();
}

process.on('SIGINT', () => {
    console.log('\n🛑 Fix script interrupted');
    process.exit(0);
});