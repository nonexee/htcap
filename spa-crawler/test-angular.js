/**
 * Test crawler on Angular test site
 */

const SPACrawler = require('./src/index');

async function main() {
  console.log('Testing SPA Crawler on Angular site...\n');
  console.log('Target: http://angular.testsparker.com/\n');
  console.log('='.repeat(60));

  const crawler = new SPACrawler({
    startUrl: 'http://angular.testsparker.com/',
    maxDepth: 3,
    maxPages: 20,
    timeout: 60000,                // 60s timeout for complex interactions
    waitForRequests: 3000,
    scope: 'domain',
    headless: true,
    deduplication: true,
    extractForms: true,
    extractClickables: true,
    interactWithPage: true,        // Enable ULTRA-DEEP recursive interaction
    maxClicksPerPage: 100,         // Try up to 100 elements per page
    waitAfterClick: 1500           // Wait 1.5s after each click
    // executablePath: '/path/to/chrome'  // Optional: specify custom Chrome path
  });

  // Track progress
  let pageCount = 0;

  crawler.on('browserLaunched', () => {
    console.log('[✓] Browser launched\n');
  });

  crawler.on('pageStart', ({ url, depth }) => {
    pageCount++;
    console.log(`\n[${pageCount}] Crawling: ${url}`);
    console.log(`    Depth: ${depth}`);
  });

  crawler.on('pageComplete', (page) => {
    console.log(`    Status: ${page.statusCode}`);
    console.log(`    Title: ${page.title}`);
    console.log(`    Links found: ${page.links.length}`);
    console.log(`    Forms found: ${page.forms.length}`);
    console.log(`    XHR/Fetch requests: ${page.requests.length}`);
    console.log(`    WebSocket connections: ${page.webSockets.length}`);
    console.log(`    Clickables: ${page.clickables.length}`);
  });

  crawler.on('duplicatePage', ({ url, similarTo, similarity }) => {
    console.log(`    [SKIP] Duplicate content (${(similarity * 100).toFixed(1)}% similar to ${similarTo})`);
  });

  crawler.on('urlQueued', ({ url, depth }) => {
    const stats = crawler.getStats();
    console.log(`    [+] Queued: ${url} (queue: ${stats.queueSize})`);
  });

  crawler.on('interactionComplete', ({ url, clickCount, formsFound, linksFound }) => {
    console.log(`    [INTERACT] Clicked ${clickCount} elements, found ${formsFound} hidden forms, ${linksFound} hidden links`);
  });

  crawler.on('error', (error) => {
    console.error(`    [ERROR] ${error.url}: ${error.message}`);
  });

  try {
    const startTime = Date.now();
    const results = await crawler.start();
    const duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));

    console.log('\n📊 Statistics:');
    console.log(`   Pages visited: ${results.stats.pagesVisited}`);
    console.log(`   Pages skipped (duplicates): ${results.stats.pagesSkipped}`);
    console.log(`   Total requests found: ${results.stats.requestsFound}`);
    console.log(`   Errors: ${results.stats.errorsEncountered}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);

    console.log('\n📄 Discovered Pages:');
    results.pages.forEach((page, i) => {
      console.log(`   ${i + 1}. ${page.url}`);
      console.log(`      Title: "${page.title}"`);
      console.log(`      Depth: ${page.depth}, Status: ${page.statusCode}`);
    });

    console.log('\n🔗 Unique Links Discovered:');
    const uniqueLinks = new Set();
    results.pages.forEach(page => {
      page.links.forEach(link => uniqueLinks.add(link.url));
    });
    uniqueLinks.forEach(link => console.log(`   - ${link}`));

    console.log('\n📋 Forms Found:');
    const allForms = results.pages.flatMap(page => page.forms);
    if (allForms.length > 0) {
      allForms.forEach((form, i) => {
        console.log(`   ${i + 1}. ${form.method} ${form.url}`);
        console.log(`      Fields: ${form.fields.map(f => f.name).join(', ')}`);
      });
    } else {
      console.log('   (none)');
    }

    console.log('\n🌐 Network Requests (XHR/Fetch):');
    const networkRequests = new Set();
    results.pages.forEach(page => {
      page.requests.forEach(req => {
        if (req.type === 'xhr' || req.type === 'fetch') {
          networkRequests.add(`${req.method} ${req.url}`);
        }
      });
    });
    if (networkRequests.size > 0) {
      networkRequests.forEach(req => console.log(`   - ${req}`));
    } else {
      console.log('   (none)');
    }

    console.log('\n🔌 WebSocket Connections:');
    const wsConnections = results.pages.flatMap(page => page.webSockets);
    if (wsConnections.length > 0) {
      wsConnections.forEach(ws => console.log(`   - ${ws.url}`));
    } else {
      console.log('   (none)');
    }

    console.log('\n❌ Errors:');
    if (results.errors.length > 0) {
      results.errors.forEach(err => {
        console.log(`   - ${err.url}`);
        console.log(`     ${err.message}`);
      });
    } else {
      console.log('   (none)');
    }

    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Full results saved to: test-results.json');

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
