# SPA Crawler

A framework-agnostic, Node.js-based crawler specifically designed for Single Page Applications (SPAs). Discovers pages, links, and API requests by intercepting network activity and analyzing DOM changes.

## Features

- **Framework Agnostic** - Works with any SPA framework (React, Vue, Angular, Svelte, etc.)
- **Network Interception** - Captures XHR, Fetch, and WebSocket requests
- **Smart Deduplication** - Prevents infinite loops using content-based similarity detection
- **Scope Control** - Configurable crawling scope (domain, directory, or single URL)
- **Form Extraction** - Discovers and extracts form data
- **Event-Driven** - Real-time progress monitoring via events
- **Headless or Headed** - Run with or without visible browser
- **Customizable** - Extensive configuration options for headers, cookies, timeouts, etc.

## Installation

```bash
npm install
```

**Note:** Puppeteer will automatically download a compatible version of Chromium (~170MB) during installation. If you're behind a firewall or want to use a different Chrome/Chromium binary, you can:

1. Skip the download: `PUPPETEER_SKIP_DOWNLOAD=true npm install`
2. Use a custom browser by setting `executablePath` in the crawler options (see Browser Options below)

## Quick Start

```javascript
const SPACrawler = require('./src/index');

const crawler = new SPACrawler({
  startUrl: 'https://example.com',
  maxDepth: 2,
  maxPages: 10
});

crawler.on('pageComplete', (page) => {
  console.log(`Crawled: ${page.url}`);
  console.log(`Found ${page.links.length} links and ${page.requests.length} requests`);
});

const results = await crawler.start();
console.log(`Visited ${results.stats.pagesVisited} pages`);
```

## Configuration Options

### Basic Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startUrl` | string | *required* | Starting URL for the crawl |
| `maxDepth` | number | 3 | Maximum crawl depth |
| `maxPages` | number | 100 | Maximum number of pages to crawl |
| `timeout` | number | 30000 | Page load timeout in milliseconds |
| `waitForRequests` | number | 2000 | Time to wait for AJAX requests after page load |

### Scope Control

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scope` | string | 'domain' | Crawl scope: 'domain', 'directory', or 'url' |
| `excludePatterns` | array | [] | Array of strings or RegExp to exclude URLs |

**Scope examples:**
- `domain`: Crawls all pages on same domain (e.g., `example.com` and `subdomain.example.com`)
- `directory`: Crawls only pages within same directory path (e.g., `/app/*`)
- `url`: Crawls only the exact URL with different query parameters

### Authentication & Headers

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headers` | object | {} | Custom HTTP headers |
| `cookies` | array | [] | Array of cookie objects |
| `userAgent` | string | null | Custom user agent string |

**Cookie format:**
```javascript
{
  name: 'session_id',
  value: 'abc123',
  domain: 'example.com',
  path: '/'
}
```

### Browser Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headless` | boolean | true | Run browser in headless mode |
| `executablePath` | string | null | Path to custom Chrome/Chromium binary (optional) |
| `viewport` | object | {width: 1920, height: 1080} | Browser viewport size |

### Deduplication

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `deduplication` | boolean | true | Enable content-based deduplication |
| `deduplicationThreshold` | number | 0.85 | Similarity threshold (0-1) |

### Feature Flags

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `extractForms` | boolean | true | Extract form data from pages |
| `extractClickables` | boolean | false | Extract clickable elements (buttons, etc.) |
| `followRedirects` | boolean | true | Follow HTTP redirects |

### Callbacks

| Option | Type | Description |
|--------|------|-------------|
| `onPage` | function | Called when a page is completed: `(page) => {}` |
| `onRequest` | function | Called for each request: `(request) => {}` |
| `onError` | function | Called on errors: `(error) => {}` |

## Events

The crawler extends EventEmitter and emits the following events:

### Lifecycle Events

```javascript
crawler.on('browserLaunched', () => {
  // Browser has been launched
});

crawler.on('stopped', () => {
  // Crawler has been stopped
});
```

### Page Events

```javascript
crawler.on('pageStart', ({ url, depth }) => {
  // Starting to crawl a page
});

crawler.on('pageComplete', (pageResult) => {
  // Page crawl completed
  // pageResult contains: url, title, links, forms, requests, etc.
});

crawler.on('duplicatePage', ({ url, similarTo, similarity }) => {
  // Page detected as duplicate
});
```

### Discovery Events

```javascript
crawler.on('urlQueued', ({ url, depth }) => {
  // New URL added to crawl queue
});

crawler.on('outOfScope', ({ url }) => {
  // URL is outside crawl scope
});

crawler.on('excluded', ({ url }) => {
  // URL matched exclusion pattern
});
```

### Limit Events

```javascript
crawler.on('maxPagesReached', (maxPages) => {
  // Maximum page limit reached
});
```

### Error Events

```javascript
crawler.on('error', (error) => {
  // Error occurred
  // error contains: url, message, stack, timestamp
});
```

## Results Object

The `start()` method returns a results object:

```javascript
{
  pages: [
    {
      url: 'https://example.com',
      depth: 0,
      title: 'Example Site',
      statusCode: 200,
      links: [...],           // Extracted links
      forms: [...],           // Extracted forms
      clickables: [...],      // Clickable elements (if enabled)
      requests: [...],        // Network requests (XHR, Fetch)
      responses: [...],       // Network responses
      webSockets: [...],      // WebSocket connections
      cookies: [...],         // Page cookies
      timestamp: 1234567890
    }
  ],
  requests: [
    {
      url: 'https://example.com/page',
      type: 'link',
      source: 'a',
      text: 'Link Text',
      depth: 1
    }
  ],
  errors: [
    {
      url: 'https://example.com/error',
      message: 'Timeout',
      stack: '...',
      timestamp: 1234567890
    }
  ],
  stats: {
    pagesVisited: 10,
    pagesSkipped: 2,
    requestsFound: 45,
    errorsEncountered: 1,
    duration: 15000,
    startTime: 1234567890,
    endTime: 1234567905
  }
}
```

## Use Cases

### 1. Discover all pages in a SPA

```javascript
const crawler = new SPACrawler({
  startUrl: 'https://myapp.com',
  maxDepth: 5,
  scope: 'domain'
});

const results = await crawler.start();
const allPages = results.pages.map(p => p.url);
console.log('All pages:', allPages);
```

### 2. Find all API endpoints

```javascript
const crawler = new SPACrawler({
  startUrl: 'https://myapp.com',
  maxDepth: 3
});

const results = await crawler.start();
const apiEndpoints = new Set();

results.pages.forEach(page => {
  page.requests.forEach(req => {
    if (req.url.includes('/api/') || req.type === 'xhr' || req.type === 'fetch') {
      apiEndpoints.add(`${req.method} ${req.url}`);
    }
  });
});

console.log('API Endpoints:', Array.from(apiEndpoints));
```

### 3. Crawl authenticated area

```javascript
const crawler = new SPACrawler({
  startUrl: 'https://myapp.com/dashboard',
  cookies: [
    {
      name: 'auth_token',
      value: 'your-token-here',
      domain: 'myapp.com',
      path: '/'
    }
  ],
  excludePatterns: [/logout/, /signout/]
});

const results = await crawler.start();
```

### 4. Monitor crawl progress

```javascript
const crawler = new SPACrawler({
  startUrl: 'https://myapp.com',
  maxPages: 100
});

let crawled = 0;

crawler.on('pageComplete', (page) => {
  crawled++;
  const stats = crawler.getStats();
  console.log(`Progress: ${crawled}/${stats.visitedSize + stats.queueSize}`);
});

await crawler.start();
```

### 5. Extract all forms

```javascript
const crawler = new SPACrawler({
  startUrl: 'https://myapp.com',
  extractForms: true
});

const results = await crawler.start();
const allForms = results.pages.flatMap(page => page.forms);

allForms.forEach(form => {
  console.log(`Form: ${form.method} ${form.url}`);
  form.fields.forEach(field => {
    console.log(`  - ${field.name} (${field.type})`);
  });
});
```

## How It Works

### 1. Network Interception

The crawler uses Puppeteer's request interception to capture all network activity:

- **XHR requests** - Traditional AJAX calls
- **Fetch API** - Modern asynchronous requests
- **WebSocket** - Real-time connections
- **Form submissions** - Both GET and POST forms

This allows discovering routes that aren't linked in the DOM but are triggered by JavaScript.

### 2. DOM Analysis

On each page, the crawler:

- Extracts all `<a>` tags and resolves relative URLs
- Finds forms with action URLs
- Optionally identifies clickable elements (buttons, divs with onClick, etc.)
- Detects meta refresh redirects and iframe sources

### 3. Deduplication

SPAs often render the same content at different URLs (e.g., `/users/1` and `/users/2` might have identical structure). The deduplicator:

- Creates content fingerprints using n-grams (shingles)
- Compares pages using Jaccard similarity
- Skips pages above similarity threshold (default 85%)
- Prevents infinite loops in SPAs with dynamic routing

### 4. Scope Management

The crawler respects scope boundaries:

- **Domain scope**: Stays on same domain and subdomains
- **Directory scope**: Only crawls URLs under same path
- **URL scope**: Only crawls the exact URL with different parameters

### 5. Queue Processing

URLs are processed breadth-first:

1. Start with initial URL at depth 0
2. Extract all links/requests from page
3. Add in-scope URLs to queue at depth + 1
4. Continue until maxDepth or maxPages reached

## Architecture

```
spa-crawler/
├── src/
│   ├── index.js          # Main crawler class
│   ├── browser.js        # Puppeteer browser management
│   ├── interceptor.js    # Network request interception
│   ├── deduplicator.js   # Content-based deduplication
│   ├── extractor.js      # DOM extraction (links, forms)
│   └── utils.js          # Utility functions
├── examples/
│   ├── basic.js          # Simple usage example
│   └── advanced.js       # Advanced configuration example
├── package.json
└── README.md
```

## Requirements

- Node.js >= 14.0.0
- Puppeteer (automatically installs Chromium)

## Differences from htcap

This SPA crawler is a simplified, pure Node.js version of htcap focused solely on crawling:

**Removed:**
- Python dependencies
- Security scanning and fuzzing
- Vulnerability detection
- SQL injection, XSS, and other security tests
- SQLite database storage
- External scanner integration (SQLMap, Arachni, Wapiti)

**Kept & Enhanced:**
- SPA crawling via headless Chrome
- Network request interception (XHR, Fetch, WebSocket)
- DOM extraction (links, forms)
- Deduplication
- Scope control
- Multi-threaded architecture (via async/await)

**New Features:**
- Event-driven architecture
- Real-time progress monitoring
- Simplified API
- JSON output
- Better configurability

## License

MIT

## Contributing

Contributions welcome! This is designed to be a lightweight, focused tool for SPA discovery.
