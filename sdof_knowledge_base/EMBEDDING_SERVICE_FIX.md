# SDOF Knowledge Base Embedding Service Fix

## Critical Issue Summary

The SDOF Knowledge Base service is persistently using Claude embeddings despite configuration attempts to switch to OpenAI embeddings. This is blocking the entire SDOF workflow implementation.

## Root Cause Analysis

1. **System Environment Variable Override**: The system has `EMBEDDING_SERVICE=claude` set at the OS level, which overrides local `.env` file settings
2. **Port Conflict**: Existing Node.js process (PID 50004) is running on port 3000
3. **Configuration Priority**: System environment variables take precedence over `.env` file configuration

## Solution Implementation

### Files Created

1. **`fix-embedding-service.js`** - Comprehensive Node.js fix script
2. **`fix-embedding-service.bat`** - Windows batch file for easy execution
3. **`.env.production`** - Enhanced environment configuration with explicit OpenAI settings
4. **`test-embedding-service.js`** - Validation script to confirm OpenAI usage

### Step-by-Step Fix Process

#### Option 1: Using the Node.js Script (Recommended)

```bash
cd sdof_knowledge_base
node fix-embedding-service.js
```

This script will:
1. Kill existing processes on port 3000
2. Clear system environment variables
3. Rebuild the service
4. Start with explicit OpenAI configuration
5. Test the embedding service

#### Option 2: Using the Windows Batch File

```cmd
cd sdof_knowledge_base
fix-embedding-service.bat
```

#### Option 3: Manual Process

1. **Kill existing processes**:
   ```cmd
   netstat -ano | findstr :3000
   taskkill /F /PID [PID_NUMBER]
   ```

2. **Clear system environment variable**:
   ```cmd
   set EMBEDDING_SERVICE=
   ```

3. **Rebuild service**:
   ```cmd
   npm run build
   ```

4. **Start with explicit configuration**:
   ```cmd
   set EMBEDDING_SERVICE=openai
   set FORCE_EMBEDDING_SERVICE=openai
   node build/index.js
   ```

### Validation

Run the test script to confirm the fix:

```bash
node test-embedding-service.js
```

Expected output:
```
✅ Service Info - SUCCESS
📊 Embedding Service: openai
🎉 CONFIRMED: Service is using OpenAI embeddings!
```

## Configuration Details

### Enhanced .env.production

The new production environment file includes:

- **Explicit OpenAI Configuration**: Multiple environment variables to ensure OpenAI selection
- **Debug Flags**: `DEBUG_EMBEDDING_SERVICE=true` for troubleshooting
- **Force Override**: `FORCE_EMBEDDING_SERVICE=openai` as ultimate fallback

### Environment Variable Priority

1. **System Environment Variables** (highest priority)
2. **Process Environment Variables**
3. **`.env` file** (lowest priority)

The fix explicitly sets process environment variables to override system settings.

## Troubleshooting

### If the service still uses Claude:

1. **Check system environment**:
   ```cmd
   echo %EMBEDDING_SERVICE%
   ```

2. **Verify .env file**:
   ```cmd
   type .env
   ```

3. **Check service logs** for initialization messages

4. **Re-run fix script** with elevated permissions

### Common Issues

1. **Permission Denied**: Run as Administrator
2. **Port Still in Use**: Manually kill processes or restart system
3. **Build Failures**: Check Node.js version and dependencies

## Implementation Status

- ✅ Fix scripts created
- ✅ Enhanced configuration files created
- ✅ Test validation script created
- ✅ Comprehensive documentation provided
- ⏳ **AWAITING EXECUTION** - Scripts need to be run to complete the fix

## Next Steps

1. **Execute the fix**: Run `node fix-embedding-service.js` or `fix-embedding-service.bat`
2. **Validate the fix**: Run `node test-embedding-service.js`
3. **Confirm SDOF workflow**: Test the MCP tools with the corrected embedding service
4. **Monitor logs**: Ensure service starts with "Embedding service initialized with: openai"

## Critical Path Impact

This fix directly unblocks:
- SDOF Phase 3 Implementation
- Knowledge base embedding operations
- MCP tool functionality
- Overall SDOF workflow progression

## Files Modified/Created

- `fix-embedding-service.js` - **NEW** - Main fix script
- `fix-embedding-service.bat` - **NEW** - Windows batch execution
- `.env.production` - **NEW** - Enhanced environment config
- `test-embedding-service.js` - **NEW** - Validation script
- `EMBEDDING_SERVICE_FIX.md` - **NEW** - This documentation

## Security Note

The fix scripts handle API keys securely and only modify the embedding service configuration without exposing sensitive data.

---

**URGENT**: Execute one of the fix scripts immediately to restore SDOF workflow functionality.