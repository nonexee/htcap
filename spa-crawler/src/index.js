/**
 * SPA Crawler - Framework-agnostic crawler for Single Page Applications
 *
 * Discovers pages and requests by:
 * - Intercepting XHR, Fetch, and WebSocket requests
 * - Extracting links and forms from DOM
 * - Detecting DOM changes
 * - Simulating user interactions
 *
 * Works with any SPA framework: React, Vue, Angular, Svelte, etc.
 */

const BrowserManager = require('./browser');
const NetworkInterceptor = require('./interceptor');
const Deduplicator = require('./deduplicator');
const InteractionHandler = require('./interactions');
const { extractLinks, extractForms, extractClickables, getPageInfo } = require('./extractor');
const { normalizeUrl, isInScope, isExcluded, isValidUrl, sleep } = require('./utils');
const EventEmitter = require('events');

class SPACrawler extends EventEmitter {
  constructor(options = {}) {
    super();

    // Validate required options
    if (!options.startUrl) {
      throw new Error('startUrl is required');
    }

    // Configuration
    this.config = {
      startUrl: options.startUrl,
      maxDepth: options.maxDepth || 3,
      maxPages: options.maxPages || 100,
      timeout: options.timeout || 30000,
      waitForRequests: options.waitForRequests || 2000,
      scope: options.scope || 'domain', // 'domain', 'directory', 'url'
      excludePatterns: options.excludePatterns || [],
      headers: options.headers || {},
      cookies: options.cookies || [],
      userAgent: options.userAgent || null,
      headless: options.headless !== false,
      executablePath: options.executablePath || null,
      deduplication: options.deduplication !== false,
      deduplicationThreshold: options.deduplicationThreshold || 0.85,
      extractForms: options.extractForms !== false,
      extractClickables: options.extractClickables || false,
      interactWithPage: options.interactWithPage || false,
      maxClicksPerPage: options.maxClicksPerPage || 10,
      waitAfterClick: options.waitAfterClick || 1000,
      followRedirects: options.followRedirects !== false,
      maxConcurrent: options.maxConcurrent || 1,
      respectRobotsTxt: options.respectRobotsTxt || false,
      viewport: options.viewport || { width: 1920, height: 1080 },
      onRequest: options.onRequest || null,
      onPage: options.onPage || null,
      onError: options.onError || null
    };

    // State
    this.browser = null;
    this.deduplicator = null;
    this.queue = [];
    this.visited = new Set();
    this.results = {
      pages: [],
      requests: [],
      errors: [],
      startTime: null,
      endTime: null
    };
    this.stats = {
      pagesVisited: 0,
      pagesSkipped: 0,
      requestsFound: 0,
      errorsEncountered: 0
    };
    this.running = false;
  }

  /**
   * Start crawling
   * @returns {Promise<Object>} Crawl results
   */
  async start() {
    if (this.running) {
      throw new Error('Crawler is already running');
    }

    this.running = true;
    this.results.startTime = Date.now();

    try {
      // Initialize browser
      this.browser = new BrowserManager({
        headless: this.config.headless,
        timeout: this.config.timeout,
        userAgent: this.config.userAgent,
        viewport: this.config.viewport,
        executablePath: this.config.executablePath
      });

      await this.browser.launch();
      this.emit('browserLaunched');

      // Initialize deduplicator
      this.deduplicator = new Deduplicator({
        enabled: this.config.deduplication,
        threshold: this.config.deduplicationThreshold
      });

      // Add initial URL to queue
      this._addToQueue(this.config.startUrl, 0);

      // Process queue
      await this._processQueue();

      // Collect WebSocket connections from last page (if any)
      // This is done at the end to capture all WS connections

      this.results.endTime = Date.now();
      this.running = false;

      return this._getResults();

    } catch (error) {
      this.running = false;
      this.emit('error', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Stop crawling
   */
  async stop() {
    this.running = false;
    this.queue = [];
    this.emit('stopped');
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Process crawl queue
   * @private
   */
  async _processQueue() {
    while (this.queue.length > 0 && this.running) {
      const item = this.queue.shift();

      // Check limits
      if (this.stats.pagesVisited >= this.config.maxPages) {
        this.emit('maxPagesReached', this.config.maxPages);
        break;
      }

      // Skip if already visited
      const normalizedUrl = normalizeUrl(item.url);
      if (this.visited.has(normalizedUrl)) {
        this.stats.pagesSkipped++;
        continue;
      }

      // Mark as visited
      this.visited.add(normalizedUrl);

      try {
        await this._crawlPage(item.url, item.depth);
      } catch (error) {
        this._handleError(error, item.url);
      }
    }
  }

  /**
   * Crawl a single page
   * @private
   */
  async _crawlPage(url, depth) {
    this.emit('pageStart', { url, depth });

    const page = await this.browser.newPage({
      userAgent: this.config.userAgent,
      headers: this.config.headers,
      cookies: this.config.cookies,
      timeout: this.config.timeout
    });

    const interceptor = new NetworkInterceptor(page);
    await interceptor.start();

    try {
      // Navigate to page
      const response = await this.browser.navigateTo(page, url, {
        timeout: this.config.timeout,
        waitUntil: 'networkidle2'
      });

      // Wait for any pending AJAX requests
      await sleep(this.config.waitForRequests);

      // Get page information
      const pageInfo = await getPageInfo(page);
      const html = pageInfo.html;
      const bodyText = pageInfo.bodyText;

      // Check for duplicate content
      if (this.config.deduplication) {
        const dupCheck = this.deduplicator.checkDuplicate(bodyText, url);
        if (dupCheck.isDuplicate) {
          this.emit('duplicatePage', {
            url,
            similarTo: dupCheck.similarTo,
            similarity: dupCheck.similarity
          });
          this.stats.pagesSkipped++;
          await this.browser.closePage(page);
          return;
        }
      }

      // Extract links
      const links = await extractLinks(page, url);

      // Extract forms
      let forms = [];
      if (this.config.extractForms) {
        forms = await extractForms(page, url);
      }

      // Extract clickable elements
      let clickables = [];
      if (this.config.extractClickables) {
        clickables = await extractClickables(page);
      }

      // Interact with page to discover hidden content (modals, etc.)
      let interactionResults = null;
      if (this.config.interactWithPage) {
        const interactionHandler = new InteractionHandler(page, {
          maxClicksPerPage: this.config.maxClicksPerPage,
          waitAfterClick: this.config.waitAfterClick
        });

        interactionResults = await interactionHandler.interactWithPage();

        // Merge discovered forms and links
        if (interactionResults.discovered.forms.length > 0) {
          forms.push(...interactionResults.discovered.forms);
        }
        if (interactionResults.discovered.links.length > 0) {
          links.push(...interactionResults.discovered.links);
        }

        this.emit('interactionComplete', {
          url,
          clickCount: interactionResults.clickCount,
          formsFound: interactionResults.discovered.forms.length,
          linksFound: interactionResults.discovered.links.length
        });
      }

      // Get network requests
      await interceptor.collectWebSocketConnections();
      const networkData = interceptor.getAll();

      // Store page result
      const pageResult = {
        url,
        depth,
        title: pageInfo.title,
        statusCode: response ? response.status() : null,
        links: links,
        forms: forms,
        clickables: clickables,
        requests: networkData.requests,
        responses: networkData.responses,
        webSockets: networkData.webSockets,
        cookies: await this.browser.getCookies(page),
        timestamp: Date.now()
      };

      this.results.pages.push(pageResult);
      this.stats.pagesVisited++;
      this.stats.requestsFound += networkData.requests.length;

      this.emit('pageComplete', pageResult);

      // Call user callback
      if (this.config.onPage) {
        await this.config.onPage(pageResult);
      }

      // Add discovered URLs to queue
      if (depth < this.config.maxDepth) {
        this._addLinksToQueue(links, depth + 1);
        this._addFormsToQueue(forms, depth + 1);
      }

      // Close page
      await this.browser.closePage(page);

    } catch (error) {
      this._handleError(error, url);
      await this.browser.closePage(page);
    }
  }

  /**
   * Add URL to crawl queue
   * @private
   */
  _addToQueue(url, depth) {
    // Validate URL
    if (!isValidUrl(url)) {
      return false;
    }

    // Normalize URL
    const normalized = normalizeUrl(url);

    // Check if already visited or in queue
    if (this.visited.has(normalized)) {
      return false;
    }

    if (this.queue.some(item => normalizeUrl(item.url) === normalized)) {
      return false;
    }

    // Check scope
    if (!isInScope(url, this.config.startUrl, this.config.scope)) {
      this.emit('outOfScope', { url });
      return false;
    }

    // Check exclusion patterns
    if (isExcluded(url, this.config.excludePatterns)) {
      this.emit('excluded', { url });
      return false;
    }

    // Add to queue
    this.queue.push({ url, depth });
    this.emit('urlQueued', { url, depth });

    return true;
  }

  /**
   * Add links to queue
   * @private
   */
  _addLinksToQueue(links, depth) {
    links.forEach(link => {
      if (this._addToQueue(link.url, depth)) {
        this.results.requests.push({
          url: link.url,
          type: 'link',
          source: link.source,
          text: link.text,
          depth
        });
      }
    });
  }

  /**
   * Add forms to queue
   * @private
   */
  _addFormsToQueue(forms, depth) {
    forms.forEach(form => {
      if (form.method === 'GET' && this._addToQueue(form.url, depth)) {
        this.results.requests.push({
          url: form.url,
          type: 'form',
          method: form.method,
          fields: form.fields,
          depth
        });
      }
    });
  }

  /**
   * Handle errors
   * @private
   */
  _handleError(error, url) {
    const errorInfo = {
      url,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    };

    this.results.errors.push(errorInfo);
    this.stats.errorsEncountered++;
    this.emit('error', errorInfo);

    if (this.config.onError) {
      this.config.onError(errorInfo);
    }
  }

  /**
   * Get crawl results
   * @private
   */
  _getResults() {
    return {
      pages: this.results.pages,
      requests: this.results.requests,
      errors: this.results.errors,
      stats: {
        ...this.stats,
        duration: this.results.endTime - this.results.startTime,
        startTime: this.results.startTime,
        endTime: this.results.endTime
      }
    };
  }

  /**
   * Get current statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.queue.length,
      visitedSize: this.visited.size,
      running: this.running
    };
  }
}

module.exports = SPACrawler;
