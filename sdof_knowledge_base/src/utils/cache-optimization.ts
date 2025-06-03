/**
 * Cache Optimization Utilities
 * 
 * Provides intelligent cache warming, lifecycle management, and optimization
 * strategies for multi-provider prompt caching.
 */

import { CacheEntry, CacheMetrics } from '../services/cache.service.js';
import embeddingService from '../services/embedding.service.js';

export interface CacheOptimizationConfig {
  warmingThreshold: number; // Minimum access frequency for warming
  evictionStrategy: 'lru' | 'lfu' | 'ttl' | 'intelligent';
  maxCacheSize: number;
  targetHitRate: number;
  costOptimizationEnabled: boolean;
  semanticGroupingEnabled: boolean;
}

export interface CacheAnalytics {
  popularPatterns: Array<{
    pattern: string;
    frequency: number;
    avgTokens: number;
    costSavings: number;
  }>;
  providerEfficiency: Record<string, {
    hitRate: number;
    avgResponseTime: number;
    costPerRequest: number;
  }>;
  semanticClusters: Array<{
    centroid: string;
    size: number;
    avgSimilarity: number;
  }>;
  recommendations: string[];
}

/**
 * Cache Warming Strategies
 */
export class CacheWarmingService {
  private static instance: CacheWarmingService;
  
  private constructor() {}
  
  public static getInstance(): CacheWarmingService {
    if (!CacheWarmingService.instance) {
      CacheWarmingService.instance = new CacheWarmingService();
    }
    return CacheWarmingService.instance;
  }

  /**
   * Identify high-value content for cache warming based on SDOF knowledge
   */
  public async identifyWarmingCandidates(): Promise<Array<{
    content: string;
    priority: number;
    estimatedValue: number;
    metadata: any;
  }>> {
    const candidates: Array<{
      content: string;
      priority: number;
      estimatedValue: number;
      metadata: any;
    }> = [];

    // 1. System patterns and architectural decisions (highest priority)
    const systemPatterns = [
      {
        content: "Implement microservice architecture with Docker containers and Kubernetes orchestration",
        priority: 10,
        estimatedValue: 0.95,
        metadata: { type: 'architecture', cacheHint: true }
      },
      {
        content: "Design RESTful API following OpenAPI 3.0 specification with proper error handling",
        priority: 9,
        estimatedValue: 0.90,
        metadata: { type: 'api_design', cacheHint: true }
      },
      {
        content: "Implement React TypeScript component with proper props validation and error boundaries",
        priority: 8,
        estimatedValue: 0.85,
        metadata: { type: 'frontend', cacheHint: true }
      }
    ];

    // 2. Common SDOF workflow patterns
    const sdofPatterns = [
      {
        content: "SDOF Phase 1: Problem exploration and solution generation. Analyze requirements, identify constraints, generate multiple solution approaches.",
        priority: 9,
        estimatedValue: 0.92,
        metadata: { type: 'sdof_phase1', cacheHint: true }
      },
      {
        content: "SDOF Phase 2: Detailed analysis and optimization. Evaluate solutions against criteria, perform trade-off analysis, select optimal approach.",
        priority: 8,
        estimatedValue: 0.88,
        metadata: { type: 'sdof_phase2', cacheHint: true }
      },
      {
        content: "SDOF Phase 3: Implementation with testing and documentation. Code implementation, unit testing, integration testing, documentation.",
        priority: 7,
        estimatedValue: 0.85,
        metadata: { type: 'sdof_phase3', cacheHint: true }
      }
    ];

    // 3. Code review and optimization patterns
    const codePatterns = [
      {
        content: "Perform comprehensive code review focusing on performance, security, maintainability, and adherence to coding standards",
        priority: 7,
        estimatedValue: 0.80,
        metadata: { type: 'code_review', cacheHint: true }
      },
      {
        content: "Optimize database queries for performance, implement proper indexing, and ensure efficient data access patterns",
        priority: 6,
        estimatedValue: 0.75,
        metadata: { type: 'database_optimization', cacheHint: true }
      }
    ];

    candidates.push(...systemPatterns, ...sdofPatterns, ...codePatterns);
    
    // Sort by priority and estimated value
    return candidates.sort((a, b) => 
      (b.priority * b.estimatedValue) - (a.priority * a.estimatedValue)
    );
  }

  /**
   * Generate warming content based on project context
   */
  public async generateContextualWarmingContent(projectContext: any): Promise<Array<{
    content: string;
    priority: number;
    provider: 'openai' | 'anthropic' | 'gemini';
    model: string;
  }>> {
    const warmingContent: Array<{
      content: string;
      priority: number;
      provider: 'openai' | 'anthropic' | 'gemini';
      model: string;
    }> = [];

    const tech_stack = projectContext?.tech_stack || [];
    const project_type = projectContext?.project_type || 'web_application';

    // Generate tech-stack specific content
    if (tech_stack.includes('React')) {
      warmingContent.push({
        content: `Create a React TypeScript component with the following requirements: proper props interface, error boundary handling, responsive design, accessibility compliance, and performance optimization using React.memo and useMemo hooks.`,
        priority: 8,
        provider: 'openai',
        model: 'gpt-4'
      });
    }

    if (tech_stack.includes('Node.js')) {
      warmingContent.push({
        content: `Design a Node.js Express API server with proper middleware, error handling, authentication, rate limiting, input validation, and MongoDB integration following MVC architecture patterns.`,
        priority: 8,
        provider: 'anthropic',
        model: 'claude-3-sonnet'
      });
    }

    // Add project-type specific content
    switch (project_type) {
      case 'microservices':
        warmingContent.push({
          content: `Design microservice architecture with service discovery, API gateway, distributed tracing, circuit breakers, and proper inter-service communication patterns.`,
          priority: 9,
          provider: 'gemini',
          model: 'gemini-pro'
        });
        break;
      case 'ecommerce':
        warmingContent.push({
          content: `Implement secure e-commerce platform with payment processing, inventory management, user authentication, order tracking, and recommendation engine.`,
          priority: 7,
          provider: 'openai',
          model: 'gpt-4'
        });
        break;
    }

    return warmingContent.sort((a, b) => b.priority - a.priority);
  }
}

/**
 * Cache Lifecycle Management
 */
export class CacheLifecycleManager {
  private config: CacheOptimizationConfig;

  constructor(config: CacheOptimizationConfig) {
    this.config = config;
  }

  /**
   * Intelligent cache eviction based on multiple factors
   */
  public selectEvictionCandidates(
    cacheEntries: Map<string, CacheEntry>,
    targetEvictionCount: number
  ): string[] {
    const entries = Array.from(cacheEntries.entries());
    
    switch (this.config.evictionStrategy) {
      case 'intelligent':
        return this.intelligentEviction(entries, targetEvictionCount);
      case 'lru':
        return this.lruEviction(entries, targetEvictionCount);
      case 'lfu':
        return this.lfuEviction(entries, targetEvictionCount);
      case 'ttl':
        return this.ttlEviction(entries, targetEvictionCount);
      default:
        return this.intelligentEviction(entries, targetEvictionCount);
    }
  }

  private intelligentEviction(
    entries: [string, CacheEntry][],
    targetCount: number
  ): string[] {
    // Score each entry based on multiple factors
    const scoredEntries = entries.map(([key, entry]) => {
      const age = Date.now() - entry.timestamp.getTime();
      const recency = Date.now() - entry.lastHit.getTime();
      const frequency = entry.hitCount;
      const tokenValue = entry.tokenCount;
      const cacheHint = entry.cacheHint ? 1 : 0;

      // Weighted scoring (lower score = more likely to evict)
      const score = 
        (frequency * 0.3) +           // Access frequency
        ((1 / recency) * 0.25) +      // Recency (inverse)
        (tokenValue * 0.15) +         // Token value
        (cacheHint * 0.20) +          // Cache hint boost
        ((1 / age) * 0.10);           // Age (inverse)

      return { key, score, entry };
    });

    // Sort by score (ascending) and take the lowest scored entries
    return scoredEntries
      .sort((a, b) => a.score - b.score)
      .slice(0, targetCount)
      .map(item => item.key);
  }

  private lruEviction(entries: [string, CacheEntry][], targetCount: number): string[] {
    return entries
      .sort((a, b) => a[1].lastHit.getTime() - b[1].lastHit.getTime())
      .slice(0, targetCount)
      .map(([key]) => key);
  }

  private lfuEviction(entries: [string, CacheEntry][], targetCount: number): string[] {
    return entries
      .sort((a, b) => a[1].hitCount - b[1].hitCount)
      .slice(0, targetCount)
      .map(([key]) => key);
  }

  private ttlEviction(entries: [string, CacheEntry][], targetCount: number): string[] {
    return entries
      .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
      .slice(0, targetCount)
      .map(([key]) => key);
  }
}

/**
 * Cache Analytics and Optimization
 */
export class CacheAnalyticsService {
  /**
   * Analyze cache performance and provide recommendations
   */
  public analyzeCache(
    cacheEntries: Map<string, CacheEntry>,
    metrics: CacheMetrics
  ): CacheAnalytics {
    const analytics: CacheAnalytics = {
      popularPatterns: this.identifyPopularPatterns(cacheEntries),
      providerEfficiency: this.analyzeProviderEfficiency(cacheEntries),
      semanticClusters: [],
      recommendations: []
    };

    // Generate recommendations
    analytics.recommendations = this.generateRecommendations(analytics, metrics);

    return analytics;
  }

  private identifyPopularPatterns(cacheEntries: Map<string, CacheEntry>): Array<{
    pattern: string;
    frequency: number;
    avgTokens: number;
    costSavings: number;
  }> {
    const patterns = new Map<string, {
      frequency: number;
      totalTokens: number;
      costSavings: number;
    }>();

    for (const entry of cacheEntries.values()) {
      // Extract patterns from content (simplified)
      const pattern = this.extractPattern(entry.content);
      
      if (!patterns.has(pattern)) {
        patterns.set(pattern, { frequency: 0, totalTokens: 0, costSavings: 0 });
      }

      const patternData = patterns.get(pattern)!;
      patternData.frequency += entry.hitCount;
      patternData.totalTokens += entry.tokenCount * entry.hitCount;
      patternData.costSavings += this.estimateCostSavings(entry);
    }

    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.frequency,
        avgTokens: data.totalTokens / data.frequency,
        costSavings: data.costSavings
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  private extractPattern(content: string): string {
    // Simplified pattern extraction - in practice, this would be more sophisticated
    if (content.includes('React')) return 'React Development';
    if (content.includes('API') || content.includes('REST')) return 'API Development';
    if (content.includes('database') || content.includes('SQL')) return 'Database Operations';
    if (content.includes('SDOF Phase')) return 'SDOF Workflow';
    if (content.includes('architecture')) return 'System Architecture';
    return 'General Development';
  }

  private analyzeProviderEfficiency(cacheEntries: Map<string, CacheEntry>): Record<string, {
    hitRate: number;
    avgResponseTime: number;
    costPerRequest: number;
  }> {
    const providerStats = new Map<string, {
      totalHits: number;
      totalRequests: number;
      totalResponseTime: number;
      totalCost: number;
    }>();

    for (const entry of cacheEntries.values()) {
      const provider = entry.provider;
      
      if (!providerStats.has(provider)) {
        providerStats.set(provider, {
          totalHits: 0,
          totalRequests: 0,
          totalResponseTime: 0,
          totalCost: 0
        });
      }

      const stats = providerStats.get(provider)!;
      stats.totalHits += entry.hitCount;
      stats.totalRequests += entry.hitCount + 1; // +1 for initial miss
      stats.totalResponseTime += entry.responseTime * entry.hitCount;
      stats.totalCost += this.estimateCostSavings(entry);
    }

    const efficiency: Record<string, any> = {};
    
    for (const [provider, stats] of providerStats) {
      efficiency[provider] = {
        hitRate: stats.totalHits / stats.totalRequests,
        avgResponseTime: stats.totalResponseTime / stats.totalHits,
        costPerRequest: stats.totalCost / stats.totalRequests
      };
    }

    return efficiency;
  }

  private estimateCostSavings(entry: CacheEntry): number {
    const costPer1kTokens = {
      openai: 0.002,
      anthropic: 0.003,
      gemini: 0.001
    };

    const baseCost = (costPer1kTokens[entry.provider] || 0.002) * (entry.tokenCount / 1000);
    return baseCost * entry.hitCount;
  }

  private generateRecommendations(analytics: CacheAnalytics, metrics: CacheMetrics): string[] {
    const recommendations: string[] = [];

    // Hit rate recommendations
    if (metrics.hitRate < 0.7) {
      recommendations.push('Consider implementing more aggressive cache warming for frequently used patterns');
    }

    if (metrics.hitRate > 0.95) {
      recommendations.push('Excellent hit rate! Consider increasing cache size to maintain performance');
    }

    // Cost optimization recommendations
    const totalSavings = analytics.popularPatterns.reduce((sum, p) => sum + p.costSavings, 0);
    if (totalSavings > 10) {
      recommendations.push(`Caching is highly effective - saving approximately $${totalSavings.toFixed(2)} in API costs`);
    }

    // Provider efficiency recommendations
    const providers = Object.entries(analytics.providerEfficiency);
    if (providers.length > 1) {
      const bestProvider = providers.reduce((best, current) => 
        current[1].hitRate > best[1].hitRate ? current : best
      );
      recommendations.push(`${bestProvider[0]} shows best cache efficiency - consider prioritizing for high-value content`);
    }

    // Cache size recommendations
    if (metrics.evictions > metrics.totalRequests * 0.1) {
      recommendations.push('High eviction rate detected - consider increasing cache size or adjusting TTL');
    }

    return recommendations;
  }
}

// Export utility classes
export const cacheWarming = CacheWarmingService.getInstance();
export const cacheAnalytics = new CacheAnalyticsService();