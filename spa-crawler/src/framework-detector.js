/**
 * Framework Detection and Optimization
 * Detects SPA framework and uses framework-specific waiting strategies
 */

class FrameworkDetector {
  constructor(page) {
    this.page = page;
    this.framework = null;
  }

  /**
   * Detect which framework the SPA is using
   * @returns {Promise<string>} Framework name
   */
  async detect() {
    this.framework = await this.page.evaluate(() => {
      const detections = {
        react: !!(window.React || window.ReactDOM || document.querySelector('[data-reactroot], [data-reactid]')),
        vue: !!(window.Vue || window.__VUE__),
        angular: !!(window.angular || window.ng || window.getAllAngularTestabilities),
        svelte: !!window.__SVELTE__,
        ember: !!(window.Ember),
        nextjs: !!(window.__NEXT_DATA__),
        nuxtjs: !!(window.__NUXT__),
        gatsby: !!(window.___gatsby)
      };

      // Return first detected framework
      for (const [name, detected] of Object.entries(detections)) {
        if (detected) return name;
      }

      return 'unknown';
    });

    console.log(`      [FRAMEWORK] Detected: ${this.framework}`);
    return this.framework;
  }

  /**
   * Wait for framework to finish rendering
   * @returns {Promise<void>}
   */
  async waitForStable() {
    if (!this.framework) {
      await this.detect();
    }

    console.log(`      [FRAMEWORK] Waiting for ${this.framework} to stabilize...`);

    try {
      switch (this.framework) {
        case 'react':
        case 'nextjs':
        case 'gatsby':
          await this._waitForReact();
          break;

        case 'vue':
        case 'nuxtjs':
          await this._waitForVue();
          break;

        case 'angular':
          await this._waitForAngular();
          break;

        case 'svelte':
          await this._waitForSvelte();
          break;

        case 'ember':
          await this._waitForEmber();
          break;

        default:
          await this._waitGeneric();
      }

      console.log(`      [FRAMEWORK] ${this.framework} is stable`);
    } catch (e) {
      console.log(`      [FRAMEWORK] Wait error: ${e.message}, continuing...`);
    }
  }

  /**
   * Wait for React to finish rendering
   * @private
   */
  async _waitForReact() {
    await this.page.evaluate(async () => {
      return new Promise((resolve) => {
        const timeout = setTimeout(resolve, 3000); // Max 3s

        // Check React Fiber tree for pending updates
        const check = () => {
          try {
            const devtools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
            if (devtools) {
              // Check if there are pending fiber updates
              const hasPending = devtools.pendingFibers?.size > 0;
              if (!hasPending) {
                clearTimeout(timeout);
                resolve();
                return;
              }
            } else {
              // No DevTools, just wait for idle
              clearTimeout(timeout);
              resolve();
              return;
            }
          } catch (e) {
            clearTimeout(timeout);
            resolve();
            return;
          }

          setTimeout(check, 100);
        };

        check();
      });
    });

    // Additional wait for any async effects
    await new Promise(r => setTimeout(r, 500));
  }

  /**
   * Wait for Vue to finish rendering
   * @private
   */
  async _waitForVue() {
    await this.page.evaluate(async () => {
      return new Promise((resolve) => {
        const timeout = setTimeout(resolve, 3000);

        try {
          if (window.Vue && window.Vue.nextTick) {
            window.Vue.nextTick(() => {
              clearTimeout(timeout);
              resolve();
            });
          } else if (window.__VUE__ && window.__VUE__.$nextTick) {
            window.__VUE__.$nextTick(() => {
              clearTimeout(timeout);
              resolve();
            });
          } else {
            resolve();
          }
        } catch (e) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    await new Promise(r => setTimeout(r, 500));
  }

  /**
   * Wait for Angular to stabilize
   * @private
   */
  async _waitForAngular() {
    await this.page.evaluate(async () => {
      return new Promise((resolve) => {
        const timeout = setTimeout(resolve, 5000); // Angular can be slow

        try {
          if (window.getAllAngularTestabilities) {
            const testabilities = window.getAllAngularTestabilities();
            if (testabilities && testabilities.length > 0) {
              let completed = 0;
              testabilities.forEach(testability => {
                testability.whenStable(() => {
                  completed++;
                  if (completed === testabilities.length) {
                    clearTimeout(timeout);
                    resolve();
                  }
                });
              });
              return;
            }
          }
        } catch (e) {}

        clearTimeout(timeout);
        resolve();
      });
    });

    await new Promise(r => setTimeout(r, 1000));
  }

  /**
   * Wait for Svelte
   * @private
   */
  async _waitForSvelte() {
    // Svelte doesn't have a global API, just wait for DOM stability
    await this._waitGeneric();
  }

  /**
   * Wait for Ember
   * @private
   */
  async _waitForEmber() {
    await this.page.evaluate(async () => {
      return new Promise((resolve) => {
        const timeout = setTimeout(resolve, 3000);

        if (window.Ember && window.Ember.run) {
          window.Ember.run.later(() => {
            clearTimeout(timeout);
            resolve();
          }, 100);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Generic wait for unknown frameworks
   * @private
   */
  async _waitGeneric() {
    // Wait for network idle + DOM stability
    await this.page.waitForNetworkIdle({ timeout: 5000, idleTime: 500 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
  }

  /**
   * Detect client-side routes
   * @returns {Promise<Array<string>>}
   */
  async discoverRoutes() {
    console.log(`      [FRAMEWORK] Discovering routes...`);

    const routes = await this.page.evaluate((framework) => {
      const routes = new Set();

      try {
        switch (framework) {
          case 'react':
          case 'nextjs':
            // Look for React Router routes
            if (window.__REACT_ROUTER__) {
              // Extract from React Router
            }

            // Check Next.js pages
            if (window.__NEXT_DATA__) {
              routes.add(window.__NEXT_DATA__.page);
            }
            break;

          case 'vue':
          case 'nuxtjs':
            // Vue Router
            if (window.$router) {
              const router = window.$router;
              router.options.routes?.forEach(route => {
                if (route.path) routes.add(route.path);
              });
            }

            // Nuxt routes
            if (window.$nuxt && window.$nuxt.$router) {
              window.$nuxt.$router.options.routes?.forEach(route => {
                if (route.path) routes.add(route.path);
              });
            }
            break;

          case 'angular':
            // Angular router
            try {
              const injector = window.ng?.probe(document.body)?.injector;
              if (injector) {
                const router = injector.get('Router');
                router.config?.forEach(route => {
                  if (route.path) routes.add('/' + route.path);
                });
              }
            } catch (e) {}
            break;
        }

        // Generic route discovery from DOM
        const selectors = [
          'a[href^="/"]',
          '[routerLink]',
          '[to^="/"]',
          '[data-route]',
          'nav a',
          '[role="navigation"] a'
        ];

        selectors.forEach(selector => {
          try {
            document.querySelectorAll(selector).forEach(el => {
              const link = el.getAttribute('href') ||
                           el.getAttribute('routerLink') ||
                           el.getAttribute('to') ||
                           el.getAttribute('data-route');

              if (link && !link.startsWith('http') && !link.startsWith('#') && !link.startsWith('javascript:')) {
                routes.add(link);
              }
            });
          } catch (e) {}
        });
      } catch (e) {
        console.error('Route discovery error:', e);
      }

      return Array.from(routes);
    }, this.framework);

    console.log(`      [FRAMEWORK] Found ${routes.length} routes:`, routes.slice(0, 10));
    return routes;
  }
}

module.exports = FrameworkDetector;
