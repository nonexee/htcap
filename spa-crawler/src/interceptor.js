/**
 * Network Interceptor - Captures AJAX, Fetch, and WebSocket requests
 * This is crucial for SPA crawling as most navigation happens via JavaScript
 */

class NetworkInterceptor {
  constructor(page) {
    this.page = page;
    this.requests = [];
    this.responses = [];
    this.wsConnections = [];
    this.listening = false;
  }

  /**
   * Start intercepting network requests
   */
  async start() {
    if (this.listening) return;
    this.listening = true;

    // Enable request interception
    await this.page.setRequestInterception(true);

    // Intercept all requests
    this.page.on('request', (request) => {
      const requestData = {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: Date.now(),
        type: this._getRequestType(request)
      };

      // Store XHR and Fetch requests
      if (requestData.type === 'xhr' || requestData.type === 'fetch') {
        this.requests.push(requestData);
      }

      // Continue the request
      request.continue().catch(() => {
        // Request may have been aborted
      });
    });

    // Intercept responses
    this.page.on('response', async (response) => {
      const request = response.request();
      const resourceType = request.resourceType();

      // Only track XHR and Fetch responses
      if (resourceType === 'xhr' || resourceType === 'fetch') {
        try {
          const responseData = {
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            headers: response.headers(),
            timestamp: Date.now(),
            requestMethod: request.method(),
            requestPostData: request.postData()
          };

          // Try to get response body (may fail for some responses)
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('json') || contentType.includes('text') || contentType.includes('javascript')) {
              responseData.body = await response.text();
            }
          } catch (e) {
            // Response body not available
          }

          this.responses.push(responseData);
        } catch (e) {
          // Response may have been aborted
        }
      }
    });

    // Inject WebSocket interception into the page
    await this._injectWebSocketInterceptor();
  }

  /**
   * Stop intercepting
   */
  async stop() {
    if (!this.listening) return;
    this.listening = false;
    await this.page.setRequestInterception(false);
  }

  /**
   * Get all captured requests
   * @returns {Array<Object>}
   */
  getRequests() {
    return [...this.requests];
  }

  /**
   * Get all captured responses
   * @returns {Array<Object>}
   */
  getResponses() {
    return [...this.responses];
  }

  /**
   * Get WebSocket connections
   * @returns {Array<Object>}
   */
  getWebSocketConnections() {
    return [...this.wsConnections];
  }

  /**
   * Get all network activity
   * @returns {Object}
   */
  getAll() {
    return {
      requests: this.getRequests(),
      responses: this.getResponses(),
      webSockets: this.getWebSocketConnections()
    };
  }

  /**
   * Clear captured data
   */
  clear() {
    this.requests = [];
    this.responses = [];
    this.wsConnections = [];
  }

  /**
   * Determine request type
   * @private
   */
  _getRequestType(request) {
    const resourceType = request.resourceType();

    if (resourceType === 'xhr') return 'xhr';
    if (resourceType === 'fetch') return 'fetch';
    if (resourceType === 'websocket') return 'websocket';
    if (resourceType === 'document') return 'document';
    if (resourceType === 'script') return 'script';

    return resourceType;
  }

  /**
   * Inject WebSocket interception code into the page
   * @private
   */
  async _injectWebSocketInterceptor() {
    await this.page.evaluateOnNewDocument(() => {
      // Store original WebSocket
      const OriginalWebSocket = window.WebSocket;

      // Track WebSocket connections
      window.__wsConnections = [];

      // Override WebSocket constructor
      window.WebSocket = function(url, protocols) {
        const ws = new OriginalWebSocket(url, protocols);

        // Track this connection
        window.__wsConnections.push({
          url: url,
          protocols: protocols,
          timestamp: Date.now(),
          readyState: ws.readyState
        });

        return ws;
      };

      // Copy static properties
      window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
      window.WebSocket.OPEN = OriginalWebSocket.OPEN;
      window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
      window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
    });
  }

  /**
   * Get WebSocket connections from page context
   * @returns {Promise<Array>}
   */
  async collectWebSocketConnections() {
    try {
      const connections = await this.page.evaluate(() => {
        return window.__wsConnections || [];
      });
      this.wsConnections.push(...connections);
    } catch (e) {
      // Page may not have the WebSocket interceptor
    }
  }

  /**
   * Get unique URLs from captured requests
   * @param {string} filter - Filter by type: 'xhr', 'fetch', 'all'
   * @returns {Array<string>}
   */
  getUniqueUrls(filter = 'all') {
    const urls = new Set();

    this.requests.forEach(req => {
      if (filter === 'all' || req.type === filter) {
        urls.add(req.url);
      }
    });

    return Array.from(urls);
  }

  /**
   * Get navigation requests (potential page transitions)
   * @returns {Array<Object>}
   */
  getNavigationRequests() {
    return this.requests.filter(req =>
      req.resourceType === 'document' ||
      (req.method === 'GET' && req.headers.accept?.includes('text/html'))
    );
  }

  /**
   * Get API requests (JSON endpoints)
   * @returns {Array<Object>}
   */
  getAPIRequests() {
    return this.requests.filter(req => {
      const accept = req.headers.accept || '';
      const contentType = req.headers['content-type'] || '';
      return accept.includes('application/json') ||
             contentType.includes('application/json') ||
             req.url.includes('/api/') ||
             req.url.includes('.json');
    });
  }
}

module.exports = NetworkInterceptor;
