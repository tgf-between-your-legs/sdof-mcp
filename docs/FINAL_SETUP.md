# SDOF Knowledge Base MCP Server: Final Setup Guide

This guide will help you finalize the setup of your SDOF Knowledge Base MCP server and start using it with the auto-save functionality.

## 1. Apply the Plan Auto-Save Updates

You need to update the main index.ts file to include the plan auto-save functionality:

1. Open `src/index.ts` in your editor
2. Follow the instructions in `src/index.ts.plan-auto-save-update` to add:
   - The import for PlanAutoSaveService
   - The StoreSdofPlanArgs type definition
   - The isStoreSdofPlanArgs validation function
   - The store_sdof_plan tool definition to the tools array
   - The case for store_sdof_plan in the switch statement
   - The handleStoreSdofPlan method to the SdofKnowledgeBaseServer class

Or alternatively, manually merge the changes from the update file into the main index.ts file.

## 2. Build and Run the Server

Now that you've applied all the updates, you can build and run the server:

```bash
# Build the server
npm run build

# Run the server
npm start
```

## 3. Configure MongoDB

Before using the server, you need to set up MongoDB with vector search capabilities:

1. Follow the instructions in `docs/MONGODB_SETUP.md` to:
   - Create a MongoDB Atlas account (if you don't have one)
   - Set up a cluster
   - Configure network access
   - Create the database and collection
   - Enable Atlas Vector Search
   - Create the vector index

## 4. Configure the MCP Server in Roo

To use the SDOF Knowledge Base MCP server with Roo, you need to add it to your MCP configuration:

1. Open Roo
2. Go to Settings → MCP
3. Add a new MCP server with the following configuration:

```json
{
  "name": "sdof_knowledge_base",
  "type": "stdio",
  "command": "npm start",
  "cwd": "c:/Users/thegr/integration-main/integration/sdof_knowledge_base"
}
```

Make sure to adjust the `cwd` path to match your actual installation directory.

## 5. Update Your SDOF Orchestrator Custom Mode

To make the SDOF Orchestrator automatically save plans to the knowledge base:

1. Open your custom_modes.json file:
   ```
   ../../AppData/Roaming/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/custom_modes.json
   ```

2. Find the SDOF Orchestrator mode (look for `"slug": "sdof-orchestrator"`)

3. Add the post-phase processing instructions to the custom_instructions section as shown in `docs/CUSTOM_MODE_EXAMPLE.md`:

```
"Post-Phase Processing:
After each phase is completed and returns results via `attempt_completion`, you should:

1. Automatically save the results to the knowledge base using the `store_sdof_plan` MCP tool from the `sdof_knowledge_base` server.
2. Use appropriate plan types based on the phase:
   - After Explorer results: planType = 'exploration'
   - After Analyzer results: planType = 'analysis'
   - After Implementer results: planType = 'implementation'
   - After Evaluator results: planType = 'evaluation'
   - After Integrator results: planType = 'integration'
   - Final synthesis: planType = 'synthesis'
3. Generate appropriate tags based on the problem domain and content.
4. Include a standardized title format: 'SDOF [PlanType]: [Brief Problem Description]'
5. Report to the user that the plan has been saved to the knowledge base."
```

## 6. Test the Auto-Save Functionality

To test that everything is working correctly:

1. Start the SDOF Knowledge Base MCP server:
   ```
   cd sdof_knowledge_base
   npm start
   ```

2. In another terminal, you can manually test the store_sdof_plan tool with curl:
   ```
   curl -X POST -H "Content-Type: application/json" -d '{
     "jsonrpc": "2.0",
     "id": "test",
     "method": "callTool",
     "params": {
       "name": "store_sdof_plan",
       "arguments": {
         "title": "Test Plan",
         "content": "# Test Plan\n\nThis is a test plan.",
         "planType": "exploration",
         "tags": ["test", "sdof"]
       }
     }
   }' http://localhost:3000/
   ```

3. Verify that the plan was saved to:
   - The filesystem at `docs/plans/explorations/YYYY-MM-DD-test-plan.md`
   - The knowledge base (you can query it using the search_knowledge tool)

## Troubleshooting

If you encounter any issues:

1. **MongoDB Connection Issues**:
   - Check that your MongoDB Atlas cluster is running
   - Verify that your IP address is in the allowed list
   - Check the connection string in your .env file

2. **Embedding Issues**:
   - Make sure your Claude API key is valid
   - Check the embedding service logs for any errors

3. **MCP Server Issues**:
   - Check that the @modelcontextprotocol/sdk version is correct (0.8.1)
   - Verify that all dependencies are installed

4. **Filesystem Issues**:
   - Ensure that the docs/plans directories have write permissions

## Additional Resources

- `docs/SETUP_GUIDE.md`: Detailed MongoDB setup instructions
- `docs/AUTO_SAVE_GUIDE.md`: More information about the auto-save functionality
- `docs/CUSTOM_MODE_EXAMPLE.md`: Details on customizing the SDOF Orchestrator mode
- `docs/ALTERNATIVE_IMPLEMENTATION.md`: Alternative implementations if you encounter SDK issues
- `docs/MONGODB_SETUP.md`: MongoDB Atlas vector search setup guide
- `docs/FINAL_REPORT.md`: Complete summary of the implementation

With these steps completed, your SDOF Knowledge Base MCP server should be fully operational and ready to use with the SDOF Orchestrator for auto-saving plans.