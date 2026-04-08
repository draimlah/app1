import { chromium } from 'playwright';

async function test() {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    console.log('Title:', await page.title());
    await browser.close();
    console.log('Playwright is working!');
  } catch (err) {
    console.error('Playwright failed:', err);
    process.exit(1);
  }
}

test();
