import { PlanAutoSaveService } from '../services/plan-auto-save.service.js';

/**
 * Tool definition for automatically saving SDOF plans to both the filesystem and knowledge base
 */
export const planAutoSaveTool = {
  name: 'store_sdof_plan',
  description: 'Stores an SDOF plan in the knowledge base and filesystem',
  inputSchema: {
    type: 'object',
    required: ['title', 'content', 'planType'],
    properties: {
      title: {
        type: 'string',
        description: 'The title of the SDOF plan'
      },
      content: {
        type: 'string',
        description: 'The markdown content of the plan'
      },
      planType: {
        type: 'string',
        enum: ['exploration', 'analysis', 'implementation', 'evaluation', 'integration', 'synthesis'],
        description: 'The type of SDOF plan'
      },
      tags: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Additional tags to categorize the plan'
      }
    }
  },
  handler: async (inputs: any) => {
    try {
      // Try to get the service instance, handling potential null
      const planService = PlanAutoSaveService.getInstance();
      if (!planService) {
        throw new Error('PlanAutoSaveService is not available');
      }
      
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
};