/**
 * Basic SPA Crawler Example
 *
 * This example shows the simplest way to use the SPA crawler
 */

const SPACrawler = require('../src/index');

async function main() {
  // Create crawler instance
  const crawler = new SPACrawler({
    startUrl: 'https://example.com',
    maxDepth: 2,
    maxPages: 10,
    scope: 'domain',
    headless: true
  });

  // Listen to events
  crawler.on('pageStart', ({ url, depth }) => {
    console.log(`[Crawling] ${url} (depth: ${depth})`);
  });

  crawler.on('pageComplete', (page) => {
    console.log(`[Completed] ${page.url}`);
    console.log(`  - Found ${page.links.length} links`);
    console.log(`  - Found ${page.requests.length} AJAX requests`);
    console.log(`  - Found ${page.forms.length} forms`);
  });

  crawler.on('duplicatePage', ({ url, similarTo }) => {
    console.log(`[Duplicate] ${url} (similar to ${similarTo})`);
  });

  crawler.on('error', (error) => {
    console.error(`[Error] ${error.url}: ${error.message}`);
  });

  try {
    console.log('Starting crawler...\n');

    // Start crawling
    const results = await crawler.start();

    console.log('\n=== Crawl Complete ===');
    console.log(`Pages visited: ${results.stats.pagesVisited}`);
    console.log(`Pages skipped: ${results.stats.pagesSkipped}`);
    console.log(`Requests found: ${results.stats.requestsFound}`);
    console.log(`Errors: ${results.stats.errorsEncountered}`);
    console.log(`Duration: ${results.stats.duration}ms`);

    // Show all discovered URLs
    console.log('\n=== Discovered URLs ===');
    results.pages.forEach(page => {
      console.log(`- ${page.url} (${page.links.length} links, ${page.requests.length} requests)`);
    });

    // Show all AJAX/Fetch requests
    console.log('\n=== AJAX/Fetch Requests ===');
    const allRequests = new Set();
    results.pages.forEach(page => {
      page.requests.forEach(req => {
        if (req.type === 'xhr' || req.type === 'fetch') {
          allRequests.add(req.url);
        }
      });
    });
    allRequests.forEach(url => console.log(`- ${url}`));

  } catch (error) {
    console.error('Crawler failed:', error);
    process.exit(1);
  }
}

main();
