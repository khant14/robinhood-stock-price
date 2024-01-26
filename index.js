const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
let browser;
let pageMap = new Map();
const PORT = process.env.PORT || 8001;
const BLOCKED_RESOURCES = ['image', 'stylesheet', 'ping', 'font'];

(async () => {
  // Launch the browser and open a new blank page
  browser = await puppeteer.launch({
    args: [
      '--no-sandbox', '--disable-setuid-sandbox'
    ]
  });

  const createPage = async (ticker) => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    // Block content for loading faster
    page.on("request", (request) => {
      if (!request.url().includes('robinhood') || BLOCKED_RESOURCES.includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
    // Set screen size
    await page.setViewport({ width: 100, height: 100 });
    // Navigate the page to a URL
    await page.goto(`https://robinhood.com/us/en/stocks/${ticker}/`);
    // Wait for page load
    await page.waitForSelector('#sdp-market-price');
    // Save page tab for future
    pageMap.set(ticker, page);

    return page;
  }

  app.get('/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker;
      const page = pageMap.has(ticker) ? pageMap.get(ticker) : await createPage(ticker);

      // Locate the price.
      const element = await page.$(".css-whh5e5");
      let value = await page.evaluate(el => el.textContent, element)
      res.send(value);
    } catch (e) {
      res.send('Error');
    }
  });

  app.listen(PORT, () =>
    console.log(`Listening on port: ${PORT}!`),
  );
})();
