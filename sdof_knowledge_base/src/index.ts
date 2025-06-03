#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { UnifiedDatabaseService } from './services/unified-database.service.js';
import EnhancedEmbeddingService from './services/enhanced-embedding.service.js';

// Tool argument schemas
const StoreSDOFPlanArgsSchema = z.object({
  plan_content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

const LogDecisionArgsSchema = z.object({
  workspace_id: z.string(),
  summary: z.string(),
  rationale: z.string().optional(),
  implementation_details: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const GetDecisionsArgsSchema = z.object({
  workspace_id: z.string(),
  limit: z.number().optional(),
  tags_filter_include_all: z.array(z.string()).optional(),
  tags_filter_include_any: z.array(z.string()).optional(),
});

const LogCustomDataArgsSchema = z.object({
  workspace_id: z.string(),
  category: z.string(),
  key: z.string(),
  value: z.any(),
});

const GetCustomDataArgsSchema = z.object({
  workspace_id: z.string(),
  category: z.string().optional(),
  key: z.string().optional(),
});

const LogSystemPatternArgsSchema = z.object({
  workspace_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const GetSystemPatternsArgsSchema = z.object({
  workspace_id: z.string(),
  tags_filter_include_all: z.array(z.string()).optional(),
  tags_filter_include_any: z.array(z.string()).optional(),
});

const LogProgressArgsSchema = z.object({
  workspace_id: z.string(),
  description: z.string(),
  status: z.string(),
  parent_id: z.number().optional(),
});

const GetProgressArgsSchema = z.object({
  workspace_id: z.string(),
  status_filter: z.string().optional(),
  parent_id_filter: z.number().optional(),
  limit: z.number().optional(),
});

const UpdateProductContextArgsSchema = z.object({
  workspace_id: z.string(),
  content: z.record(z.any()).optional(),
  patch_content: z.record(z.any()).optional(),
});

const UpdateActiveContextArgsSchema = z.object({
  workspace_id: z.string(),
  content: z.record(z.any()).optional(),
  patch_content: z.record(z.any()).optional(),
});

const GetContextArgsSchema = z.object({
  workspace_id: z.string(),
});

const SemanticSearchArgsSchema = z.object({
  workspace_id: z.string(),
  query_text: z.string(),
  top_k: z.number().default(5),
  filter_item_types: z.array(z.string()).optional(),
  filter_tags_include_any: z.array(z.string()).optional(),
  filter_tags_include_all: z.array(z.string()).optional(),
  filter_custom_data_categories: z.array(z.string()).optional(),
});

// Prompt Caching Schemas
const ExecuteCachedPromptArgsSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini']),
  model: z.string(),
  systemPrompt: z.string(),
  sdofContext: z.string(),
  userQuery: z.string(),
  metadata: z.object({
    cacheHint: z.boolean().optional(),
    priority: z.number().optional(),
    projectContext: z.any().optional(),
    cacheHints: z.any().optional(),
  }).optional(),
  options: z.any().optional(),
});

const OptimizeSDOFContextArgsSchema = z.object({
  workspace_id: z.string(),
  includeDecisions: z.boolean().default(true),
  includePatterns: z.boolean().default(true),
  includePlans: z.boolean().default(true),
  includeProjectContext: z.boolean().default(true),
});

const WarmCachesArgsSchema = z.object({
  providers: z.array(z.enum(['openai', 'anthropic', 'gemini'])).optional(),
});

const GetCacheAnalyticsArgsSchema = z.object({
  detailed: z.boolean().default(false),
});

class UnifiedSDOFServer {
  private server: Server;
  private databases: Map<string, UnifiedDatabaseService> = new Map();
  private enhancedEmbedding: typeof EnhancedEmbeddingService;

  constructor() {
    this.enhancedEmbedding = EnhancedEmbeddingService;
    this.server = new Server(
      {
        name: 'sdof-knowledge-base',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private getDatabase(workspaceId: string): UnifiedDatabaseService {
    if (!this.databases.has(workspaceId)) {
      this.databases.set(workspaceId, new UnifiedDatabaseService(workspaceId));
    }
    return this.databases.get(workspaceId)!;
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // SDOF Plan Storage
          {
            name: 'store_sdof_plan',
            description: 'Store an SDOF plan with metadata',
            inputSchema: {
              type: 'object',
              properties: {
                plan_content: {
                  type: 'string',
                  description: 'The content of the SDOF plan',
                  minLength: 1,
                },
                metadata: {
                  type: 'object',
                  description: 'Optional metadata for the plan',
                  additionalProperties: true,
                },
              },
              required: ['plan_content'],
              additionalProperties: false,
            },
          },

          // Decision Management
          {
            name: 'log_decision',
            description: 'Log an architectural or implementation decision',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                summary: { type: 'string', description: 'Decision summary' },
                rationale: { type: 'string', description: 'Decision rationale' },
                implementation_details: { type: 'string', description: 'Implementation details' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
              },
              required: ['workspace_id', 'summary'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_decisions',
            description: 'Retrieve logged decisions',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                limit: { type: 'number', description: 'Maximum number of results' },
                tags_filter_include_all: { type: 'array', items: { type: 'string' } },
                tags_filter_include_any: { type: 'array', items: { type: 'string' } },
              },
              required: ['workspace_id'],
              additionalProperties: false,
            },
          },

          // Custom Data Management
          {
            name: 'log_custom_data',
            description: 'Store custom data entry',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                category: { type: 'string', description: 'Data category' },
                key: { type: 'string', description: 'Data key' },
                value: { description: 'Data value (any type)' },
              },
              required: ['workspace_id', 'category', 'key', 'value'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_custom_data',
            description: 'Retrieve custom data',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                category: { type: 'string', description: 'Filter by category' },
                key: { type: 'string', description: 'Filter by key' },
              },
              required: ['workspace_id'],
              additionalProperties: false,
            },
          },

          // System Pattern Management
          {
            name: 'log_system_pattern',
            description: 'Log a system or coding pattern',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                name: { type: 'string', description: 'Pattern name' },
                description: { type: 'string', description: 'Pattern description' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
              },
              required: ['workspace_id', 'name'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_system_patterns',
            description: 'Retrieve system patterns',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                tags_filter_include_all: { type: 'array', items: { type: 'string' } },
                tags_filter_include_any: { type: 'array', items: { type: 'string' } },
              },
              required: ['workspace_id'],
              additionalProperties: false,
            },
          },

          // Progress Management
          {
            name: 'log_progress',
            description: 'Log progress or task status',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                description: { type: 'string', description: 'Progress description' },
                status: { type: 'string', description: 'Progress status' },
                parent_id: { type: 'number', description: 'Parent task ID' },
              },
              required: ['workspace_id', 'description', 'status'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_progress',
            description: 'Retrieve progress entries',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                status_filter: { type: 'string', description: 'Filter by status' },
                parent_id_filter: { type: 'number', description: 'Filter by parent ID' },
                limit: { type: 'number', description: 'Maximum number of results' },
              },
              required: ['workspace_id'],
              additionalProperties: false,
            },
          },

          // Context Management
          {
            name: 'update_product_context',
            description: 'Update product context',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                content: { type: 'object', description: 'Full content update' },
                patch_content: { type: 'object', description: 'Partial content update' },
              },
              required: ['workspace_id'],
              additionalProperties: false,
            },
          },
          {
            name: 'update_active_context',
            description: 'Update active context',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                content: { type: 'object', description: 'Full content update' },
                patch_content: { type: 'object', description: 'Partial content update' },
              },
              required: ['workspace_id'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_product_context',
            description: 'Get product context',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
              },
              required: ['workspace_id'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_active_context',
            description: 'Get active context',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
              },
              required: ['workspace_id'],
              additionalProperties: false,
            },
          },

          // Semantic Search
          {
            name: 'semantic_search_sdof',
            description: 'Perform semantic search across SDOF knowledge base with OpenAI embeddings',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                query_text: { type: 'string', description: 'Search query' },
                top_k: { type: 'number', default: 5, description: 'Number of results' },
                filter_item_types: { type: 'array', items: { type: 'string' } },
                filter_tags_include_any: { type: 'array', items: { type: 'string' } },
                filter_tags_include_all: { type: 'array', items: { type: 'string' } },
                filter_custom_data_categories: { type: 'array', items: { type: 'string' } },
              },
              required: ['workspace_id', 'query_text'],
              additionalProperties: false,
            },
          },

          // Prompt Caching Tools
          {
            name: 'execute_cached_prompt',
            description: 'Execute a prompt with multi-provider caching optimization',
            inputSchema: {
              type: 'object',
              properties: {
                provider: { type: 'string', enum: ['openai', 'anthropic', 'gemini'], description: 'LLM provider' },
                model: { type: 'string', description: 'Model name' },
                systemPrompt: { type: 'string', description: 'System prompt' },
                sdofContext: { type: 'string', description: 'SDOF knowledge context' },
                userQuery: { type: 'string', description: 'User query' },
                metadata: {
                  type: 'object',
                  properties: {
                    cacheHint: { type: 'boolean', description: 'Hint for cache priority' },
                    priority: { type: 'number', description: 'Cache priority (0-10)' },
                    projectContext: { description: 'Project context data' },
                    cacheHints: { description: 'Additional cache hints' }
                  },
                  additionalProperties: true
                },
                options: { description: 'Additional provider options' }
              },
              required: ['provider', 'model', 'systemPrompt', 'sdofContext', 'userQuery'],
              additionalProperties: false,
            },
          },
          {
            name: 'optimize_sdof_context_for_caching',
            description: 'Optimize SDOF knowledge for prompt caching',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', description: 'Workspace identifier' },
                includeDecisions: { type: 'boolean', default: true, description: 'Include architectural decisions' },
                includePatterns: { type: 'boolean', default: true, description: 'Include system patterns' },
                includePlans: { type: 'boolean', default: true, description: 'Include SDOF plans' },
                includeProjectContext: { type: 'boolean', default: true, description: 'Include project context' }
              },
              required: ['workspace_id'],
              additionalProperties: false,
            },
          },
          {
            name: 'warm_all_caches',
            description: 'Warm caches across all providers with SDOF patterns',
            inputSchema: {
              type: 'object',
              properties: {
                providers: {
                  type: 'array',
                  items: { type: 'string', enum: ['openai', 'anthropic', 'gemini'] },
                  description: 'Specific providers to warm (optional, defaults to all)'
                }
              },
              additionalProperties: false,
            },
          },
          {
            name: 'get_cache_analytics',
            description: 'Get comprehensive cache performance analytics',
            inputSchema: {
              type: 'object',
              properties: {
                detailed: { type: 'boolean', default: false, description: 'Include detailed metrics' }
              },
              additionalProperties: false,
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'store_sdof_plan': {
          const args = StoreSDOFPlanArgsSchema.parse(request.params.arguments);
          
          // Use current working directory as workspace if not provided
          const workspaceId = process.cwd();
          const db = this.getDatabase(workspaceId);
          
          const id = await db.storePlan(args.plan_content, args.metadata);
          
          return {
            content: [
              {
                type: 'text',
                text: `Successfully stored SDOF plan with ID: ${id}`,
              },
            ],
          };
        }

        case 'log_decision': {
          const args = LogDecisionArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const id = await db.logDecision(
            args.summary,
            args.rationale,
            args.implementation_details,
            args.tags
          );
          
          return {
            content: [
              {
                type: 'text',
                text: `Decision logged with ID: ${id}`,
              },
            ],
          };
        }

        case 'get_decisions': {
          const args = GetDecisionsArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const decisions = await db.getDecisions(
            args.limit,
            args.tags_filter_include_all,
            args.tags_filter_include_any
          );
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(decisions, null, 2),
              },
            ],
          };
        }

        case 'log_custom_data': {
          const args = LogCustomDataArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const id = await db.logCustomData(
            args.category,
            args.key,
            args.value
          );
          
          return {
            content: [
              {
                type: 'text',
                text: `Custom data logged with ID: ${id}`,
              },
            ],
          };
        }

        case 'get_custom_data': {
          const args = GetCustomDataArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const data = await db.getCustomData(args.category, args.key);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        case 'log_system_pattern': {
          const args = LogSystemPatternArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const id = await db.logSystemPattern(
            args.name,
            args.description,
            args.tags
          );
          
          return {
            content: [
              {
                type: 'text',
                text: `System pattern logged with ID: ${id}`,
              },
            ],
          };
        }

        case 'get_system_patterns': {
          const args = GetSystemPatternsArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const patterns = await db.getSystemPatterns(
            args.tags_filter_include_all,
            args.tags_filter_include_any
          );
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(patterns, null, 2),
              },
            ],
          };
        }

        case 'log_progress': {
          const args = LogProgressArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const id = await db.logProgress(
            args.description,
            args.status,
            args.parent_id
          );
          
          return {
            content: [
              {
                type: 'text',
                text: `Progress logged with ID: ${id}`,
              },
            ],
          };
        }

        case 'get_progress': {
          const args = GetProgressArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const progress = await db.getProgress(
            args.status_filter,
            args.parent_id_filter,
            args.limit
          );
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(progress, null, 2),
              },
            ],
          };
        }

        case 'update_product_context': {
          const args = UpdateProductContextArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          if (args.content) {
            await db.updateProductContext(args.content);
          } else if (args.patch_content) {
            // Get current context and merge
            const current = await db.getProductContext() || {};
            const merged = { ...current, ...args.patch_content };
            
            // Handle __DELETE__ sentinel values
            for (const [key, value] of Object.entries(args.patch_content)) {
              if (value === '__DELETE__') {
                delete merged[key];
              }
            }
            
            await db.updateProductContext(merged);
          }
          
          return {
            content: [
              {
                type: 'text',
                text: 'Product context updated successfully',
              },
            ],
          };
        }

        case 'update_active_context': {
          const args = UpdateActiveContextArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          if (args.content) {
            await db.updateActiveContext(args.content);
          } else if (args.patch_content) {
            // Get current context and merge
            const current = await db.getActiveContext() || {};
            const merged = { ...current, ...args.patch_content };
            
            // Handle __DELETE__ sentinel values
            for (const [key, value] of Object.entries(args.patch_content)) {
              if (value === '__DELETE__') {
                delete merged[key];
              }
            }
            
            await db.updateActiveContext(merged);
          }
          
          return {
            content: [
              {
                type: 'text',
                text: 'Active context updated successfully',
              },
            ],
          };
        }

        case 'get_product_context': {
          const args = GetContextArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const context = await db.getProductContext();
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(context, null, 2),
              },
            ],
          };
        }

        case 'get_active_context': {
          const args = GetContextArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const context = await db.getActiveContext();
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(context, null, 2),
              },
            ],
          };
        }

        case 'semantic_search_sdof': {
          const args = SemanticSearchArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          const results = await db.semanticSearch(
            args.query_text,
            args.top_k,
            args.filter_item_types,
            args.filter_tags_include_any,
            args.filter_tags_include_all,
            args.filter_custom_data_categories
          );
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        }

        case 'execute_cached_prompt': {
          const args = ExecuteCachedPromptArgsSchema.parse(request.params.arguments);
          
          if (!this.enhancedEmbedding.isCachingAvailable()) {
            throw new McpError(
              ErrorCode.InternalError,
              'Prompt caching is not enabled or configured. Please ensure ENABLE_PROMPT_CACHING=true and provider credentials are set.'
            );
          }

          try {
            // Create a properly typed request
            const request = {
              provider: args.provider,
              model: args.model,
              systemPrompt: args.systemPrompt,
              sdofContext: args.sdofContext,
              userQuery: args.userQuery,
              options: args.options
            } as any;
            
            if (args.metadata) {
              request.metadata = args.metadata;
            }
            
            const result = await this.enhancedEmbedding.executeCachedPrompt(request);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    cached: result.cached,
                    provider: result.provider,
                    model: result.model,
                    response: result.response,
                    metrics: result.metrics,
                    cacheKey: result.cacheKey
                  }, null, 2),
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to execute cached prompt: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        case 'optimize_sdof_context_for_caching': {
          const args = OptimizeSDOFContextArgsSchema.parse(request.params.arguments);
          const db = this.getDatabase(args.workspace_id);
          
          try {
            // Fetch SDOF data based on options
            // Note: Using empty array for plans as getPlans() method doesn't exist yet
            const sdofPlans: any[] = []; // TODO: Implement getPlans() method in UnifiedDatabaseService
            const decisions = args.includeDecisions ? await db.getDecisions() : [];
            const systemPatterns = args.includePatterns ? await db.getSystemPatterns() : [];
            const projectContext = args.includeProjectContext ? await db.getProductContext() : null;
            
            const optimization = await this.enhancedEmbedding.optimizeSDOFContextForCaching(
              sdofPlans,
              decisions,
              systemPatterns,
              projectContext
            );
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    optimizedContext: optimization.optimizedContext,
                    cacheHints: optimization.cacheHints,
                    estimatedValue: optimization.estimatedValue,
                    recommendations: [
                      `Context optimized for caching with estimated value: ${optimization.estimatedValue.toFixed(2)}`,
                      `Includes ${decisions.length} decisions, ${systemPatterns.length} patterns, ${sdofPlans.length} plans`,
                      optimization.estimatedValue > 0.7 ? 'High cache value - excellent candidate for caching' :
                      optimization.estimatedValue > 0.4 ? 'Medium cache value - good candidate for caching' :
                      'Low cache value - consider enriching content'
                    ]
                  }, null, 2),
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to optimize SDOF context: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        case 'warm_all_caches': {
          const args = WarmCachesArgsSchema.parse(request.params.arguments);
          
          if (!this.enhancedEmbedding.isCachingAvailable()) {
            throw new McpError(
              ErrorCode.InternalError,
              'Prompt caching is not enabled or configured.'
            );
          }

          try {
            const results = await this.enhancedEmbedding.warmAllCaches();
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    summary: results.summary,
                    providerResults: results,
                    message: `Cache warming completed: ${results.summary.providersWarmed} providers, ${results.summary.totalPatterns} patterns, estimated savings: $${results.summary.estimatedSavings.toFixed(4)}`
                  }, null, 2),
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to warm caches: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        case 'get_cache_analytics': {
          const args = GetCacheAnalyticsArgsSchema.parse(request.params.arguments);
          
          if (!this.enhancedEmbedding.isCachingAvailable()) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    message: 'Prompt caching is not enabled or configured.',
                    analytics: null
                  }, null, 2),
                },
              ],
            };
          }

          try {
            const analytics = this.enhancedEmbedding.getCacheAnalytics();
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    analytics: analytics,
                    summary: {
                      overallHitRate: `${(analytics.overall.hitRate * 100).toFixed(1)}%`,
                      totalCostSavings: `$${analytics.overall.costSavings.toFixed(4)}`,
                      availableProviders: this.enhancedEmbedding.getAvailableProviders(),
                      recommendations: analytics.recommendations
                    }
                  }, null, 2),
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to get cache analytics: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Unified SDOF Knowledge Base MCP server running on stdio');
  }
}

// Import HTTP server functionality
import { startHttpServer } from './http-server.js';

async function startBothServers() {
  try {
    // Start HTTP server first
    console.error('[STARTUP] Starting HTTP API server...');
    await startHttpServer();
    
    // Start MCP server
    console.error('[STARTUP] Starting MCP server...');
    const mcpServer = new UnifiedSDOFServer();
    await mcpServer.run();
    
    console.error('[STARTUP] Both servers are now running');
  } catch (error) {
    console.error('[STARTUP] Failed to start servers:', error);
    process.exit(1);
  }
}

// Start both servers
startBothServers().catch(console.error);