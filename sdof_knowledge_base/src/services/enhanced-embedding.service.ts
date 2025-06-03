/**
 * Enhanced Embedding Service with Prompt Caching Integration
 * 
 * Extends the existing embedding service with multi-provider caching capabilities,
 * SDOF knowledge optimization, and intelligent cache warming.
 */

import EmbeddingServiceInstance from './embedding.service.js';
import { MultiProviderCacheService } from './cache.service.js';
import { OpenAICacheManager, OpenAICacheConfig } from './providers/openai-cache.service.js';
import { AnthropicCacheManager, AnthropicCacheConfig } from './providers/anthropic-cache.service.js';
import { GeminiCacheManager, GeminiCacheConfig } from './providers/gemini-cache.service.js';
import { cacheWarming, cacheAnalytics } from '../utils/cache-optimization.js';
import dotenv from 'dotenv';

dotenv.config();

export interface ProviderConfigs {
  openai?: OpenAICacheConfig;
  anthropic?: AnthropicCacheConfig;
  gemini?: GeminiCacheConfig;
}

export interface CacheablePromptRequest {
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;
  systemPrompt: string;
  sdofContext: string;
  userQuery: string;
  metadata?: {
    cacheHint?: boolean;
    priority?: number;
    projectContext?: any;
    cacheHints?: any;
  };
  options?: any;
}

export interface CachedResponse {
  response: any;
  cached: boolean;
  provider: string;
  model: string;
  cacheKey?: string;
  metrics: {
    responseTime: number;
    tokenCount: number;
    cost: number;
    costSavings?: number;
  };
}

/**
 * Enhanced Embedding Service with Multi-Provider Caching
 * Uses composition to wrap the existing EmbeddingService
 */
export class EnhancedEmbeddingService {
  private static enhancedInstance: EnhancedEmbeddingService;
  private embeddingService: typeof EmbeddingServiceInstance;
  private cacheService: MultiProviderCacheService;
  private providerManagers: Map<string, any> = new Map();
  private configs: ProviderConfigs;
  private cachingEnabled: boolean;

  private constructor() {
    this.embeddingService = EmbeddingServiceInstance;
    this.cacheService = MultiProviderCacheService.getInstance();
    this.cachingEnabled = process.env.ENABLE_PROMPT_CACHING === 'true';
    this.configs = this.loadProviderConfigs();
    this.initializeProviderManagers();
    
    console.log('[Enhanced Embedding] Service initialized with multi-provider caching');
  }

  public static getEnhancedInstance(): EnhancedEmbeddingService {
    if (!EnhancedEmbeddingService.enhancedInstance) {
      EnhancedEmbeddingService.enhancedInstance = new EnhancedEmbeddingService();
    }
    return EnhancedEmbeddingService.enhancedInstance;
  }

  /**
   * Load provider configurations from environment
   */
  private loadProviderConfigs(): ProviderConfigs {
    const configs: ProviderConfigs = {};

    // OpenAI configuration
    if (process.env.OPENAI_API_KEY) {
      configs.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        enablePromptCaching: process.env.OPENAI_ENABLE_CACHING === 'true',
        cacheThreshold: parseInt(process.env.OPENAI_CACHE_THRESHOLD || '1000')
      };
    }

    // Anthropic configuration
    if (process.env.ANTHROPIC_API_KEY) {
      configs.anthropic = {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4000'),
        temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7'),
        enableCacheControl: process.env.ANTHROPIC_ENABLE_CACHE_CONTROL === 'true',
        cacheBreakpointThreshold: parseInt(process.env.ANTHROPIC_CACHE_THRESHOLD || '1000')
      };
    }

    // Gemini configuration
    if (process.env.GOOGLE_PROJECT_ID) {
      configs.gemini = {
        projectId: process.env.GOOGLE_PROJECT_ID,
        location: process.env.GOOGLE_LOCATION || 'us-central1',
        model: process.env.GEMINI_MODEL || 'gemini-pro',
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '4000'),
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
        topP: parseFloat(process.env.GEMINI_TOP_P || '0.8'),
        topK: parseInt(process.env.GEMINI_TOP_K || '40'),
        enableImplicitCaching: process.env.GEMINI_ENABLE_CACHING === 'true',
        cacheThreshold: parseInt(process.env.GEMINI_CACHE_THRESHOLD || '1000')
      };
    }

    return configs;
  }

  /**
   * Initialize provider cache managers
   */
  private initializeProviderManagers(): void {
    if (this.configs.openai) {
      this.providerManagers.set('openai', new OpenAICacheManager(this.configs.openai));
    }

    if (this.configs.anthropic) {
      this.providerManagers.set('anthropic', new AnthropicCacheManager(this.configs.anthropic));
    }

    if (this.configs.gemini) {
      this.providerManagers.set('gemini', new GeminiCacheManager(this.configs.gemini));
    }

    console.log(`[Enhanced Embedding] Initialized ${this.providerManagers.size} provider managers`);
  }

  /**
   * Execute cached prompt across providers with intelligent optimization
   */
  public async executeCachedPrompt(request: CacheablePromptRequest): Promise<CachedResponse> {
    if (!this.cachingEnabled) {
      throw new Error('Prompt caching is not enabled. Set ENABLE_PROMPT_CACHING=true');
    }

    const manager = this.providerManagers.get(request.provider);
    if (!manager) {
      throw new Error(`Provider ${request.provider} is not configured or available`);
    }

    try {
      let result: any;

      switch (request.provider) {
        case 'openai':
          result = await this.executeOpenAIRequest(manager, request);
          break;
        case 'anthropic':
          result = await this.executeAnthropicRequest(manager, request);
          break;
        case 'gemini':
          result = await this.executeGeminiRequest(manager, request);
          break;
        default:
          throw new Error(`Unsupported provider: ${request.provider}`);
      }

      // Calculate cost savings if cached
      const costSavings = result.cached ? this.estimateCostSavings(request.provider, result.metrics.tokenCount) : 0;

      return {
        ...result,
        provider: request.provider,
        model: request.model,
        metrics: {
          ...result.metrics,
          costSavings
        }
      };

    } catch (error) {
      console.error(`[Enhanced Embedding] Error executing ${request.provider} request:`, error);
      throw error;
    }
  }

  /**
   * Execute OpenAI request with caching
   */
  private async executeOpenAIRequest(manager: OpenAICacheManager, request: CacheablePromptRequest): Promise<any> {
    const structure = await manager.structurePromptForCaching(
      request.systemPrompt,
      request.sdofContext,
      request.userQuery,
      request.metadata
    );

    return await manager.executeWithCaching(structure, request.options);
  }

  /**
   * Execute Anthropic request with cache control
   */
  private async executeAnthropicRequest(manager: AnthropicCacheManager, request: CacheablePromptRequest): Promise<any> {
    const structure = await manager.structurePromptWithCacheControl(
      request.systemPrompt,
      request.sdofContext,
      request.userQuery,
      request.metadata
    );

    return await manager.executeWithCaching(structure, request.options);
  }

  /**
   * Execute Gemini request with implicit caching
   */
  private async executeGeminiRequest(manager: GeminiCacheManager, request: CacheablePromptRequest): Promise<any> {
    const structure = await manager.structurePromptForImplicitCaching(
      request.systemPrompt,
      request.sdofContext,
      request.userQuery,
      request.metadata
    );

    return await manager.executeWithCaching(structure, request.options);
  }

  /**
   * Optimize SDOF context for caching
   */
  public async optimizeSDOFContextForCaching(
    sdofPlans: any[],
    decisions: any[],
    systemPatterns: any[],
    projectContext: any
  ): Promise<{
    optimizedContext: string;
    cacheHints: any;
    estimatedValue: number;
  }> {
    // Build comprehensive SDOF context
    let context = '# SDOF Knowledge Base Context\n\n';

    // High-value architectural decisions
    if (decisions.length > 0) {
      context += '## Architectural Decisions\n';
      const topDecisions = decisions
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 5);
      
      topDecisions.forEach((decision, index) => {
        context += `${index + 1}. **${decision.summary}**\n`;
        if (decision.rationale) {
          context += `   - Rationale: ${decision.rationale}\n`;
        }
        if (decision.implementation_details) {
          context += `   - Implementation: ${decision.implementation_details}\n`;
        }
        context += '\n';
      });
    }

    // System patterns
    if (systemPatterns.length > 0) {
      context += '## System Patterns\n';
      systemPatterns.slice(0, 10).forEach((pattern, index) => {
        context += `${index + 1}. **${pattern.name}**\n`;
        if (pattern.description) {
          context += `   - ${pattern.description}\n`;
        }
        context += '\n';
      });
    }

    // Recent SDOF plans
    if (sdofPlans.length > 0) {
      context += '## Recent SDOF Plans\n';
      const recentPlans = sdofPlans
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 3);
      
      recentPlans.forEach((plan, index) => {
        const metadata = typeof plan.metadata === 'string' ? JSON.parse(plan.metadata) : plan.metadata;
        context += `${index + 1}. **${metadata?.planTitle || 'Untitled Plan'}**\n`;
        context += `   - Type: ${metadata?.planType || 'Unknown'}\n`;
        if (metadata?.phase) {
          context += `   - SDOF Phase: ${metadata.phase}\n`;
        }
        context += '\n';
      });
    }

    // Project context
    if (projectContext) {
      context += '## Project Context\n';
      context += '```json\n';
      context += JSON.stringify(projectContext, null, 2);
      context += '\n```\n\n';
    }

    // Generate cache hints
    const cacheHints = {
      architecturalDecisions: decisions.map(d => d.summary),
      systemPatterns: systemPatterns.map(p => p.name),
      sdofPhases: sdofPlans.map(p => {
        const metadata = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
        return metadata?.phase;
      }).filter(Boolean),
      projectContext,
      cacheHint: true // Always mark SDOF context as high-value
    };

    // Estimate caching value based on content
    const estimatedValue = this.calculateCacheValue(context, cacheHints);

    return {
      optimizedContext: context,
      cacheHints,
      estimatedValue
    };
  }

  /**
   * Calculate cache value based on content characteristics
   */
  private calculateCacheValue(context: string, cacheHints: any): number {
    let value = 0;

    // Base value from content length
    const tokenCount = Math.ceil(context.length / 4);
    value += Math.min(tokenCount / 1000, 0.3); // Up to 0.3 for length

    // Architectural decisions boost
    if (cacheHints.architecturalDecisions?.length > 0) {
      value += 0.25;
    }

    // System patterns boost
    if (cacheHints.systemPatterns?.length > 0) {
      value += 0.20;
    }

    // SDOF phases boost
    if (cacheHints.sdofPhases?.length > 0) {
      value += 0.15;
    }

    // Project context boost
    if (cacheHints.projectContext) {
      value += 0.10;
    }

    return Math.min(value, 1.0);
  }

  /**
   * Estimate cost savings from caching
   */
  private estimateCostSavings(provider: string, tokenCount: number): number {
    const costPer1kTokens = {
      openai: 0.03,
      anthropic: 0.008,
      gemini: 0.00125
    };

    const baseCost = (costPer1kTokens[provider as keyof typeof costPer1kTokens] || 0.02) * (tokenCount / 1000);
    return baseCost;
  }

  /**
   * Warm all provider caches with SDOF patterns
   */
  public async warmAllCaches(): Promise<{
    openai?: any;
    anthropic?: any;
    gemini?: any;
    summary: {
      totalPatterns: number;
      providersWarmed: number;
      estimatedSavings: number;
    };
  }> {
    const results: any = {};
    let totalPatterns = 0;
    let providersWarmed = 0;
    let estimatedSavings = 0;

    console.log('[Enhanced Embedding] Starting cache warming across all providers');

    // Warm OpenAI cache
    if (this.providerManagers.has('openai')) {
      try {
        await this.providerManagers.get('openai').warmCacheWithPatterns();
        results.openai = this.providerManagers.get('openai').getProviderMetrics();
        providersWarmed++;
        estimatedSavings += results.openai.costSavings || 0;
      } catch (error) {
        console.error('[Enhanced Embedding] OpenAI cache warming failed:', error);
      }
    }

    // Warm Anthropic cache
    if (this.providerManagers.has('anthropic')) {
      try {
        await this.providerManagers.get('anthropic').warmCacheWithPatterns();
        results.anthropic = this.providerManagers.get('anthropic').getProviderMetrics();
        providersWarmed++;
        estimatedSavings += results.anthropic.costSavings || 0;
      } catch (error) {
        console.error('[Enhanced Embedding] Anthropic cache warming failed:', error);
      }
    }

    // Warm Gemini cache
    if (this.providerManagers.has('gemini')) {
      try {
        await this.providerManagers.get('gemini').warmCacheWithPatterns();
        results.gemini = this.providerManagers.get('gemini').getProviderMetrics();
        providersWarmed++;
        estimatedSavings += results.gemini.costSavings || 0;
      } catch (error) {
        console.error('[Enhanced Embedding] Gemini cache warming failed:', error);
      }
    }

    const candidates = await cacheWarming.identifyWarmingCandidates();
    totalPatterns = candidates.length;

    console.log(`[Enhanced Embedding] Cache warming completed: ${providersWarmed} providers, ${totalPatterns} patterns`);

    return {
      ...results,
      summary: {
        totalPatterns,
        providersWarmed,
        estimatedSavings
      }
    };
  }

  /**
   * Get comprehensive cache analytics
   */
  public getCacheAnalytics(): {
    overall: any;
    providers: any;
    recommendations: string[];
  } {
    const overallMetrics = this.cacheService.getMetrics();
    const providerMetrics: any = {};

    // Get metrics from each provider
    for (const [provider, manager] of this.providerManagers) {
      try {
        providerMetrics[provider] = manager.getProviderMetrics();
      } catch (error) {
        console.warn(`[Enhanced Embedding] Failed to get metrics for ${provider}:`, error);
      }
    }

    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(overallMetrics, providerMetrics);

    return {
      overall: overallMetrics,
      providers: providerMetrics,
      recommendations
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(overallMetrics: any, providerMetrics: any): string[] {
    const recommendations: string[] = [];

    // Overall performance recommendations
    if (overallMetrics.hitRate < 0.8) {
      recommendations.push('Cache hit rate is below target (80%). Consider implementing more aggressive cache warming.');
    }

    if (overallMetrics.costSavings > 10) {
      recommendations.push(`Excellent cost savings of $${overallMetrics.costSavings.toFixed(2)} achieved. Consider expanding caching to more use cases.`);
    }

    // Provider-specific recommendations
    const bestProvider = Object.entries(providerMetrics).reduce((best: any, [provider, metrics]: [string, any]) => {
      if (!best || metrics.hitRate > best.metrics.hitRate) {
        return { provider, metrics };
      }
      return best;
    }, null);

    if (bestProvider) {
      recommendations.push(`${bestProvider.provider} shows best cache performance (${(bestProvider.metrics.hitRate * 100).toFixed(1)}% hit rate). Consider prioritizing for high-value content.`);
    }

    // Cache size recommendations
    if (overallMetrics.evictions > overallMetrics.totalRequests * 0.1) {
      recommendations.push('High cache eviction rate detected. Consider increasing cache size or adjusting TTL settings.');
    }

    return recommendations;
  }

  /**
   * Check if caching is enabled and configured
   */
  public isCachingAvailable(): boolean {
    return this.cachingEnabled && this.providerManagers.size > 0;
  }

  /**
   * Get available providers
   */
  public getAvailableProviders(): string[] {
    return Array.from(this.providerManagers.keys());
  }

  // ===== Proxy methods for existing EmbeddingService functionality =====

  /**
   * Generate embedding vector from text using existing service
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddingService.generateEmbedding(text);
  }

  /**
   * Generate embedding for a knowledge entry by combining title and content
   */
  public async generateEntryEmbedding(title: string, content: string, tags: string[] = []): Promise<number[]> {
    return this.embeddingService.generateEntryEmbedding(title, content, tags);
  }

  /**
   * Get the dimensions of the OpenAI embedding model
   */
  public getDimensions(): number {
    return this.embeddingService.getDimensions();
  }

  /**
   * Clear the embedding cache
   */
  public clearEmbeddingCache(): void {
    this.embeddingService.clearCache();
  }

  /**
   * Clear all caches (both embedding and prompt caches)
   */
  public clearAllCaches(): void {
    this.embeddingService.clearCache();
    this.cacheService.clearAllCaches();
    console.log('[Enhanced Embedding] All caches cleared (embeddings + prompts)');
  }
}

// Export enhanced singleton instance
export default EnhancedEmbeddingService.getEnhancedInstance();