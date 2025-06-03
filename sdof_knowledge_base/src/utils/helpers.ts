/**
 * Helper Utilities
 * 
 * Common utility functions used throughout the application.
 */

/**
 * Sleep for a specified duration
 * @param ms Time to sleep in milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Calculate cosine similarity between two vectors
 * @param vecA First vector
 * @param vecB Second vector
 * @returns Similarity score between 0 and 1
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Chunk text into smaller segments for processing
 * @param text Text to chunk
 * @param maxChunkSize Maximum size of each chunk
 * @returns Array of text chunks
 */
export const chunkText = (text: string, maxChunkSize: number = 1000): string[] => {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  let currentChunk = '';
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxChunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

/**
 * Truncate text to a maximum length with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Format a date for display
 * @param date Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Generate a random ID
 * @param length Length of the ID
 * @returns Random ID string
 */
export const generateId = (length: number = 10): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns Result of the function
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries) {
        throw error;
      }
      
      retries++;
      console.log(`Retry ${retries}/${maxRetries} after ${delay}ms delay`);
      await sleep(delay);
      delay *= 2;  // Exponential backoff
    }
  }
};