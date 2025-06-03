#!/usr/bin/env node

/**
 * HTTP API Server for SDOF Knowledge Base
 * 
 * Provides HTTP endpoints for embedding generation and health checks
 * to support the Python VectorStorageHandler integration.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { EmbeddingService } from './services/embedding.service.js';

dotenv.config();

const app = express();
const port = parseInt(process.env.HTTP_PORT || '3001');

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize embedding service
const embeddingService = EmbeddingService.getInstance();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sdof-knowledge-base',
    timestamp: new Date().toISOString(),
    embedding_service: process.env.EMBEDDING_SERVICE || 'openai',
    port: port
  });
});

// Embedding generation endpoint
app.post('/api/vectors/embed', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid text parameter',
        message: 'Request body must contain a "text" field with string content'
      });
    }

    console.log(`[HTTP API] Generating embedding for text (${text.length} chars)`);
    
    const embedding = await embeddingService.generateEmbedding(text);
    const dimensions = embeddingService.getDimensions();
    
    res.json({
      embedding,
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
      dimensions,
      service: process.env.EMBEDDING_SERVICE || 'openai'
    });
    
  } catch (error) {
    console.error('[HTTP API] Error generating embedding:', error);
    
    res.status(500).json({
      error: 'Failed to generate embedding',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[HTTP API] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    available_endpoints: [
      'GET /health',
      'POST /api/vectors/embed'
    ]
  });
});

export function startHttpServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`[HTTP API] SDOF Knowledge Base HTTP server running on port ${port}`);
      console.log(`[HTTP API] Health endpoint: http://localhost:${port}/health`);
      console.log(`[HTTP API] Embed endpoint: http://localhost:${port}/api/vectors/embed`);
      console.log(`[HTTP API] Embedding service: ${process.env.EMBEDDING_SERVICE || 'openai'}`);
      resolve();
    });
    
    server.on('error', (err) => {
      console.error(`[HTTP API] Failed to start server on port ${port}:`, err);
      reject(err);
    });
  });
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startHttpServer().catch((error) => {
    console.error('Failed to start HTTP server:', error);
    process.exit(1);
  });
}