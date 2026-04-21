/**
 * Simple in-memory cache for media Blob URLs.
 * Stores { messageId: blobUrl }
 */
const cache = new Map();

export const MediaCache = {
  get: (messageId) => cache.get(messageId),
  
  set: (messageId, blobUrl) => {
    cache.set(messageId, blobUrl);
  },
  
  has: (messageId) => cache.has(messageId),
  
  clear: () => {
    // Revoke object URLs to prevent memory leaks
    for (const url of cache.values()) {
      URL.revokeObjectURL(url);
    }
    cache.clear();
  }
};
