const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
let browser;
let page;
let searchTicker;
const PORT = process.env.PORT || 8001;
const BLOCKED_RESOURCES = ['image', 'stylesheet', 'ping', 'font'];

(async () => {
  // Launch the browser and open a new blank page
  browser = await puppeteer.launch({
    args: [
      '--no-sandbox', '--disable-setuid-sandbox'
    ]
  });
  page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (!request.url().includes('robinhood') || BLOCKED_RESOURCES.includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });

  // Set screen size
  await page.setViewport({ width: 100, height: 100 });

  app.get('/:ticker', async (req, res) => {
    try {
      // If user request a different ticker, navigate to page.
      if (searchTicker !== req.params.ticker) {
        searchTicker = req.params.ticker;

        // Navigate the page to a URL
        await page.goto(`https://robinhood.com/us/en/stocks/${searchTicker}/`);

        // Wait for page load
        await page.waitForSelector('#sdp-market-price');
      }

      // Locate the price. TODO: Find better way to get price
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
