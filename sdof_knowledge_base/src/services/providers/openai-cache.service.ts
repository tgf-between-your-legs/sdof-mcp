/**
 * OpenAI-Specific Cache Manager
 * 
 * Implements OpenAI's automatic prompt caching with intelligent content structuring
 * and cost optimization strategies.
 */

import { OpenAI } from 'openai';
import { MultiProviderCacheService, CacheEntry } from '../cache.service.js';
import { cacheWarming } from '../../utils/cache-optimization.js';

export interface OpenAICacheConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enablePromptCaching: boolean;
  cacheThreshold: number; // Minimum tokens for caching
}

export interface OpenAIPromptStructure {
  systemPrompt: string;
  cacheableContext: string;
  userQuery: string;
  totalTokens: number;
  estimatedCost: number;
}

/**
 * OpenAI Cache Manager with automatic prompt caching
 */
export class OpenAICacheManager {
  private openai: OpenAI;
  private config: OpenAICacheConfig;
  private cacheService: MultiProviderCacheService;

  constructor(config: OpenAICacheConfig) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.cacheService = MultiProviderCacheService.getInstance();
  }

  /**
   * Structure prompt for OpenAI automatic caching
   * Places stable SDOF context at the beginning for optimal caching
   */
  public async structurePromptForCaching(
    systemPrompt: string,
    sdofContext: string,
    userQuery: string,
    metadata?: any
  ): Promise<OpenAIPromptStructure> {
    // Estimate token counts
    const systemTokens = this.estimateTokens(systemPrompt);
    const contextTokens = this.estimateTokens(sdofContext);
    const queryTokens = this.estimateTokens(userQuery);
    const totalTokens = systemTokens + contextTokens + queryTokens;

    // Structure for optimal caching - stable content first
    const cacheableContext = this.buildCacheableContext(sdofContext, metadata?.cacheHints);
    
    const structure: OpenAIPromptStructure = {
      systemPrompt,
      cacheableContext,
      userQuery,
      totalTokens,
      estimatedCost: this.estimateCost(totalTokens)
    };

    // Log caching strategy
    if (contextTokens > this.config.cacheThreshold) {
      console.log(`[OpenAI Cache] Structuring prompt for caching (${contextTokens} cacheable tokens)`);
    }

    return structure;
  }

  /**
   * Execute prompt with caching optimization
   */
  public async executeWithCaching(
    promptStructure: OpenAIPromptStructure,
    options?: {
      stream?: boolean;
      functions?: any[];
      toolChoice?: any;
    }
  ): Promise<{
    response: any;
    cached: boolean;
    cacheKey?: string;
    metrics: {
      responseTime: number;
      tokenCount: number;
      cost: number;
    };
  }> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheContent = this.buildCacheContent(promptStructure);
    const cached = await this.cacheService.getCachedContent(
      cacheContent,
      'openai',
      this.config.model,
      true // Enable semantic matching
    );

    if (cached) {
      return {
        response: cached.metadata.response,
        cached: true,
        cacheKey: cached.id,
        metrics: {
          responseTime: Date.now() - startTime,
          tokenCount: cached.tokenCount,
          cost: 0 // Cache hit = no cost
        }
      };
    }

    // Execute request with OpenAI
    const messages = this.buildMessages(promptStructure);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: options?.stream || false,
        ...(options?.functions && { functions: options.functions }),
        ...(options?.toolChoice && { tool_choice: options.toolChoice })
      });

      const responseTime = Date.now() - startTime;
      const cost = this.estimateCost(promptStructure.totalTokens);

      // Cache the response
      const cacheKey = await this.cacheService.setCachedContent(
        cacheContent,
        response,
        'openai',
        this.config.model,
        {
          promptStructure,
          cacheHint: this.shouldCacheResponse(promptStructure),
          responseTime,
          cost
        }
      );

      return {
        response,
        cached: false,
        cacheKey,
        metrics: {
          responseTime,
          tokenCount: promptStructure.totalTokens,
          cost
        }
      };

    } catch (error) {
      console.error('[OpenAI Cache] API Error:', error);
      throw error;
    }
  }

  /**
   * Build cacheable context from SDOF knowledge
   */
  private buildCacheableContext(sdofContext: string, cacheHints?: any): string {
    let context = sdofContext;

    // Add cache hints if available
    if (cacheHints?.systemPatterns) {
      context = `SYSTEM PATTERNS:\n${cacheHints.systemPatterns.join('\n')}\n\n${context}`;
    }

    if (cacheHints?.projectContext) {
      context = `PROJECT CONTEXT:\n${JSON.stringify(cacheHints.projectContext, null, 2)}\n\n${context}`;
    }

    if (cacheHints?.decisionHistory) {
      context = `DECISION HISTORY:\n${cacheHints.decisionHistory}\n\n${context}`;
    }

    return context;
  }

  /**
   * Build messages array for OpenAI API
   */
  private buildMessages(structure: OpenAIPromptStructure): any[] {
    const messages: any[] = [];

    // System prompt (stable)
    if (structure.systemPrompt) {
      messages.push({
        role: 'system',
        content: structure.systemPrompt
      });
    }

    // Cacheable context (stable, placed early for caching)
    if (structure.cacheableContext) {
      messages.push({
        role: 'user',
        content: `CONTEXT:\n${structure.cacheableContext}`
      });
      
      messages.push({
        role: 'assistant',
        content: 'I understand the context. How can I help you with this project?'
      });
    }

    // User query (variable)
    messages.push({
      role: 'user',
      content: structure.userQuery
    });

    return messages;
  }

  /**
   * Build cache content key
   */
  private buildCacheContent(structure: OpenAIPromptStructure): string {
    return `${structure.systemPrompt}\n---\n${structure.cacheableContext}\n---\n${structure.userQuery}`;
  }

  /**
   * Determine if response should be cached
   */
  private shouldCacheResponse(structure: OpenAIPromptStructure): boolean {
    // Cache responses for high-token content or specific patterns
    return structure.totalTokens > this.config.cacheThreshold ||
           structure.cacheableContext.includes('SDOF Phase') ||
           structure.cacheableContext.includes('system_pattern') ||
           structure.cacheableContext.includes('architectural_decision');
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // OpenAI token estimation: ~4 chars per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate API cost
   */
  private estimateCost(tokenCount: number): number {
    // GPT-4 pricing (approximate)
    const inputCostPer1k = 0.03;
    const outputCostPer1k = 0.06;
    
    // Assume 70% input, 30% output
    const inputTokens = tokenCount * 0.7;
    const outputTokens = tokenCount * 0.3;
    
    return (inputTokens / 1000 * inputCostPer1k) + (outputTokens / 1000 * outputCostPer1k);
  }

  /**
   * Warm cache with high-value OpenAI patterns
   */
  public async warmCacheWithPatterns(): Promise<void> {
    const candidates = await cacheWarming.identifyWarmingCandidates();
    
    console.log(`[OpenAI Cache] Warming cache with ${candidates.length} high-value patterns`);
    
    for (const candidate of candidates.slice(0, 10)) { // Limit to top 10
      if (candidate.estimatedValue > 0.8) {
        const structure = await this.structurePromptForCaching(
          'You are an expert software architect and developer.',
          candidate.content,
          'Please provide a comprehensive implementation approach.',
          candidate.metadata
        );

        // Simulate a response for warming (in production, this would be actual responses)
        const mockResponse = {
          choices: [{
            message: {
              content: `Implementation approach for: ${candidate.content.substring(0, 100)}...`
            }
          }]
        };

        await this.cacheService.setCachedContent(
          this.buildCacheContent(structure),
          mockResponse,
          'openai',
          this.config.model,
          {
            ...candidate.metadata,
            warmed: true,
            cacheHint: true
          }
        );
      }
    }
    
    console.log('[OpenAI Cache] Cache warming completed');
  }

  /**
   * Get OpenAI-specific cache metrics
   */
  public getProviderMetrics(): any {
    const metrics = this.cacheService.getMetrics();
    
    return {
      provider: 'openai',
      model: this.config.model,
      hitRate: metrics.hitRate,
      totalRequests: metrics.totalRequests,
      costSavings: metrics.costSavings,
      averageResponseTime: metrics.averageResponseTime,
      cacheSize: metrics.cacheSize,
      recommendedOptimizations: this.getOptimizationRecommendations(metrics)
    };
  }

  private getOptimizationRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.hitRate < 0.7) {
      recommendations.push('Consider implementing more aggressive prompt structuring for caching');
    }
    
    if (metrics.costSavings > 5) {
      recommendations.push('Caching is highly effective - consider expanding cache size');
    }
    
    if (metrics.averageResponseTime > 2000) {
      recommendations.push('Consider optimizing prompt structure to reduce token count');
    }
    
    return recommendations;
  }
}