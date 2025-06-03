/**
 * Knowledge Entry Model
 * 
 * This model represents a knowledge entry in the SDOF knowledge base.
 * Each entry contains content, metadata, and a vector representation for semantic search.
 */

import mongoose, { Document, Schema } from 'mongoose';

// Interface for knowledge entry document
export interface IKnowledgeEntry extends Document {
  title: string;
  content: string;
  contentType: string; 
  category: string;
  tags: string[];
  vector: number[];
  sourceReference?: string;
  relatedEntries?: string[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessedAt?: Date;
}

// Schema definition
const KnowledgeEntrySchema = new Schema<IKnowledgeEntry>(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
      enum: ['text', 'code', 'decision', 'analysis', 'solution', 'evaluation', 'integration'],
      default: 'text',
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    vector: {
      type: [Number],
      required: true,
      index: true, // This will be replaced with a vector index in MongoDB
    },
    sourceReference: {
      type: String,
    },
    relatedEntries: {
      type: [String],
      default: [],
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create text indexes for full-text search capabilities
KnowledgeEntrySchema.index({ title: 'text', content: 'text', tags: 'text' });

// Create a MongoDB Atlas vector search index (requires manual setup in MongoDB Atlas)
// This is done via MongoDB Atlas UI or API, not in the schema definition

// Helper method to increment access count
KnowledgeEntrySchema.methods.recordAccess = function() {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

// Export the model
const KnowledgeEntry = mongoose.model<IKnowledgeEntry>('KnowledgeEntry', KnowledgeEntrySchema);
export default KnowledgeEntry;