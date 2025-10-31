/**
 * Interaction Handler - Simulates user interactions to discover hidden content
 *
 * This module clicks buttons, opens modals, and triggers events to find:
 * - Hidden forms
 * - Modal content
 * - Dynamically loaded elements
 * - AJAX requests triggered by clicks
 */

const { sleep } = require('./utils');

class InteractionHandler {
  constructor(page, options = {}) {
    this.page = page;
    this.options = {
      maxClicksPerPage: options.maxClicksPerPage || 10,
      waitAfterClick: options.waitAfterClick || 1000,
      clickButtons: options.clickButtons !== false,
      clickModalTriggers: options.clickModalTriggers !== false,
      closeModals: options.closeModals !== false
    };
    this.clickedElements = new Set();
    this.discoveredContent = {
      forms: [],
      links: [],
      requests: []
    };
  }

  /**
   * Perform interactions on the page to discover hidden content
   * @returns {Promise<Object>}
   */
  async interactWithPage() {
    const interactions = [];

    // Find clickable elements that might reveal content
    const clickTargets = await this._findClickTargets();

    let clickCount = 0;
    for (const target of clickTargets) {
      if (clickCount >= this.options.maxClicksPerPage) break;

      try {
        // Take snapshot of DOM before click
        const beforeSnapshot = await this._getDOMSnapshot();

        // Click the element
        const clicked = await this._clickElement(target);
        if (!clicked) continue;

        clickCount++;

        // Wait for any animations/content to load
        await sleep(this.options.waitAfterClick);

        // Take snapshot after click
        const afterSnapshot = await this._getDOMSnapshot();

        // Check if new content appeared
        const newContent = await this._detectNewContent(beforeSnapshot, afterSnapshot);

        if (newContent.hasChanges) {
          interactions.push({
            target,
            newForms: newContent.forms,
            newLinks: newContent.links,
            modalOpened: newContent.modalDetected
          });

          // Extract new forms and links
          this.discoveredContent.forms.push(...newContent.forms);
          this.discoveredContent.links.push(...newContent.links);

          // If modal opened, try to close it
          if (newContent.modalDetected && this.options.closeModals) {
            await this._closeModal();
            await sleep(500);
          }
        }

      } catch (error) {
        // Continue with next element if this one fails
        continue;
      }
    }

    return {
      interactions,
      discovered: this.discoveredContent,
      clickCount
    };
  }

  /**
   * Find elements that are worth clicking
   * @private
   */
  async _findClickTargets() {
    return await this.page.evaluate(() => {
      const targets = [];
      const selectors = [
        'button[type="button"]',
        'button:not([type])',
        '[role="button"]',
        '[data-toggle="modal"]',
        '[data-target^="#"]',
        '.modal-trigger',
        '.open-modal',
        'a[href="#"]',
        'a[href^="#modal"]',
        '[ng-click]',
        '[v-on:click]',
        '[@click]',
        '[onclick*="modal"]',
        '[onclick*="show"]',
        '[onclick*="open"]'
      ];

      const seen = new Set();

      selectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach((el, index) => {
            // Skip if already processed
            const signature = el.outerHTML.substring(0, 50);
            if (seen.has(signature)) return;
            seen.add(signature);

            // Skip submit buttons
            if (el.type === 'submit') return;

            // Skip disabled elements
            if (el.disabled || el.hasAttribute('disabled')) return;

            const text = el.innerText?.trim() || el.getAttribute('aria-label') || '';

            targets.push({
              selector: selector,
              text: text.substring(0, 50),
              id: el.id || '',
              class: el.className || '',
              index: targets.length,
              dataToggle: el.getAttribute('data-toggle'),
              dataTarget: el.getAttribute('data-target')
            });
          });
        } catch (e) {
          // Skip invalid selectors
        }
      });

      return targets.slice(0, 20); // Limit to top 20 candidates
    });
  }

  /**
   * Click an element safely
   * @private
   */
  async _clickElement(target) {
    try {
      // Find element by multiple strategies
      let element = null;

      if (target.id) {
        element = await this.page.$(`#${target.id}`);
      }

      if (!element && target.dataTarget) {
        element = await this.page.$(`[data-target="${target.dataTarget}"]`);
      }

      if (!element) {
        // Find by text content
        element = await this.page.evaluateHandle((targetText) => {
          const buttons = Array.from(document.querySelectorAll('button, [role="button"], a[href="#"]'));
          return buttons.find(el => el.innerText?.trim() === targetText);
        }, target.text);
      }

      if (!element || !element.asElement()) {
        return false;
      }

      // Check if element is visible and clickable
      const isVisible = await this.page.evaluate(el => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0';
      }, element);

      if (!isVisible) return false;

      // Click the element
      await element.click();

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Get snapshot of current DOM state
   * @private
   */
  async _getDOMSnapshot() {
    return await this.page.evaluate(() => {
      return {
        formCount: document.querySelectorAll('form').length,
        modalCount: document.querySelectorAll('[class*="modal"]').length,
        linkCount: document.querySelectorAll('a[href]').length,
        inputCount: document.querySelectorAll('input').length,
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
      after.modalCount > before.modalCount ||
      after.linkCount > before.linkCount ||
      after.inputCount > before.inputCount ||
      Math.abs(after.bodyHTML - before.bodyHTML) > 100;

    if (!hasChanges) {
      return { hasChanges: false };
    }

    // Extract newly visible content
    const newContent = await this.page.evaluate(() => {
      const forms = [];
      const links = [];
      let modalDetected = false;

      // Find visible modals
      const modals = document.querySelectorAll('[class*="modal"]');
      modals.forEach(modal => {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          modalDetected = true;

          // Extract forms from modal
          modal.querySelectorAll('form').forEach((form, idx) => {
            const action = form.getAttribute('action') || window.location.href;
            const method = (form.getAttribute('method') || 'GET').toUpperCase();

            const fields = [];
            form.querySelectorAll('input, select, textarea').forEach(field => {
              const name = field.getAttribute('name');
              const type = field.getAttribute('type') || 'text';

              if (!name || type === 'submit' || type === 'button') return;

              fields.push({
                name,
                type,
                value: field.value || field.getAttribute('value') || '',
                required: field.hasAttribute('required')
              });
            });

            if (fields.length > 0) {
              forms.push({
                action,
                method,
                fields,
                location: 'modal'
              });
            }
          });

          // Extract links from modal
          modal.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (href && !href.startsWith('javascript:')) {
              links.push({
                url: new URL(href, window.location.href).toString(),
                text: a.innerText?.trim() || '',
                location: 'modal'
              });
            }
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
      // Try multiple strategies to close modals
      await this.page.evaluate(() => {
        // Strategy 1: Click close button
        const closeButtons = document.querySelectorAll(
          '.modal .close, .modal [data-dismiss="modal"], .modal .modal-close, [class*="close"]'
        );
        if (closeButtons.length > 0) {
          closeButtons[0].click();
          return;
        }

        // Strategy 2: Click overlay/backdrop
        const backdrop = document.querySelector('.modal-backdrop, [class*="overlay"]');
        if (backdrop) {
          backdrop.click();
          return;
        }

        // Strategy 3: Press ESC key
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      await sleep(500);
    } catch (error) {
      // Ignore errors when closing modals
    }
  }

  /**
   * Clear interaction state
   */
  reset() {
    this.clickedElements.clear();
    this.discoveredContent = {
      forms: [],
      links: [],
      requests: []
    };
  }
}

module.exports = InteractionHandler;
