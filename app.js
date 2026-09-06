// --- Live data state ---
let liveDataMap = {}; // ticker -> { price, pe, roa, fetchedAt } or undefined if not fetched/failed
let lastFetchTime = null;

function getSavedApiKey(){
  try{ return localStorage.getItem("finnhubApiKey") || ""; }
  catch(e){ return ""; }
}
function saveApiKey(key){
  try{ localStorage.setItem("finnhubApiKey", key); }
  catch(e){ /* localStorage unavailable */ }
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function fetchFinnhubQuote(ticker, apiKey){
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`);
  const data = await res.json();
  if(data.error) throw new Error(data.error);
  if(data.c === undefined || data.c === 0) throw new Error("no price returned");
  return data.c; // current price
}

async function fetchFinnhubMetrics(ticker, apiKey){
  const res = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${apiKey}`);
  const data = await res.json();
  if(data.error) throw new Error(data.error);
  const m = data.metric || {};
  const pe = m.peExclExtraTTM ?? m.peTTM ?? m.peBasicExclExtraTTM;
  const roa = m.roaTTM ?? m.roaRfy;
  return { pe, roa };
}

async function fetchLiveDataForAllAssets(){
  const statusEl = document.getElementById("fetchStatus");
  const apiKey = getSavedApiKey();
  if(!apiKey){
    statusEl.textContent = "Add and save a Finnhub API key first.";
    statusEl.style.color = "var(--amber)";
    return;
  }

  statusEl.textContent = "Fetching live data…";
  statusEl.style.color = "var(--text-secondary)";

  let successCount = 0;
  let failCount = 0;
  const failedTickers = [];

  const workingAssets = getWorkingData();
  for(const asset of workingAssets){
    try{
      const [price, metrics] = await Promise.all([
        fetchFinnhubQuote(asset.ticker, apiKey),
        fetchFinnhubMetrics(asset.ticker, apiKey)
      ]);
      liveDataMap[asset.ticker] = {
        price: price,
        pe: (metrics.pe !== undefined && metrics.pe !== null && !isNaN(metrics.pe)) ? metrics.pe : undefined,
        roa: (metrics.roa !== undefined && metrics.roa !== null && !isNaN(metrics.roa)) ? metrics.roa : undefined,
      };
      successCount++;
    }catch(err){
      liveDataMap[asset.ticker] = undefined;
      failCount++;
      failedTickers.push(asset.ticker);
    }
    // Stagger calls to stay well under Finnhub's free-tier rate limit (60/min).
    await sleep(120);
  }

  lastFetchTime = new Date();
  runMatrixOptimization();

  if(failCount === 0){
    statusEl.textContent = `Live data updated for all ${successCount} tickers at ${lastFetchTime.toLocaleTimeString()}.`;
    statusEl.style.color = "var(--emerald)";
  } else {
    statusEl.textContent = `Updated ${successCount}/${workingAssets.length} tickers at ${lastFetchTime.toLocaleTimeString()}. Fallback (static) data used for: ${failedTickers.join(", ")}.`;
    statusEl.style.color = "var(--amber)";
  }
}

// --- Asset management (add/remove), persisted in localStorage ---
function getCustomAssets(){
  try{ return JSON.parse(localStorage.getItem("customAssets") || "[]"); }
  catch(e){ return []; }
}
function saveCustomAssets(list){
  try{ localStorage.setItem("customAssets", JSON.stringify(list)); }
  catch(e){ /* localStorage unavailable */ }
}
function getRemovedTickers(){
  try{ return JSON.parse(localStorage.getItem("removedTickers") || "[]"); }
  catch(e){ return []; }
}
function saveRemovedTickers(list){
  try{ localStorage.setItem("removedTickers", JSON.stringify(list)); }
  catch(e){ /* localStorage unavailable */ }
}

function getWorkingData(){
  const removed = getRemovedTickers();
  const base = marketData.filter(a => !removed.includes(a.ticker));
  const custom = getCustomAssets();
  return [...base, ...custom];
}

function addAsset({ ticker, name, targetPrice, stability, growth }){
  const custom = getCustomAssets();
  const removed = getRemovedTickers();
  // If this ticker was previously removed from the base list, un-remove it
  // instead of creating a duplicate when the user re-adds the same symbol.
  const newRemoved = removed.filter(t => t !== ticker);
  saveRemovedTickers(newRemoved);

  const existingIdx = custom.findIndex(a => a.ticker === ticker);
  const newAsset = {
    ticker, name,
    roa: 0, pe: 0, currentPrice: targetPrice || 1, // placeholders until a live fetch runs
    targetPrice: targetPrice || 0,
    stability: stability || "Not yet rated.",
    growth: growth || "Unclassified"
  };
  if(existingIdx >= 0){
    custom[existingIdx] = newAsset;
  } else {
    custom.push(newAsset);
  }
  saveCustomAssets(custom);
}

function removeAsset(ticker){
  // Remove from custom list if it's a user-added asset...
  const custom = getCustomAssets().filter(a => a.ticker !== ticker);
  saveCustomAssets(custom);
  // ...and also mark base-list tickers as removed so they stay hidden.
  const removed = getRemovedTickers();
  if(!removed.includes(ticker)){
    removed.push(ticker);
    saveRemovedTickers(removed);
  }
}

function resetAssetsToDefault(){
  saveCustomAssets([]);
  saveRemovedTickers([]);
}

function renderRemoveList(){
  const container = document.getElementById("removeList");
  if(!container) return;
  container.innerHTML = "";
  const working = getWorkingData();
  if(working.length === 0){
    container.innerHTML = `<span style="color:var(--text-secondary);">No assets in the table.</span>`;
    return;
  }
  working.forEach(asset => {
    const chip = document.createElement("div");
    chip.className = "remove-chip";
    chip.innerHTML = `<span>${asset.ticker}</span><button data-ticker="${asset.ticker}" title="Remove ${asset.ticker}">&times;</button>`;
    chip.querySelector("button").addEventListener("click", (e) => {
      const t = e.target.getAttribute("data-ticker");
      removeAsset(t);
      renderRemoveList();
      runMatrixOptimization();
    });
    container.appendChild(chip);
  });
}

document.getElementById('optimizeBtn').addEventListener('click', runMatrixOptimization);

function runMatrixOptimization() {
  const mandate = document.getElementById('riskProfile').value;
  const tbody = document.querySelector('#resultsTable tbody');
  tbody.innerHTML = '';

  const workingData = getWorkingData();

  let processedAssets = workingData.map(asset => {
    const live = liveDataMap[asset.ticker];
    const currentPrice = (live && live.price !== undefined) ? live.price : asset.currentPrice;
    const pe = (live && live.pe !== undefined) ? live.pe : asset.pe;
    const roa = (live && live.roa !== undefined) ? live.roa : asset.roa;
    const isLive = !!(live && live.price !== undefined);

    let upsidePercentage = (asset.targetPrice - currentPrice) / currentPrice;
    let attributionScore = 0;

    if (mandate === 'tactical') {
      attributionScore = upsidePercentage * 100;
    } else if (mandate === 'conservative') {
      if (asset.stability.startsWith("Ultra-High")) attributionScore += 60;
      if (asset.stability.startsWith("High Stability")) attributionScore += 35;
      attributionScore += (120 / (pe + 1));
      if (asset.growth.includes("Cyclical")) attributionScore -= 20;
    } else if (mandate === 'balanced') {
      attributionScore += roa * 1.2;
      attributionScore += upsidePercentage * 80;
    } else if (mandate === 'aggressive') {
      attributionScore += upsidePercentage * 180;
      attributionScore += roa * 0.8;
      if (asset.growth.includes("High") || asset.growth.includes("Moat")) attributionScore += 25;
    }

    return { ...asset, currentPrice, pe, roa, isLive, finalScore: Math.max(0.1, attributionScore), calculatedUpside: upsidePercentage };
  });

  const netMatrixScore = processedAssets.reduce((accum, item) => accum + item.finalScore, 0);

  processedAssets = processedAssets.map(item => {
    let targetAllocationWeight = (item.finalScore / netMatrixScore) * 100;
    return { ...item, allocationWeight: targetAllocationWeight };
  });

  if (mandate === 'tactical') {
    processedAssets.sort((a, b) => b.calculatedUpside - a.calculatedUpside);
  } else {
    processedAssets.sort((a, b) => b.allocationWeight - a.allocationWeight);
  }

  processedAssets.forEach(item => {
    const rowElement = document.createElement('tr');
    const livenessBadge = item.isLive
      ? `<span style="color:var(--emerald); font-size:0.75rem; font-weight:600;">● LIVE</span>`
      : `<span style="color:var(--text-secondary); font-size:0.75rem; font-weight:600;">○ static</span>`;
    rowElement.innerHTML = `
      <td><span class="ticker-txt">${item.ticker}</span><br>${livenessBadge}</td>
      <td><strong>${item.name}</strong></td>
      <td>${item.roa.toFixed(2)}%</td>
      <td>${item.pe.toFixed(2)}&times;</td>
      <td>$${item.currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      <td>$${item.targetPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span style="color:var(--text-secondary); font-size:0.75rem;">(static)</span></td>
      <td style="color: ${item.calculatedUpside >= 0 ? 'var(--emerald)' : '#ef4444'}; font-weight: 600;">
        ${item.calculatedUpside >= 0 ? '+' : ''}${(item.calculatedUpside * 100).toFixed(1)}%
      </td>
      <td class="moat-cell"><span style="font-size: 0.88rem; color: var(--text-secondary);">${item.stability}</span></td>
      <td><span class="allocation-badge">${item.allocationWeight.toFixed(2)}%</span></td>
    `;
    tbody.appendChild(rowElement);
  });
}

// Default execution initialization
runMatrixOptimization();

// --- Wire up Add/Remove asset panel ---
try{
  const tabAddBtn = document.getElementById("tabAddBtn");
  const tabRemoveBtn = document.getElementById("tabRemoveBtn");
  const addPanel = document.getElementById("addPanel");
  const removePanel = document.getElementById("removePanel");

  if(tabAddBtn && tabRemoveBtn && addPanel && removePanel){
    tabAddBtn.addEventListener("click", () => {
      addPanel.style.display = "block";
      removePanel.style.display = "none";
      tabAddBtn.classList.add("active-tab");
      tabRemoveBtn.classList.remove("active-tab");
    });
    tabRemoveBtn.addEventListener("click", () => {
      addPanel.style.display = "none";
      removePanel.style.display = "block";
      tabRemoveBtn.classList.add("active-tab");
      tabAddBtn.classList.remove("active-tab");
      renderRemoveList();
    });
  } else {
    console.warn("Add/Remove tab elements missing — index.html may be out of date.");
  }

  const addAssetBtn = document.getElementById("addAssetBtn");
  if(addAssetBtn){
    addAssetBtn.addEventListener("click", () => {
      const ticker = document.getElementById("newTicker").value.trim().toUpperCase();
      const name = document.getElementById("newName").value.trim();
      const targetPrice = parseFloat(document.getElementById("newTarget").value);
      const stability = document.getElementById("newStability").value.trim();
      const growth = document.getElementById("newGrowth").value.trim();
      const statusEl = document.getElementById("addStatus");

      if(!ticker || !name){
        statusEl.textContent = "Ticker and Company Name are required.";
        statusEl.style.color = "var(--amber)";
        return;
      }

      addAsset({ ticker, name, targetPrice: isNaN(targetPrice) ? 0 : targetPrice, stability, growth });
      runMatrixOptimization();

      statusEl.textContent = `${ticker} added. Click "Fetch live data" above to pull its real price/P/E/ROA.`;
      statusEl.style.color = "var(--emerald)";

      document.getElementById("newTicker").value = "";
      document.getElementById("newName").value = "";
      document.getElementById("newTarget").value = "";
      document.getElementById("newStability").value = "";
      document.getElementById("newGrowth").value = "";
    });
  } else {
    console.warn("addAssetBtn not found — index.html may be out of date.");
  }

  const resetAssetsBtn = document.getElementById("resetAssetsBtn");
  if(resetAssetsBtn){
    resetAssetsBtn.addEventListener("click", () => {
      resetAssetsToDefault();
      renderRemoveList();
      runMatrixOptimization();
    });
  }

  renderRemoveList();
}catch(err){
  console.error("Failed to wire up Add/Remove asset panel:", err);
}

// --- Wire up live-data controls (defensive: won't break if elements are missing) ---
try{
  const apiKeyEl = document.getElementById("apiKey");
  if(apiKeyEl) apiKeyEl.value = getSavedApiKey();

  const saveKeyBtn = document.getElementById("saveKeyBtn");
  if(saveKeyBtn){
    saveKeyBtn.addEventListener("click", () => {
      const key = document.getElementById("apiKey").value.trim();
      saveApiKey(key);
      const statusEl = document.getElementById("fetchStatus");
      if(statusEl){
        statusEl.textContent = "Key saved in this browser.";
        statusEl.style.color = "var(--emerald)";
      }
    });
  } else {
    console.warn("saveKeyBtn not found in the page — index.html may be out of date.");
  }

  const fetchLiveBtn = document.getElementById("fetchLiveBtn");
  if(fetchLiveBtn){
    fetchLiveBtn.addEventListener("click", fetchLiveDataForAllAssets);
  } else {
    console.warn("fetchLiveBtn not found in the page — index.html may be out of date.");
  }
}catch(err){
  console.error("Failed to wire up live-data controls:", err);
}

