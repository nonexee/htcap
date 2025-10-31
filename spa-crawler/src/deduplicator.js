/**
 * Deduplicator - Prevents crawling duplicate pages in SPAs
 * Uses shingle-based similarity detection to identify duplicate content
 */

const { createShingles, jaccardSimilarity, hashContent } = require('./utils');

class Deduplicator {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.85; // Similarity threshold (0-1)
    this.shingleSize = options.shingleSize || 4; // N-gram size
    this.enabled = options.enabled !== false; // Default: enabled

    // Storage
    this.seenUrls = new Set();
    this.contentHashes = new Map(); // hash -> { url, shingles }
    this.urlToHash = new Map(); // url -> hash
  }

  /**
   * Check if URL has been seen before (exact match)
   * @param {string} url
   * @returns {boolean}
   */
  hasSeenUrl(url) {
    return this.seenUrls.has(url);
  }

  /**
   * Mark URL as seen
   * @param {string} url
   */
  markUrlSeen(url) {
    this.seenUrls.add(url);
  }

  /**
   * Check if content is duplicate
   * @param {string} content - Page content (HTML or text)
   * @param {string} url - Current URL
   * @returns {Object} { isDuplicate: boolean, similarTo: string|null, similarity: number }
   */
  checkDuplicate(content, url) {
    if (!this.enabled) {
      return { isDuplicate: false, similarTo: null, similarity: 0 };
    }

    // Quick hash check
    const hash = hashContent(content);

    // Exact match by content hash
    if (this.contentHashes.has(hash)) {
      const existing = this.contentHashes.get(hash);
      return {
        isDuplicate: true,
        similarTo: existing.url,
        similarity: 1.0
      };
    }

    // Create shingles for similarity comparison
    const shingles = createShingles(content, this.shingleSize);

    // Compare with existing content
    let maxSimilarity = 0;
    let similarTo = null;

    for (const [existingHash, data] of this.contentHashes.entries()) {
      const similarity = jaccardSimilarity(shingles, data.shingles);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        similarTo = data.url;
      }

      // Early exit if we found a very similar page
      if (similarity >= this.threshold) {
        return {
          isDuplicate: true,
          similarTo: data.url,
          similarity
        };
      }
    }

    // Not a duplicate - store this content
    this.contentHashes.set(hash, { url, shingles });
    this.urlToHash.set(url, hash);

    return {
      isDuplicate: false,
      similarTo,
      similarity: maxSimilarity
    };
  }

  /**
   * Remove URL from deduplication tracking
   * @param {string} url
   */
  remove(url) {
    this.seenUrls.delete(url);
    const hash = this.urlToHash.get(url);
    if (hash) {
      this.contentHashes.delete(hash);
      this.urlToHash.delete(url);
    }
  }

  /**
   * Clear all tracking data
   */
  clear() {
    this.seenUrls.clear();
    this.contentHashes.clear();
    this.urlToHash.clear();
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalUrls: this.seenUrls.size,
      uniqueContent: this.contentHashes.size,
      threshold: this.threshold,
      enabled: this.enabled
    };
  }
}

module.exports = Deduplicator;
