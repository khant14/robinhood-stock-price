const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
let browser;
let pageMap = new Map();
let priceMap = new Map();
const PORT = process.env.PORT || 8003;
const BLOCKED_RESOURCES = ['image', 'stylesheet', 'ping', 'font'];

(async () => {
  // Launch the browser and open a new blank page
  browser = await puppeteer.launch({
    args: [
      '--no-sandbox', '--disable-setuid-sandbox'
    ]
  });

  const createPage = async (ticker, type = 'stocks') => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    // Block content for loading faster
    page.on("request", request => {
      if (BLOCKED_RESOURCES.includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
    // Listen for stock price change
    page.on('response', async (response) => {
      try {
        if (response.url().includes('quotes')) {
          const stockQuotes = await response.json();
          const symbol = stockQuotes.results ? stockQuotes.results[0].symbol : stockQuotes.symbol;
          priceMap.set(symbol, stockQuotes.results ? stockQuotes.results[0] : stockQuotes);
        }
      } catch (e) { }
    });
    // Set screen size
    await page.setViewport({ width: 100, height: 100 });
    // Navigate the page to a URL
    await page.goto(`https://robinhood.com/us/en/${type}/${ticker}/`, { waitUntil: 'networkidle0' });
    // Save page tab for future
    pageMap.set(ticker, page);
  }

  app.get('/stocks/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker;
      if (!pageMap.has(ticker)) await createPage(ticker, 'stocks');
      const stockQuote = priceMap.get(ticker);

      res.send(stockQuote);
    } catch (e) {
      res.send('Error');
    }
  });

  app.get('/crypto/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker;
      if (!pageMap.has(ticker)) await createPage(ticker, 'crypto');
      const stockQuote = priceMap.get(`${ticker}USD`);

      res.send(stockQuote);
    } catch (e) {
      res.send('Error');
    }
  });

  app.listen(PORT, () =>
    console.log(`Listening on port: ${PORT}!`),
  );
})();
