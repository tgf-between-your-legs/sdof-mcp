# SDOF Knowledge Base Installation Guide

## Overview

The **Structured Decision Optimization Framework (SDOF) Knowledge Base** is a next-generation knowledge management system that replaces ConPort with a 5-phase optimization workflow. This guide provides complete setup instructions for a clean installation.

## Prerequisites

- **Node.js** 18+ 
- **MongoDB** (Atlas or local instance)
- **OpenAI API Key** (for embeddings)
- **Claude Desktop** or MCP-compatible client

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd integration

# Install dependencies
cd sdof_knowledge_base
npm install
npm run build
```

### 2. Environment Configuration

Create `sdof_knowledge_base/.env.production`:

```bash
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=SDOFCluster
MONGODB_DB_NAME=sdof_knowledge
MONGODB_COLLECTION=knowledge_entries

# Embedding Service Configuration
EMBEDDING_SERVICE=openai
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
EMBEDDING_MODEL=text-embedding-3-large

# HTTP API Configuration
HTTP_PORT=3000

# Cache Configuration
EMBEDDING_CACHE_TTL=3600
DEBUG_EMBEDDING_SERVICE=true
FORCE_EMBEDDING_SERVICE=openai
```

### 3. MCP Server Configuration

Update `.roo/mcp.json`:

```json
{
  "mcpServers": {
    "sdof_knowledge_base": {
      "type": "stdio",
      "command": "node",
      "args": ["sdof_knowledge_base/build/index.js"],
      "env": {
        "MONGODB_URI": "mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=SDOFCluster",
        "MONGODB_DB_NAME": "sdof_knowledge",
        "MONGODB_COLLECTION": "knowledge_entries",
        "EMBEDDING_SERVICE": "openai",
        "OPENAI_API_KEY": "sk-proj-your-openai-api-key-here"
      },
      "alwaysAllow": ["store_sdof_plan"]
    }
  }
}
```

### 4. SDOF Rules Configuration

Update `.roo/rules/rules.md` with SDOF memory strategy:

```yaml
# --- SDOF Memory Strategy ---
sdof_memory_strategy:
  knowledge_base_source: "The agent must use the SDOF Knowledge Base service for persistent memory and context. All knowledge operations use the store_sdof_plan MCP tool."

  initialization:
    thinking_preamble: |
      Initialize SDOF Knowledge Base integration and check service availability.

    agent_action_plan:
      - step: 1
        action: "Test SDOF Knowledge Base service availability."
        tool_to_use: "use_mcp_tool"
        parameters: "server_name: sdof_knowledge_base, tool_name: store_sdof_plan"

  sdof_knowledge_operations:
    frequency: "UPDATE SDOF KNOWLEDGE THROUGHOUT THE SESSION WHEN SIGNIFICANT INFORMATION EMERGES."
    storage_strategy: "Store knowledge in structured format with proper metadata and tagging for retrieval."
    tools:
      - name: store_sdof_plan
        trigger: "When new project knowledge, decisions, implementations, or learnings emerge that should be preserved."
```

### 5. Content Type Schema

Valid `contentType` values for SDOF Knowledge Base:

- `'text'` - General text content
- `'code'` - Code implementations
- `'decision'` - Decision records
- `'analysis'` - Analysis results
- `'solution'` - Solution descriptions
- `'evaluation'` - Evaluation reports
- `'integration'` - Integration documentation

## Testing Installation

### 1. Service Test

```bash
# Start the service
cd sdof_knowledge_base
npm start
```

### 2. MCP Tool Test

Test from your AI client:

```javascript
// Test storage
use_mcp_tool: {
  server_name: "sdof_knowledge_base",
  tool_name: "store_sdof_plan",
  arguments: {
    plan_content: "# Test Plan\nThis is a test of the SDOF Knowledge Base.",
    metadata: {
      planTitle: "Installation Test",
      planType: "text",
      tags: ["test", "installation"],
      cache_hint: true
    }
  }
}
```

### 3. Verification

Success indicators:
- ✅ No 401 authentication errors
- ✅ No schema validation errors
- ✅ Returns `{"message": "Plan stored successfully", "entryId": "..."}`
- ✅ File created in `docs/plans/` directory

## SDOF Workflow Integration

### Mode Configuration

Update all SDOF mode rules to use the knowledge base:

1. **SDOF Orchestrator** (`.roo/rules-sdof-orchestrator/`)
2. **SDOF Explorer** (`.roo/rules-sdof-explorer/`)
3. **SDOF Analyzer** (`.roo/rules-sdof-analyzer/`)
4. **SDOF Implementer** (`.roo/rules-sdof-implementer/`)
5. **SDOF Evaluator** (`.roo/rules-sdof-evaluator/`)
6. **SDOF Integrator** (`.roo/rules-sdof-integrator/`)

### Example Mode Integration

```toml
[[rules]]
id = "sdof-mode-knowledge-storage"
description = "Store phase results in SDOF Knowledge Base"
trigger = "phase_completion"
actions = [
  { type = "mcp_call", tool = "store_sdof_plan", arguments = { plan_content = "Phase results", metadata = { phase = "current_phase" } } }
]
```

## Migration from ConPort

### 1. Disable ConPort Servers

Remove ConPort servers from `.roo/mcp.json`:

```json
// Remove these entries:
// "context-portal"
// "conport-vector-bridge"
```

### 2. Update Tool References

Replace ConPort tools with SDOF equivalents:

- `log_decision` → `store_sdof_plan` (with `planType: "decision"`)
- `update_product_context` → `store_sdof_plan` (with `planType: "text"`)
- `get_decisions` → Query SDOF Knowledge Base

### 3. Update Rules

Replace ConPort memory strategy with SDOF memory strategy in `.roo/rules/rules.md`.

## Production Deployment

### Security Hardening

1. **API Rate Limiting**: Configure rate limits for HTTP endpoints
2. **Authentication**: Add API key authentication for HTTP endpoints
3. **CORS Restriction**: Limit CORS to specific origins
4. **Input Validation**: Enhanced validation for all inputs

### MongoDB Atlas Setup

1. Create MongoDB Atlas cluster
2. Configure network access (IP whitelist)
3. Create database user with read/write permissions
4. Enable vector search index for embeddings

### Environment Variables

Set production environment variables:

```bash
NODE_ENV=production
MONGODB_URI=<production-mongodb-uri>
OPENAI_API_KEY=<production-openai-key>
HTTP_PORT=3000
```

## Troubleshooting

### Common Issues

**401 Authentication Error**
- Verify OpenAI API key is valid and has embedding permissions
- Check API key is correctly set in both `.env.production` and `.roo/mcp.json`

**Schema Validation Error**
- Ensure `planType` uses valid enum values: `'text'`, `'code'`, `'decision'`, `'analysis'`, `'solution'`, `'evaluation'`, `'integration'`

**404 Not Found**
- Verify HTTP server is running on port 3000
- Check firewall and port accessibility

**MongoDB Connection Error**
- Verify MongoDB URI and credentials
- Check network access settings in MongoDB Atlas

### Debug Mode

Enable debug logging:

```bash
DEBUG_EMBEDDING_SERVICE=true
NODE_ENV=development
```

## API Reference

### MCP Tool: store_sdof_plan

```typescript
interface StoreSDOFPlanArgs {
  plan_content: string;
  metadata: {
    planTitle: string;
    planType: 'text' | 'code' | 'decision' | 'analysis' | 'solution' | 'evaluation' | 'integration';
    tags?: string[];
    phase?: string;
    cache_hint?: boolean;
  };
}
```

### HTTP API Endpoints

- `POST /api/vectors/embed` - Generate embeddings
- `GET /health` - Health check
- `GET /api/info` - Service information

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs in debug mode
3. Verify environment configuration
4. Test with minimal example

---

**Last Updated**: June 1, 2025  
**Version**: 1.0.0  
**Architecture**: SDOF Knowledge Base v1.0