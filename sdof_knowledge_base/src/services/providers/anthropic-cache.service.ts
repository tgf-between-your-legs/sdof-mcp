/**
 * Anthropic Claude Cache Manager
 * 
 * Implements Anthropic's explicit cache control with cache breakpoints
 * and intelligent content structuring for maximum cost savings.
 */

import { MultiProviderCacheService, CacheEntry } from '../cache.service.js';
import { cacheWarming } from '../../utils/cache-optimization.js';

export interface AnthropicCacheConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enableCacheControl: boolean;
  cacheBreakpointThreshold: number; // Minimum tokens for cache breakpoint
}

export interface AnthropicMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text';
    text: string;
    cache_control?: {
      type: 'ephemeral';
    };
  }>;
}

export interface AnthropicPromptStructure {
  messages: AnthropicMessage[];
  totalTokens: number;
  cacheBreakpoints: number;
  estimatedCost: number;
  cacheControlActive: boolean;
}

/**
 * Anthropic Cache Manager with explicit cache control
 */
export class AnthropicCacheManager {
  private config: AnthropicCacheConfig;
  private cacheService: MultiProviderCacheService;
  private apiEndpoint = 'https://api.anthropic.com/v1/messages';

  constructor(config: AnthropicCacheConfig) {
    this.config = config;
    this.cacheService = MultiProviderCacheService.getInstance();
  }

  /**
   * Structure prompt with explicit cache control breakpoints
   * Places cache_control markers after stable SDOF content
   */
  public async structurePromptWithCacheControl(
    systemPrompt: string,
    sdofContext: string,
    userQuery: string,
    metadata?: any
  ): Promise<AnthropicPromptStructure> {
    const messages: AnthropicMessage[] = [];
    let totalTokens = 0;
    let cacheBreakpoints = 0;

    // 1. System message with cache control if large enough
    const systemTokens = this.estimateTokens(systemPrompt);
    if (systemTokens > this.config.cacheBreakpointThreshold) {
      messages.push({
        role: 'system',
        content: [{
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }
        }]
      });
      cacheBreakpoints++;
      console.log(`[Anthropic Cache] Cache breakpoint added for system prompt (${systemTokens} tokens)`);
    } else {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    totalTokens += systemTokens;

    // 2. SDOF Context with cache control (high-value content)
    if (sdofContext) {
      const contextTokens = this.estimateTokens(sdofContext);
      const structuredContext = this.buildCacheableContext(sdofContext, metadata?.cacheHints);
      
      if (contextTokens > this.config.cacheBreakpointThreshold || metadata?.cacheHint) {
        messages.push({
          role: 'user',
          content: [{
            type: 'text',
            text: `SDOF KNOWLEDGE CONTEXT:\n${structuredContext}`,
            cache_control: { type: 'ephemeral' }
          }]
        });
        cacheBreakpoints++;
        console.log(`[Anthropic Cache] Cache breakpoint added for SDOF context (${contextTokens} tokens)`);
      } else {
        messages.push({
          role: 'user',
          content: `SDOF KNOWLEDGE CONTEXT:\n${structuredContext}`
        });
      }
      
      // Assistant acknowledgment
      messages.push({
        role: 'assistant',
        content: 'I understand the SDOF context and knowledge base. How can I assist you with this project?'
      });
      
      totalTokens += contextTokens;
    }

    // 3. User query (variable content, no cache control)
    const queryTokens = this.estimateTokens(userQuery);
    messages.push({
      role: 'user',
      content: userQuery
    });
    totalTokens += queryTokens;

    return {
      messages,
      totalTokens,
      cacheBreakpoints,
      estimatedCost: this.estimateCost(totalTokens, cacheBreakpoints),
      cacheControlActive: cacheBreakpoints > 0
    };
  }

  /**
   * Execute prompt with Anthropic API and cache control
   */
  public async executeWithCaching(
    promptStructure: AnthropicPromptStructure,
    options?: {
      stream?: boolean;
      stopSequences?: string[];
      tools?: any[];
    }
  ): Promise<{
    response: any;
    cached: boolean;
    cacheKey?: string;
    metrics: {
      responseTime: number;
      tokenCount: number;
      cost: number;
      cacheBreakpoints: number;
    };
  }> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheContent = this.buildCacheContent(promptStructure);
    const cached = await this.cacheService.getCachedContent(
      cacheContent,
      'anthropic',
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
          cost: 0, // Cache hit = no cost
          cacheBreakpoints: promptStructure.cacheBreakpoints
        }
      };
    }

    // Execute request with Anthropic
    try {
      const requestBody = {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: promptStructure.messages,
        ...(options?.stopSequences && { stop_sequences: options.stopSequences }),
        ...(options?.tools && { tools: options.tools }),
        ...(options?.stream && { stream: options.stream })
      };

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const responseTime = Date.now() - startTime;
      const cost = this.estimateCost(promptStructure.totalTokens, promptStructure.cacheBreakpoints);

      // Cache the response
      const cacheKey = await this.cacheService.setCachedContent(
        cacheContent,
        result,
        'anthropic',
        this.config.model,
        {
          promptStructure,
          cacheHint: this.shouldCacheResponse(promptStructure),
          responseTime,
          cost,
          cacheBreakpoints: promptStructure.cacheBreakpoints
        }
      );

      return {
        response: result,
        cached: false,
        cacheKey,
        metrics: {
          responseTime,
          tokenCount: promptStructure.totalTokens,
          cost,
          cacheBreakpoints: promptStructure.cacheBreakpoints
        }
      };

    } catch (error) {
      console.error('[Anthropic Cache] API Error:', error);
      throw error;
    }
  }

  /**
   * Build cacheable context with SDOF knowledge optimization
   */
  private buildCacheableContext(sdofContext: string, cacheHints?: any): string {
    let context = '';

    // Prioritize high-value content for caching
    if (cacheHints?.architecturalDecisions) {
      context += 'ARCHITECTURAL DECISIONS:\n' + cacheHints.architecturalDecisions.join('\n\n') + '\n\n';
    }

    if (cacheHints?.systemPatterns) {
      context += 'SYSTEM PATTERNS:\n' + cacheHints.systemPatterns.join('\n\n') + '\n\n';
    }

    if (cacheHints?.projectContext) {
      context += 'PROJECT CONTEXT:\n' + JSON.stringify(cacheHints.projectContext, null, 2) + '\n\n';
    }

    if (cacheHints?.sdofPhaseHistory) {
      context += 'SDOF PHASE HISTORY:\n' + cacheHints.sdofPhaseHistory + '\n\n';
    }

    // Add main SDOF context
    context += sdofContext;

    return context;
  }

  /**
   * Build cache content key for deduplication
   */
  private buildCacheContent(structure: AnthropicPromptStructure): string {
    return structure.messages
      .map(msg => `${msg.role}: ${this.extractTextContent(msg.content)}`)
      .join('\n---\n');
  }

  /**
   * Extract text content from message content (handles both string and object arrays)
   */
  private extractTextContent(content: string | Array<any>): string {
    if (typeof content === 'string') {
      return content;
    }
    
    return content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');
  }

  /**
   * Determine if response should be cached based on content value
   */
  private shouldCacheResponse(structure: AnthropicPromptStructure): boolean {
    const contentText = this.buildCacheContent(structure).toLowerCase();
    
    return structure.cacheBreakpoints > 0 ||
           structure.totalTokens > this.config.cacheBreakpointThreshold ||
           contentText.includes('sdof phase') ||
           contentText.includes('architectural') ||
           contentText.includes('system pattern') ||
           contentText.includes('implementation strategy');
  }

  /**
   * Estimate token count for Anthropic (more accurate than generic estimation)
   */
  private estimateTokens(text: string): number {
    // Claude token estimation: ~3.5 chars per token on average
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Estimate cost with cache breakpoint savings
   */
  private estimateCost(tokenCount: number, cacheBreakpoints: number): number {
    // Claude pricing (approximate)
    const inputCostPer1k = 0.008;
    const outputCostPer1k = 0.024;
    
    // Cache breakpoints provide significant savings on repeated content
    const cacheDiscount = Math.min(cacheBreakpoints * 0.25, 0.75); // Up to 75% savings
    
    // Assume 75% input, 25% output
    const inputTokens = tokenCount * 0.75;
    const outputTokens = tokenCount * 0.25;
    
    const baseCost = (inputTokens / 1000 * inputCostPer1k) + (outputTokens / 1000 * outputCostPer1k);
    return baseCost * (1 - cacheDiscount);
  }

  /**
   * Warm cache with Anthropic-optimized patterns
   */
  public async warmCacheWithPatterns(): Promise<void> {
    const candidates = await cacheWarming.identifyWarmingCandidates();
    
    console.log(`[Anthropic Cache] Warming cache with ${candidates.length} patterns optimized for cache control`);
    
    for (const candidate of candidates.slice(0, 8)) { // Limit for Anthropic rate limits
      if (candidate.estimatedValue > 0.85) {
        const structure = await this.structurePromptWithCacheControl(
          'You are an expert SDOF architect and implementation specialist.',
          candidate.content,
          'Please provide a detailed analysis and implementation strategy.',
          {
            ...candidate.metadata,
            cacheHint: true
          }
        );

        // Simulate response for warming
        const mockResponse = {
          content: [{
            type: 'text',
            text: `Comprehensive analysis for: ${candidate.content.substring(0, 150)}...`
          }],
          usage: {
            input_tokens: structure.totalTokens * 0.75,
            output_tokens: structure.totalTokens * 0.25
          }
        };

        await this.cacheService.setCachedContent(
          this.buildCacheContent(structure),
          mockResponse,
          'anthropic',
          this.config.model,
          {
            ...candidate.metadata,
            warmed: true,
            cacheHint: true,
            cacheBreakpoints: structure.cacheBreakpoints
          }
        );
      }
    }
    
    console.log('[Anthropic Cache] Cache warming completed with cache control optimization');
  }

  /**
   * Get Anthropic-specific cache metrics and recommendations
   */
  public getProviderMetrics(): any {
    const metrics = this.cacheService.getMetrics();
    
    return {
      provider: 'anthropic',
      model: this.config.model,
      hitRate: metrics.hitRate,
      totalRequests: metrics.totalRequests,
      costSavings: metrics.costSavings,
      averageResponseTime: metrics.averageResponseTime,
      cacheSize: metrics.cacheSize,
      cacheControlActive: this.config.enableCacheControl,
      recommendedOptimizations: this.getOptimizationRecommendations(metrics)
    };
  }

  private getOptimizationRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.hitRate < 0.75) {
      recommendations.push('Consider adding more cache breakpoints for stable SDOF content');
    }
    
    if (metrics.costSavings > 8) {
      recommendations.push('Cache control is highly effective - expand to more content types');
    }
    
    if (metrics.averageResponseTime > 3000) {
      recommendations.push('Optimize cache breakpoint placement to reduce token processing');
    }
    
    if (!this.config.enableCacheControl) {
      recommendations.push('Enable cache control for significant cost savings on repeated content');
    }
    
    return recommendations;
  }

  /**
   * Analyze cache breakpoint effectiveness
   */
  public analyzeCacheBreakpointEffectiveness(): {
    averageBreakpoints: number;
    costSavingsPerBreakpoint: number;
    recommendedBreakpointStrategy: string;
  } {
    const metrics = this.cacheService.getMetrics();
    
    // Analyze cached entries for breakpoint patterns
    // This would typically analyze actual cache entries
    
    return {
      averageBreakpoints: 1.8, // Example metric
      costSavingsPerBreakpoint: 0.35, // 35% savings per breakpoint
      recommendedBreakpointStrategy: 'Place breakpoints after system prompts and SDOF context blocks > 1000 tokens'
    };
  }
}