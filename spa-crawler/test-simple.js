/**
 * Simple browser test
 */

const puppeteer = require('puppeteer');

async function main() {
  console.log('Testing browser connection...');

  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      // executablePath: '/path/to/chrome',  // Optional: specify custom Chrome path
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    console.log('Browser launched!');

    console.log('Creating page...');
    const page = await browser.newPage();
    console.log('Page created!');

    console.log('Navigating to http://angular.testsparker.com/...');
    await page.goto('http://angular.testsparker.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Page loaded!');

    const title = await page.title();
    console.log('Page title:', title);

    const url = page.url();
    console.log('Page URL:', url);

    await browser.close();
    console.log('Browser closed. Test successful!');

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
