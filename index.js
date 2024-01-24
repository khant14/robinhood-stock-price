const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
let browser;
let page;
let searchTicker;

(async () => {
  // Launch the browser and open a new blank page
  browser = await puppeteer.launch();
  page = await browser.newPage();

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

  app.get('/:ticker', async (req, res) => {
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
  });

  app.listen(process.env.PORT, () =>
    console.log(`Listening on port: ${process.env.PORT}!`),
  );
})();
