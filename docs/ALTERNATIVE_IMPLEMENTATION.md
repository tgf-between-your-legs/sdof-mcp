# Alternative Implementation Without MCP SDK Dependency

If you're experiencing issues with the `@modelcontextprotocol/sdk` dependency, this guide provides an alternative implementation approach that doesn't rely on the SDK.

## The Issue

The error message indicates that the specified version of the MCP SDK (`@modelcontextprotocol/sdk@^0.1.0`) isn't available:

```
npm error code ETARGET
npm error notarget No matching version found for @modelcontextprotocol/sdk@^0.1.0.
```

## Solution Options

### Option 1: Use Wildcard Version (Already Applied)

We've updated the package.json to use a wildcard version specifier:

```json
"@modelcontextprotocol/sdk": "*"
```

This will accept any available version of the SDK. Try running `npm install` again with this change.

### Option 2: Implement MCP Server Without the SDK

If the wildcard approach doesn't work, you can implement a simple MCP server without the SDK dependency. Here's how:

1. Create a new `server.js` file in the root of your project:

```javascript
import express from 'express';
import { PlanAutoSaveService } from './src/services/plan-auto-save.service.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Define the MCP tools
const tools = [
  {
    name: 'store_sdof_plan',
    description: 'Stores an SDOF plan in the knowledge base and filesystem',
    handler: async (inputs) => {
      try {
        const planService = PlanAutoSaveService.getInstance();
        const { title, content, planType, tags = [] } = inputs;
        const result = await planService.savePlan(title, content, planType, tags);
        
        return {
          success: true,
          filePath: result.filePath,
          entryId: result.entryId,
          message: `Plan "${title}" successfully saved to ${result.filePath} and knowledge base`
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to save SDOF plan'
        };
      }
    }
  },
  {
    name: 'search_knowledge',
    description: 'Searches the knowledge base for relevant entries',
    handler: async (inputs) => {
      // Implement search functionality
      // This is a placeholder - you would need to implement the actual search logic
      return {
        success: true,
        results: [],
        message: 'Search completed'
      };
    }
  }
  // Add other tools as needed
];

// MCP API endpoint
app.post('/mcp/v1/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const inputs = req.body;
  
  const tool = tools.find(t => t.name === toolName);
  
  if (!tool) {
    return res.status(404).json({
      success: false,
      error: `Tool '${toolName}' not found`
    });
  }
  
  try {
    const result = await tool.handler(inputs);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`SDOF Knowledge Base MCP server running on port ${PORT}`);
});
```

2. Add a new start script to package.json:

```json
"scripts": {
  "build": "tsc && node -e \"require('fs').chmodSync('build/index.js', '755')\"",
  "start": "node build/index.js",
  "start:alt": "node server.js",
  "dev": "ts-node src/index.ts",
  "test": "jest"
}
```

3. Update the MCP configuration for Roo to use this alternative server:

```json
{
  "name": "sdof_knowledge_base",
  "type": "stdio",
  "command": "npm run start:alt",
  "cwd": "/path/to/your/project"
}
```

### Option 3: Use a Mock Implementation for Development

If you're just testing the auto-save functionality, you can create a mock implementation:

1. Create a `mock-server.js` file:

```javascript
import fs from 'fs';
import path from 'path';

// Mock implementation of plan saving
const savePlan = (title, content, planType, tags = []) => {
  // Create sanitized filename from title
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  // Get current date for folder organization
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  
  // Determine directory based on plan type
  let dirPath = path.join('docs', 'plans', planType + 's');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Create file path
  const fileName = `${dateStr}-${sanitizedTitle}.md`;
  const filePath = path.join(dirPath, fileName);
  
  // Write file
  fs.writeFileSync(filePath, content);
  
  return {
    filePath,
    entryId: `mock-${Date.now()}`
  };
};

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length >= 3) {
  const [title, planType, contentFile] = args;
  const content = fs.readFileSync(contentFile, 'utf8');
  const tags = args.slice(3);
  
  const result = savePlan(title, content, planType, tags);
  console.log(JSON.stringify(result, null, 2));
} else {
  console.error('Usage: node mock-server.js "Plan Title" planType contentFile.md [tag1 tag2 ...]');
}
```

2. Use this from your custom mode by executing the command:

```
node mock-server.js "SDOF Exploration: Knowledge Base" exploration exploration-content.md knowledge-base vector-database
```

## Choosing the Right Approach

1. **If you need full MCP compatibility**: Try Option 1 first, then Option 2
2. **If you just need the auto-save functionality**: Option 3 provides a simple solution
3. **If you want to contribute to the MCP ecosystem**: Consider checking the official MCP documentation for the correct SDK version

## Next Steps

After implementing one of these alternatives:

1. Test the functionality by creating a sample SDOF plan
2. Verify that the plan is saved to the filesystem in the correct location
3. If using Options 1 or 2, test the MCP tool integration with your SDOF Orchestrator

These alternatives should allow you to proceed with implementing the auto-save functionality even if there are issues with the MCP SDK dependency.