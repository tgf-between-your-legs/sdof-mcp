# SDOF Knowledge Base MCP Server Usage Guide

This document provides detailed instructions on how to use the SDOF Knowledge Base MCP server with Roo Code.

## Configuration

To use this MCP server with Roo, add the following configuration to your MCP settings:

```json
{
  "mcpServers": {
    "sdof_knowledge_base": {
      "command": "cd",
      "args": ["C:\\Users\\thegr\\integration-main\\integration\\sdof_knowledge_base", "&&", "npm", "start"],
      "disabled": false
    }
  }
}
```

> Note: Adjust the path to match your actual installation directory.

## Available Tools

### store_sdof_plan

Stores an SDOF plan in both the filesystem and knowledge base.

#### Input Schema

```json
{
  "plan_content": "The full markdown content of the SDOF plan",
  "metadata": {
    "planTitle": "Title of the plan",
    "planType": "exploration|analysis|implementation|evaluation|integration|synthesis",
    "tags": ["tag1", "tag2", "tag3"]
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| plan_content | string | Yes | The full markdown content of the SDOF plan |
| metadata | object | No | Additional metadata about the plan |
| metadata.planTitle | string | No | Title of the plan (default: "SDOF Plan {timestamp}") |
| metadata.planType | string | No | Type of the plan (default: "misc") |
| metadata.tags | string[] | No | Array of tags for categorization (default: []) |

#### Example Usage

From the SDOF Orchestrator or any other Roo mode, you can use the tool as follows:

```xml
<use_mcp_tool>
<server_name>sdof_knowledge_base</server_name>
<tool_name>store_sdof_plan</tool_name>
<arguments>
{
  "plan_content": "# Phase 1: Exploration Results\n\n## Problem Statement\n\nThe problem is to design...\n\n## Approaches\n\n### Approach 1\n...",
  "metadata": {
    "planTitle": "Exploration: Designing a Vector Database",
    "planType": "exploration",
    "tags": ["vector-db", "semantic-search", "embeddings"]
  }
}
</arguments>
</use_mcp_tool>
```

#### Response Format

Upon successful execution, the tool returns:

```json
{
  "message": "Plan stored successfully.",
  "filePath": "docs/plans/explorations/2025-04-09-exploration-designing-a-vector-database.md",
  "entryId": "64e8a7b2c3d5f4a1e2b3c4d5"
}
```

## Integration with SDOF Workflow

### Automatic Plan Storage

After each SDOF phase completes, you can add the following code to your SDOF Orchestrator to automatically save the plan:

```javascript
// Example: After Phase 1 (Exploration)
const explorationResults = await sdofExplorer.completeTask();

// Store the results in the knowledge base
await useMcpTool({
  serverName: "sdof_knowledge_base",
  toolName: "store_sdof_plan",
  arguments: {
    plan_content: explorationResults.markdown,
    metadata: {
      planTitle: `Exploration: ${problemStatement.substring(0, 50)}...`,
      planType: "exploration",
      tags: ["sdof", "phase1", ...domainTags]
    }
  }
});
```

### Retrieving Past Solutions

In future versions, additional tools will be added to retrieve relevant past solutions based on the current problem, enabling the SDOF workflow to learn from past experiences.

## File Organization

Plans are automatically saved to the filesystem in the following directory structure:

```
docs/
└── plans/
    ├── explorations/     # Phase 1 plans
    ├── analyses/         # Phase 2 plans  
    ├── implementations/  # Phase 3 plans
    ├── evaluations/      # Phase 4 plans
    ├── integrations/     # Phase 5 plans
    ├── syntheses/        # Final synthesis plans
    └── misc/             # Other plans
```

Each file is named using the format: `YYYY-MM-DD-plan-title.md`