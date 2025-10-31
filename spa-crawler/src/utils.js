/**
 * Utility functions for SPA crawler
 */

const { URL } = require('url');
const crypto = require('crypto');

/**
 * Normalize URL for comparison
 * @param {string} urlString
 * @returns {string}
 */
function normalizeUrl(urlString) {
  try {
    const url = new URL(urlString);

    // Remove default ports
    if ((url.protocol === 'http:' && url.port === '80') ||
        (url.protocol === 'https:' && url.port === '443')) {
      url.port = '';
    }

    // Remove trailing slash from pathname
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    // Sort query parameters
    const params = Array.from(url.searchParams.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
    url.search = '';
    params.forEach(([key, value]) => url.searchParams.append(key, value));

    // Remove fragment
    url.hash = '';

    return url.toString();
  } catch (e) {
    return urlString;
  }
}

/**
 * Check if URL is in scope
 * @param {string} url - URL to check
 * @param {string} baseUrl - Base URL
 * @param {string} scopeType - 'domain', 'directory', or 'url'
 * @returns {boolean}
 */
function isInScope(url, baseUrl, scopeType = 'domain') {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseUrl);

    switch (scopeType) {
      case 'url':
        // Only exact URL (different query params allowed)
        return urlObj.origin === baseObj.origin &&
               urlObj.pathname === baseObj.pathname;

      case 'directory':
        // Same domain and directory path
        return urlObj.origin === baseObj.origin &&
               urlObj.pathname.startsWith(baseObj.pathname);

      case 'domain':
      default:
        // Same domain (including subdomains)
        return urlObj.hostname === baseObj.hostname ||
               urlObj.hostname.endsWith('.' + baseObj.hostname);
    }
  } catch (e) {
    return false;
  }
}

/**
 * Check if URL matches exclusion patterns
 * @param {string} url
 * @param {Array<string|RegExp>} patterns
 * @returns {boolean}
 */
function isExcluded(url, patterns = []) {
  if (!patterns || patterns.length === 0) return false;

  return patterns.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(url);
    }
    return url.includes(pattern);
  });
}

/**
 * Generate hash for content (for deduplication)
 * @param {string} content
 * @returns {string}
 */
function hashContent(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Extract domain from URL
 * @param {string} urlString
 * @returns {string}
 */
function getDomain(urlString) {
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch (e) {
    return '';
  }
}

/**
 * Check if URL is valid
 * @param {string} urlString
 * @returns {boolean}
 */
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Resolve relative URL against base URL
 * @param {string} relativeUrl
 * @param {string} baseUrl
 * @returns {string|null}
 */
function resolveUrl(relativeUrl, baseUrl) {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch (e) {
    return null;
  }
}

/**
 * Simple text cleaning for similarity comparison
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Calculate Jaccard similarity between two sets
 * @param {Set} set1
 * @param {Set} set2
 * @returns {number} Similarity score between 0 and 1
 */
function jaccardSimilarity(set1, set2) {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 1.0;
  return intersection.size / union.size;
}

/**
 * Create shingles (n-grams) from text
 * @param {string} text
 * @param {number} n - Size of shingles
 * @returns {Set<string>}
 */
function createShingles(text, n = 3) {
  const shingles = new Set();
  const cleaned = cleanText(text);

  if (cleaned.length < n) {
    shingles.add(cleaned);
    return shingles;
  }

  for (let i = 0; i <= cleaned.length - n; i++) {
    shingles.add(cleaned.substring(i, i + n));
  }

  return shingles;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  normalizeUrl,
  isInScope,
  isExcluded,
  hashContent,
  getDomain,
  isValidUrl,
  resolveUrl,
  cleanText,
  jaccardSimilarity,
  createShingles,
  sleep
};
