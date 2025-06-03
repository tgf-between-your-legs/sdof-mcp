#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { UnifiedDatabaseService } from './services/unified-database-complete.service.js';
import { z } from 'zod';

// Initialize the unified database service
const dbService = new UnifiedDatabaseService();

class UnifiedMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'unified-sdof-knowledge-base',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  private setupRequestHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Core Context Management Tools
          {
            name: 'get_product_context',
            description: 'Retrieves the overall project goals, features, and architecture.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'update_product_context',
            description: 'Updates the product context. Accepts full content (object) or patch_content (object) for partial updates.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                content: {
                  type: 'object',
                  description: 'The full new context content as a dictionary. Overwrites existing.',
                },
                patch_content: {
                  type: 'object',
                  description: 'A dictionary of changes to apply to the existing context (add/update keys).',
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'get_active_context',
            description: 'Retrieves the current working focus, recent changes, and open issues.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'update_active_context',
            description: 'Updates the active context. Accepts full content (object) or patch_content (object) for partial updates.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                content: {
                  type: 'object',
                  description: 'The full new context content as a dictionary. Overwrites existing.',
                },
                patch_content: {
                  type: 'object',
                  description: 'A dictionary of changes to apply to the existing context (add/update keys).',
                },
              },
              required: ['workspace_id'],
            },
          },

          // Decision Management Tools
          {
            name: 'log_decision',
            description: 'Logs an architectural or implementation decision.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                summary: {
                  type: 'string',
                  description: 'A concise summary of the decision',
                },
                rationale: {
                  type: 'string',
                  description: 'The reasoning behind the decision',
                },
                implementation_details: {
                  type: 'string',
                  description: 'Details about how the decision will be/was implemented',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional tags for categorization',
                },
              },
              required: ['workspace_id', 'summary'],
            },
          },
          {
            name: 'get_decisions',
            description: 'Retrieves logged decisions.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of decisions to return (most recent first)',
                },
                tags_filter_include_all: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter: items must include ALL of these tags.',
                },
                tags_filter_include_any: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter: items must include AT LEAST ONE of these tags.',
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'search_decisions_fts',
            description: 'Full-text search across decision fields (summary, rationale, details, tags).',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                query_term: {
                  type: 'string',
                  description: 'The term to search for in decisions.',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of search results to return.',
                  default: 10,
                },
              },
              required: ['workspace_id', 'query_term'],
            },
          },
          {
            name: 'delete_decision_by_id',
            description: 'Deletes a decision by its ID.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                decision_id: {
                  type: 'number',
                  description: 'The ID of the decision to delete.',
                },
              },
              required: ['workspace_id', 'decision_id'],
            },
          },

          // Progress Management Tools
          {
            name: 'log_progress',
            description: 'Logs a progress entry or task status.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                status: {
                  type: 'string',
                  description: 'Current status (e.g., TODO, IN_PROGRESS, DONE)',
                },
                description: {
                  type: 'string',
                  description: 'Description of the progress or task',
                },
                parent_id: {
                  type: 'number',
                  description: 'ID of the parent task, if this is a subtask',
                },
                linked_item_type: {
                  type: 'string',
                  description: 'Optional: Type of the ConPort item this progress entry is linked to',
                },
                linked_item_id: {
                  type: 'string',
                  description: 'Optional: ID/key of the ConPort item this progress entry is linked to',
                },
                link_relationship_type: {
                  type: 'string',
                  description: 'Relationship type for the automatic link',
                  default: 'relates_to_progress',
                },
              },
              required: ['workspace_id', 'status', 'description'],
            },
          },
          {
            name: 'get_progress',
            description: 'Retrieves progress entries.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                status_filter: {
                  type: 'string',
                  description: 'Filter entries by status',
                },
                parent_id_filter: {
                  type: 'number',
                  description: 'Filter entries by parent task ID',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of entries to return (most recent first)',
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'update_progress',
            description: 'Updates an existing progress entry.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                progress_id: {
                  type: 'number',
                  description: 'The ID of the progress entry to update.',
                },
                status: {
                  type: 'string',
                  description: 'New status (e.g., TODO, IN_PROGRESS, DONE)',
                },
                description: {
                  type: 'string',
                  description: 'New description of the progress or task',
                },
                parent_id: {
                  type: 'number',
                  description: 'New ID of the parent task, if changing',
                },
              },
              required: ['workspace_id', 'progress_id'],
            },
          },
          {
            name: 'delete_progress_by_id',
            description: 'Deletes a progress entry by its ID.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                progress_id: {
                  type: 'number',
                  description: 'The ID of the progress entry to delete.',
                },
              },
              required: ['workspace_id', 'progress_id'],
            },
          },

          // System Pattern Management Tools
          {
            name: 'log_system_pattern',
            description: 'Logs or updates a system/coding pattern.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                name: {
                  type: 'string',
                  description: 'Unique name for the system pattern',
                },
                description: {
                  type: 'string',
                  description: 'Description of the pattern',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional tags for categorization',
                },
              },
              required: ['workspace_id', 'name'],
            },
          },
          {
            name: 'get_system_patterns',
            description: 'Retrieves system patterns.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                tags_filter_include_all: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter: items must include ALL of these tags.',
                },
                tags_filter_include_any: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter: items must include AT LEAST ONE of these tags.',
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'delete_system_pattern_by_id',
            description: 'Deletes a system pattern by its ID.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                pattern_id: {
                  type: 'number',
                  description: 'The ID of the system pattern to delete.',
                },
              },
              required: ['workspace_id', 'pattern_id'],
            },
          },

          // Custom Data Management Tools
          {
            name: 'log_custom_data',
            description: 'Stores/updates a custom key-value entry under a category. Value is JSON-serializable.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                category: {
                  type: 'string',
                  description: 'Category for the custom data',
                },
                key: {
                  type: 'string',
                  description: 'Key for the custom data (unique within category)',
                },
                value: {
                  description: 'The custom data value (JSON serializable)',
                },
              },
              required: ['workspace_id', 'category', 'key', 'value'],
            },
          },
          {
            name: 'get_custom_data',
            description: 'Retrieves custom data.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                category: {
                  type: 'string',
                  description: 'Filter by category',
                },
                key: {
                  type: 'string',
                  description: 'Filter by key (requires category)',
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'delete_custom_data',
            description: 'Deletes a specific custom data entry.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                category: {
                  type: 'string',
                  description: 'Category of the data to delete',
                },
                key: {
                  type: 'string',
                  description: 'Key of the data to delete',
                },
              },
              required: ['workspace_id', 'category', 'key'],
            },
          },
          {
            name: 'search_custom_data_value_fts',
            description: 'Full-text search across all custom data values, categories, and keys.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                query_term: {
                  type: 'string',
                  description: 'The term to search for in custom data (category, key, or value).',
                },
                category_filter: {
                  type: 'string',
                  description: 'Optional: Filter results to this category after FTS.',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of search results to return.',
                  default: 10,
                },
              },
              required: ['workspace_id', 'query_term'],
            },
          },
          {
            name: 'search_project_glossary_fts',
            description: 'Full-text search within the ProjectGlossary custom data category.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                query_term: {
                  type: 'string',
                  description: 'The term to search for in the glossary.',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of search results to return.',
                  default: 10,
                },
              },
              required: ['workspace_id', 'query_term'],
            },
          },

          // Link Management Tools
          {
            name: 'link_conport_items',
            description: 'Creates a relationship link between two ConPort items, explicitly building out the project knowledge graph.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                source_item_type: {
                  type: 'string',
                  description: 'Type of the source item',
                },
                source_item_id: {
                  type: 'string',
                  description: 'ID or key of the source item',
                },
                target_item_type: {
                  type: 'string',
                  description: 'Type of the target item',
                },
                target_item_id: {
                  type: 'string',
                  description: 'ID or key of the target item',
                },
                relationship_type: {
                  type: 'string',
                  description: 'Nature of the link',
                },
                description: {
                  type: 'string',
                  description: 'Optional description for the link',
                },
              },
              required: ['workspace_id', 'source_item_type', 'source_item_id', 'target_item_type', 'target_item_id', 'relationship_type'],
            },
          },
          {
            name: 'get_linked_items',
            description: 'Retrieves items linked to a specific item.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                item_type: {
                  type: 'string',
                  description: 'Type of the item to find links for (e.g., decision)',
                },
                item_id: {
                  type: 'string',
                  description: 'ID or key of the item to find links for',
                },
                relationship_type_filter: {
                  type: 'string',
                  description: 'Optional: Filter by relationship type',
                },
                linked_item_type_filter: {
                  type: 'string',
                  description: 'Optional: Filter by the type of the linked items',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of links to return',
                },
              },
              required: ['workspace_id', 'item_type', 'item_id'],
            },
          },

          // Advanced Query Tools
          {
            name: 'get_item_history',
            description: 'Retrieves version history for Product or Active Context.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                item_type: {
                  type: 'string',
                  description: 'Type of the item: product_context or active_context',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of history entries to return (most recent first)',
                },
                before_timestamp: {
                  type: 'string',
                  description: 'Return entries before this timestamp',
                },
                after_timestamp: {
                  type: 'string',
                  description: 'Return entries after this timestamp',
                },
                version: {
                  type: 'number',
                  description: 'Return a specific version',
                },
              },
              required: ['workspace_id', 'item_type'],
            },
          },
          {
            name: 'batch_log_items',
            description: 'Logs multiple items of the same type (e.g., decisions, progress entries) in a single call.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                item_type: {
                  type: 'string',
                  description: 'Type of items to log (e.g., decision, progress_entry, system_pattern, custom_data)',
                },
                items: {
                  type: 'array',
                  description: 'A list of dictionaries, each representing the arguments for a single item log.',
                  items: { type: 'object' },
                },
              },
              required: ['workspace_id', 'item_type', 'items'],
            },
          },
          {
            name: 'get_recent_activity_summary',
            description: 'Provides a summary of recent ConPort activity (new/updated items).',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                hours_ago: {
                  type: 'number',
                  description: 'Look back this many hours for recent activity.',
                },
                since_timestamp: {
                  type: 'string',
                  description: 'Look back for activity since this specific timestamp.',
                },
                limit_per_type: {
                  type: 'number',
                  description: 'Maximum number of recent items to show per activity type.',
                  default: 5,
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'get_conport_schema',
            description: 'Retrieves the schema of available ConPort tools and their arguments.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
              },
              required: ['workspace_id'],
            },
          },

          // Semantic Search and Vector Tools
          {
            name: 'semantic_search_conport',
            description: 'Performs a semantic search across ConPort data.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                query_text: {
                  type: 'string',
                  description: 'The natural language query text for semantic search.',
                },
                top_k: {
                  type: 'number',
                  description: 'Number of top results to return.',
                  default: 5,
                  minimum: 1,
                  maximum: 25,
                },
                filter_item_types: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional list of item types to filter by.',
                },
                filter_tags_include_any: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional list of tags; results will include items matching any of these tags.',
                },
                filter_tags_include_all: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional list of tags; results will include only items matching all of these tags.',
                },
                filter_custom_data_categories: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional list of categories to filter by if custom_data is in filter_item_types.',
                },
              },
              required: ['workspace_id', 'query_text'],
            },
          },

          // AI Enrichment Tools
          {
            name: 'get_link_suggestions',
            description: 'Retrieves link suggestions, optionally filtered.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                status_filter: {
                  type: 'string',
                  description: 'Filter by status (e.g., pending, accepted, rejected)',
                },
                source_item_type_filter: {
                  type: 'string',
                  description: 'Filter by source item type',
                },
                source_item_id_filter: {
                  type: 'string',
                  description: 'Filter by source item ID',
                },
                target_item_type_filter: {
                  type: 'string',
                  description: 'Filter by target item type',
                },
                target_item_id_filter: {
                  type: 'string',
                  description: 'Filter by target item ID',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of suggestions to return',
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'update_link_suggestion_status',
            description: 'Updates the status of a specific link suggestion.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                suggestion_id: {
                  type: 'number',
                  description: 'The ID of the link suggestion to update.',
                },
                status: {
                  type: 'string',
                  description: 'The new status for the suggestion (e.g., accepted, rejected, dismissed).',
                },
                user_feedback: {
                  type: 'string',
                  description: 'Optional feedback from the user.',
                },
                reviewed_by: {
                  type: 'string',
                  description: 'Identifier for the user/agent who reviewed the suggestion.',
                },
              },
              required: ['workspace_id', 'suggestion_id', 'status'],
            },
          },
          {
            name: 'get_metadata_suggestions',
            description: 'Retrieves metadata suggestions, optionally filtered.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                status_filter: {
                  type: 'string',
                  description: 'Filter by status (e.g., pending, accepted, rejected)',
                },
                item_type_filter: {
                  type: 'string',
                  description: 'Filter by item type',
                },
                item_id_filter: {
                  type: 'string',
                  description: 'Filter by item ID',
                },
                suggestion_type_filter: {
                  type: 'string',
                  description: 'Filter by suggestion type',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of suggestions to return',
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'update_item_metadata',
            description: 'Updates metadata for a specified ConPort item (e.g., decision, system_pattern, custom_data, progress_entry).',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                item_type: {
                  type: 'string',
                  description: 'The type of the ConPort item (e.g., decision, system_pattern, custom_data, progress_entry).',
                },
                item_id: {
                  type: 'string',
                  description: 'The ID (primary key as string) of the item to update.',
                },
                metadata_to_update: {
                  type: 'object',
                  description: 'A dictionary of metadata fields and their new values to apply to the item.',
                },
              },
              required: ['workspace_id', 'item_type', 'item_id', 'metadata_to_update'],
            },
          },

          // RAG Evaluation Tools
          {
            name: 'execute_agentic_rag_query',
            description: 'Executes an agentic RAG query using ConPort as a knowledge source.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                query_text: {
                  type: 'string',
                  description: 'The complex user query for the agentic RAG process.',
                },
                user_persona: {
                  type: 'string',
                  description: 'The persona the agent should adopt for the response.',
                },
                output_format_instructions: {
                  type: 'string',
                  description: 'Specific instructions for the output format.',
                },
                complexity_level: {
                  type: 'string',
                  description: 'Desired complexity level of the response (e.g., simple, detailed).',
                },
                context_items_ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of ConPort item IDs to be used as primary context.',
                },
                model_parameters: {
                  type: 'object',
                  description: 'Parameters for the underlying language model.',
                },
                max_iterations: {
                  type: 'number',
                  description: 'Maximum number of agentic iterations.',
                },
                tool_names: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific tool names the agent is allowed to use.',
                },
              },
              required: ['workspace_id', 'query_text'],
            },
          },
          {
            name: 'trigger_rag_evaluation_run',
            description: 'Triggers a RAG evaluation run against a specified dataset.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                dataset_id: {
                  type: 'string',
                  description: 'The ID of the dataset to use for the evaluation.',
                },
                experiment_label: {
                  type: 'string',
                  description: 'An optional label for this evaluation experiment run.',
                },
              },
              required: ['workspace_id', 'dataset_id'],
            },
          },
          {
            name: 'log_rag_evaluation_feedback',
            description: 'Logs feedback for a RAG evaluation.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                query_text: {
                  type: 'string',
                  description: 'The original query text that was evaluated.',
                },
                generated_answer: {
                  type: 'string',
                  description: 'The answer generated by the RAG system.',
                },
                feedback_data: {
                  type: 'object',
                  description: 'A dictionary containing various feedback metrics and comments.',
                },
                rag_query_id: {
                  type: 'string',
                  description: 'Optional ID of the RAG query this feedback pertains to.',
                },
                retrieved_context_summary: {
                  type: 'string',
                  description: 'A summary of the context retrieved for the RAG query.',
                },
                evaluator_id: {
                  type: 'string',
                  description: 'Identifier for the user or system providing the evaluation feedback.',
                },
              },
              required: ['workspace_id', 'query_text', 'generated_answer', 'feedback_data'],
            },
          },

          // Export/Import Tools
          {
            name: 'export_conport_to_markdown',
            description: 'Exports ConPort data to markdown files.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                output_path: {
                  type: 'string',
                  description: 'Optional output directory path relative to workspace_id.',
                },
              },
              required: ['workspace_id'],
            },
          },
          {
            name: 'import_markdown_to_conport',
            description: 'Imports data from markdown files into ConPort.',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'Identifier for the workspace (e.g., absolute path)',
                },
                input_path: {
                  type: 'string',
                  description: 'Optional input directory path relative to workspace_id containing markdown files.',
                },
              },
              required: ['workspace_id'],
            },
          },

          // SDOF-specific Tools
          {
            name: 'store_sdof_plan',
            description: 'Stores a SDOF plan with optional metadata.',
            inputSchema: {
              type: 'object',
              properties: {
                plan_content: {
                  type: 'string',
                  description: 'The SDOF plan content',
                },
                metadata: {
                  type: 'object',
                  description: 'Optional metadata associated with the plan',
                },
              },
              required: ['plan_content'],
            },
          },
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        // Initialize database service if not already done
        await dbService.initialize();

        switch (name) {
          // Core Context Management
          case 'get_product_context':
            return await this.handleGetProductContext(args as any);
          case 'update_product_context':
            return await this.handleUpdateProductContext(args as any);
          case 'get_active_context':
            return await this.handleGetActiveContext(args as any);
          case 'update_active_context':
            return await this.handleUpdateActiveContext(args as any);

          // Decision Management
          case 'log_decision':
            return await this.handleLogDecision(args as any);
          case 'get_decisions':
            return await this.handleGetDecisions(args as any);
          case 'search_decisions_fts':
            return await this.handleSearchDecisionsFts(args as any);
          case 'delete_decision_by_id':
            return await this.handleDeleteDecisionById(args as any);

          // Progress Management
          case 'log_progress':
            return await this.handleLogProgress(args as any);
          case 'get_progress':
            return await this.handleGetProgress(args as any);
          case 'update_progress':
            return await this.handleUpdateProgress(args as any);
          case 'delete_progress_by_id':
            return await this.handleDeleteProgressById(args as any);

          // System Pattern Management
          case 'log_system_pattern':
            return await this.handleLogSystemPattern(args as any);
          case 'get_system_patterns':
            return await this.handleGetSystemPatterns(args as any);
          case 'delete_system_pattern_by_id':
            return await this.handleDeleteSystemPatternById(args as any);

          // Custom Data Management
          case 'log_custom_data':
            return await this.handleLogCustomData(args as any);
          case 'get_custom_data':
            return await this.handleGetCustomData(args as any);
          case 'delete_custom_data':
            return await this.handleDeleteCustomData(args as any);
          case 'search_custom_data_value_fts':
            return await this.handleSearchCustomDataValueFts(args as any);
          case 'search_project_glossary_fts':
            return await this.handleSearchProjectGlossaryFts(args as any);

          // Link Management
          case 'link_conport_items':
            return await this.handleLinkConportItems(args as any);
          case 'get_linked_items':
            return await this.handleGetLinkedItems(args as any);

          // Advanced Query Tools
          case 'get_item_history':
            return await this.handleGetItemHistory(args as any);
          case 'batch_log_items':
            return await this.handleBatchLogItems(args as any);
          case 'get_recent_activity_summary':
            return await this.handleGetRecentActivitySummary(args as any);
          case 'get_conport_schema':
            return await this.handleGetConportSchema(args as any);

          // Semantic Search
          case 'semantic_search_conport':
            return await this.handleSemanticSearchConport(args as any);

          // AI Enrichment
          case 'get_link_suggestions':
            return await this.handleGetLinkSuggestions(args as any);
          case 'update_link_suggestion_status':
            return await this.handleUpdateLinkSuggestionStatus(args as any);
          case 'get_metadata_suggestions':
            return await this.handleGetMetadataSuggestions(args as any);
          case 'update_item_metadata':
            return await this.handleUpdateItemMetadata(args as any);

          // RAG Evaluation
          case 'execute_agentic_rag_query':
            return await this.handleExecuteAgenticRagQuery(args as any);
          case 'trigger_rag_evaluation_run':
            return await this.handleTriggerRagEvaluationRun(args as any);
          case 'log_rag_evaluation_feedback':
            return await this.handleLogRagEvaluationFeedback(args as any);

          // Export/Import
          case 'export_conport_to_markdown':
            return await this.handleExportConportToMarkdown(args as any);
          case 'import_markdown_to_conport':
            return await this.handleImportMarkdownToConport(args as any);

          // SDOF
          case 'store_sdof_plan':
            return await this.handleStoreSdofPlan(args as any);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error in tool ${name}:`, errorMessage);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private setupToolHandlers() {
    // Tool handlers will be implemented in the request handler
  }

  // Handler implementations
  private async handleGetProductContext(args: { workspace_id: string }) {
    const context = await dbService.getProductContext(args.workspace_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(context, null, 2),
        },
      ],
    };
  }

  private async handleUpdateProductContext(args: { 
    workspace_id: string; 
    content?: any; 
    patch_content?: any; 
  }) {
    const result = await dbService.updateProductContext(
      args.workspace_id, 
      args.content, 
      args.patch_content
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetActiveContext(args: { workspace_id: string }) {
    const context = await dbService.getActiveContext(args.workspace_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(context, null, 2),
        },
      ],
    };
  }

  private async handleUpdateActiveContext(args: { 
    workspace_id: string; 
    content?: any; 
    patch_content?: any; 
  }) {
    const result = await dbService.updateActiveContext(
      args.workspace_id, 
      args.content, 
      args.patch_content
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleLogDecision(args: {
    workspace_id: string;
    summary: string;
    rationale?: string;
    implementation_details?: string;
    tags?: string[];
  }) {
    const result = await dbService.logDecision(
      args.workspace_id,
      args.summary,
      args.rationale,
      args.implementation_details,
      args.tags
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetDecisions(args: {
    workspace_id: string;
    limit?: number;
    tags_filter_include_all?: string[];
    tags_filter_include_any?: string[];
  }) {
    const decisions = await dbService.getDecisions(
      args.workspace_id,
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

  private async handleSearchDecisionsFts(args: {
    workspace_id: string;
    query_term: string;
    limit?: number;
  }) {
    const results = await dbService.searchDecisionsFts(
      args.workspace_id,
      args.query_term,
      args.limit || 10
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

  private async handleDeleteDecisionById(args: {
    workspace_id: string;
    decision_id: number;
  }) {
    const result = await dbService.deleteDecisionById(args.decision_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleLogProgress(args: {
    workspace_id: string;
    status: string;
    description: string;
    parent_id?: number;
    linked_item_type?: string;
    linked_item_id?: string;
    link_relationship_type?: string;
  }) {
    const result = await dbService.logProgress(
      args.workspace_id,
      args.status,
      args.description,
      args.parent_id,
      args.linked_item_type,
      args.linked_item_id,
      args.link_relationship_type
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetProgress(args: {
    workspace_id: string;
    status_filter?: string;
    parent_id_filter?: number;
    limit?: number;
  }) {
    const progress = await dbService.getProgress(
      args.workspace_id,
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

  private async handleUpdateProgress(args: {
    workspace_id: string;
    progress_id: number;
    status?: string;
    description?: string;
    parent_id?: number;
  }) {
    const result = await dbService.updateProgress(
      args.workspace_id,
      args.progress_id,
      args.status,
      args.description,
      args.parent_id
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleDeleteProgressById(args: {
    workspace_id: string;
    progress_id: number;
  }) {
    const result = await dbService.deleteProgressById(
      args.workspace_id,
      args.progress_id
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleLogSystemPattern(args: {
    workspace_id: string;
    name: string;
    description?: string;
    tags?: string[];
  }) {
    const result = await dbService.logSystemPattern(
      args.workspace_id,
      args.name,
      args.description,
      args.tags
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetSystemPatterns(args: {
    workspace_id: string;
    tags_filter_include_all?: string[];
    tags_filter_include_any?: string[];
  }) {
    const patterns = await dbService.getSystemPatterns(
      args.workspace_id,
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

  private async handleDeleteSystemPatternById(args: {
    workspace_id: string;
    pattern_id: number;
  }) {
    const result = await dbService.deleteSystemPatternById(
      args.workspace_id,
      args.pattern_id
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleLogCustomData(args: {
    workspace_id: string;
    category: string;
    key: string;
    value: any;
  }) {
    const result = await dbService.logCustomData(
      args.workspace_id,
      args.category,
      args.key,
      args.value
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetCustomData(args: {
    workspace_id: string;
    category?: string;
    key?: string;
  }) {
    const data = await dbService.getCustomData(
      args.workspace_id,
      args.category,
      args.key
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  private async handleDeleteCustomData(args: {
    workspace_id: string;
    category: string;
    key: string;
  }) {
    const result = await dbService.deleteCustomData(
      args.workspace_id,
      args.category,
      args.key
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSearchCustomDataValueFts(args: {
    workspace_id: string;
    query_term: string;
    category_filter?: string;
    limit?: number;
  }) {
    const results = await dbService.searchCustomDataValueFts(
      args.workspace_id,
      args.query_term,
      args.category_filter,
      args.limit || 10
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

  private async handleSearchProjectGlossaryFts(args: {
    workspace_id: string;
    query_term: string;
    limit?: number;
  }) {
    const results = await dbService.searchProjectGlossaryFts(
      args.workspace_id,
      args.query_term,
      args.limit || 10
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

  private async handleLinkConportItems(args: {
    workspace_id: string;
    source_item_type: string;
    source_item_id: string;
    target_item_type: string;
    target_item_id: string;
    relationship_type: string;
    description?: string;
  }) {
    const result = await dbService.linkConportItems(
      args.workspace_id,
      args.source_item_type,
      args.source_item_id,
      args.target_item_type,
      args.target_item_id,
      args.relationship_type,
      args.description
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetLinkedItems(args: {
    workspace_id: string;
    item_type: string;
    item_id: string;
    relationship_type_filter?: string;
    linked_item_type_filter?: string;
    limit?: number;
  }) {
    const links = await dbService.getLinkedItems(
      args.workspace_id,
      args.item_type,
      args.item_id,
      args.relationship_type_filter,
      args.linked_item_type_filter,
      args.limit
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(links, null, 2),
        },
      ],
    };
  }

  private async handleGetItemHistory(args: {
    workspace_id: string;
    item_type: string;
    limit?: number;
    before_timestamp?: string;
    after_timestamp?: string;
    version?: number;
  }) {
    const history = await dbService.getItemHistory(
      args.workspace_id,
      args.item_type,
      args.limit,
      args.before_timestamp,
      args.after_timestamp,
      args.version
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(history, null, 2),
        },
      ],
    };
  }

  private async handleBatchLogItems(args: {
    workspace_id: string;
    item_type: string;
    items: any[];
  }) {
    const results = await dbService.batchLogItems(
      args.workspace_id,
      args.item_type,
      args.items
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

  private async handleGetRecentActivitySummary(args: {
    workspace_id: string;
    hours_ago?: number;
    since_timestamp?: string;
    limit_per_type?: number;
  }) {
    const summary = await dbService.getRecentActivitySummary(
      args.workspace_id,
      args.hours_ago,
      args.since_timestamp,
      args.limit_per_type || 5
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private async handleGetConportSchema(args: { workspace_id: string }) {
    const schema = await dbService.getConportSchema(args.workspace_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(schema, null, 2),
        },
      ],
    };
  }

  private async handleSemanticSearchConport(args: {
    workspace_id: string;
    query_text: string;
    top_k?: number;
    filter_item_types?: string[];
    filter_tags_include_any?: string[];
    filter_tags_include_all?: string[];
    filter_custom_data_categories?: string[];
  }) {
    const results = await dbService.semanticSearchConport(
      args.workspace_id,
      args.query_text,
      args.top_k || 5,
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

  private async handleGetLinkSuggestions(args: {
    workspace_id: string;
    status_filter?: string;
    source_item_type_filter?: string;
    source_item_id_filter?: string;
    target_item_type_filter?: string;
    target_item_id_filter?: string;
    limit?: number;
  }) {
    const suggestions = await dbService.getLinkSuggestions(
      args.workspace_id,
      args.status_filter,
      args.source_item_type_filter,
      args.source_item_id_filter,
      args.target_item_type_filter,
      args.target_item_id_filter,
      args.limit
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(suggestions, null, 2),
        },
      ],
    };
  }

  private async handleUpdateLinkSuggestionStatus(args: {
    workspace_id: string;
    suggestion_id: number;
    status: string;
    user_feedback?: string;
    reviewed_by?: string;
  }) {
    const result = await dbService.updateLinkSuggestionStatus(
      args.workspace_id,
      args.suggestion_id,
      args.status,
      args.user_feedback,
      args.reviewed_by
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetMetadataSuggestions(args: {
    workspace_id: string;
    status_filter?: string;
    item_type_filter?: string;
    item_id_filter?: string;
    suggestion_type_filter?: string;
    limit?: number;
  }) {
    const suggestions = await dbService.getMetadataSuggestions(
      args.workspace_id,
      args.status_filter,
      args.item_type_filter,
      args.item_id_filter,
      args.suggestion_type_filter,
      args.limit
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(suggestions, null, 2),
        },
      ],
    };
  }

  private async handleUpdateItemMetadata(args: {
    workspace_id: string;
    item_type: string;
    item_id: string;
    metadata_to_update: any;
  }) {
    const result = await dbService.updateItemMetadata(
      args.workspace_id,
      args.item_type,
      args.item_id,
      args.metadata_to_update
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleExecuteAgenticRagQuery(args: {
    workspace_id: string;
    query_text: string;
    user_persona?: string;
    output_format_instructions?: string;
    complexity_level?: string;
    context_items_ids?: string[];
    model_parameters?: any;
    max_iterations?: number;
    tool_names?: string[];
  }) {
    // Placeholder implementation - would integrate with actual RAG system
    const result = {
      status: 'stubbed',
      message: 'RAG query execution is not yet implemented in the unified system',
      query: args.query_text,
      timestamp: new Date().toISOString()
    };
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleTriggerRagEvaluationRun(args: {
    workspace_id: string;
    dataset_id: string;
    experiment_label?: string;
  }) {
    // Placeholder implementation
    const result = {
      status: 'stubbed',
      message: 'RAG evaluation trigger is not yet implemented in the unified system',
      dataset_id: args.dataset_id,
      timestamp: new Date().toISOString()
    };
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleLogRagEvaluationFeedback(args: {
    workspace_id: string;
    query_text: string;
    generated_answer: string;
    feedback_data: any;
    rag_query_id?: string;
    retrieved_context_summary?: string;
    evaluator_id?: string;
  }) {
    const result = await dbService.logRagEvaluationFeedback(
      args.workspace_id,
      args.query_text,
      args.generated_answer,
      args.feedback_data,
      args.rag_query_id,
      args.retrieved_context_summary,
      args.evaluator_id
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleExportConportToMarkdown(args: {
    workspace_id: string;
    output_path?: string;
  }) {
    const result = await dbService.exportConportToMarkdown(
      args.workspace_id,
      args.output_path
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleImportMarkdownToConport(args: {
    workspace_id: string;
    input_path?: string;
  }) {
    const result = await dbService.importMarkdownToConport(
      args.workspace_id,
      args.input_path
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleStoreSdofPlan(args: {
    plan_content: string;
    metadata?: any;
  }) {
    const result = await dbService.storeSdofPlan(args.plan_content, args.metadata);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Unified SDOF Knowledge Base MCP Server running on stdio');
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new UnifiedMCPServer();
  server.run().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { UnifiedMCPServer };