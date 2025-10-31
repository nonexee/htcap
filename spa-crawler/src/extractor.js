/**
 * DOM Extractor - Extracts links and forms from page DOM
 * Works within Puppeteer page context
 */

const { resolveUrl, isValidUrl } = require('./utils');

/**
 * Extract all links from the page
 * @param {Page} page - Puppeteer page
 * @param {string} baseUrl - Base URL for resolving relative links
 * @returns {Promise<Array<Object>>}
 */
async function extractLinks(page, baseUrl) {
  return await page.evaluate((base) => {
    const links = [];
    const seen = new Set();

    // Helper to add link
    const addLink = (url, source, text = '') => {
      if (!url || seen.has(url)) return;
      seen.add(url);

      links.push({
        url,
        source,
        text: text.trim().substring(0, 100),
        type: 'link'
      });
    };

    // Extract from <a> tags
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
        try {
          const url = new URL(href, base);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            addLink(url.toString(), 'a', a.innerText);
          }
        } catch (e) {
          // Invalid URL
        }
      }
    });

    // Extract from <area> tags (image maps)
    document.querySelectorAll('area[href]').forEach(area => {
      const href = area.getAttribute('href');
      if (href) {
        try {
          const url = new URL(href, base);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            addLink(url.toString(), 'area', area.getAttribute('alt') || '');
          }
        } catch (e) {
          // Invalid URL
        }
      }
    });

    // Extract from <iframe> tags
    document.querySelectorAll('iframe[src]').forEach(iframe => {
      const src = iframe.getAttribute('src');
      if (src && !src.startsWith('javascript:') && !src.startsWith('about:')) {
        try {
          const url = new URL(src, base);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            addLink(url.toString(), 'iframe');
          }
        } catch (e) {
          // Invalid URL
        }
      }
    });

    // Extract from meta refresh
    document.querySelectorAll('meta[http-equiv="refresh"]').forEach(meta => {
      const content = meta.getAttribute('content');
      if (content) {
        const match = content.match(/url=(.+)$/i);
        if (match) {
          try {
            const url = new URL(match[1].trim(), base);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
              addLink(url.toString(), 'meta-refresh');
            }
          } catch (e) {
            // Invalid URL
          }
        }
      }
    });

    return links;
  }, baseUrl);
}

/**
 * Extract all forms from the page
 * @param {Page} page - Puppeteer page
 * @param {string} baseUrl - Base URL for resolving relative actions
 * @returns {Promise<Array<Object>>}
 */
async function extractForms(page, baseUrl) {
  return await page.evaluate((base) => {
    const forms = [];

    document.querySelectorAll('form').forEach((form, index) => {
      const action = form.getAttribute('action') || base;
      const method = (form.getAttribute('method') || 'GET').toUpperCase();

      try {
        const url = new URL(action, base);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return;
        }

        const fields = [];

        // Extract input fields
        form.querySelectorAll('input, select, textarea').forEach(field => {
          const name = field.getAttribute('name');
          const type = field.getAttribute('type') || 'text';

          // Skip buttons and submit inputs
          if (!name || type === 'submit' || type === 'button' || type === 'reset' || type === 'image') {
            return;
          }

          let value = '';

          // Get default value
          if (field.tagName === 'SELECT') {
            const selected = field.querySelector('option[selected]');
            value = selected ? selected.value : (field.options[0] ? field.options[0].value : '');
          } else if (type === 'checkbox' || type === 'radio') {
            value = field.checked ? (field.value || 'on') : '';
          } else {
            value = field.value || field.getAttribute('value') || '';
          }

          fields.push({
            name,
            type,
            value,
            required: field.hasAttribute('required')
          });
        });

        forms.push({
          url: url.toString(),
          method,
          fields,
          type: 'form',
          index
        });
      } catch (e) {
        // Invalid URL
      }
    });

    return forms;
  }, baseUrl);
}

/**
 * Extract all clickable elements (buttons, divs with onClick, etc.)
 * @param {Page} page - Puppeteer page
 * @returns {Promise<Array<Object>>}
 */
async function extractClickables(page) {
  return await page.evaluate(() => {
    const clickables = [];
    const selectors = [
      'button:not([type="submit"])',
      '[role="button"]',
      '[onclick]',
      '[ng-click]',
      '[v-on:click]',
      '[data-action]',
      '.btn:not([href])',
      '.button:not([href])'
    ];

    const elements = document.querySelectorAll(selectors.join(','));

    elements.forEach((el, index) => {
      // Skip if it's already an <a> tag (handled in links)
      if (el.tagName === 'A') return;

      const text = el.innerText?.trim().substring(0, 50) || '';
      const id = el.id || '';
      const classes = el.className || '';

      clickables.push({
        type: 'clickable',
        index,
        text,
        id,
        classes: typeof classes === 'string' ? classes : '',
        tagName: el.tagName.toLowerCase()
      });
    });

    return clickables;
  });
}

/**
 * Get page information
 * @param {Page} page - Puppeteer page
 * @returns {Promise<Object>}
 */
async function getPageInfo(page) {
  const url = page.url();
  const title = await page.title();

  const info = await page.evaluate(() => {
    return {
      bodyText: document.body?.innerText || '',
      html: document.documentElement?.outerHTML || '',
      scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src),
      styles: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href),
      metaTags: Array.from(document.querySelectorAll('meta')).map(m => ({
        name: m.getAttribute('name'),
        property: m.getAttribute('property'),
        content: m.getAttribute('content')
      }))
    };
  });

  return {
    url,
    title,
    ...info
  };
}

module.exports = {
  extractLinks,
  extractForms,
  extractClickables,
  getPageInfo
};
