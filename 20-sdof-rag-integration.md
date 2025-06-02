+++
id = "ROO-CMD-RULE-SDOF-RAG-INTEGRATION-V1"
title = "Roo Commander: Workspace-Wide Rule for SDOF & RAG Integration"
status = "active"
scope = "Workspace-wide rule providing reusable instructions for dynamic SDOF context retrieval, prompt caching, and token management for all modes"
target_audience = ["all"]
tags = ["sdof", "rag", "context-retrieval", "prompt-caching", "token-management", "workspace-wide", "integration"]
related_docs = [
    ".roo/rules/rules.md",
    ".ruru/docs/guides/06_Advanced_Usage_Customization/02_Custom_Instructions_Rules.md",
    ".ruru/docs/architecture/sdof_architecture_design_v1.md",
    ".ruru/docs/api/sdof_knowledge_system_v1.md"
]
+++

# Workspace-Wide Rule: SDOF & RAG Integration

## Objective

This workspace-wide rule defines reusable, standardized instructions for all modes to dynamically retrieve relevant context from the SDOF Knowledge Base using MCP tools, implement prompt caching strategies based on `cache_hint` metadata, and monitor token usage with context pruning to optimize LLM API requests.

The goal is to provide a consistent, maintainable integration of advanced AI capabilities and SDOF knowledge retrieval across all modes in the workspace.

## Instructions for Modes

### 1. Dynamic SDOF Context Retrieval

- Analyze the user query or task to identify key entities, concepts, and keywords.
- Use the prioritized retrieval strategy as defined in the project rules ([`.roo/rules/rules.md`](.roo/rules/rules.md#dynamic_knowledge_retrieval)) to select appropriate SDOF MCP tools:
  - Targeted knowledge search using `store_sdof_plan` with query parameters.
  - Specific knowledge retrieval by planType, phase, or tags.
  - Contextual expansion via related knowledge links.
  - Fallback to broad context retrieval for general project knowledge.
- Synthesize and filter retrieved knowledge to produce concise, relevant summaries.
- Handle errors gracefully, logging and falling back as needed.

### 2. Prompt Caching Strategy

- Identify cacheable content from retrieved SDOF knowledge based on:
  - Presence of `cache_hint: true` in `metadata` of stored plans.
  - Size and stability heuristics (e.g., minimum token threshold).
  - Prioritized plan types (`project_context`, `system_pattern`, `implementation_knowledge`, `decision_record`).
- Structure prompts for caching according to the LLM provider:
  - For implicit caching (e.g., Gemini, OpenAI), place stable SDOF knowledge at the absolute beginning of the prompt.
  - For explicit caching (e.g., Anthropic), insert `cache_control` breakpoints after stable SDOF content.
- Notify users when prompt caching is applied: `[INFO: Structuring prompt for caching]`.

### 3. Token Usage Monitoring and Context Pruning

- Estimate token usage of the constructed prompt before sending to the LLM.
- If token usage exceeds limits, prune context by:
  - Removing less relevant or lower priority SDOF knowledge items.
  - Summarizing or compressing SDOF knowledge where possible.
- Ensure the final prompt respects token limits while maintaining relevance.

### 4. Integration and Usage

- Modes should load this rule automatically as it is workspace-wide.
- Modes can invoke the instructions defined here to fetch SDOF knowledge and build optimized prompts.
- This rule complements mode-specific system prompts and rules, providing advanced context management capabilities.

### 5. SDOF Knowledge Base Operations

#### Storage Operations
- **Trigger**: When new insights, decisions, implementations, or learnings emerge
- **Tool**: `store_sdof_plan` with structured metadata
- **Format**: Markdown content with comprehensive metadata including:
  - `planTitle`: Descriptive title for the knowledge entry
  - `planType`: Category (e.g., "decision_record", "implementation_note", "system_pattern")
  - `tags`: Relevant keywords for retrieval
  - `phase`: SDOF phase if applicable (1-5)
  - `cache_hint`: Boolean indicating high-value caching content

#### Retrieval Operations
- **Trigger**: When needing project context, previous decisions, or implementation details
- **Tool**: `store_sdof_plan` with query parameters (when available) or direct retrieval
- **Strategy**: 
  - Query by specific tags for targeted knowledge
  - Filter by planType for category-specific knowledge
  - Retrieve by phase for workflow-specific context
  - Use semantic search capabilities when available

#### Error Handling
- Gracefully handle SDOF Knowledge Base service unavailability
- Provide fallback behavior when specific knowledge isn't found
- Log retrieval attempts and failures for debugging
- Continue operation in limited mode when SDOF is unavailable

## References

- Project rules on dynamic knowledge retrieval and RAG: [`.roo/rules/rules.md`](.roo/rules/rules.md#dynamic_knowledge_retrieval)
- Prompt caching strategies: [`.roo/rules/rules.md`](.roo/rules/rules.md#prompt_caching_strategies)
- Advanced usage guide: [`.ruru/docs/guides/06_Advanced_Usage_Customization/02_Custom_Instructions_Rules.md`](.ruru/docs/guides/06_Advanced_Usage_Customization/02_Custom_Instructions_Rules.md)
- SDOF Architecture design: [`.ruru/docs/architecture/sdof_architecture_design_v1.md`](.ruru/docs/architecture/sdof_architecture_design_v1.md)
- SDOF Knowledge system: [`.ruru/docs/api/sdof_knowledge_system_v1.md`](.ruru/docs/api/sdof_knowledge_system_v1.md)

## Change Log

- v1 (2025-06-01): Initial version migrated from ConPort to SDOF, defining workspace-wide SDOF and RAG integration instructions.