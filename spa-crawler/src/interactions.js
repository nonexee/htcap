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
const FrameworkDetector = require('./framework-detector');
const AdvancedDiscovery = require('./advanced-discovery');

class InteractionHandler {
  constructor(page, options = {}) {
    this.page = page;
    this.frameworkDetector = new FrameworkDetector(page);
    this.advancedDiscovery = new AdvancedDiscovery(page, options);
    this.options = {
      maxInteractionDepth: options.maxInteractionDepth || 10,
      maxClicksPerPage: options.maxClicksPerPage || 200,
      maxPassesPerElement: options.maxPassesPerElement || 2,
      // PERFORMANCE: Reduced wait times
      waitAfterClick: options.waitAfterClick || 500,          // 2000 → 500ms
      waitForDelayedContent: options.waitForDelayedContent || 1000, // 3000 → 1000ms
      waitForNetworkIdle: options.waitForNetworkIdle || 1000, // 3000 → 1000ms
      // PERFORMANCE: Batch interactions
      batchSize: options.batchSize || 5,                      // NEW: Click 5 elements concurrently
      batchWait: options.batchWait || 2000,                   // NEW: Wait after batch
      enableParallel: options.enableParallel !== false,       // NEW: Enable parallel interactions
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
    this.totalElementsFound = 0; // Total including duplicates
    this.deduplicatedCount = 0;  // How many were skipped as duplicates
  }

  /**
   * Wait for SPA framework to fully render - ENHANCED with framework detection
   * @private
   */
  async _waitForSPAToRender() {
    try {
      // Detect framework
      await this.frameworkDetector.detect();

      // Use framework-specific waiting
      await this.frameworkDetector.waitForStable();

    } catch (e) {
      console.log(`      [INSANE-DEEP] ⚠️  Render wait error: ${e.message}`);
    }
  }

  /**
   * Start insanely deep interaction
   * @returns {Promise<Object>}
   */
  async interactWithPage() {
    console.log(`      [INSANE-DEEP] 🚀 Starting ULTIMATE interaction mode`);

    // Wait for SPA to fully render
    await this._waitForSPAToRender();

    // ADVANCED: Discover client-side routes
    const routes = await this.frameworkDetector.discoverRoutes();
    if (routes.length > 0) {
      console.log(`      [ROUTES] Discovered ${routes.length} client-side routes`);
      // Note: Routes can be returned for the main crawler to visit
    }

    // ADVANCED: Run comprehensive discovery (infinite scroll, iframes, lazy loading)
    const advancedResults = await this.advancedDiscovery.discoverAll();

    // Set up comprehensive monitoring
    await this._setupComprehensiveMonitoring();

    // Start recursive interaction
    await this._recursiveInteraction(0);

    // Clean up
    await this._teardownMonitoring();

    const deduplicationRate = this.totalElementsFound > 0
      ? ((this.deduplicatedCount / this.totalElementsFound) * 100).toFixed(1)
      : 0;

    console.log(`      [INSANE-DEEP] 📊 FINAL STATS:`);
    console.log(`      [INSANE-DEEP]    Total interactions: ${this.totalInteractions}`);
    console.log(`      [INSANE-DEEP]    Unique elements: ${this.clickedElements.size}`);
    console.log(`      [INSANE-DEEP]    Total elements found: ${this.totalElementsFound}`);
    console.log(`      [INSANE-DEEP]    Deduplicated: ${this.deduplicatedCount} (${deduplicationRate}% efficiency)`);
    console.log(`      [INSANE-DEEP]    Forms found: ${this.discoveredContent.forms.length}`);
    console.log(`      [INSANE-DEEP]    Links found: ${this.discoveredContent.links.length}`);
    console.log(`      [INSANE-DEEP]    Endpoints: ${this.discoveredContent.endpoints.size}`);
    console.log(`      [INSANE-DEEP]    MIME types: ${this.discoveredContent.mimeTypes.size}`);
    console.log(`      [INSANE-DEEP]    Max depth: ${this.currentDepth}`);
    console.log(`      [INSANE-DEEP]    Routes discovered: ${routes.length}`);
    console.log(`      [INSANE-DEEP]    Scroll items loaded: ${advancedResults.infiniteScroll.loaded}`);
    console.log(`      [INSANE-DEEP]    Iframes crawled: ${advancedResults.iframes.length}`);
    console.log(`      [INSANE-DEEP]    Lazy chunks: ${advancedResults.lazyLoading.chunks}`);

    return {
      clickCount: this.clickedElements.size,
      totalInteractions: this.totalInteractions,
      discovered: {
        ...this.discoveredContent,
        endpoints: Array.from(this.discoveredContent.endpoints),
        mimeTypes: Object.fromEntries(this.discoveredContent.mimeTypes)
      },
      maxDepthReached: this.currentDepth,
      // ADVANCED DISCOVERY RESULTS
      routes: routes,
      infiniteScroll: advancedResults.infiniteScroll,
      iframes: advancedResults.iframes,
      lazyLoading: advancedResults.lazyLoading,
      framework: this.frameworkDetector.framework
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

    // Track totals for deduplication statistics
    this.totalElementsFound += elements.length;

    // Count how many are already interacted with (deduplication stats)
    const newElements = elements.filter(e => !this.clickedElements.has(e.signature));
    const alreadySeen = elements.length - newElements.length;
    this.deduplicatedCount += alreadySeen;

    console.log(`      [INSANE-DEEP] 🔍 Depth ${depth}: Found ${elements.length} elements (${newElements.length} new, ${alreadySeen} deduplicated)`);

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

    // Use parallel processing if enabled
    if (this.options.enableParallel) {
      await this._interactWithElementsParallel(interactiveElements, depth);
    } else {
      await this._interactWithElementsSequential(interactiveElements, depth);
    }
  }

  /**
   * Interact with elements in PARALLEL (FAST!)
   * @private
   */
  async _interactWithElementsParallel(elements, depth) {
    const beforeState = await this._captureState();
    const beforeNetworkCount = this.networkRequests.length;

    // Process in batches
    for (let batchStart = 0; batchStart < elements.length && this.totalInteractions < this.options.maxClicksPerPage; batchStart += this.options.batchSize) {
      const batch = elements.slice(batchStart, batchStart + this.options.batchSize);

      console.log(`      [INSANE-DEEP] ⚡ Depth ${depth}: Processing batch ${Math.floor(batchStart / this.options.batchSize) + 1} (${batch.length} elements in parallel)...`);

      // Click all elements in batch CONCURRENTLY
      const interactions = batch.map(async (element, idx) => {
        const passCount = this.clickedElements.get(element.signature) || 0;
        if (passCount >= this.options.maxPassesPerElement) {
          return null; // Skip
        }

        try {
          // Quick interaction (no individual waits)
          await this._performAllInteractions(element);

          // Mark as interacted
          this.clickedElements.set(element.signature, passCount + 1);
          this.totalInteractions++;

          return { element, success: true };
        } catch (error) {
          return { element, success: false, error: error.message };
        }
      });

      // Wait for all interactions in batch to complete
      await Promise.all(interactions);

      // Wait ONCE after batch (instead of after each element)
      await sleep(this.options.batchWait);
      await this._waitForNetworkIdle();
    }

    // Check changes ONCE after all batches
    const afterState = await this._captureState();
    const afterNetworkCount = this.networkRequests.length;
    const changes = await this._analyzeChanges(beforeState, afterState);
    const newNetworkRequests = afterNetworkCount - beforeNetworkCount;

    if (changes.hasChanges || newNetworkRequests > 0) {
      console.log(`      [INSANE-DEEP] ✨ Depth ${depth}: BATCH CHANGES DETECTED!`);
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

      // Check if modal opened
      const modalOpened = await this._checkModalOpened(beforeState);
      if (modalOpened) {
        console.log(`      [INSANE-DEEP] 🪟 NEW Modal opened! Going DEEPER...`);
        await this._recursiveInteraction(depth + 1);
        await sleep(500);
      } else if (changes.significant) {
        console.log(`      [INSANE-DEEP] 🌊 Significant changes! Going DEEPER...`);
        await this._recursiveInteraction(depth + 1);
      }
    }
  }

  /**
   * Interact with elements SEQUENTIALLY (original method, kept for compatibility)
   * @private
   */
  async _interactWithElementsSequential(elements, depth) {
    for (let i = 0; i < elements.length && this.totalInteractions < this.options.maxClicksPerPage; i++) {
      const element = elements[i];
      const passCount = this.clickedElements.get(element.signature) || 0;

      if (passCount >= this.options.maxPassesPerElement) {
        continue;
      }

      try {
        console.log(`      [INSANE-DEEP] 💥 Depth ${depth}: Element ${i + 1}/${elements.length} (pass ${passCount + 1}): "${element.text?.substring(0, 40)}"`);

        const beforeState = await this._captureState();
        const beforeNetworkCount = this.networkRequests.length;

        await this._performAllInteractions(element);
        await sleep(this.options.waitAfterClick);
        await this._waitForNetworkIdle();
        await sleep(this.options.waitForDelayedContent);

        const afterState = await this._captureState();
        const afterNetworkCount = this.networkRequests.length;

        this.clickedElements.set(element.signature, passCount + 1);
        this.totalInteractions++;

        const changes = await this._analyzeChanges(beforeState, afterState);
        const newNetworkRequests = afterNetworkCount - beforeNetworkCount;

        if (changes.hasChanges || newNetworkRequests > 0) {
          console.log(`      [INSANE-DEEP] ✨ Depth ${depth}: CHANGES DETECTED!`);
          console.log(`      [INSANE-DEEP]    + ${changes.newForms} forms, + ${changes.newLinks} links, + ${changes.newButtons} buttons, + ${newNetworkRequests} requests`);

          const newContent = await this._extractAllContent();

          if (newContent.forms.length > 0) {
            console.log(`      [INSANE-DEEP] 📋 Found ${newContent.forms.length} new forms!`);
            this.discoveredContent.forms.push(...newContent.forms);
          }

          if (newContent.links.length > 0) {
            console.log(`      [INSANE-DEEP] 🔗 Found ${newContent.links.length} new links!`);
            this.discoveredContent.links.push(...newContent.links);
          }

          const modalOpened = await this._checkModalOpened(beforeState);
          if (modalOpened) {
            console.log(`      [INSANE-DEEP] 🪟 NEW Modal opened! Going DEEPER...`);
            await this._recursiveInteraction(depth + 1);
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

    // 7. Accessibility (ARIA) interactions
    await this._interactWithAriaElement(element, target);

    // 8. Table interactions
    await this._interactWithTable(element, target);
  }

  /**
   * Interact with form fields - COMPREHENSIVE
   * Tries multiple values, triggers all events
   * @private
   */
  async _interactWithFormField(element, target) {
    try {
      const tagName = await element.evaluate(el => el.tagName);
      const type = await element.evaluate(el => el.type);

      if (tagName === 'INPUT') {
        if (type === 'text' || type === 'email' || type === 'search' || type === 'url' ||
            type === 'tel' || type === 'password' || !type) {
          // Try multiple values to trigger different responses
          const testValues = [
            'test', 'admin', 'user', 'test@example.com', '123',
            'a', 'ab', 'abc' // Progressive typing
          ];

          for (const value of testValues.slice(0, 3)) { // Try 3 different values
            try {
              // Clear field
              await element.click({ clickCount: 3 }); // Triple-click to select all
              await element.press('Backspace');

              // Type value
              await element.type(value, { delay: 50 });
              await sleep(400); // Wait for autocomplete/validation

              // Trigger blur event (validation often happens on blur)
              await this.page.evaluate(el => {
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
              }, element);
              await sleep(300);
            } catch (e) {}
          }

          // Clear field
          try {
            await element.click({ clickCount: 3 });
            await element.press('Backspace');
          } catch (e) {}

        } else if (type === 'number' || type === 'range') {
          // Try different numbers
          const numbers = ['0', '1', '10', '100', '-1'];
          for (const num of numbers.slice(0, 2)) {
            try {
              await element.click({ clickCount: 3 });
              await element.type(num, { delay: 50 });
              await sleep(300);
            } catch (e) {}
          }

        } else if (type === 'date' || type === 'datetime-local' || type === 'time' ||
                   type === 'week' || type === 'month') {
          // Trigger the date picker
          try {
            await element.click();
            await sleep(500);
            // Type a date (might trigger date picker)
            await element.type('2024-01-01', { delay: 50 });
            await sleep(500);
          } catch (e) {}

        } else if (type === 'checkbox' || type === 'radio') {
          // Toggle multiple times to trigger all states
          try {
            await element.click();
            await sleep(300);
            await element.click(); // Toggle back
            await sleep(300);
          } catch (e) {}

        } else if (type === 'file') {
          // Can't actually upload, but we can click to open dialog
          try {
            await element.click();
            await sleep(500);
            // Press Escape to close file dialog
            await this.page.keyboard.press('Escape');
            await sleep(300);
          } catch (e) {}

        } else if (type === 'color') {
          // Click to open color picker
          try {
            await element.click();
            await sleep(500);
            await this.page.keyboard.press('Escape');
          } catch (e) {}
        }

      } else if (tagName === 'SELECT') {
        // Try ALL options to trigger different requests
        try {
          const options = await element.evaluate(el =>
            Array.from(el.options).map((opt, idx) => ({ value: opt.value, index: idx }))
          );

          for (const opt of options.slice(0, 5)) { // Try up to 5 options
            if (opt.value) {
              try {
                await element.select(opt.value);
                await sleep(400);
                // Trigger change event
                await this.page.evaluate(el => {
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }, element);
                await sleep(400);
              } catch (e) {}
            }
          }

          // Reset to first option
          if (options.length > 0 && options[0].value) {
            await element.select(options[0].value).catch(() => {});
          }
        } catch (e) {}

      } else if (tagName === 'TEXTAREA') {
        // Try multiple text values
        const texts = ['test', 'Hello\nWorld', 'Lorem ipsum dolor sit amet'];
        for (const text of texts.slice(0, 2)) {
          try {
            await element.click({ clickCount: 3 });
            await element.type(text, { delay: 50 });
            await sleep(400);
            await this.page.evaluate(el => {
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }, element);
            await sleep(300);
          } catch (e) {}
        }

        // Clear
        try {
          await element.click({ clickCount: 3 });
          await element.press('Backspace');
        } catch (e) {}
      }

      // For contenteditable elements
      if (tagName === 'DIV' || tagName === 'SPAN') {
        const isContentEditable = await element.evaluate(el =>
          el.getAttribute('contenteditable') === 'true' || el.getAttribute('contenteditable') === ''
        );

        if (isContentEditable) {
          try {
            await element.click();
            await element.type('test content', { delay: 50 });
            await sleep(400);
            // Clear
            await this.page.evaluate(el => {
              el.textContent = '';
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }, element);
            await sleep(300);
          } catch (e) {}
        }
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

      // Try Space (for buttons/checkboxes)
      await element.press('Space');
      await sleep(200);

      // Try Arrow keys (for dropdowns, sliders, etc.)
      await element.press('ArrowDown');
      await sleep(200);
      await element.press('ArrowUp');
      await sleep(200);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Interact with ARIA/accessibility elements
   * @private
   */
  async _interactWithAriaElement(element, target) {
    try {
      if (!target.ariaAttrs || Object.keys(target.ariaAttrs).length === 0) {
        return; // No ARIA attributes
      }

      // Handle aria-expanded (expandable sections, accordions, dropdowns)
      if (target.ariaAttrs['aria-expanded'] !== undefined) {
        const isExpanded = target.ariaAttrs['aria-expanded'] === 'true';
        // Click to toggle
        try {
          await element.click();
          await sleep(500);
          // If it was collapsed, clicking expanded it - explore the newly visible content
          // If it was expanded, clicking collapsed it
          if (!isExpanded) {
            await sleep(500); // Extra wait for content to load
          }
        } catch (e) {}
      }

      // Handle aria-haspopup (elements that trigger popups/menus)
      if (target.ariaAttrs['aria-haspopup']) {
        try {
          await element.click();
          await sleep(600);
          // Press Escape to close
          await this.page.keyboard.press('Escape');
          await sleep(300);
        } catch (e) {}
      }

      // Handle aria-controls (element controls another element)
      if (target.ariaAttrs['aria-controls']) {
        try {
          // Click the control
          await element.click();
          await sleep(500);

          // Try to find the controlled element
          const controlsId = target.ariaAttrs['aria-controls'];
          const controlledExists = await this.page.$(`#${controlsId}`);
          if (controlledExists) {
            // The controlled element is now visible/active
            await sleep(500);
          }
        } catch (e) {}
      }

      // Handle aria-pressed (toggle buttons)
      if (target.ariaAttrs['aria-pressed'] !== undefined) {
        try {
          await element.click();
          await sleep(400);
          // Toggle back
          await element.click();
          await sleep(400);
        } catch (e) {}
      }

      // Handle aria-checked (checkboxes, radio buttons, switches)
      if (target.ariaAttrs['aria-checked'] !== undefined) {
        try {
          await element.click();
          await sleep(400);
          await element.click();
          await sleep(400);
        } catch (e) {}
      }

      // Handle aria-selected (selectable items in lists, tabs)
      if (target.ariaAttrs['aria-selected'] !== undefined) {
        try {
          await element.click();
          await sleep(500);
        } catch (e) {}
      }

      // Handle specific roles
      if (target.role) {
        switch (target.role) {
          case 'tab':
            // Click tab to switch views
            try {
              await element.click();
              await sleep(600);
            } catch (e) {}
            break;

          case 'combobox':
          case 'listbox':
            // Click to open, then try arrow keys
            try {
              await element.click();
              await sleep(400);
              await element.press('ArrowDown');
              await sleep(300);
              await element.press('ArrowDown');
              await sleep(300);
              await element.press('Enter');
              await sleep(400);
            } catch (e) {}
            break;

          case 'slider':
          case 'spinbutton':
            // Try arrow keys to change value
            try {
              await element.click();
              await element.press('ArrowUp');
              await sleep(300);
              await element.press('ArrowUp');
              await sleep(300);
              await element.press('ArrowDown');
              await sleep(300);
            } catch (e) {}
            break;

          case 'switch':
            // Toggle switch
            try {
              await element.click();
              await sleep(400);
              await element.click();
              await sleep(400);
            } catch (e) {}
            break;
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Interact with table elements
   * @private
   */
  async _interactWithTable(element, target) {
    try {
      const tagName = target.selector.toUpperCase();

      // Click on table rows/cells - might trigger selection, expansion, navigation
      if (['TR', 'TD', 'TH'].includes(tagName)) {
        try {
          await element.click();
          await sleep(500);

          // Try double-click (might open detail view)
          await element.click({ clickCount: 2 });
          await sleep(500);

          // Try right-click (might open context menu)
          await element.click({ button: 'right' });
          await sleep(400);
          await this.page.keyboard.press('Escape');
          await sleep(300);
        } catch (e) {}
      }

      // If it's a table, try to find and click sortable headers
      if (tagName === 'TABLE') {
        try {
          // Find sortable headers (often have onclick, data-sort, etc.)
          const headers = await this.page.evaluate(() => {
            const ths = document.querySelectorAll('th[onclick], th[data-sort], th.sortable, th[class*="sort"]');
            return Array.from(ths).map(th => ({
              text: th.textContent.trim(),
              signature: th.outerHTML.substring(0, 100)
            }));
          });

          // Click a few headers to trigger sorting
          for (const header of headers.slice(0, 3)) {
            try {
              const headerEl = await this.page.evaluateHandle(sig => {
                return Array.from(document.querySelectorAll('th')).find(
                  th => th.outerHTML.substring(0, 100) === sig
                );
              }, header.signature);

              if (headerEl) {
                await headerEl.click();
                await sleep(600);
              }
            } catch (e) {}
          }
        } catch (e) {}
      }
    } catch (e) {
      // Ignore errors
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
   * Find ALL interactive elements (comprehensive + Shadow DOM + iframes)
   * @private
   */
  async _findAllInteractiveElements() {
    return await this.page.evaluate(() => {
      const targets = [];
      const seen = new Set();

      const selectors = [
        // ===== BUTTONS & SUBMITS =====
        'button', 'input[type="button"]', 'input[type="submit"]', 'input[type="reset"]',
        'input[type="image"]', '[role="button"]', '[type="button"]',

        // ===== ALL FORM INPUTS (comprehensive) =====
        'input[type="text"]', 'input[type="email"]', 'input[type="password"]',
        'input[type="search"]', 'input[type="tel"]', 'input[type="url"]',
        'input[type="number"]', 'input[type="range"]', 'input[type="date"]',
        'input[type="datetime-local"]', 'input[type="time"]', 'input[type="week"]',
        'input[type="month"]', 'input[type="color"]', 'input[type="file"]',
        'input[type="checkbox"]', 'input[type="radio"]',
        'input:not([type])', // Default type="text"
        'select', 'textarea', 'output',
        '[contenteditable="true"]', '[contenteditable=""]',

        // ===== DATA ATTRIBUTES (toggles, targets, actions) =====
        '[data-toggle]', '[data-target]', '[data-modal]', '[data-dialog]',
        '[data-open]', '[data-show]', '[data-hide]', '[data-close]',
        '[data-bs-toggle]', '[data-mdb-toggle]', '[data-dismiss]', '[data-bs-dismiss]',
        '[data-action]', '[data-click]', '[data-trigger]', '[data-load]',
        '[data-src]', '[data-url]', '[data-href]', '[data-link]',

        // ===== FRAMEWORK-SPECIFIC (Angular, React, Vue, Alpine, etc.) =====
        '[ng-click]', '[ng-submit]', '[ng-change]', '[ng-focus]', '[ng-blur]',
        '[v-on:click]', '[v-on:change]', '[v-on:focus]', '[v-on:submit]',
        '[@click]', '[\\@click]', '[@change]', '[@submit]', '[@focus]',
        '[x-on:click]', '[x-on:change]', '[x-on:submit]',
        '[data-action="click"]', '[wire:click]', '[hx-get]', '[hx-post]',

        // ===== LINKS (all types) =====
        'a', 'a[href]', 'a[href="#"]', 'a[href^="#"]', 'a[href="javascript:"]',
        'a[onclick]', 'area[href]', '[role="link"]',

        // ===== EVENT HANDLERS (onclick, etc.) =====
        '[onclick]', '[onmousedown]', '[onmouseup]', '[ondblclick]',
        '[onchange]', '[oninput]', '[onfocus]', '[onblur]', '[onsubmit]',

        // ===== COMMON CLASSES (buttons, tabs, navigation) =====
        '.btn', '.button', '.btn-primary', '.btn-secondary', '.btn-link',
        '.tab', '.tab-link', '.tab-item', '.tab-button', '.tab-pane',
        '.dropdown', '.dropdown-toggle', '.dropdown-trigger', '.dropdown-menu',
        '.accordion', '.accordion-toggle', '.accordion-item', '.accordion-button',
        '.expand', '.collapse', '.toggle', '.switch',
        '.menu-item', '.nav-link', '.nav-item', '.navbar-item',
        '.sidebar-item', '.list-item', '.card', '.panel',

        // ===== MODALS, DIALOGS, OVERLAYS =====
        '.modal', '.modal-trigger', '.open-modal', '.show-modal', '.popup-trigger',
        '.dialog', '.overlay', '.backdrop', '.lightbox', '.tooltip',
        '[role="dialog"]', '[role="alertdialog"]', '[aria-modal="true"]',

        // ===== TABLES (rows, cells - might have click handlers) =====
        'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot',
        'tr[onclick]', 'td[onclick]', 'th[onclick]',
        'tr[data-action]', 'td[data-action]',
        '[role="row"]', '[role="cell"]', '[role="gridcell"]',

        // ===== ACCESSIBILITY (ARIA roles & attributes) =====
        '[role="tab"]', '[role="tabpanel"]', '[role="menuitem"]',
        '[role="option"]', '[role="checkbox"]', '[role="radio"]',
        '[role="switch"]', '[role="slider"]', '[role="spinbutton"]',
        '[role="combobox"]', '[role="listbox"]', '[role="tree"]', '[role="treeitem"]',
        '[role="searchbox"]', '[role="textbox"]',
        '[aria-expanded]', '[aria-haspopup]', '[aria-controls]',
        '[aria-pressed]', '[aria-selected]', '[aria-checked]',
        '[tabindex="0"]', '[tabindex]:not([tabindex="-1"])',

        // ===== LISTS (might contain clickable items) =====
        'li[onclick]', 'ul[onclick]', 'ol[onclick]',
        'li[data-action]', 'li[data-value]',
        '[role="listitem"]', '[role="menuitem"]', '[role="option"]',

        // ===== DIVS/SPANS with click handlers or interactive classes =====
        'div[onclick]', 'span[onclick]', 'div[onmousedown]', 'span[onmousedown]',
        'div[class*="click"]', 'span[class*="click"]',
        'div[class*="button"]', 'span[class*="button"]',
        'div[class*="btn"]', 'span[class*="btn"]',
        'div[class*="action"]', 'span[class*="action"]',
        'div[class*="trigger"]', 'span[class*="trigger"]',
        'div[class*="link"]', 'span[class*="link"]',

        // ===== IMAGES & SVG (might be clickable) =====
        'img[onclick]', 'svg[onclick]', 'svg[class*="click"]',
        'img[data-action]', 'svg[data-action]',
        'figure[onclick]', 'picture[onclick]',

        // ===== MEDIA & EMBEDS =====
        'video', 'audio', 'canvas', 'iframe',
        'embed', 'object',

        // ===== FORMS =====
        'form', 'fieldset', 'legend', 'label', 'label[for]',

        // ===== OTHER INTERACTIVE ELEMENTS =====
        'details', 'summary', 'meter', 'progress',
        '[draggable="true"]', '[droppable]'
      ];

      const isInteractive = (el) => {
        // Less strict - allow more elements through
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (style.opacity === '0') return false;
        if (el.disabled || el.hasAttribute('disabled')) return false;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        // Also check if cursor is pointer (clickable)
        if (style.cursor === 'pointer') return true;

        return true;
      };

      // Generate robust signature that doesn't change with dynamic attributes
      const generateSignature = (el) => {
        // Use stable identifiers
        const id = el.id || '';
        const name = el.getAttribute('name') || '';
        const type = el.getAttribute('type') || '';
        const href = el.getAttribute('href') || '';
        const tag = el.tagName;

        // Get position in DOM (parent path to avoid duplicates)
        let domPath = tag;
        let parent = el.parentElement;
        let depth = 0;
        while (parent && depth < 3) { // Track 3 levels up
          domPath = parent.tagName + '>' + domPath;
          if (parent.id) {
            domPath = '#' + parent.id + '>' + domPath;
            break; // ID is unique, stop here
          }
          parent = parent.parentElement;
          depth++;
        }

        // Get stable text content (first 30 chars, normalized)
        const text = (el.innerText || el.textContent || '').trim().substring(0, 30).replace(/\s+/g, ' ');

        // Combine stable attributes (ignore dynamic ones like class, aria-expanded, etc.)
        const stableSignature = [
          domPath,
          id,
          name,
          type,
          href,
          text,
          // Include position among siblings with same tag
          Array.from(el.parentElement?.children || [])
            .filter(c => c.tagName === el.tagName)
            .indexOf(el)
        ].join('|');

        // Create a simple hash for efficiency
        let hash = 0;
        for (let i = 0; i < stableSignature.length; i++) {
          const char = stableSignature.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }

        return 'sig_' + hash + '_' + tag + (id ? '_' + id : '');
      };

      const addElement = (el) => {
        if (!isInteractive(el)) return;

        const signature = generateSignature(el);

        if (seen.has(signature)) {
          // Element already found - deduplication working!
          return;
        }
        seen.add(signature);

        const text = (
          el.innerText || el.textContent || el.value ||
          el.getAttribute('aria-label') || el.getAttribute('placeholder') ||
          el.getAttribute('title') || el.getAttribute('alt') || ''
        ).trim();

        // Capture ALL relevant attributes
        const ariaAttrs = {};
        const dataAttrs = {};
        const ngAttrs = {};
        const vueAttrs = {};

        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          if (attr.name.startsWith('aria-')) {
            ariaAttrs[attr.name] = attr.value;
          } else if (attr.name.startsWith('data-')) {
            dataAttrs[attr.name.substring(5)] = attr.value; // Remove 'data-' prefix
          } else if (attr.name.startsWith('ng-')) {
            ngAttrs[attr.name] = attr.value;
          } else if (attr.name.startsWith('v-') || attr.name.startsWith('@') || attr.name.startsWith(':')) {
            vueAttrs[attr.name] = attr.value;
          }
        }

        targets.push({
          signature,
          selector: el.tagName.toLowerCase(),
          text: text.substring(0, 50),
          id: el.id || '',
          name: el.getAttribute('name') || '',
          classes: (el.className || '').toString(),
          type: el.getAttribute('type') || el.tagName.toLowerCase(),
          role: el.getAttribute('role') || '',
          tabindex: el.getAttribute('tabindex') || '',
          href: el.getAttribute('href') || '',
          src: el.getAttribute('src') || '',
          ariaAttrs,
          dataAttrs,
          ngAttrs,
          vueAttrs,
          // Capture if it's a form element
          isFormElement: ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName),
          formType: el.getAttribute('type') || el.tagName.toLowerCase()
        });
      };

      // Search in main document
      selectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(addElement);
        } catch (e) {}
      });

      // Search in Shadow DOM
      const searchShadowDOM = (root) => {
        try {
          root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
              selectors.forEach(selector => {
                try {
                  el.shadowRoot.querySelectorAll(selector).forEach(addElement);
                } catch (e) {}
              });
              searchShadowDOM(el.shadowRoot);
            }
          });
        } catch (e) {}
      };
      searchShadowDOM(document);

      // Debug: log if we found nothing
      if (targets.length === 0) {
        console.log('[DEBUG] Found 0 elements. Page info:');
        console.log('  - Body HTML length:', document.body?.innerHTML?.length || 0);
        console.log('  - All buttons:', document.querySelectorAll('button').length);
        console.log('  - All links:', document.querySelectorAll('a').length);
        console.log('  - All inputs:', document.querySelectorAll('input').length);
        console.log('  - All divs:', document.querySelectorAll('div').length);
        console.log('  - Has Angular?', !!window.angular || !!window.ng);
        console.log('  - Has React?', !!window.React);
        console.log('  - Has Vue?', !!window.Vue);

        // Fallback: find ANY elements with cursor:pointer
        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.cursor === 'pointer' && style.display !== 'none') {
            addElement(el);
          }
        });

        console.log('  - After fallback (cursor:pointer):', targets.length);
      }

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
    this.totalElementsFound = 0;
    this.deduplicatedCount = 0;
  }
}

module.exports = InteractionHandler;
