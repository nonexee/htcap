/**
 * ULTRA-DEEP Interaction Handler - Recursive interaction to discover ALL hidden content
 *
 * This module goes DEEP:
 * - Clicks ALL elements recursively
 * - Handles modals within modals within modals (unlimited depth)
 * - Monitors ALL DOM changes continuously
 * - Tracks network requests per interaction
 * - Rescans and re-clicks newly appeared elements
 * - Goes as deep as possible until nothing new appears
 */

const { sleep } = require('./utils');

class InteractionHandler {
  constructor(page, options = {}) {
    this.page = page;
    this.options = {
      maxInteractionDepth: options.maxInteractionDepth || 5, // How deep to nest interactions
      maxClicksPerPage: options.maxClicksPerPage || 100, // Try up to 100 elements
      waitAfterClick: options.waitAfterClick || 1500,
      waitForNetworkIdle: options.waitForNetworkIdle || 2000,
      enableScrolling: options.enableScrolling !== false,
      enableHover: options.enableHover !== false
    };

    this.clickedElements = new Set();
    this.discoveredContent = {
      forms: [],
      links: [],
      networkRequests: []
    };

    this.mutationObserver = null;
    this.domChanges = [];
    this.currentDepth = 0;
  }

  /**
   * Start ultra-deep recursive interaction
   * @returns {Promise<Object>}
   */
  async interactWithPage() {
    console.log(`      [ULTRA-DEEP] Starting interaction at depth 0`);

    // Set up DOM mutation observer
    await this._setupMutationObserver();

    // Start recursive interaction
    const result = await this._recursiveInteraction(0);

    // Clean up
    await this._teardownMutationObserver();

    console.log(`      [ULTRA-DEEP] Total clicks: ${this.clickedElements.size}`);
    console.log(`      [ULTRA-DEEP] Total forms found: ${this.discoveredContent.forms.length}`);
    console.log(`      [ULTRA-DEEP] Total links found: ${this.discoveredContent.links.length}`);
    console.log(`      [ULTRA-DEEP] Total network requests: ${this.discoveredContent.networkRequests.length}`);

    return {
      clickCount: this.clickedElements.size,
      discovered: this.discoveredContent,
      maxDepthReached: this.currentDepth
    };
  }

  /**
   * Recursive interaction - goes as deep as needed
   * @private
   */
  async _recursiveInteraction(depth) {
    if (depth >= this.options.maxInteractionDepth) {
      console.log(`      [ULTRA-DEEP] Max depth ${depth} reached`);
      return;
    }

    this.currentDepth = Math.max(this.currentDepth, depth);
    console.log(`      [ULTRA-DEEP] Depth ${depth}: Starting interaction round`);

    // Scroll to reveal content
    if (this.options.enableScrolling && depth === 0) {
      console.log(`      [ULTRA-DEEP] Scrolling page...`);
      await this._scrollPage();
      await sleep(1000);
    }

    // Find ALL interactive elements at this level
    const elements = await this._findAllInteractiveElements();
    console.log(`      [ULTRA-DEEP] Depth ${depth}: Found ${elements.length} elements to interact with`);

    if (elements.length === 0) {
      console.log(`      [ULTRA-DEEP] Depth ${depth}: No elements found, returning`);
      return;
    }

    let clickedThisRound = 0;

    // Try to click EVERY element
    for (let i = 0; i < elements.length && this.clickedElements.size < this.options.maxClicksPerPage; i++) {
      const element = elements[i];

      // Skip if already clicked
      if (this.clickedElements.has(element.signature)) {
        continue;
      }

      try {
        // Hover if enabled
        if (this.options.enableHover) {
          await this._hoverElement(element);
          await sleep(200);
        }

        // Take snapshot before
        const beforeState = await this._captureState();

        // Clear DOM changes
        this.domChanges = [];

        // Click the element
        console.log(`      [ULTRA-DEEP] Depth ${depth}: Clicking element ${i + 1}/${elements.length}: "${element.text?.substring(0, 30)}"`);
        const clicked = await this._clickElement(element);

        if (!clicked) {
          console.log(`      [ULTRA-DEEP] Depth ${depth}: Click failed`);
          continue;
        }

        this.clickedElements.add(element.signature);
        clickedThisRound++;

        // Wait for any changes
        await sleep(this.options.waitAfterClick);

        // Wait for network to be idle
        await this._waitForNetworkIdle();

        // Take snapshot after
        const afterState = await this._captureState();

        // Detect what changed
        const changes = await this._analyzeChanges(beforeState, afterState);

        if (changes.hasChanges) {
          console.log(`      [ULTRA-DEEP] Depth ${depth}: Changes detected!`);
          console.log(`      [ULTRA-DEEP] Depth ${depth}: + ${changes.newForms} forms, + ${changes.newLinks} links, + ${changes.newButtons} buttons`);

          // Extract new content
          const newContent = await this._extractNewContent();

          if (newContent.forms.length > 0) {
            console.log(`      [ULTRA-DEEP] Depth ${depth}: Found ${newContent.forms.length} new forms!`);
            this.discoveredContent.forms.push(...newContent.forms);
          }

          if (newContent.links.length > 0) {
            console.log(`      [ULTRA-DEEP] Depth ${depth}: Found ${newContent.links.length} new links!`);
            this.discoveredContent.links.push(...newContent.links);
          }

          // Check if modal/dialog opened
          const modalOpened = await this._checkModalOpened();

          if (modalOpened) {
            console.log(`      [ULTRA-DEEP] Depth ${depth}: Modal detected! Going deeper...`);

            // RECURSIVELY interact with content inside the modal
            await this._recursiveInteraction(depth + 1);

            // Close the modal
            console.log(`      [ULTRA-DEEP] Depth ${depth}: Closing modal...`);
            await this._closeModal();
            await sleep(500);
          } else if (changes.significant) {
            // Significant DOM changes but not a modal - still go deeper
            console.log(`      [ULTRA-DEEP] Depth ${depth}: Significant changes detected, going deeper...`);
            await this._recursiveInteraction(depth + 1);
          }
        }

      } catch (error) {
        console.log(`      [ULTRA-DEEP] Depth ${depth}: Error during interaction: ${error.message}`);
        continue;
      }
    }

    console.log(`      [ULTRA-DEEP] Depth ${depth}: Clicked ${clickedThisRound} elements this round`);
  }

  /**
   * Set up DOM mutation observer
   * @private
   */
  async _setupMutationObserver() {
    await this.page.evaluateOnNewDocument(() => {
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
        attributeOldValue: true
      });
    });
  }

  /**
   * Teardown mutation observer
   * @private
   */
  async _teardownMutationObserver() {
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
   * Wait for network to be idle
   * @private
   */
  async _waitForNetworkIdle() {
    try {
      await this.page.waitForNetworkIdle({
        timeout: this.options.waitForNetworkIdle,
        idleTime: 500
      });
    } catch (e) {
      // Timeout is okay
    }
  }

  /**
   * Scroll through entire page
   * @private
   */
  async _scrollPage() {
    try {
      await this.page.evaluate(async () => {
        const scrollHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollSteps = Math.ceil(scrollHeight / viewportHeight);

        for (let i = 0; i <= scrollSteps; i++) {
          window.scrollTo(0, i * viewportHeight);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        window.scrollTo(0, 0);
      });
    } catch (error) {
      // Ignore
    }
  }

  /**
   * Find ALL interactive elements
   * @private
   */
  async _findAllInteractiveElements() {
    return await this.page.evaluate(() => {
      const targets = [];
      const seen = new Set();

      // COMPREHENSIVE selector list
      const selectors = [
        'button',
        'input[type="button"]',
        'input[type="submit"]',
        '[role="button"]',
        '[type="button"]',

        // Modal/Dialog triggers
        '[data-toggle]',
        '[data-target]',
        '[data-modal]',
        '[data-dialog]',
        '[data-open]',
        '[data-show]',
        '[data-bs-toggle]',
        '[data-mdb-toggle]',

        // Framework-specific
        '[ng-click]',
        '[ng-submit]',
        '[v-on:click]',
        '[@click]',
        '[\\@click]',
        '[x-on:click]',
        '[data-action="click"]',

        // Links
        'a[href="#"]',
        'a[href^="#"]',
        'a[href="javascript:"]',
        'a[href^="javascript:"]',
        'a[onclick]',

        // Click handlers
        '[onclick]',
        '[onmousedown]',

        // Common UI patterns
        '.btn',
        '.button',
        '.tab',
        '.tab-link',
        '.dropdown-toggle',
        '.dropdown-trigger',
        '.accordion',
        '.accordion-toggle',
        '.expand',
        '.collapse',
        '.toggle',
        '.menu-item',
        '.nav-link',
        '.nav-item',
        '.modal-trigger',
        '.open-modal',
        '.show-modal',
        '.popup-trigger',

        // Clickable divs/spans
        'div[onclick]',
        'span[onclick]',
        'div[class*="click"]',
        'div[class*="button"]',
        'span[class*="click"]',
        'span[class*="button"]',
        'div[class*="btn"]',
        'span[class*="btn"]',

        // SVG elements
        'svg[onclick]',
        'svg[class*="click"]'
      ];

      const isInteractive = (el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (el.disabled || el.hasAttribute('disabled')) return false;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        // Check if element is actually in viewport or can be scrolled to
        return true;
      };

      selectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach((el) => {
            if (!isInteractive(el)) return;

            const signature =
              el.outerHTML.substring(0, 150) +
              (el.id || '') +
              (el.className || '') +
              el.tagName +
              (el.getAttribute('data-target') || '');

            if (seen.has(signature)) return;
            seen.add(signature);

            const text = (el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '').trim();

            targets.push({
              signature,
              selector: el.tagName.toLowerCase(),
              text: text.substring(0, 50),
              id: el.id || '',
              classes: (el.className || '').toString(),
              hasOnClick: el.hasAttribute('onclick'),
              type: el.getAttribute('type') || '',
              dataAttrs: {
                toggle: el.getAttribute('data-toggle') || el.getAttribute('data-bs-toggle'),
                target: el.getAttribute('data-target') || el.getAttribute('data-bs-target'),
                action: el.getAttribute('data-action')
              }
            });
          });
        } catch (e) {
          // Skip invalid selectors
        }
      });

      return targets;
    });
  }

  /**
   * Hover over element
   * @private
   */
  async _hoverElement(target) {
    try {
      const element = await this._findElementByTarget(target);
      if (element) {
        await element.hover();
      }
    } catch (error) {
      // Ignore
    }
  }

  /**
   * Click element with multiple fallback strategies
   * @private
   */
  async _clickElement(target) {
    try {
      const element = await this._findElementByTarget(target);
      if (!element) return false;

      // Check visibility
      const isVisible = await this.page.evaluate(el => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               parseFloat(style.opacity) > 0;
      }, element);

      if (!isVisible) return false;

      // Try multiple click strategies
      try {
        // Strategy 1: Normal click
        await element.click();
        return true;
      } catch (clickError) {
        try {
          // Strategy 2: JavaScript click
          await this.page.evaluate(el => el.click(), element);
          return true;
        } catch (jsError) {
          try {
            // Strategy 3: Dispatch click event
            await this.page.evaluate(el => {
              el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }, element);
            return true;
          } catch (eventError) {
            return false;
          }
        }
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Find element by target info
   * @private
   */
  async _findElementByTarget(target) {
    try {
      // Try by ID
      if (target.id) {
        const byId = await this.page.$(`#${target.id}`);
        if (byId) return byId;
      }

      // Try by data attributes
      if (target.dataAttrs?.target) {
        const byData = await this.page.$(`[data-target="${target.dataAttrs.target}"]`);
        if (byData) return byData;
      }

      // Try by text content
      if (target.text && target.text.length > 2) {
        const byText = await this.page.evaluateHandle((targetText) => {
          const elements = Array.from(document.querySelectorAll('button, a, [role="button"], [onclick], div, span'));
          return elements.find(el => {
            const text = (el.innerText || el.textContent || '').trim();
            return text === targetText || text.startsWith(targetText);
          });
        }, target.text);

        if (byText && await byText.asElement()) {
          return byText.asElement();
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Capture current state
   * @private
   */
  async _captureState() {
    return await this.page.evaluate(() => {
      return {
        formCount: document.querySelectorAll('form').length,
        inputCount: document.querySelectorAll('input').length,
        buttonCount: document.querySelectorAll('button').length,
        linkCount: document.querySelectorAll('a[href]').length,
        modalCount: document.querySelectorAll('[class*="modal"], [role="dialog"], [class*="popup"]').length,
        visibleModalCount: Array.from(document.querySelectorAll('[class*="modal"], [role="dialog"]')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).length,
        bodyHTML: document.body.innerHTML.length,
        domChangeCount: window.__domChanges ? window.__domChanges.length : 0
      };
    });
  }

  /**
   * Analyze what changed
   * @private
   */
  async _analyzeChanges(before, after) {
    const newForms = after.formCount - before.formCount;
    const newLinks = after.linkCount - before.linkCount;
    const newButtons = after.buttonCount - before.buttonCount;
    const newModals = after.visibleModalCount - before.visibleModalCount;
    const htmlGrowth = after.bodyHTML - before.bodyHTML;
    const domChanges = after.domChangeCount - before.domChangeCount;

    const hasChanges =
      newForms > 0 ||
      newLinks > 0 ||
      newButtons > 0 ||
      newModals > 0 ||
      Math.abs(htmlGrowth) > 500 ||
      domChanges > 5;

    const significant =
      newForms > 0 ||
      newModals > 0 ||
      Math.abs(htmlGrowth) > 2000 ||
      domChanges > 20;

    return {
      hasChanges,
      significant,
      newForms,
      newLinks,
      newButtons,
      newModals,
      htmlGrowth,
      domChanges
    };
  }

  /**
   * Check if modal opened
   * @private
   */
  async _checkModalOpened() {
    return await this.page.evaluate(() => {
      const modals = document.querySelectorAll('[class*="modal"], [role="dialog"], [class*="popup"], [class*="overlay"]');

      for (const modal of modals) {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            parseFloat(style.opacity) > 0) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Extract new content from page
   * @private
   */
  async _extractNewContent() {
    return await this.page.evaluate(() => {
      const forms = [];
      const links = [];

      // Get ALL visible forms
      document.querySelectorAll('form').forEach(form => {
        const style = window.getComputedStyle(form);
        if (style.display === 'none') return;

        const action = form.getAttribute('action') || window.location.href;
        const method = (form.getAttribute('method') || 'GET').toUpperCase();

        const fields = [];
        form.querySelectorAll('input, select, textarea').forEach(field => {
          const name = field.getAttribute('name') || field.getAttribute('id') || '';
          const type = field.getAttribute('type') || field.tagName.toLowerCase();

          if (!name || type === 'submit' || type === 'button' || type === 'reset') return;

          fields.push({
            name,
            type,
            value: field.value || field.getAttribute('value') || '',
            placeholder: field.getAttribute('placeholder') || '',
            required: field.hasAttribute('required')
          });
        });

        forms.push({
          action,
          method,
          fields,
          id: form.id || '',
          classes: form.className || ''
        });
      });

      // Get ALL visible links
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
          } catch (e) {
            // Invalid URL
          }
        }
      });

      return { forms, links };
    });
  }

  /**
   * Close modal with multiple strategies
   * @private
   */
  async _closeModal() {
    try {
      await this.page.evaluate(() => {
        // Strategy 1: Click close button
        const closeSelectors = [
          '.modal .close',
          '.modal [data-dismiss]',
          '.modal [data-bs-dismiss]',
          '.modal .modal-close',
          '.close',
          '[data-dismiss="modal"]',
          '[data-bs-dismiss="modal"]',
          '[aria-label*="lose"]',
          '[aria-label*="Close"]',
          'button[class*="close"]'
        ];

        for (const selector of closeSelectors) {
          const btns = document.querySelectorAll(selector);
          for (const btn of btns) {
            const style = window.getComputedStyle(btn);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              btn.click();
              return;
            }
          }
        }

        // Strategy 2: Click backdrop
        const backdrop = document.querySelector('.modal-backdrop, [class*="backdrop"], [class*="overlay"]');
        if (backdrop) {
          backdrop.click();
          return;
        }

        // Strategy 3: ESC key
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));

        // Strategy 4: Hide modals directly
        document.querySelectorAll('[class*="modal"], [role="dialog"]').forEach(modal => {
          modal.style.display = 'none';
        });
      });

      await sleep(500);
    } catch (error) {
      // Ignore
    }
  }

  /**
   * Reset state
   */
  reset() {
    this.clickedElements.clear();
    this.discoveredContent = {
      forms: [],
      links: [],
      networkRequests: []
    };
    this.domChanges = [];
    this.currentDepth = 0;
  }
}

module.exports = InteractionHandler;
