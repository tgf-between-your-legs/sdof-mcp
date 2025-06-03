# QUICK START: Fix SDOF Embedding Service

**URGENT**: Execute this immediately to restore SDOF functionality

## 🚀 One-Command Fix

### Option 1: Automated Fix (Recommended)
```cmd
cd sdof_knowledge_base
node fix-embedding-service.js
```

### Option 2: Windows Batch
```cmd
cd sdof_knowledge_base
fix-embedding-service.bat
```

## ✅ Verify Fix
```cmd
node test-embedding-service.js
```

**Expected Result**: "🎉 CONFIRMED: Service is using OpenAI embeddings!"

## 📋 What Gets Fixed

1. ✅ Kills conflicting processes on port 3000
2. ✅ Clears system environment variable `EMBEDDING_SERVICE=claude` 
3. ✅ Rebuilds service with `npm run build`
4. ✅ Starts with explicit `EMBEDDING_SERVICE=openai`
5. ✅ Tests embedding generation

## 🎯 Success Indicators

- Service logs: "Embedding service initialized with: openai"
- Test shows: "Service is using OpenAI embeddings"
- Port 3000 accessible
- MCP tools functional

## 🔧 If Still Failing

1. Run as Administrator
2. Check: `echo %EMBEDDING_SERVICE%` (should be empty)
3. Restart system if needed
4. Re-run fix script

**This fix unblocks the entire SDOF workflow!**