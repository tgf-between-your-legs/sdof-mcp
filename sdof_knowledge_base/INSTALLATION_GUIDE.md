# SDOF Prompt Caching Revolution - Installation Guide

## 🚀 Quick Installation for End Users

### Prerequisites
- **Node.js 18-22** (Node.js 23.0.x has known TypeScript CLI issues, use 22.x for best experience)
- **OpenAI API Key** (primary embedding service)
- **Git** (to clone the repository)

### Step 1: Clone the Repository
```bash
git clone https://github.com/tgf-between-your-legs/sdof-mcp.git
cd sdof-mcp
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment
```bash
# Copy the environment template
cp .env.template .env

# Edit .env with your API key
# Replace 'your_openai_api_key_here' with your actual OpenAI API key
```

**Example .env configuration:**
```bash
OPENAI_API_KEY=sk-your-actual-openai-key-here
EMBEDDING_SERVICE=openai
EMBEDDING_MODEL=text-embedding-3-small
PORT=3000
```

### Step 4: Build the Project
```bash
npm run build
```

### Step 5: Configure MCP Integration
```bash
# Copy the MCP configuration template
cp mcp-config.json.template mcp-config.json

# Edit mcp-config.json and update the path
# Replace [REPLACE_WITH_YOUR_PATH] with your actual installation path
```

**Example mcp-config.json (Windows):**
```json
{
  "mcpServers": {
    "sdof_knowledge_base": {
      "command": "node",
      "args": ["C:/your/path/to/sdof-mcp/build/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-actual-key-here",
        "EMBEDDING_SERVICE": "openai",
        "EMBEDDING_MODEL": "text-embedding-3-small"
      },
      "disabled": false,
      "timeout": 60,
      "alwaysAllow": []
    }
  }
}
```

**Example mcp-config.json (macOS/Linux):**
```json
{
  "mcpServers": {
    "sdof_knowledge_base": {
      "command": "node",
      "args": ["/your/path/to/sdof-mcp/build/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-actual-key-here",
        "EMBEDDING_SERVICE": "openai",
        "EMBEDDING_MODEL": "text-embedding-3-small"
      },
      "disabled": false,
      "timeout": 60,
      "alwaysAllow": []
    }
  }
}
```

### Step 6: Start the SDOF Server
```bash
npm start
```

**Success indicators:**
- Server starts on port 3000
- No Claude 404 errors in console
- Log shows: "Embedding service initialized with: openai"

### Step 7: Verify Installation
```bash
node verify-installation.js
```

Expected output should show mostly ✅ PASS results.

## 🔧 Integration with Roo Commander

### Option A: Manual Integration
1. Copy the `.roo/rules-sdof-*` directories to your project's `.roo/` directory
2. Add SDOF mode definitions to your custom modes configuration

### Option B: Automated Integration
The verification script will detect if you're in a Roo Commander workspace and guide you through integration.

## 🛠️ Available SDOF Tools

Once installed, you'll have access to these MCP tools:

### Core SDOF Operations
- `store_sdof_plan` - Store SDOF plans with metadata
- `semantic_search_sdof` - Vector-powered search

### Context Management
- `get_product_context` / `update_product_context`
- `get_active_context` / `update_active_context`

### Data Storage
- `log_decision` / `get_decisions`
- `log_custom_data` / `get_custom_data`
- `log_system_pattern` / `get_system_patterns`
- `log_progress` / `get_progress`

## 🐛 Troubleshooting

### Issue: "Module not found" errors
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Claude 404 errors
**Solution:**
```bash
# Ensure your .env uses OpenAI, not Claude
grep EMBEDDING_SERVICE .env
# Should show: EMBEDDING_SERVICE=openai
```

### Issue: TypeScript compilation fails (Node.js 23+)
**Solution:**
This is a known issue. The pre-built files work fine:
```bash
# Just start the server directly
npm start
```

### Issue: Port 3000 already in use
**Solution:**
```bash
# Kill existing processes
taskkill /F /IM node.exe  # Windows
pkill node                # macOS/Linux

# Or change port in .env
echo "PORT=3001" >> .env
```

### Issue: Permission denied (Windows)
**Solution:**
Run terminal as Administrator and retry installation.

## 📊 Performance Expectations

- **Query Response**: <500ms average
- **Embedding Generation**: <2s per request  
- **Vector Search**: <100ms for similarity calculations
- **Memory Usage**: ~50-100MB depending on cache size

## 🔄 Updates and Maintenance

### Update SDOF
```bash
git pull origin main
npm install
npm run build
npm start
```

### Clear Cache
```bash
# Remove vector database (regenerates automatically)
rm -f *.db *.sqlite
npm start
```

## 🎯 Success Verification

You know SDOF is working correctly when:
- ✅ No error messages in server logs
- ✅ MCP tools respond in your AI interface
- ✅ `store_sdof_plan` saves data successfully
- ✅ `semantic_search_sdof` returns relevant results
- ✅ Performance stays under 500ms per query

## 📞 Support

If you encounter issues:
1. Run `node verify-installation.js` and share output
2. Check console logs for specific error messages  
3. Verify your OpenAI API key has credits
4. Ensure firewall allows port 3000 access

**Common Path Issues:**
- Use forward slashes `/` even on Windows in JSON config
- Use absolute paths, not relative paths like `./` or `../`
- Escape backslashes if using Windows paths: `C:\\Users\\...`

Happy prompting with SDOF! 🚀