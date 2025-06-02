# Auto-Saving SDOF Plans to the Knowledge Base

This guide explains how to modify the SDOF Orchestrator custom mode to automatically save plans as Markdown files in the appropriate location within the knowledge base.

## Overview

When the SDOF Orchestrator generates plans or final reports, we want to:
1. Automatically save them as Markdown files in appropriate folders
2. Store them in the vector database for future semantic search
3. Categorize them with proper metadata for easy retrieval

## Implementation Steps

### 1. Update the SDOF Orchestrator Custom Mode

You'll need to modify your SDOF Orchestrator custom mode to include a post-processing step that saves plans to the knowledge base. Here's how to do it:

1. Navigate to your custom modes file:
   ```
   ../../AppData/Roaming/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/custom_modes.json
   ```

2. Find the SDOF Orchestrator mode configuration (look for `"slug": "sdof-orchestrator"`)

3. Add the following code to the `custom_instructions` section:

```json
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

### 2. Using the Auto-Save Functionality

Once the mode is updated, you'll need to ensure the SDOF Knowledge Base MCP server is running and properly connected to your Roo environment.

When the SDOF Orchestrator receives results from any phase, it will automatically:

1. Format the content as Markdown
2. Generate an appropriate title and tags
3. Use the `store_sdof_plan` MCP tool to save the plan
4. Report the save location to the user

### Example MCP Tool Usage

Here's an example of how the SDOF Orchestrator would use the MCP tool:

```javascript
// After receiving exploration results
const explorationResults = "# Exploration Results\n\n## Approach 1\n...";

// Use MCP tool to save
<use_mcp_tool>
<server_name>sdof_knowledge_base</server_name>
<tool_name>store_sdof_plan</tool_name>
<arguments>
{
  "title": "SDOF Exploration: Knowledge Base MCP Server Design",
  "content": "# Exploration Results\n\n## Approach 1\n...",
  "planType": "exploration",
  "tags": ["knowledge-base", "mcp-server", "vector-database"]
}
</arguments>
</use_mcp_tool>
```

### 3. Directory Structure

The plans will be automatically organized in the following directory structure:

```
sdof_knowledge_base/
├── docs/
│   ├── plans/
│   │   ├── explorations/
│   │   │   └── YYYY-MM-DD-plan-title.md
│   │   ├── analyses/
│   │   ├── implementations/
│   │   ├── evaluations/
│   │   ├── integrations/
│   │   └── syntheses/
```

### 4. Retrieving Plans

You can retrieve saved plans in two ways:

1. **Filesystem Access**: Directly access the Markdown files in the appropriate directory
2. **Knowledge Base Query**: Use the `search_knowledge` MCP tool with relevant keywords or concepts

## Full Example: Updated Workflow

Here's how the updated workflow would look:

1. **Receive Problem**
2. **Delegate to Explorer**
3. **Receive Explorer Results**
4. **Automatically Save Exploration Results**
   ```
   <use_mcp_tool>
   <server_name>sdof_knowledge_base</server_name>
   <tool_name>store_sdof_plan</tool_name>
   <arguments>
   {
     "title": "SDOF Exploration: [Problem Name]",
     "content": "[Explorer Results]",
     "planType": "exploration",
     "tags": ["relevant", "tags", "here"]
   }
   </arguments>
   </use_mcp_tool>
   ```
5. **Continue with SDOF Workflow**
6. **Save Each Phase's Results**
7. **Final Synthesis and Save**

## Benefits

This approach provides several benefits:

1. **Persistent Knowledge**: All SDOF plans are saved and organized
2. **Searchable Repository**: Vector search enables finding relevant past plans
3. **Automatic Organization**: Plans are categorized by type and date
4. **Version History**: Multiple plans for similar problems can be compared
5. **Knowledge Reuse**: Past successful approaches can inform new problem-solving

By implementing this auto-save functionality, your SDOF Orchestrator will build a growing repository of problem-solving approaches, analyses, and implementations that can be leveraged for future projects.