# SDOF Knowledge Base MCP Server: Setup Guide for Non-Coders

## Setting Up MongoDB with Vector Search

### Step 1: Install MongoDB Atlas (Cloud Solution - Recommended for Beginners)

1. **Create a MongoDB Atlas Account**
   - Go to [MongoDB Atlas website](https://www.mongodb.com/cloud/atlas/register)
   - Click "Start Free" and follow the registration process
   - Verify your email address

2. **Create a New Cluster**
   - After logging in, click "Build a Database"
   - Select "M0 FREE" tier (it's completely free)
   - Choose your preferred cloud provider (AWS, Google Cloud, or Azure)
   - Select a region closest to you
   - Click "Create Cluster" (this process may take 1-3 minutes)

3. **Set Up Database Access**
   - In the left sidebar, click "Database Access"
   - Click "Add New Database User"
   - Create a username and password (save these securely)
   tgf_sdof
   FuckYOUFucker
   - Select "Read and write to any database" under "Database User Privileges"
   - Click "Add User"

4. **Configure Network Access**
   - In the left sidebar, click "Network Access"
   - Click "Add IP Address"
   - For testing, click "Allow Access from Anywhere" (you can restrict this later)
   - Click "Confirm"

5. **Enable Vector Search (Atlas Vector Search)**
   - In the left sidebar, click "Clusters"
   - Click on your cluster name
   - Click on the "Collections" tab
   - Click "Create Database"
   - Enter "sdof_knowledge" as Database name
   - Enter "knowledge_entries" as Collection name
   - Click "Create"
   - After creation, click on the "Search" tab
   - Click "Create Search Index"
   - Select "JSON Editor" and paste the following:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 1536,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
```
   - Click "Next" and then "Create Search Index"

6. **Get Your Connection String**
   - In the left sidebar, click "Database"
   - Click "Connect" button on your cluster
   - Click "Connect your application"
   - Copy the connection string (it looks like: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/`)
   - Replace `<password>` with your actual password
   mongodb+srv://tgf_sdof:<db_password>@tgf.nh2hef0.mongodb.net

### Step 2: Update the .env File

1. Create a file named `.env` in the root of your project with the following content:

```
MONGODB_URI=your_connection_string_from_step_6
MONGODB_DB_NAME=sdof_knowledge
MONGODB_COLLECTION=knowledge_entries
EMBEDDING_MODEL=text-embedding-3-large
OPENAI_API_KEY=your_openai_api_key
```

## Using Alternative Language Models

The SDOF Knowledge Base implementation can be easily modified to work with various language models for generating embeddings. Here's how to set up and use different popular LLMs:

### 1. Claude 3.7 Sonnet

To use Claude 3.7 Sonnet for embeddings:

1. **Sign up for Anthropic API access**
   - Go to [Anthropic's website](https://www.anthropic.com/)
   - Create an account and request API access
   - Once approved, get your API key

2. **Update your `.env` file**
   ```
   EMBEDDING_SERVICE=claude
   CLAUDE_API_KEY=your_claude_api_key
   ```

3. **Modify the embedding service**
   - In `src/services/embedding.service.ts`, add Claude integration:

```typescript
// Add this to the imports
import { Client } from '@anthropic/sdk';

// Add this to the EmbeddingService class
private async getClaudeEmbedding(text: string): Promise<number[]> {
  const client = new Client(process.env.CLAUDE_API_KEY || '');
  const response = await client.embeddings.create({
    model: 'claude-3-sonnet-20240229',
    input: text,
  });
  return response.embeddings[0].embedding;
}
```

### 2. Google Gemini Models

To use Google Gemini:

1. **Get Google AI Studio API access**
   - Go to [Google AI Studio](https://makersuite.google.com/)
   - Create an account and get an API key

2. **Update your `.env` file**
   ```
   EMBEDDING_SERVICE=gemini
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Modify the embedding service**
   - In `src/services/embedding.service.ts`, add Gemini integration:

```typescript
// Add this to the imports
import { GoogleGenerativeAI } from '@google/generative-ai';

// Add this to the EmbeddingService class
private async getGeminiEmbedding(text: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}
```

### 3. Deepseek

To use Deepseek models:

1. **Sign up for Deepseek API access**
   - Go to Deepseek's website and register for API access
   - Get your API key

2. **Update your `.env` file**
   ```
   EMBEDDING_SERVICE=deepseek
   DEEPSEEK_API_KEY=your_deepseek_api_key
   ```

3. **Modify the embedding service**
   - In `src/services/embedding.service.ts`, add Deepseek integration:

```typescript
// Add this to the imports
import axios from 'axios';

// Add this to the EmbeddingService class
private async getDeepseekEmbedding(text: string): Promise<number[]> {
  const response = await axios.post(
    'https://api.deepseek.com/v1/embeddings',
    {
      input: text,
      model: 'deepseek-embedding'
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.data[0].embedding;
}
```

### 4. Creating a Universal Model Selector

To make it easy to switch between models, you can add a model selector to the embedding service:

1. **Update the `.env` file with a model selector**
   ```
   EMBEDDING_SERVICE=openai  # or claude, gemini, deepseek
   ```

2. **Modify the main embedding function**
   - In `src/services/embedding.service.ts`, update the getEmbedding method:

```typescript
public async getEmbedding(text: string): Promise<number[]> {
  const service = process.env.EMBEDDING_SERVICE || 'openai';
  
  switch (service) {
    case 'claude':
      return this.getClaudeEmbedding(text);
    case 'gemini':
      return this.getGeminiEmbedding(text);
    case 'deepseek':
      return this.getDeepseekEmbedding(text);
    case 'openai':
    default:
      return this.getOpenAIEmbedding(text);
  }
}
```

## Running the MCP Server

Once you've set up MongoDB and configured your preferred embedding model:

1. **Install Node.js**
   - Download and install from [Node.js website](https://nodejs.org/)
   - Choose the LTS (Long Term Support) version

2. **Install dependencies**
   - Open a command prompt or terminal
   - Navigate to your project folder
   - Run: `npm install`

3. **Start the server**
   - Run: `npm start`
   - You should see a message indicating the server is running

4. **Configure MCP in Roo**
   - Add the following to your MCP configuration:

```json
{
  "name": "sdof_knowledge_base",
  "type": "stdio",
  "command": "npm start",
  "cwd": "/path/to/your/project"
}
```

## Troubleshooting Common Issues

### MongoDB Connection Issues
- Verify your IP address is whitelisted in MongoDB Atlas
- Check that your username and password are correct in the connection string
- Ensure the database and collection names match your configuration

### Embedding API Issues
- Verify your API keys are valid and have not expired
- Check for API rate limits, especially on free tiers
- Ensure your network can reach the API endpoints

### Server Startup Problems
- Make sure all dependencies are installed with `npm install`
- Check the Node.js version (should be 14.x or higher)
- Verify that the .env file is in the correct location

## Modifying Vector Dimensions

Different embedding models produce vectors with different dimensions:
- OpenAI's text-embedding-3-large: 3072 dimensions (or 1536 for older models)
- Claude: typically 1536 dimensions
- Gemini: typically 768 dimensions
- Deepseek: typically 1024 dimensions

When changing models, you need to update the vector dimensions in:

1. **MongoDB Atlas Vector Search Index**
   - Delete and recreate the index with the correct dimensions

2. **The Knowledge Entry Schema**
   - Update the vector field configuration in your schema

This comprehensive guide should help you set up and configure the SDOF Knowledge Base MCP Server with various language models, even without prior coding experience. The implementation is designed to be flexible, allowing you to choose the embedding model that best fits your needs.