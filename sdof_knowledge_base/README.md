# SDOF Knowledge Base - Unified Implementation

## 🚀 Quick Start

**CRITICAL**: If you're getting Claude 404 errors, you must run the clean deployment:

```bash
# Windows
clean-deploy.bat

# Manual clean deployment
npm run clean
npm install
npm run build
npm start
```

## 🎯 Overview

This is the **unified SDOF Knowledge Base** that eliminates all Claude dependencies and consolidates ConPort functionality into a single MCP tool with sqlite-vec integration.

### ✅ Key Features
- **No Claude Dependencies**: Uses OpenAI embeddings exclusively
- **sqlite-vec Integration**: High-performance vector operations
- **Unified Architecture**: Single MCP server with all ConPort tools
- **<500ms Query Performance**: Optimized for production workloads
- **Comprehensive Tool Set**: All ConPort functionality in one place

## 🔧 Installation

### Prerequisites
- Node.js 18+
- OpenAI API Key
- sqlite-vec extension (auto-installed)

### Environment Setup

Create `.env` file:
```bash
OPENAI_API_KEY=your_openai_api_key_here
EMBEDDING_MODEL=text-embedding-3-small
```

### Clean Deployment (Recommended)

If upgrading from old ConPort/SDOF implementation:

```bash
# Run clean deployment script
clean-deploy.bat

# Or manually:
rm -rf build/ node_modules/
npm install
npm run build
npm start
```

## 🛠️ Available Tools

The unified MCP server provides these tools:

### SDOF Operations
- `store_sdof_plan` - Store SDOF plans with metadata

### Decision Management  
- `log_decision` - Log architectural decisions
- `get_decisions` - Retrieve decisions with filtering

### Custom Data Storage
- `log_custom_data` - Store custom data entries
- `get_custom_data` - Retrieve custom data

### System Patterns
- `log_system_pattern` - Log coding patterns
- `get_system_patterns` - Retrieve patterns

### Progress Tracking
- `log_progress` - Track task progress
- `get_progress` - Get progress entries

### Context Management
- `update_product_context` - Update product context
- `get_product_context` - Get product context
- `update_active_context` - Update active context  
- `get_active_context` - Get active context

### Semantic Search
- `semantic_search_sdof` - Vector-powered search with OpenAI embeddings

## 🚨 Troubleshooting

### Claude 404 Errors

If you see `Failed to generate Claude embedding: Request failed with status code 404`:

1. **Stop all running processes**:
   ```bash
   taskkill /F /IM node.exe  # Windows
   pkill node                # Linux/Mac
   ```

2. **Run clean deployment**:
   ```bash
   clean-deploy.bat  # Windows
   ./clean-deploy.sh # Linux/Mac
   ```

3. **Verify OpenAI API key**:
   ```bash
   echo $OPENAI_API_KEY  # Should not be empty
   ```

4. **Test the system**:
   ```bash
   node build/test-unified-system.js
   ```

### Build Issues

If build fails:
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Performance Issues

If queries are slow (>500ms):
- Check OpenAI API connectivity
- Verify sqlite-vec extension is loaded
- Monitor database file size and indexing

## 📊 Performance Benchmarks

Target performance metrics:
- **Query Response**: <500ms average
- **Embedding Generation**: <2s per request
- **Vector Search**: <100ms for similarity calculations
- **Database Operations**: <50ms for CRUD operations

## 🔄 Migration from Old ConPort

If migrating from existing ConPort installation:

1. **Export existing data** (optional):
   ```bash
   # If you have critical data in old ConPort
   python context-portal/export_data.py
   ```

2. **Run clean deployment**:
   ```bash
   clean-deploy.bat
   ```

3. **Import data** (if exported):
   ```bash
   node build/scripts/import-data.js
   ```

## 🧪 Testing

Run comprehensive tests:
```bash
# Full system test
node build/test-unified-system.js

# Performance benchmarks
npm run test:performance

# Unit tests
npm test
```

## 🐛 Common Issues

### "Module not found" errors
- Run `npm install` and `npm run build`
- Check all TypeScript files compile without errors

### Database connection issues
- Ensure workspace directory is writable
- Check sqlite-vec extension is available

### Embedding service failures
- Verify OPENAI_API_KEY is set correctly
- Check internet connectivity to OpenAI API
- Ensure no Claude environment variables are set

## 📁 Project Structure

```
sdof_knowledge_base/
├── src/
│   ├── index.ts                     # Main MCP server (unified)
│   ├── services/
│   │   └── unified-database.service.ts  # Core database with sqlite-vec
│   └── test-unified-system.ts       # Comprehensive test suite
├── build/                           # Compiled JavaScript
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # This file
```

## 🤝 Contributing

1. Make changes to TypeScript files in `src/`
2. Run `npm run build` to compile
3. Test with `node build/test-unified-system.js`
4. Ensure no Claude dependencies are introduced

## 📜 License

MIT License - See LICENSE file for details.

---

## 🎉 Success Indicators

You know the system is working correctly when:
- ✅ No Claude 404 errors in logs
- ✅ `semantic_search_sdof` returns results
- ✅ All MCP tools respond correctly
- ✅ Query performance <500ms
- ✅ Test suite passes completely

**If you see any Claude references in error messages, re-run the clean deployment process.**