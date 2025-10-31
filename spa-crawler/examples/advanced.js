/**
 * Advanced SPA Crawler Example
 *
 * This example demonstrates advanced features:
 * - Custom headers and cookies
 * - Scope control
 * - Exclusion patterns
 * - Event handlers
 * - Result processing
 */

const SPACrawler = require('../src/index');
const fs = require('fs');

async function main() {
  // Create crawler with advanced configuration
  const crawler = new SPACrawler({
    startUrl: 'https://example.com',

    // Crawl limits
    maxDepth: 3,
    maxPages: 50,

    // Timeout settings
    timeout: 30000,
    waitForRequests: 3000,

    // Scope control
    scope: 'directory', // 'domain', 'directory', or 'url'

    // Exclude patterns (URLs matching these will be skipped)
    excludePatterns: [
      /logout/i,
      /signout/i,
      /delete/i,
      '.pdf',
      '.zip',
      '.jpg',
      '.png'
    ],

    // Custom headers
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Custom-Header': 'crawler'
    },

    // Cookies (if authentication is needed)
    cookies: [
      {
        name: 'session_id',
        value: 'your-session-token',
        domain: 'example.com',
        path: '/'
      }
    ],

    // User agent
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

    // Browser options
    headless: true,
    viewport: {
      width: 1920,
      height: 1080
    },

    // Deduplication settings
    deduplication: true,
    deduplicationThreshold: 0.85,

    // Feature flags
    extractForms: true,
    extractClickables: true,

    // Callbacks
    onPage: async (page) => {
      // Process each page as it's crawled
      console.log(`[Callback] Processing ${page.url}`);

      // You can do custom processing here
      // For example, save API requests to a file
      const apiRequests = page.requests.filter(r =>
        r.url.includes('/api/') || r.headers?.accept?.includes('application/json')
      );

      if (apiRequests.length > 0) {
        console.log(`  Found ${apiRequests.length} API requests`);
      }
    },

    onError: (error) => {
      console.error(`[Error Handler] ${error.url}: ${error.message}`);
    }
  });

  // Event listeners for monitoring
  crawler.on('browserLaunched', () => {
    console.log('[Event] Browser launched');
  });

  crawler.on('pageStart', ({ url, depth }) => {
    console.log(`[Event] Starting: ${url} (depth ${depth})`);
  });

  crawler.on('pageComplete', (page) => {
    const stats = crawler.getStats();
    console.log(`[Event] Completed: ${page.url}`);
    console.log(`  Progress: ${stats.pagesVisited}/${stats.visitedSize + stats.queueSize}`);
  });

  crawler.on('duplicatePage', ({ url, similarTo, similarity }) => {
    console.log(`[Event] Duplicate: ${url}`);
    console.log(`  Similar to: ${similarTo} (${(similarity * 100).toFixed(1)}%)`);
  });

  crawler.on('urlQueued', ({ url, depth }) => {
    const stats = crawler.getStats();
    console.log(`[Event] Queued: ${url} (queue size: ${stats.queueSize})`);
  });

  crawler.on('outOfScope', ({ url }) => {
    console.log(`[Event] Out of scope: ${url}`);
  });

  crawler.on('excluded', ({ url }) => {
    console.log(`[Event] Excluded: ${url}`);
  });

  crawler.on('maxPagesReached', (maxPages) => {
    console.log(`[Event] Maximum pages reached: ${maxPages}`);
  });

  try {
    console.log('Starting advanced crawler...\n');

    const startTime = Date.now();
    const results = await crawler.start();
    const duration = Date.now() - startTime;

    // Display comprehensive results
    console.log('\n' + '='.repeat(60));
    console.log('CRAWL RESULTS');
    console.log('='.repeat(60));

    console.log('\nStatistics:');
    console.log(`  Pages visited: ${results.stats.pagesVisited}`);
    console.log(`  Pages skipped: ${results.stats.pagesSkipped}`);
    console.log(`  Total requests found: ${results.stats.requestsFound}`);
    console.log(`  Errors encountered: ${results.stats.errorsEncountered}`);
    console.log(`  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);

    // Analyze discovered pages
    console.log('\nDiscovered Pages:');
    results.pages.forEach((page, index) => {
      console.log(`  ${index + 1}. ${page.url}`);
      console.log(`     Title: ${page.title}`);
      console.log(`     Status: ${page.statusCode}`);
      console.log(`     Links: ${page.links.length}, Requests: ${page.requests.length}, Forms: ${page.forms.length}`);
    });

    // Analyze network requests
    console.log('\nNetwork Activity:');
    const allXHR = [];
    const allFetch = [];
    const allWS = [];

    results.pages.forEach(page => {
      page.requests.forEach(req => {
        if (req.type === 'xhr') allXHR.push(req.url);
        if (req.type === 'fetch') allFetch.push(req.url);
      });
      allWS.push(...page.webSockets);
    });

    console.log(`  XHR requests: ${new Set(allXHR).size} unique`);
    console.log(`  Fetch requests: ${new Set(allFetch).size} unique`);
    console.log(`  WebSocket connections: ${allWS.length}`);

    // Find all API endpoints
    console.log('\nAPI Endpoints:');
    const apiEndpoints = new Set();
    results.pages.forEach(page => {
      page.requests.forEach(req => {
        if (req.url.includes('/api/') ||
            req.url.includes('/graphql') ||
            req.headers?.accept?.includes('application/json')) {
          apiEndpoints.add(`${req.method} ${req.url}`);
        }
      });
    });
    apiEndpoints.forEach(endpoint => console.log(`  - ${endpoint}`));

    // Save results to JSON file
    const outputFile = 'crawl-results.json';
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${outputFile}`);

    // Generate sitemap
    console.log('\nSitemap:');
    const sitemap = results.pages.map(p => ({
      url: p.url,
      depth: p.depth,
      links: p.links.length
    }));
    sitemap.forEach(item => {
      console.log(`  ${'  '.repeat(item.depth)}└─ ${item.url}`);
    });

  } catch (error) {
    console.error('\nCrawler failed:', error);
    process.exit(1);
  }
}

main();
