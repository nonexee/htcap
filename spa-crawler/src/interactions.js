/**
 * Interaction Handler - Aggressive interaction to discover ALL hidden content
 *
 * This module systematically interacts with pages to find:
 * - Hidden forms in modals
 * - Dynamically loaded content
 * - Hover-triggered elements
 * - Scroll-triggered lazy loading
 * - Nested modals and dropdowns
 * - Event-driven content
 */

const { sleep } = require('./utils');

class InteractionHandler {
  constructor(page, options = {}) {
    this.page = page;
    this.options = {
      maxClicksPerPage: options.maxClicksPerPage || 20,
      waitAfterClick: options.waitAfterClick || 1500,
      enableScrolling: options.enableScrolling !== false,
      enableHover: options.enableHover !== false,
      rescanAfterInteraction: options.rescanAfterInteraction !== false
    };
    this.clickedElements = new Set();
    this.discoveredContent = {
      forms: [],
      links: [],
      modals: []
    };
  }

  /**
   * Perform comprehensive interactions on the page
   * @returns {Promise<Object>}
   */
  async interactWithPage() {
    const interactions = [];
    let totalClicks = 0;

    // Step 1: Scroll to reveal all content
    if (this.options.enableScrolling) {
      await this._scrollPage();
      await sleep(1000);
    }

    // Step 2: Find all potentially interactive elements
    let clickTargets = await this._findAllInteractiveElements();
    console.log(`      [DEBUG] Found ${clickTargets.length} interactive elements`);

    // Step 3: Interact with elements systematically
    let round = 0;
    while (clickTargets.length > 0 && totalClicks < this.options.maxClicksPerPage) {
      round++;
      console.log(`      [DEBUG] Interaction round ${round}, ${clickTargets.length} elements to try`);

      for (const target of clickTargets) {
        if (totalClicks >= this.options.maxClicksPerPage) break;

        // Skip if already clicked
        if (this.clickedElements.has(target.signature)) continue;

        try {
          // Hover first (might reveal content)
          if (this.options.enableHover) {
            await this._hoverElement(target);
            await sleep(300);
          }

          // Get DOM snapshot before click
          const beforeSnapshot = await this._getDOMSnapshot();

          // Click the element
          const clicked = await this._clickElement(target);
          if (!clicked) continue;

          this.clickedElements.add(target.signature);
          totalClicks++;

          // Wait for changes
          await sleep(this.options.waitAfterClick);

          // Get DOM snapshot after click
          const afterSnapshot = await this._getDOMSnapshot();

          // Detect new content
          const newContent = await this._detectNewContent(beforeSnapshot, afterSnapshot);

          if (newContent.hasChanges) {
            interactions.push({
              target: target.text || target.selector,
              changes: newContent
            });

            // Extract discovered content
            if (newContent.forms && newContent.forms.length > 0) {
              this.discoveredContent.forms.push(...newContent.forms);
              console.log(`      [DEBUG] Found ${newContent.forms.length} new forms!`);
            }
            if (newContent.links && newContent.links.length > 0) {
              this.discoveredContent.links.push(...newContent.links);
              console.log(`      [DEBUG] Found ${newContent.links.length} new links!`);
            }

            // Close modal if one opened
            if (newContent.modalDetected) {
              console.log(`      [DEBUG] Modal detected, closing...`);
              await this._closeModal();
              await sleep(500);
            }
          }

        } catch (error) {
          // Continue with next element
          continue;
        }
      }

      // Rescan for new elements that appeared
      if (this.options.rescanAfterInteraction && totalClicks < this.options.maxClicksPerPage) {
        const newTargets = await this._findAllInteractiveElements();
        // Filter out already clicked
        clickTargets = newTargets.filter(t => !this.clickedElements.has(t.signature));

        if (clickTargets.length > 0) {
          console.log(`      [DEBUG] Rescan found ${clickTargets.length} new elements`);
        } else {
          break; // No new elements, we're done
        }
      } else {
        break;
      }
    }

    return {
      interactions,
      discovered: this.discoveredContent,
      clickCount: totalClicks
    };
  }

  /**
   * Scroll through entire page to trigger lazy loading
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

        // Scroll back to top
        window.scrollTo(0, 0);
      });
    } catch (error) {
      // Ignore scroll errors
    }
  }

  /**
   * Find ALL interactive elements on the page
   * @private
   */
  async _findAllInteractiveElements() {
    return await this.page.evaluate(() => {
      const targets = [];
      const seen = new Set();

      // Comprehensive list of interactive selectors
      const selectors = [
        // Buttons
        'button',
        '[type="button"]',
        '[role="button"]',

        // Modal/Dialog triggers
        '[data-toggle]',
        '[data-target]',
        '[data-modal]',
        '[data-dialog]',
        '[data-open]',
        '[data-show]',
        '.modal-trigger',
        '.open-modal',
        '.show-modal',

        // Framework-specific
        '[ng-click]',
        '[ng-submit]',
        '[v-on:click]',
        '[@click]',
        '[\\@click]',
        '[x-on:click]',

        // Links that trigger actions
        'a[href="#"]',
        'a[href^="#"]',
        'a[href="javascript:"]',
        'a[href^="javascript:"]',

        // Elements with click handlers
        '[onclick]',

        // Common UI patterns
        '.btn',
        '.button',
        '.tab',
        '.dropdown-toggle',
        '.accordion',
        '.expand',
        '.collapse',
        '.toggle',
        '.menu-item',
        '.nav-link',

        // Divs/spans that might be clickable
        'div[class*="click"]',
        'div[class*="button"]',
        'span[class*="click"]',
        'span[class*="button"]'
      ];

      // Helper to check if element is actually visible and clickable
      const isInteractive = (el) => {
        // Skip if hidden
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }

        // Skip if disabled
        if (el.disabled || el.hasAttribute('disabled')) {
          return false;
        }

        // Must be somewhat visible
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return false;
        }

        return true;
      };

      // Collect all matching elements
      selectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach((el) => {
            if (!isInteractive(el)) return;

            // Create unique signature
            const signature = el.outerHTML.substring(0, 100) +
                            (el.id || '') +
                            (el.className || '') +
                            el.tagName;

            if (seen.has(signature)) return;
            seen.add(signature);

            // Skip form submits (handled separately)
            if (el.type === 'submit') return;

            // Get element info
            const text = (el.innerText || el.textContent || '').trim().substring(0, 50);
            const id = el.id || '';
            const classes = (el.className || '').toString();

            targets.push({
              signature,
              selector: el.tagName.toLowerCase(),
              text,
              id,
              classes,
              hasOnClick: el.hasAttribute('onclick'),
              dataAttrs: {
                toggle: el.getAttribute('data-toggle'),
                target: el.getAttribute('data-target'),
                modal: el.getAttribute('data-modal')
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
   * Hover over an element
   * @private
   */
  async _hoverElement(target) {
    try {
      const element = await this._findElementByTarget(target);
      if (element) {
        await element.hover();
      }
    } catch (error) {
      // Ignore hover errors
    }
  }

  /**
   * Click an element using multiple strategies
   * @private
   */
  async _clickElement(target) {
    try {
      const element = await this._findElementByTarget(target);
      if (!element) return false;

      // Check if still visible
      const isVisible = await this.page.evaluate(el => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0';
      }, element);

      if (!isVisible) return false;

      // Try to click
      try {
        await element.click();
        return true;
      } catch (clickError) {
        // Try JavaScript click as fallback
        try {
          await this.page.evaluate(el => el.click(), element);
          return true;
        } catch (jsError) {
          return false;
        }
      }

    } catch (error) {
      return false;
    }
  }

  /**
   * Find element using multiple strategies
   * @private
   */
  async _findElementByTarget(target) {
    try {
      // Strategy 1: By ID
      if (target.id) {
        const byId = await this.page.$(`#${target.id}`);
        if (byId) return byId;
      }

      // Strategy 2: By data attributes
      if (target.dataAttrs && target.dataAttrs.target) {
        const byData = await this.page.$(`[data-target="${target.dataAttrs.target}"]`);
        if (byData) return byData;
      }

      // Strategy 3: By text content
      if (target.text) {
        const byText = await this.page.evaluateHandle((targetText, targetSelector) => {
          const elements = Array.from(document.querySelectorAll(targetSelector + ', button, a, [role="button"]'));
          return elements.find(el => {
            const text = (el.innerText || el.textContent || '').trim();
            return text === targetText || text.includes(targetText);
          });
        }, target.text, target.selector);

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
   * Get DOM snapshot
   * @private
   */
  async _getDOMSnapshot() {
    return await this.page.evaluate(() => {
      return {
        formCount: document.querySelectorAll('form').length,
        inputCount: document.querySelectorAll('input').length,
        modalCount: document.querySelectorAll('[class*="modal"], [role="dialog"]').length,
        linkCount: document.querySelectorAll('a[href]').length,
        buttonCount: document.querySelectorAll('button').length,
        bodyHTML: document.body.innerHTML.length
      };
    });
  }

  /**
   * Detect new content after interaction
   * @private
   */
  async _detectNewContent(before, after) {
    const hasChanges =
      after.formCount > before.formCount ||
      after.inputCount > before.inputCount ||
      after.modalCount > before.modalCount ||
      after.linkCount > before.linkCount ||
      after.buttonCount > before.buttonCount ||
      Math.abs(after.bodyHTML - before.bodyHTML) > 500;

    if (!hasChanges) {
      return { hasChanges: false };
    }

    // Extract new content
    const newContent = await this.page.evaluate(() => {
      const forms = [];
      const links = [];
      let modalDetected = false;

      // Find visible modals
      const modals = document.querySelectorAll('[class*="modal"], [role="dialog"], [class*="popup"], [class*="overlay"]');

      modals.forEach(modal => {
        const style = window.getComputedStyle(modal);
        const isVisible = style.display !== 'none' &&
                         style.visibility !== 'hidden' &&
                         style.opacity !== '0';

        if (isVisible) {
          modalDetected = true;

          // Extract ALL forms from modal (including nested)
          modal.querySelectorAll('form').forEach((form) => {
            const action = form.getAttribute('action') || window.location.href;
            const method = (form.getAttribute('method') || 'GET').toUpperCase();

            const fields = [];
            form.querySelectorAll('input, select, textarea').forEach(field => {
              const name = field.getAttribute('name') || field.getAttribute('id') || '';
              const type = field.getAttribute('type') || field.tagName.toLowerCase();

              if (!name || type === 'submit' || type === 'button') return;

              fields.push({
                name,
                type,
                value: field.value || field.getAttribute('value') || '',
                required: field.hasAttribute('required'),
                placeholder: field.getAttribute('placeholder') || ''
              });
            });

            if (fields.length > 0 || method === 'POST') {
              forms.push({
                action,
                method,
                fields,
                location: 'modal',
                id: form.id || '',
                classes: form.className || ''
              });
            }
          });

          // Extract links from modal
          modal.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (href && !href.startsWith('javascript:')) {
              try {
                links.push({
                  url: new URL(href, window.location.href).toString(),
                  text: (a.innerText || '').trim().substring(0, 50),
                  location: 'modal'
                });
              } catch (e) {
                // Invalid URL
              }
            }
          });
        }
      });

      // Also check for any NEW forms/links anywhere on the page
      document.querySelectorAll('form').forEach(form => {
        const style = window.getComputedStyle(form);
        if (style.display === 'none') return;

        const action = form.getAttribute('action') || window.location.href;
        const method = (form.getAttribute('method') || 'GET').toUpperCase();

        const fields = [];
        form.querySelectorAll('input, select, textarea').forEach(field => {
          const name = field.getAttribute('name') || field.getAttribute('id') || '';
          const type = field.getAttribute('type') || field.tagName.toLowerCase();

          if (!name || type === 'submit' || type === 'button') return;

          fields.push({
            name,
            type,
            value: field.value || field.getAttribute('value') || ''
          });
        });

        if (fields.length > 0) {
          // Check if this is a new form (not already in forms array)
          const signature = method + action + fields.map(f => f.name).join(',');
          forms.push({
            action,
            method,
            fields,
            signature,
            location: 'page'
          });
        }
      });

      return {
        forms,
        links,
        modalDetected
      };
    });

    return {
      hasChanges: true,
      ...newContent
    };
  }

  /**
   * Try to close any open modals
   * @private
   */
  async _closeModal() {
    try {
      await this.page.evaluate(() => {
        // Strategy 1: Click close button
        const closeSelectors = [
          '.modal .close',
          '.modal [data-dismiss]',
          '.modal .modal-close',
          '[class*="close"]',
          '[class*="dismiss"]',
          'button[aria-label*="Close"]',
          'button[aria-label*="close"]'
        ];

        for (const selector of closeSelectors) {
          const closeBtn = document.querySelector(selector);
          if (closeBtn) {
            const style = window.getComputedStyle(closeBtn);
            if (style.display !== 'none') {
              closeBtn.click();
              return;
            }
          }
        }

        // Strategy 2: Click overlay
        const overlay = document.querySelector('.modal-backdrop, [class*="overlay"], [class*="backdrop"]');
        if (overlay) {
          overlay.click();
          return;
        }

        // Strategy 3: Press ESC
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
      });

      await sleep(500);
    } catch (error) {
      // Ignore errors
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
      modals: []
    };
  }
}

module.exports = InteractionHandler;
