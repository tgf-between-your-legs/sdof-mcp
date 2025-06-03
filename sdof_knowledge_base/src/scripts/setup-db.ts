/**
 * Setup script for MongoDB database and vector search index
 */
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function setupDatabase() {
  console.log('Setting up MongoDB database and vector search index...');
  
  // Get MongoDB connection string from environment
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI environment variable is not set');
    process.exit(1);
  }
  
  // Get database and collection names from environment
  const dbName = process.env.MONGODB_DB_NAME || 'sdof_knowledge';
  const collectionName = process.env.MONGODB_COLLECTION || 'knowledge_entries';
  
  console.log(`Using database: ${dbName}`);
  console.log(`Using collection: ${collectionName}`);
  
  let client: MongoClient | null = null;
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Get database and collection
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Check if the collection exists, create it if it doesn't
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.log(`Collection '${collectionName}' does not exist, creating it...`);
      await db.createCollection(collectionName);
      console.log(`Collection '${collectionName}' created`);
    } else {
      console.log(`Collection '${collectionName}' already exists`);
    }
    
    // Check if the vector search index exists
    const indexExists = await collection.indexExists('embedding_vector_index');
    
    if (!indexExists) {
      console.log('Creating vector search index...');
      
      // Use createIndex with any type to bypass TypeScript's strict typing
      // MongoDB Atlas supports vector search which may not be in the TypeScript definitions
      await (collection as any).createIndex(
        { embedding: "vector" },
        { 
          name: "embedding_vector_index",
          vectorDimension: 1536, // Default dimension for Claude/OpenAI embeddings
          vectorDistanceMetric: "cosine"
        }
      );
      
      console.log('Vector search index created successfully');
    } else {
      console.log('Vector search index already exists');
    }
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
    process.exit(0);
  }
}

// Run the setup
setupDatabase();