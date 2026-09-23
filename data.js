// DATA.JS BUILD: v2 (Trimmed to exactly the 9-ticker "Sample List" a brand-new user
// starts with — NVDA, MU, AMZN, TSM, GOOGL, SNDK, PLTR, META, AAPL — removing the 21
// other legacy tickers that used to live here (from the old, retired 30-ticker sample
// list) since they're no longer part of any current default. IMPORTANT for anyone
// editing this file: it is NOT purely a "new user" template — it's the one shared,
// permanent data source every account's Portfolio Lists fall back to for any ticker
// that hasn't been overridden by "Fetch live data," Import Excel, or a manual edit.
// Removing a ticker here that an EXISTING account still uses as a base (non-custom)
// ticker doesn't delete that account's data, but it does mean that ticker's still-
// unfetched fields fall back to the same blank/zero defaults described below instead
// of vanishing — app.js's migrateLegacyMarketTickersToCustomIfNeeded() additionally
// promotes any such ticker to a "custom" entry on that account's list (once, the
// first time this version loads for that account) so it never disappears outright.
//
// Every field below is intentionally 0 (or "Med"/"" for the two non-numeric fields)
// rather than a plausible-looking real number. A brand-new user's first look at the
// Portfolio table should be an honest blank slate — not fabricated example data that
// could be mistaken for real, current market figures — paired with the "New User.
// Pending data when user activate live update." banner (see runMatrixOptimization in
// app.js) that appears automatically whenever every visible asset still has a zero
// Current Price, and disappears the moment any one of them gets real data from any
// source (Fetch live data, Import Excel, a paste-update, or a manual edit).
const marketData = [
  { ticker: "NVDA", name: "NVIDIA Corp.", roa: 0, pe: 0, currentPrice: 0, targetPrice: 0, stability: "Med", stabilityNotes: "", revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, beta: 0 },
  { ticker: "MU", name: "Micron Technology", roa: 0, pe: 0, currentPrice: 0, targetPrice: 0, stability: "Med", stabilityNotes: "", revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, beta: 0 },
  { ticker: "AMZN", name: "Amazon.com Inc.", roa: 0, pe: 0, currentPrice: 0, targetPrice: 0, stability: "Med", stabilityNotes: "", revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, beta: 0 },
  { ticker: "TSM", name: "TSMC", roa: 0, pe: 0, currentPrice: 0, targetPrice: 0, stability: "Med", stabilityNotes: "", revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, beta: 0 },
  { ticker: "GOOGL", name: "Alphabet / Google", roa: 0, pe: 0, currentPrice: 0, targetPrice: 0, stability: "Med", stabilityNotes: "", revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, beta: 0 },
  { ticker: "SNDK", name: "Sandisk Corp.", roa: 0, pe: 0, currentPrice: 0, targetPrice: 0, stability: "Med", stabilityNotes: "", revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, beta: 0 },
  { ticker: "PLTR", name: "Palantir Tech.", roa: 0, pe: 0, currentPrice: 0, targetPrice: 0, stability: "Med", stabilityNotes: "", revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, beta: 0 },
  { ticker: "META", name: "Meta Platforms", roa: 0, pe: 0, currentPrice: 0, targetPrice: 0, stability: "Med", stabilityNotes: "", revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, beta: 0 },
  { ticker: "AAPL", name: "Apple Inc.", roa: 0, pe: 0, currentPrice: 0, targetPrice: 0, stability: "Med", stabilityNotes: "", revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, beta: 0 }
];
