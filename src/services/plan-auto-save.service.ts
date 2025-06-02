import fs from 'fs';
import path from 'path';
import databaseService from './database.service.js';
import embeddingService from './embedding.service.js';

/**
 * Service responsible for automatically saving SDOF plans to both the filesystem
 * and the knowledge base.
 */
export class PlanAutoSaveService {
  private static instance: PlanAutoSaveService;
  
  private constructor() {}

  /**
   * Get the singleton instance of the PlanAutoSaveService
   */
  public static getInstance(): PlanAutoSaveService {
    if (!PlanAutoSaveService.instance) {
      PlanAutoSaveService.instance = new PlanAutoSaveService();
    }
    return PlanAutoSaveService.instance;
  }

  /**
   * Save a plan to both the filesystem and the knowledge base
   * 
   * @param planTitle The title of the plan
   * @param planContent The markdown content of the plan
   * @param planType The type of plan (e.g., 'exploration', 'analysis', 'implementation')
   * @param tags Additional tags to categorize the plan
   * @returns Object containing the file path and knowledge base entry ID
   */
  public async savePlan(
    planTitle: string,
    planContent: string,
    planType: string,
    tags: string[] = []
  ): Promise<{ filePath: string; entryId: string }> {
    // 1. Save to filesystem
    const filePath = await this.saveToFilesystem(planTitle, planContent, planType);
    
    // 2. Save to knowledge base
    const entryId = await this.saveToKnowledgeBase(planTitle, planContent, planType, tags);
    
    return { filePath, entryId };
  }

  /**
   * Save plan to filesystem in the appropriate directory
   */
  private async saveToFilesystem(
    planTitle: string,
    planContent: string,
    planType: string
  ): Promise<string> {
    // Create sanitized filename from title
    const sanitizedTitle = planTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Get current date for folder organization
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    
    // Determine directory based on plan type
    let dirPath: string;
    
    switch (planType.toLowerCase()) {
      case 'exploration':
        dirPath = path.join('docs', 'plans', 'explorations');
        break;
      case 'analysis':
        dirPath = path.join('docs', 'plans', 'analyses');
        break;
      case 'implementation':
        dirPath = path.join('docs', 'plans', 'implementations');
        break;
      case 'evaluation':
        dirPath = path.join('docs', 'plans', 'evaluations');
        break;
      case 'integration':
        dirPath = path.join('docs', 'plans', 'integrations');
        break;
      case 'synthesis':
        dirPath = path.join('docs', 'plans', 'syntheses');
        break;
      default:
        dirPath = path.join('docs', 'plans', 'misc');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Create file path
    const fileName = `${dateStr}-${sanitizedTitle}.md`;
    const filePath = path.join(dirPath, fileName);
    
    // Write file
    fs.writeFileSync(filePath, planContent);
    
    return filePath;
  }

  /**
   * Save plan to knowledge base
   */
  private async saveToKnowledgeBase(
    planTitle: string,
    planContent: string,
    planType: string,
    tags: string[]
  ): Promise<string> {
    // Connect to database
    await databaseService.connect();
    
    // Generate embedding for combined content
    const embeddingText = `${planTitle}\n${planContent}`;
    const vector = await embeddingService.generateEmbedding(embeddingText);
    
    // Create knowledge entry
    const newEntry = await databaseService.createEntry({
      title: planTitle,
      content: planContent,
      contentType: planType,
      category: 'sdof-plan',
      tags: [...tags, 'sdof', 'plan', planType],
      sourceReference: 'sdof-orchestrator',
      vector
    });
    
    // Safely get the ID as a string, handling potential undefined or null
    const entryId = newEntry?._id ? 
      (typeof newEntry._id.toString === 'function' ? 
        newEntry._id.toString() : 
        String(newEntry._id)
      ) : 
      'unknown-id';
    
    return entryId;
  }
}

// Export singleton instance
export default PlanAutoSaveService.getInstance();