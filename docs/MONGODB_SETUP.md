# MongoDB Atlas Vector Search Setup Guide

This guide provides step-by-step instructions for setting up MongoDB Atlas with vector search capabilities for the SDOF Knowledge Base.

## Prerequisites

- A MongoDB Atlas account (free tier is sufficient for testing)
- Your MongoDB connection string (already configured in your .env file)

## Step 1: Create a MongoDB Atlas Account (if you don't have one)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account or log in to your existing account

## Step 2: Set Up a Cluster

1. In the MongoDB Atlas dashboard, click "Build a Database"
2. Select the free "M0" tier (unless you need more capacity)
3. Choose your preferred cloud provider and region
4. Click "Create Cluster" (this may take a few minutes)

## Step 3: Configure Network Access

1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. For development/testing, you can select "Allow Access from Anywhere" (not recommended for production)
4. Click "Confirm"

## Step 4: Configure Database Access

1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Create a username and password (this should match what's in your .env file)
4. Under "Database User Privileges", select "Read and write to any database"
5. Click "Add User"

## Step 5: Create the Knowledge Database and Collection

1. In the left sidebar, click "Databases"
2. Click on your cluster name
3. Click "Browse Collections"
4. Click "Add My Own Data"
5. Enter "sdof_knowledge" as the Database name
6. Enter "knowledge_entries" as the Collection name
7. Click "Create"

## Step 6: Enable Atlas Vector Search

1. In the left sidebar, click "Databases"
2. Click on your cluster name
3. Click "Search" in the top navigation
4. Click "Create Search Index"
5. Select "JSON Editor" and click "Next"
6. Enter `vector_index` as the Index Name
7. Replace the default JSON with the following configuration:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "vector": {
        "dimensions": 1536,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
```

**Note:** The `dimensions` value (1536) should match the embedding model's output dimensions:
- Claude embeddings: 1536 dimensions
- OpenAI embeddings: 1536 dimensions (for older models) or 3072 dimensions (for text-embedding-3-large)

8. Click "Next" and then "Create Search Index"

## Step 7: Create Text Index

The text index is automatically created by the Mongoose schema, but you can manually create it if needed:

1. In your cluster's "Collections" view, select the "sdof_knowledge.knowledge_entries" collection
2. Click "Indexes" and then "Create Index"
3. Use the following JSON for the index:

```json
{
  "title": "text",
  "content": "text",
  "tags": "text"
}
```

4. Click "Create"

## Step 8: Test Connection

After completing these steps, your MongoDB Atlas instance should be properly configured for vector search. The application will automatically connect to it using the connection string in your .env file.

## Troubleshooting

If you encounter issues with vector search:

1. **Vector Index Not Found**: Ensure the index name in the database service (`vector_index`) matches the name you created in Atlas
2. **Dimension Mismatch**: Ensure the dimensions in your Atlas vector index match the dimensions of your embedding model
3. **Connection Issues**: Verify that your IP address is allowed in the Network Access settings
4. **Authentication Issues**: Check that your username and password in the .env file are correct

## Additional Resources

- [MongoDB Atlas Vector Search Documentation](https://www.mongodb.com/docs/atlas/atlas-search/vector-search/)
- [MongoDB Atlas Connection String Format](https://www.mongodb.com/docs/manual/reference/connection-string/)