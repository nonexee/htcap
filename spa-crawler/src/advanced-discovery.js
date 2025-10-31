/**
 * Advanced Content Discovery
 * Handles infinite scroll, iframes, lazy loading, virtual scrolling
 */

class AdvancedDiscovery {
  constructor(page, options = {}) {
    this.page = page;
    this.options = {
      maxScrollAttempts: options.maxScrollAttempts || 10,
      scrollWait: options.scrollWait || 1500,
      enableIframes: options.enableIframes !== false,
      enableInfiniteScroll: options.enableInfiniteScroll !== false,
      enableLazyLoading: options.enableLazyLoading !== false
    };
    this.discoveredContent = {
      scrollItems: 0,
      iframes: [],
      lazyModules: new Set()
    };
  }

  /**
   * Handle infinite scroll to load all dynamic content
   * @returns {Promise<Object>}
   */
  async handleInfiniteScroll() {
    if (!this.options.enableInfiniteScroll) return { loaded: 0 };

    console.log(`      [INFINITE-SCROLL] Detecting and triggering infinite scroll...`);

    let lastHeight = 0;
    let noChangeAttempts = 0;
    let totalLoaded = 0;

    while (noChangeAttempts < this.options.maxScrollAttempts) {
      // Get current page height
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);

      // Scroll to bottom
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for content to load
      await new Promise(r => setTimeout(r, this.options.scrollWait));

      // Wait for any network activity to complete
      await this.page.waitForNetworkIdle({ timeout: 3000, idleTime: 500 }).catch(() => {});

      // Get new height
      const newHeight = await this.page.evaluate(() => document.body.scrollHeight);

      if (newHeight > lastHeight) {
        // New content loaded!
        const itemsAdded = Math.floor((newHeight - lastHeight) / 100); // Rough estimate
        totalLoaded += itemsAdded;
        console.log(`      [INFINITE-SCROLL] Loaded more content (+${itemsAdded} items, total: ${totalLoaded})`);
        lastHeight = newHeight;
        noChangeAttempts = 0; // Reset counter
      } else {
        // No new content
        noChangeAttempts++;
      }

      // Check if there's a "Load More" button
      const loadMoreButton = await this.page.evaluate(() => {
        const selectors = [
          'button:contains("Load More")',
          'button:contains("Show More")',
          '[class*="load-more"]',
          '[class*="show-more"]',
          '[data-action="load-more"]'
        ];

        for (const selector of selectors) {
          try {
            const btns = Array.from(document.querySelectorAll('button, a')).filter(el => {
              const text = el.textContent.toLowerCase();
              return text.includes('load more') || text.includes('show more');
            });

            if (btns.length > 0) {
              btns[0].click();
              return true;
            }
          } catch (e) {}
        }
        return false;
      });

      if (loadMoreButton) {
        console.log(`      [INFINITE-SCROLL] Clicked "Load More" button`);
        await new Promise(r => setTimeout(r, this.options.scrollWait));
      }
    }

    // Scroll back to top
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));

    console.log(`      [INFINITE-SCROLL] Complete. Loaded ${totalLoaded} items`);
    this.discoveredContent.scrollItems = totalLoaded;

    return { loaded: totalLoaded };
  }

  /**
   * Detect and handle virtual scrolling
   * @returns {Promise<boolean>}
   */
  async detectVirtualScroll() {
    const hasVirtualScroll = await this.page.evaluate(() => {
      // Look for common virtual scroll libraries
      const indicators = [
        '[class*="virtual"]',
        '[class*="infinite"]',
        '[data-virtualized]',
        '[class*="react-window"]',
        '[class*="react-virtualized"]',
        '.ReactVirtualized__Grid',
        '.ReactVirtualized__List'
      ];

      for (const selector of indicators) {
        if (document.querySelector(selector)) {
          return true;
        }
      }

      return false;
    });

    if (hasVirtualScroll) {
      console.log(`      [VIRTUAL-SCROLL] Detected virtual scrolling`);
      // Virtual scroll needs scrolling to reveal items
      await this.handleInfiniteScroll();
    }

    return hasVirtualScroll;
  }

  /**
   * Crawl iframe content
   * @returns {Promise<Array>}
   */
  async crawlIframes() {
    if (!this.options.enableIframes) return [];

    console.log(`      [IFRAME] Discovering and crawling iframes...`);

    const frames = this.page.frames();
    const iframeData = [];

    for (const frame of frames) {
      if (frame === this.page.mainFrame()) continue; // Skip main frame

      try {
        // Try to access iframe (will fail if cross-origin)
        const frameUrl = await frame.evaluate(() => {
          try {
            return window.location.href;
          } catch (e) {
            return null; // Cross-origin
          }
        });

        if (!frameUrl) {
          console.log(`      [IFRAME] Skipping cross-origin iframe`);
          continue;
        }

        console.log(`      [IFRAME] Crawling iframe: ${frameUrl}`);

        // Get iframe content
        const content = await frame.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title,
            linksCount: document.querySelectorAll('a[href]').length,
            formsCount: document.querySelectorAll('form').length,
            html: document.body.innerHTML.length
          };
        });

        // Find interactive elements in iframe
        const elements = await frame.evaluate(() => {
          const interactiveSelectors = [
            'button', 'a[href]', 'input', 'select', 'textarea',
            '[onclick]', '[role="button"]', '.btn'
          ];

          const elements = [];
          interactiveSelectors.forEach(selector => {
            try {
              document.querySelectorAll(selector).forEach(el => {
                const text = (el.innerText || el.value || '').trim().substring(0, 50);
                elements.push({
                  tag: el.tagName,
                  text,
                  type: el.getAttribute('type') || ''
                });
              });
            } catch (e) {}
          });

          return elements;
        });

        content.elements = elements;
        iframeData.push(content);

        console.log(`      [IFRAME] Found ${elements.length} interactive elements in iframe`);

        // TODO: Could interact with iframe elements here

      } catch (e) {
        console.log(`      [IFRAME] Error crawling iframe: ${e.message}`);
      }
    }

    this.discoveredContent.iframes = iframeData;
    console.log(`      [IFRAME] Crawled ${iframeData.length} iframes`);

    return iframeData;
  }

  /**
   * Detect and trigger lazy loading
   * @returns {Promise<Object>}
   */
  async detectLazyLoading() {
    if (!this.options.enableLazyLoading) return { chunks: 0, modules: 0 };

    console.log(`      [LAZY-LOAD] Detecting lazy-loaded modules...`);

    // Monitor network for webpack chunks
    const lazyChunks = new Set();

    const responseHandler = (response) => {
      const url = response.url();

      // Detect webpack/vite/rollup chunks
      if (url.match(/\d+\.[a-f0-9]+\.chunk\.js/) ||
          url.match(/\d+\.[a-f0-9]+\.js/) ||
          url.match(/chunk-[A-Z0-9]+\.js/) ||
          url.includes('.lazy.') ||
          url.includes('-lazy-')) {
        lazyChunks.add(url);
      }
    };

    this.page.on('response', responseHandler);

    // Detect dynamic imports in source
    const dynamicImports = await this.page.evaluate(() => {
      const imports = new Set();

      // Check all script tags
      document.querySelectorAll('script').forEach(script => {
        try {
          const content = script.textContent;
          // Look for import() calls
          const matches = content.match(/import\(['"](.+?)['"]\)/g);
          if (matches) {
            matches.forEach(m => imports.add(m));
          }
        } catch (e) {}
      });

      return Array.from(imports);
    });

    console.log(`      [LAZY-LOAD] Found ${dynamicImports.length} dynamic import() calls`);

    // Try to trigger lazy loading by interacting with navigation
    const navLinks = await this.page.$$('nav a, [role="navigation"] a, .menu a, .sidebar a');

    for (let i = 0; i < Math.min(navLinks.length, 10); i++) {
      try {
        await navLinks[i].click();
        await new Promise(r => setTimeout(r, 1000)); // Wait for chunk to load
        await this.page.goBack().catch(() => {});
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {}
    }

    // Remove listener
    this.page.off('response', responseHandler);

    this.discoveredContent.lazyModules = lazyChunks;

    console.log(`      [LAZY-LOAD] Detected ${lazyChunks.size} lazy-loaded chunks`);

    return {
      chunks: lazyChunks.size,
      modules: dynamicImports.length,
      chunkUrls: Array.from(lazyChunks)
    };
  }

  /**
   * Run all advanced discovery methods
   * @returns {Promise<Object>}
   */
  async discoverAll() {
    console.log(`      [ADVANCED] Running comprehensive discovery...`);

    const results = {
      infiniteScroll: await this.handleInfiniteScroll(),
      virtualScroll: await this.detectVirtualScroll(),
      iframes: await this.crawlIframes(),
      lazyLoading: await this.detectLazyLoading()
    };

    console.log(`      [ADVANCED] Discovery complete:`, {
      scrollItems: results.infiniteScroll.loaded,
      iframes: results.iframes.length,
      lazyChunks: results.lazyLoading.chunks
    });

    return results;
  }

  /**
   * Get discovered content summary
   * @returns {Object}
   */
  getDiscoveredContent() {
    return this.discoveredContent;
  }
}

module.exports = AdvancedDiscovery;
