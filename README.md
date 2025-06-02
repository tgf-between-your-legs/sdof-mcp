# SDOF MCP - Structured Decision Optimization Framework

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

> **Next-generation knowledge management system with 5-phase optimization workflow**

The **Structured Decision Optimization Framework (SDOF) Knowledge Base** is a Model Context Protocol (MCP) server that provides persistent memory and context management for AI systems through a structured 5-phase optimization workflow.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- OpenAI API Key (for embeddings)
- MCP-compatible client (Claude Desktop, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/sdof-mcp.git
cd sdof-mcp

# Install dependencies
npm install
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your OpenAI API key

# Start the server
npm start
```

## 📖 Documentation

- **[Installation Guide](SDOF_INSTALLATION_GUIDE.md)** - Complete setup instructions
- **[Migration Guide](README_SDOF_MIGRATION.md)** - Migration from ConPort
- **[API Documentation](docs/MCP_USAGE.md)** - MCP tool reference
- **[Setup Guide](docs/SETUP_GUIDE.md)** - Detailed configuration

## ✨ Features

### 🎯 5-Phase Optimization Workflow
- **Phase 1**: Exploration - Solution discovery and brainstorming
- **Phase 2**: Analysis - Detailed evaluation and optimization  
- **Phase 3**: Implementation - Code development and testing
- **Phase 4**: Evaluation - Performance and quality assessment
- **Phase 5**: Integration - Learning consolidation and documentation

### 🧠 Advanced Knowledge Management
- **Vector Embeddings**: Semantic search with OpenAI embeddings
- **Persistent Storage**: MongoDB/SQLite with vector indexing
- **Prompt Caching**: Optimized for LLM efficiency
- **Schema Validation**: Structured content types
- **Multi-Interface**: Both MCP tools and HTTP API

### 🔧 Content Types
- `text` - General documentation and notes
- `code` - Code implementations and examples
- `decision` - Decision records and rationale
- `analysis` - Analysis results and findings
- `solution` - Solution descriptions and designs
- `evaluation` - Evaluation reports and metrics
- `integration` - Integration documentation and guides

## 🛠️ MCP Tools

### Primary Tool: `store_sdof_plan`

Store structured knowledge with metadata:

```typescript
{
  plan_content: string;        // Markdown content
  metadata: {
    planTitle: string;         // Descriptive title
    planType: ContentType;     // Content type (text, code, decision, etc.)
    tags?: string[];           // Categorization tags
    phase?: string;            // SDOF phase (1-5)
    cache_hint?: boolean;      // Mark for prompt caching
  }
}
```

### Example Usage

```javascript
// Store a decision record
{
  "server_name": "sdof_knowledge_base",
  "tool_name": "store_sdof_plan",
  "arguments": {
    "plan_content": "# Database Selection\n\nChose MongoDB for vector storage due to...",
    "metadata": {
      "planTitle": "Database Architecture Decision",
      "planType": "decision",
      "tags": ["database", "architecture"],
      "phase": "2",
      "cache_hint": true
    }
  }
}
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Clients    │───▶│  SDOF Knowledge  │───▶│   Database      │
│ (Claude, etc.)  │    │     Base MCP     │    │  (MongoDB/      │
└─────────────────┘    │    Server        │    │   SQLite)       │
                       └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   HTTP API       │
                       │  (Port 3000)     │
                       └──────────────────┘
```

## 🔧 Configuration

### MCP Client Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "sdof_knowledge_base": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/sdof-mcp/build/index.js"],
      "env": {
        "OPENAI_API_KEY": "your-openai-api-key"
      },
      "alwaysAllow": ["store_sdof_plan"]
    }
  }
}
```

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-proj-your-openai-api-key

# Optional
EMBEDDING_MODEL=text-embedding-3-small
HTTP_PORT=3000
MONGODB_URI=mongodb://localhost:27017/sdof
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run system validation
node build/test-unified-system.js

# Performance benchmarks
npm run test:performance
```

## 📊 Performance

Target metrics:
- **Query Response**: <500ms average
- **Embedding Generation**: <2s per request  
- **Vector Search**: <100ms for similarity calculations
- **Database Operations**: <50ms for CRUD operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes to TypeScript files in `src/`
4. Run tests: `npm test`
5. Build: `npm run build`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs/](docs/) directory
- **Issues**: [GitHub Issues](https://github.com/your-username/sdof-mcp/issues)
- **Installation Help**: See [SDOF_INSTALLATION_GUIDE.md](SDOF_INSTALLATION_GUIDE.md)

## 🎉 Success Indicators

You know the system is working correctly when:
- ✅ No authentication errors in logs
- ✅ `store_sdof_plan` tool responds successfully
- ✅ Knowledge entries are stored and retrievable
- ✅ Query performance meets targets (<500ms)
- ✅ Test suite passes completely

---

**Built with ❤️ for the AI community**