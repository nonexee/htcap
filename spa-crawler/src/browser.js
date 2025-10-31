/**
 * Browser Manager - Handles Puppeteer browser lifecycle
 */

const puppeteer = require('puppeteer');

class BrowserManager {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false, // Default: true
      args: options.args || [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ],
      defaultViewport: options.viewport || {
        width: 1920,
        height: 1080
      },
      timeout: options.timeout || 30000,
      userAgent: options.userAgent || null,
      ...options.puppeteerOptions
    };

    this.browser = null;
    this.pages = new Map();
  }

  /**
   * Launch browser
   * @returns {Promise<Browser>}
   */
  async launch() {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch(this.options);
    return this.browser;
  }

  /**
   * Create new page with configuration
   * @param {Object} config - Page configuration
   * @returns {Promise<Page>}
   */
  async newPage(config = {}) {
    if (!this.browser) {
      await this.launch();
    }

    const page = await this.browser.newPage();
    const pageId = this._generatePageId();
    this.pages.set(pageId, page);

    // Set user agent if specified
    if (config.userAgent || this.options.userAgent) {
      await page.setUserAgent(config.userAgent || this.options.userAgent);
    }

    // Set extra HTTP headers
    if (config.headers) {
      await page.setExtraHTTPHeaders(config.headers);
    }

    // Set cookies
    if (config.cookies && config.cookies.length > 0) {
      await page.setCookie(...config.cookies);
    }

    // Set viewport
    if (config.viewport) {
      await page.setViewport(config.viewport);
    }

    // Set default timeout
    page.setDefaultTimeout(config.timeout || this.options.timeout);

    // Set default navigation timeout
    page.setDefaultNavigationTimeout(config.timeout || this.options.timeout);

    // Handle dialogs (alerts, confirms, prompts)
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    // Handle console messages (optional logging)
    if (config.logConsole) {
      page.on('console', msg => {
        console.log('PAGE LOG:', msg.text());
      });
    }

    // Handle page errors
    page.on('pageerror', error => {
      if (config.logErrors) {
        console.error('PAGE ERROR:', error.message);
      }
    });

    return page;
  }

  /**
   * Navigate to URL with retry logic
   * @param {Page} page
   * @param {string} url
   * @param {Object} options
   * @returns {Promise<Response>}
   */
  async navigateTo(page, url, options = {}) {
    const maxRetries = options.retries || 2;
    const waitUntil = options.waitUntil || 'networkidle2';

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await page.goto(url, {
          waitUntil,
          timeout: options.timeout || this.options.timeout
        });

        return response;
      } catch (error) {
        if (i === maxRetries) {
          throw error;
        }

        // Wait before retry
        await this._sleep(1000 * (i + 1));
      }
    }
  }

  /**
   * Wait for network to be idle
   * @param {Page} page
   * @param {number} timeout
   * @returns {Promise}
   */
  async waitForNetworkIdle(page, timeout = 5000) {
    try {
      await page.waitForNetworkIdle({
        timeout,
        idleTime: 500
      });
    } catch (e) {
      // Timeout is acceptable
    }
  }

  /**
   * Execute JavaScript in page context
   * @param {Page} page
   * @param {Function|string} fn
   * @param {Array} args
   * @returns {Promise<any>}
   */
  async evaluate(page, fn, ...args) {
    return await page.evaluate(fn, ...args);
  }

  /**
   * Take screenshot
   * @param {Page} page
   * @param {Object} options
   * @returns {Promise<Buffer>}
   */
  async screenshot(page, options = {}) {
    return await page.screenshot({
      fullPage: options.fullPage || false,
      path: options.path,
      ...options
    });
  }

  /**
   * Get page HTML
   * @param {Page} page
   * @returns {Promise<string>}
   */
  async getHTML(page) {
    return await page.content();
  }

  /**
   * Get page cookies
   * @param {Page} page
   * @returns {Promise<Array>}
   */
  async getCookies(page) {
    return await page.cookies();
  }

  /**
   * Set page cookies
   * @param {Page} page
   * @param {Array} cookies
   * @returns {Promise}
   */
  async setCookies(page, cookies) {
    if (cookies && cookies.length > 0) {
      await page.setCookie(...cookies);
    }
  }

  /**
   * Close specific page
   * @param {Page} page
   */
  async closePage(page) {
    if (!page.isClosed()) {
      await page.close();
    }

    // Remove from tracking
    for (const [id, p] of this.pages.entries()) {
      if (p === page) {
        this.pages.delete(id);
        break;
      }
    }
  }

  /**
   * Close all pages
   */
  async closeAllPages() {
    const pages = Array.from(this.pages.values());
    await Promise.all(pages.map(page => this.closePage(page)));
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.pages.clear();
    }
  }

  /**
   * Check if browser is running
   * @returns {boolean}
   */
  isRunning() {
    return this.browser !== null && this.browser.isConnected();
  }

  /**
   * Get browser instance
   * @returns {Browser|null}
   */
  getBrowser() {
    return this.browser;
  }

  /**
   * Generate unique page ID
   * @private
   */
  _generatePageId() {
    return `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep helper
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BrowserManager;
