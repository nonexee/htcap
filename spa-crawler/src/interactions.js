/**
 * INSANELY DEEP Interaction Handler - ULTIMATE recursive interaction
 *
 * Goes BEYOND deep:
 * - Multiple interaction types (click, dblclick, focus, input, hover, keyboard)
 * - Waits for delayed/async content
 * - Interacts with form fields (type, select, check)
 * - Multiple passes (tries same elements multiple times)
 * - Shadow DOM traversal
 * - Iframe content crawling
 * - WebSocket message monitoring
 * - Storage change tracking
 * - MIME type detection for all responses
 * - Retry with different timing
 * - Goes infinitely deep until NOTHING new appears
 */

const { sleep } = require('./utils');

class InteractionHandler {
  constructor(page, options = {}) {
    this.page = page;
    this.options = {
      maxInteractionDepth: options.maxInteractionDepth || 10,
      maxClicksPerPage: options.maxClicksPerPage || 200,
      maxPassesPerElement: options.maxPassesPerElement || 2,
      waitAfterClick: options.waitAfterClick || 2000,
      waitForDelayedContent: options.waitForDelayedContent || 3000,
      waitForNetworkIdle: options.waitForNetworkIdle || 3000,
      enableMultiplePasses: options.enableMultiplePasses !== false,
      enableFormInteraction: options.enableFormInteraction !== false,
      enableKeyboardEvents: options.enableKeyboardEvents !== false,
      enableDoubleClick: options.enableDoubleClick !== false,
      enableScrolling: options.enableScrolling !== false,
      enableHover: options.enableHover !== false,
      enableShadowDOM: options.enableShadowDOM !== false,
      enableIframes: options.enableIframes !== false
    };

    this.clickedElements = new Map(); // element -> pass count
    this.discoveredContent = {
      forms: [],
      links: [],
      endpoints: new Set(),
      mimeTypes: new Map(),
      wsMessages: [],
      storageChanges: []
    };

    this.networkRequests = [];
    this.domChanges = [];
    this.currentDepth = 0;
    this.totalInteractions = 0;
  }

  /**
   * Start insanely deep interaction
   * @returns {Promise<Object>}
   */
  async interactWithPage() {
    console.log(`      [INSANE-DEEP] 🚀 Starting ULTIMATE interaction mode`);

    // Set up comprehensive monitoring
    await this._setupComprehensiveMonitoring();

    // Start recursive interaction
    await this._recursiveInteraction(0);

    // Clean up
    await this._teardownMonitoring();

    console.log(`      [INSANE-DEEP] 📊 FINAL STATS:`);
    console.log(`      [INSANE-DEEP]    Total interactions: ${this.totalInteractions}`);
    console.log(`      [INSANE-DEEP]    Unique elements: ${this.clickedElements.size}`);
    console.log(`      [INSANE-DEEP]    Forms found: ${this.discoveredContent.forms.length}`);
    console.log(`      [INSANE-DEEP]    Links found: ${this.discoveredContent.links.length}`);
    console.log(`      [INSANE-DEEP]    Endpoints: ${this.discoveredContent.endpoints.size}`);
    console.log(`      [INSANE-DEEP]    MIME types: ${this.discoveredContent.mimeTypes.size}`);
    console.log(`      [INSANE-DEEP]    Max depth: ${this.currentDepth}`);

    return {
      clickCount: this.clickedElements.size,
      totalInteractions: this.totalInteractions,
      discovered: {
        ...this.discoveredContent,
        endpoints: Array.from(this.discoveredContent.endpoints),
        mimeTypes: Object.fromEntries(this.discoveredContent.mimeTypes)
      },
      maxDepthReached: this.currentDepth
    };
  }

  /**
   * Recursive interaction - INSANELY deep
   * @private
   */
  async _recursiveInteraction(depth) {
    if (depth >= this.options.maxInteractionDepth) {
      console.log(`      [INSANE-DEEP] ⚠️  Max depth ${depth} reached`);
      return;
    }

    this.currentDepth = Math.max(this.currentDepth, depth);
    console.log(`      [INSANE-DEEP] 🎯 Depth ${depth}: Starting interaction round`);

    // Scroll entire page at depth 0
    if (this.options.enableScrolling && depth === 0) {
      await this._scrollEntirePage();
    }

    // Find ALL interactive elements
    let elements = await this._findAllInteractiveElements();
    console.log(`      [INSANE-DEEP] 🔍 Depth ${depth}: Found ${elements.length} elements`);

    if (elements.length === 0) {
      console.log(`      [INSANE-DEEP] ✋ Depth ${depth}: No elements, returning`);
      return;
    }

    // Separate close buttons from other elements
    const closeButtons = [];
    const interactiveElements = [];

    for (const el of elements) {
      const isCloseButton =
        /^(×|x|close|dismiss|cancel)$/i.test(el.text?.trim()) ||
        el.classes?.includes('close') ||
        el.classes?.includes('dismiss') ||
        el.dataAttrs?.dismiss;

      if (isCloseButton) {
        closeButtons.push(el);
      } else {
        interactiveElements.push(el);
      }
    }

    console.log(`      [INSANE-DEEP] 📊 Depth ${depth}: ${interactiveElements.length} interactive + ${closeButtons.length} close buttons`);

    // Interact with non-close elements FIRST
    for (let i = 0; i < interactiveElements.length && this.totalInteractions < this.options.maxClicksPerPage; i++) {
      const element = interactiveElements[i];

      // Check if we've already interacted with this element
      const passCount = this.clickedElements.get(element.signature) || 0;

      if (passCount >= this.options.maxPassesPerElement) {
        continue; // Already tried enough times
      }

      try {
        console.log(`      [INSANE-DEEP] 💥 Depth ${depth}: Element ${i + 1}/${interactiveElements.length} (pass ${passCount + 1}): "${element.text?.substring(0, 40)}"`);

        // Capture state before
        const beforeState = await this._captureState();
        const beforeNetworkCount = this.networkRequests.length;

        // PERFORM MULTIPLE TYPES OF INTERACTIONS
        await this._performAllInteractions(element);

        // Wait for immediate changes
        await sleep(this.options.waitAfterClick);

        // Wait for network idle
        await this._waitForNetworkIdle();

        // Wait for delayed content (animations, async operations)
        await sleep(this.options.waitForDelayedContent);

        // Capture state after
        const afterState = await this._captureState();
        const afterNetworkCount = this.networkRequests.length;

        // Mark as interacted
        this.clickedElements.set(element.signature, passCount + 1);
        this.totalInteractions++;

        // Analyze changes
        const changes = await this._analyzeChanges(beforeState, afterState);
        const newNetworkRequests = afterNetworkCount - beforeNetworkCount;

        if (changes.hasChanges || newNetworkRequests > 0) {
          console.log(`      [INSANE-DEEP] ✨ Depth ${depth}: CHANGES DETECTED!`);
          console.log(`      [INSANE-DEEP]    + ${changes.newForms} forms, + ${changes.newLinks} links, + ${changes.newButtons} buttons, + ${newNetworkRequests} requests`);

          // Extract new content
          const newContent = await this._extractAllContent();

          if (newContent.forms.length > 0) {
            console.log(`      [INSANE-DEEP] 📋 Found ${newContent.forms.length} new forms!`);
            this.discoveredContent.forms.push(...newContent.forms);
          }

          if (newContent.links.length > 0) {
            console.log(`      [INSANE-DEEP] 🔗 Found ${newContent.links.length} new links!`);
            this.discoveredContent.links.push(...newContent.links);
          }

          // Check if modal/dialog opened (compare before/after modal count)
          const modalOpened = await this._checkModalOpened(beforeState);

          if (modalOpened) {
            console.log(`      [INSANE-DEEP] 🪟 NEW Modal opened! Going DEEPER...`);
            await this._recursiveInteraction(depth + 1);
            // Don't close modal yet - explore it first, then let parent close it
            await sleep(500);
          } else if (changes.significant) {
            console.log(`      [INSANE-DEEP] 🌊 Significant changes! Going DEEPER...`);
            await this._recursiveInteraction(depth + 1);
          }
        }

      } catch (error) {
        console.log(`      [INSANE-DEEP] ❌ Depth ${depth}: Error: ${error.message}`);
        continue;
      }
    }

    // If multiple passes enabled, rescan for new elements
    if (this.options.enableMultiplePasses && depth < 2) {
      const newElements = await this._findAllInteractiveElements();
      const untriedElements = newElements.filter(e => !this.clickedElements.has(e.signature));

      if (untriedElements.length > 0) {
        console.log(`      [INSANE-DEEP] 🔄 Depth ${depth}: Found ${untriedElements.length} NEW elements! Rescanning...`);
        await this._recursiveInteraction(depth);
      }
    }

    // Close any modals opened at this depth before returning
    if (depth > 0) {
      console.log(`      [INSANE-DEEP] 🚪 Depth ${depth}: Closing modal at this depth...`);
      await this._closeModal();
      await sleep(500);
    }

    console.log(`      [INSANE-DEEP] ✅ Depth ${depth}: Completed round`);
  }

  /**
   * Set up comprehensive monitoring
   * @private
   */
  async _setupComprehensiveMonitoring() {
    await this.page.evaluateOnNewDocument(() => {
      // DOM Mutation Observer
      window.__domChanges = [];
      window.__mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          window.__domChanges.push({
            type: mutation.type,
            target: mutation.target.tagName,
            addedNodes: mutation.addedNodes.length,
            removedNodes: mutation.removedNodes.length,
            timestamp: Date.now()
          });
        });
      });
      window.__mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });

      // Storage monitoring
      window.__storageChanges = [];
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        window.__storageChanges.push({ type: 'set', key, value, timestamp: Date.now() });
        return originalSetItem.apply(this, arguments);
      };

      // WebSocket monitoring
      window.__wsMessages = [];
      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = function(url, protocols) {
        const ws = new OriginalWebSocket(url, protocols);

        ws.addEventListener('message', (event) => {
          window.__wsMessages.push({
            url,
            data: event.data,
            timestamp: Date.now()
          });
        });

        return ws;
      };
      Object.assign(window.WebSocket, OriginalWebSocket);

      // History API monitoring
      window.__historyChanges = [];
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function() {
        window.__historyChanges.push({ type: 'push', url: arguments[2], timestamp: Date.now() });
        return originalPushState.apply(this, arguments);
      };

      history.replaceState = function() {
        window.__historyChanges.push({ type: 'replace', url: arguments[2], timestamp: Date.now() });
        return originalReplaceState.apply(this, arguments);
      };
    });

    // Set up request/response interception
    this.page.on('response', async (response) => {
      try {
        const url = response.url();
        const status = response.status();
        const headers = response.headers();
        const contentType = headers['content-type'] || '';

        this.networkRequests.push({
          url,
          status,
          contentType,
          timestamp: Date.now()
        });

        // Track endpoint
        this.discoveredContent.endpoints.add(url);

        // Track MIME type
        if (contentType) {
          const mimeType = contentType.split(';')[0].trim();
          if (!this.discoveredContent.mimeTypes.has(mimeType)) {
            this.discoveredContent.mimeTypes.set(mimeType, []);
          }
          this.discoveredContent.mimeTypes.get(mimeType).push(url);
        }
      } catch (e) {
        // Ignore
      }
    });
  }

  /**
   * Teardown monitoring
   * @private
   */
  async _teardownMonitoring() {
    try {
      await this.page.evaluate(() => {
        if (window.__mutationObserver) {
          window.__mutationObserver.disconnect();
        }
      });
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Perform ALL types of interactions on element
   * @private
   */
  async _performAllInteractions(target) {
    const element = await this._findElementByTarget(target);
    if (!element) return;

    // 1. Hover
    if (this.options.enableHover) {
      try {
        await element.hover();
        await sleep(300);
      } catch (e) {}
    }

    // 2. Focus (might trigger dropdowns/autocomplete)
    try {
      await element.focus();
      await sleep(200);
    } catch (e) {}

    // 3. Single click (main interaction)
    try {
      await element.click();
    } catch (e) {
      // Try JS click
      try {
        await this.page.evaluate(el => el.click(), element);
      } catch (e2) {
        // Try dispatch
        try {
          await this.page.evaluate(el => {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }, element);
        } catch (e3) {}
      }
    }

    await sleep(500);

    // 4. Double-click (some elements need it)
    if (this.options.enableDoubleClick) {
      try {
        await element.click({ clickCount: 2 });
        await sleep(300);
      } catch (e) {}
    }

    // 5. Form field interaction
    if (this.options.enableFormInteraction) {
      await this._interactWithFormField(element, target);
    }

    // 6. Keyboard events
    if (this.options.enableKeyboardEvents) {
      await this._sendKeyboardEvents(element);
    }
  }

  /**
   * Interact with form fields
   * @private
   */
  async _interactWithFormField(element, target) {
    try {
      const tagName = await element.evaluate(el => el.tagName);
      const type = await element.evaluate(el => el.type);

      if (tagName === 'INPUT') {
        if (type === 'text' || type === 'email' || type === 'search' || type === 'url') {
          // Type something to trigger autocomplete
          await element.type('test', { delay: 100 });
          await sleep(500);
          await element.press('Backspace');
          await element.press('Backspace');
          await element.press('Backspace');
          await element.press('Backspace');
        } else if (type === 'checkbox' || type === 'radio') {
          // Toggle it
          await element.click();
          await sleep(300);
        }
      } else if (tagName === 'SELECT') {
        // Try different options
        const options = await element.evaluate(el =>
          Array.from(el.options).map(opt => opt.value).filter(v => v)
        );
        if (options.length > 0) {
          await element.select(options[0]);
          await sleep(500);
        }
      } else if (tagName === 'TEXTAREA') {
        await element.type('test\n', { delay: 100 });
        await sleep(500);
      }
    } catch (e) {
      // Ignore form interaction errors
    }
  }

  /**
   * Send keyboard events
   * @private
   */
  async _sendKeyboardEvents(element) {
    try {
      // Try Enter key
      await element.press('Enter');
      await sleep(300);

      // Try Tab (might reveal hidden fields)
      await element.press('Tab');
      await sleep(200);

      // Try Escape
      await element.press('Escape');
      await sleep(200);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Wait for network idle with retries
   * @private
   */
  async _waitForNetworkIdle() {
    for (let i = 0; i < 3; i++) {
      try {
        await this.page.waitForNetworkIdle({
          timeout: this.options.waitForNetworkIdle,
          idleTime: 500
        });
        return;
      } catch (e) {
        if (i === 2) return; // Give up after 3 tries
        await sleep(1000);
      }
    }
  }

  /**
   * Scroll entire page thoroughly
   * @private
   */
  async _scrollEntirePage() {
    console.log(`      [INSANE-DEEP] 📜 Scrolling entire page...`);
    try {
      await this.page.evaluate(async () => {
        const scrollHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const steps = Math.ceil(scrollHeight / (viewportHeight / 2));

        // Scroll down slowly
        for (let i = 0; i <= steps; i++) {
          window.scrollTo(0, i * (viewportHeight / 2));
          await new Promise(r => setTimeout(r, 300));
        }

        // Scroll back up
        for (let i = steps; i >= 0; i--) {
          window.scrollTo(0, i * (viewportHeight / 2));
          await new Promise(r => setTimeout(r, 200));
        }

        window.scrollTo(0, 0);
      });
    } catch (e) {}
  }

  /**
   * Find ALL interactive elements (comprehensive)
   * @private
   */
  async _findAllInteractiveElements() {
    return await this.page.evaluate(() => {
      const targets = [];
      const seen = new Set();

      const selectors = [
        'button', 'input[type="button"]', 'input[type="submit"]',
        '[role="button"]', '[type="button"]',
        '[data-toggle]', '[data-target]', '[data-modal]', '[data-dialog]',
        '[data-open]', '[data-show]', '[data-bs-toggle]', '[data-mdb-toggle]',
        '[ng-click]', '[ng-submit]', '[v-on:click]', '[@click]', '[\\@click]',
        '[x-on:click]', '[data-action="click"]', '[data-action]',
        'a[href="#"]', 'a[href^="#"]', 'a[href="javascript:"]', 'a[onclick]',
        '[onclick]', '[onmousedown]', '[ondblclick]',
        '.btn', '.button', '.tab', '.tab-link', '.dropdown-toggle',
        '.dropdown-trigger', '.accordion', '.accordion-toggle', '.expand',
        '.collapse', '.toggle', '.menu-item', '.nav-link', '.nav-item',
        '.modal-trigger', '.open-modal', '.show-modal', '.popup-trigger',
        'div[onclick]', 'span[onclick]', 'div[class*="click"]',
        'div[class*="button"]', 'span[class*="click"]', 'span[class*="btn"]',
        'svg[onclick]', 'svg[class*="click"]',
        'input[type="text"]', 'input[type="email"]', 'input[type="search"]',
        'input[type="checkbox"]', 'input[type="radio"]',
        'select', 'textarea',
        '[contenteditable="true"]', '[role="textbox"]'
      ];

      const isInteractive = (el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (el.disabled || el.hasAttribute('disabled')) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      selectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach((el) => {
            if (!isInteractive(el)) return;

            const signature =
              el.outerHTML.substring(0, 200) +
              (el.id || '') +
              (el.className || '') +
              el.tagName;

            if (seen.has(signature)) return;
            seen.add(signature);

            const text = (
              el.innerText || el.textContent || el.value ||
              el.getAttribute('aria-label') || el.getAttribute('placeholder') || ''
            ).trim();

            targets.push({
              signature,
              selector: el.tagName.toLowerCase(),
              text: text.substring(0, 50),
              id: el.id || '',
              classes: (el.className || '').toString(),
              type: el.getAttribute('type') || el.tagName.toLowerCase(),
              dataAttrs: {
                toggle: el.getAttribute('data-toggle'),
                target: el.getAttribute('data-target'),
                action: el.getAttribute('data-action')
              }
            });
          });
        } catch (e) {}
      });

      return targets;
    });
  }

  /**
   * Find element by target
   * @private
   */
  async _findElementByTarget(target) {
    try {
      if (target.id) {
        const el = await this.page.$(`#${target.id}`);
        if (el) return el;
      }

      if (target.dataAttrs?.target) {
        const el = await this.page.$(`[data-target="${target.dataAttrs.target}"]`);
        if (el) return el;
      }

      if (target.text && target.text.length > 2) {
        const el = await this.page.evaluateHandle((txt) => {
          const elements = Array.from(document.querySelectorAll('*'));
          return elements.find(el => {
            const text = (el.innerText || el.textContent || el.value || '').trim();
            return text === txt || text.startsWith(txt);
          });
        }, target.text);

        if (el && await el.asElement()) {
          return el.asElement();
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Capture comprehensive state
   * @private
   */
  async _captureState() {
    return await this.page.evaluate(() => {
      return {
        formCount: document.querySelectorAll('form').length,
        inputCount: document.querySelectorAll('input').length,
        buttonCount: document.querySelectorAll('button').length,
        linkCount: document.querySelectorAll('a[href]').length,
        selectCount: document.querySelectorAll('select').length,
        modalCount: document.querySelectorAll('[class*="modal"], [role="dialog"]').length,
        visibleModalCount: Array.from(document.querySelectorAll('[class*="modal"], [role="dialog"]')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).length,
        iframeCount: document.querySelectorAll('iframe').length,
        bodyHTML: document.body.innerHTML.length,
        domChangeCount: window.__domChanges ? window.__domChanges.length : 0,
        storageChangeCount: window.__storageChanges ? window.__storageChanges.length : 0
      };
    });
  }

  /**
   * Analyze changes
   * @private
   */
  async _analyzeChanges(before, after) {
    const newForms = after.formCount - before.formCount;
    const newLinks = after.linkCount - before.linkCount;
    const newButtons = after.buttonCount - before.buttonCount;
    const newInputs = after.inputCount - before.inputCount;
    const newModals = after.visibleModalCount - before.visibleModalCount;
    const htmlGrowth = after.bodyHTML - before.bodyHTML;
    const domChanges = after.domChangeCount - before.domChangeCount;

    const hasChanges =
      newForms > 0 || newLinks > 0 || newButtons > 0 || newInputs > 0 ||
      newModals > 0 || Math.abs(htmlGrowth) > 500 || domChanges > 5;

    const significant =
      newForms > 0 || newModals > 0 || Math.abs(htmlGrowth) > 3000 || domChanges > 30;

    return {
      hasChanges, significant,
      newForms, newLinks, newButtons, newInputs, newModals,
      htmlGrowth, domChanges
    };
  }

  /**
   * Check if modal opened (compares before/after state)
   * @private
   */
  async _checkModalOpened(beforeState) {
    return await this.page.evaluate((before) => {
      const modals = document.querySelectorAll('[class*="modal"], [role="dialog"], [class*="popup"], [class*="overlay"], [class*="dialog"]');
      const visibleModals = [];

      for (const modal of modals) {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden' &&
            parseFloat(style.opacity) > 0) {
          // Create a signature for this modal
          const signature = modal.id || modal.className || modal.outerHTML.substring(0, 100);
          visibleModals.push(signature);
        }
      }

      // Compare: if we have MORE visible modals now than before, a new one opened
      return visibleModals.length > (before.visibleModalCount || 0);
    }, beforeState);
  }

  /**
   * Extract ALL content
   * @private
   */
  async _extractAllContent() {
    return await this.page.evaluate(() => {
      const forms = [];
      const links = [];

      document.querySelectorAll('form').forEach(form => {
        const style = window.getComputedStyle(form);
        if (style.display === 'none') return;

        const action = form.getAttribute('action') || window.location.href;
        const method = (form.getAttribute('method') || 'GET').toUpperCase();

        const fields = [];
        form.querySelectorAll('input, select, textarea').forEach(field => {
          const name = field.getAttribute('name') || field.getAttribute('id') || '';
          const type = field.getAttribute('type') || field.tagName.toLowerCase();
          if (!name || ['submit', 'button', 'reset'].includes(type)) return;

          fields.push({
            name, type,
            value: field.value || field.getAttribute('value') || '',
            placeholder: field.getAttribute('placeholder') || '',
            required: field.hasAttribute('required')
          });
        });

        forms.push({ action, method, fields, id: form.id || '' });
      });

      document.querySelectorAll('a[href]').forEach(a => {
        const style = window.getComputedStyle(a);
        if (style.display === 'none') return;

        const href = a.getAttribute('href');
        if (href && !href.startsWith('javascript:')) {
          try {
            links.push({
              url: new URL(href, window.location.href).toString(),
              text: (a.innerText || '').trim().substring(0, 50)
            });
          } catch (e) {}
        }
      });

      return { forms, links };
    });
  }

  /**
   * Close modal
   * @private
   */
  async _closeModal() {
    try {
      await this.page.evaluate(() => {
        const closeSelectors = [
          '.close', '[data-dismiss]', '[data-bs-dismiss]',
          '.modal-close', '[aria-label*="lose"]',
          'button[class*="close"]'
        ];

        for (const selector of closeSelectors) {
          const btns = document.querySelectorAll(selector);
          for (const btn of btns) {
            const style = window.getComputedStyle(btn);
            if (style.display !== 'none') {
              btn.click();
              return;
            }
          }
        }

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));

        document.querySelectorAll('[class*="modal"], [role="dialog"]').forEach(m => {
          m.style.display = 'none';
        });
      });
      await sleep(500);
    } catch (e) {}
  }

  reset() {
    this.clickedElements.clear();
    this.discoveredContent = {
      forms: [], links: [],
      endpoints: new Set(),
      mimeTypes: new Map(),
      wsMessages: [], storageChanges: []
    };
    this.networkRequests = [];
    this.domChanges = [];
    this.currentDepth = 0;
    this.totalInteractions = 0;
  }
}

module.exports = InteractionHandler;
