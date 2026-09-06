// APP.JS BUILD: v4.3 (repair stuck tickers with Clear button)
console.log("app.js loaded — build v4.3 (repair stuck tickers with Clear button)");

// --- Live data state ---
let liveDataMap = {}; // ticker -> { price, pe, roa, fetchedAt } or undefined if not fetched/failed
let fetchFailedTickers = new Set(); // tickers where a live fetch was attempted but errored out
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

async function fetchFinnhubMetrics(ticker, apiKey, livePrice){
  const res = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${apiKey}`);
  const data = await res.json();
  if(data.error) throw new Error(data.error);
  const m = data.metric || {};

  let pe = m.peExclExtraTTM ?? m.peTTM ?? m.peBasicExclExtraTTM ?? m.peNormalizedAnnual ?? m.peInclExtraTTM;
  let peSource = pe !== undefined ? "finnhub-ratio" : null;

  // Fallback: Finnhub often has raw EPS even when it lacks a pre-computed P/E
  // ratio (common for recent IPOs/SPACs and thinly-covered small caps).
  if(pe === undefined || pe === null || isNaN(pe)){
    const eps = m.epsExclExtraItemsTTM ?? m.epsInclExtraItemsTTM ?? m.epsTTM ?? m.epsNormalizedAnnual;
    if(eps !== undefined && eps !== null && !isNaN(eps) && eps !== 0 && livePrice){
      pe = livePrice / eps;
      peSource = "computed-from-eps";
    }
  }

  const roa = m.roaTTM ?? m.roaRfy ?? m.roaAnnual;

  return {
    pe: (pe !== undefined && pe !== null && !isNaN(pe)) ? pe : undefined,
    roa: (roa !== undefined && roa !== null && !isNaN(roa)) ? roa : undefined,
    peSource
  };
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
  const noPeTickers = [];

  const workingAssets = getWorkingData();
  for(const asset of workingAssets){
    try{
      const price = await fetchFinnhubQuote(asset.ticker, apiKey);
      const metrics = await fetchFinnhubMetrics(asset.ticker, apiKey, price);
      liveDataMap[asset.ticker] = {
        price: price,
        pe: metrics.pe,
        roa: metrics.roa,
      };
      fetchFailedTickers.delete(asset.ticker);
      if(metrics.pe === undefined) noPeTickers.push(asset.ticker);
      successCount++;
    }catch(err){
      liveDataMap[asset.ticker] = undefined;
      fetchFailedTickers.add(asset.ticker);
      failCount++;
      failedTickers.push(asset.ticker);
    }
    // Stagger calls to stay well under Finnhub's free-tier rate limit (60/min).
    await sleep(120);
  }

  lastFetchTime = new Date();
  runMatrixOptimization();

  let msgParts = [];
  if(failCount === 0){
    msgParts.push(`Live data updated for all ${successCount} tickers at ${lastFetchTime.toLocaleTimeString()}.`);
  } else {
    msgParts.push(`Updated ${successCount}/${workingAssets.length} tickers at ${lastFetchTime.toLocaleTimeString()}. Fully failed (using static fallback): ${failedTickers.join(", ")}.`);
  }
  if(noPeTickers.length > 0){
    msgParts.push(`No P/E data available from Finnhub for: ${noPeTickers.join(", ")} (common for recent IPOs/SPACs or thinly-covered small caps — price/ROA still updated where possible).`);
  }
  statusEl.textContent = msgParts.join(" ");
  statusEl.style.color = failCount === 0 && noPeTickers.length === 0 ? "var(--emerald)" : "var(--amber)";
}

// --- Multi-list portfolio management, persisted in localStorage ---
// Ticker DATA (name, price, targets, stability, etc.) is now stored globally,
// shared across every list — so editing AAPL in one list updates it everywhere
// AAPL appears. Each list only tracks WHICH tickers it includes.
// List shape: { name, useBaseData: bool, includedCustomTickers: [...], removedTickers: [...] }
const DEFAULT_LIST_ID = "list-default";

function getGlobalOverrides(){
  try{ return JSON.parse(localStorage.getItem("globalOverrides") || "{}"); }
  catch(e){ return {}; }
}
function saveGlobalOverrides(ov){
  try{ localStorage.setItem("globalOverrides", JSON.stringify(ov)); }
  catch(e){ /* localStorage unavailable */ }
}
function setGlobalOverride(ticker, field, value){
  const ov = getGlobalOverrides();
  if(!ov[ticker]) ov[ticker] = {};
  ov[ticker][field] = value;
  saveGlobalOverrides(ov);
}

function getAllLists(){
  let lists = null;
  try{
    const raw = localStorage.getItem("portfolioLists");
    if(raw) lists = JSON.parse(raw);
  }catch(e){ /* fall through to fresh default */ }

  if(!lists){
    // Migrate any pre-existing single-list data (from before multi-list support existed at all).
    let migratedCustom = [], migratedRemoved = [];
    try{ migratedCustom = JSON.parse(localStorage.getItem("customAssets") || "[]"); }catch(e){}
    try{ migratedRemoved = JSON.parse(localStorage.getItem("removedTickers") || "[]"); }catch(e){}
    lists = {
      [DEFAULT_LIST_ID]: { name: "Sample List", useBaseData: true, customAssets: migratedCustom, removedTickers: migratedRemoved, overrides: {} }
    };
  }

  // One-time, self-healing migration from the older per-list overrides/customAssets
  // schema into the global-overrides model. Runs automatically, loses nothing.
  let changed = false;
  const globalOv = getGlobalOverrides();

  Object.keys(lists).forEach(id => {
    const list = lists[id];

    if(Array.isArray(list.customAssets) && list.customAssets.length && typeof list.customAssets[0] === 'object'){
      list.customAssets.forEach(asset => {
        if(!globalOv[asset.ticker]) globalOv[asset.ticker] = {};
        Object.keys(asset).forEach(k => {
          // roa/pe/currentPrice were always just placeholder shell values in the old
          // schema (editable cells didn't exist yet), never genuine manual edits —
          // migrating them as overrides would permanently block live data.
          if(k === 'ticker' || k === 'roa' || k === 'pe' || k === 'currentPrice') return;
          if(globalOv[asset.ticker][k] === undefined) globalOv[asset.ticker][k] = asset[k];
        });
      });
      list.includedCustomTickers = [...new Set([...(list.includedCustomTickers || []), ...list.customAssets.map(a => a.ticker)])];
      delete list.customAssets;
      changed = true;
    }

    if(list.overrides && typeof list.overrides === 'object' && Object.keys(list.overrides).length){
      Object.keys(list.overrides).forEach(ticker => {
        if(!globalOv[ticker]) globalOv[ticker] = {};
        Object.keys(list.overrides[ticker]).forEach(field => {
          globalOv[ticker][field] = list.overrides[ticker][field];
        });
      });
      delete list.overrides;
      changed = true;
    }

    if(list.includedCustomTickers === undefined){ list.includedCustomTickers = []; changed = true; }
    if(list.useBaseData === undefined){ list.useBaseData = (id === DEFAULT_LIST_ID); changed = true; }

    // Auto-upgrade an untouched default list name; never touches a list the user renamed.
    if(id === DEFAULT_LIST_ID && list.name === "List 1"){ list.name = "Sample List"; changed = true; }
  });

  if(changed){
    saveGlobalOverrides(globalOv);
    saveAllLists(lists);
  }

  return lists;
}

function saveAllLists(lists){
  try{ localStorage.setItem("portfolioLists", JSON.stringify(lists)); }
  catch(e){ /* localStorage unavailable */ }
}

function getActiveListId(){
  try{
    const id = localStorage.getItem("activeListId");
    const lists = getAllLists();
    if(id && lists[id]) return id;
  }catch(e){ /* fall through */ }
  const lists = getAllLists();
  const firstId = Object.keys(lists)[0] || DEFAULT_LIST_ID;
  setActiveListId(firstId);
  return firstId;
}

function setActiveListId(id){
  try{ localStorage.setItem("activeListId", id); }
  catch(e){ /* localStorage unavailable */ }
}

function getActiveList(){
  const lists = getAllLists();
  const id = getActiveListId();
  if(!lists[id]){
    lists[id] = { name: "Sample List", useBaseData: true, includedCustomTickers: [], removedTickers: [] };
    saveAllLists(lists);
  }
  return lists[id];
}

function updateActiveList(mutatorFn){
  const lists = getAllLists();
  const id = getActiveListId();
  if(!lists[id]) lists[id] = { name: "Sample List", useBaseData: true, includedCustomTickers: [], removedTickers: [] };
  mutatorFn(lists[id]);
  saveAllLists(lists);
}

function createList(name){
  const lists = getAllLists();
  const id = "list-" + Date.now();
  lists[id] = { name: name || "New List", useBaseData: false, includedCustomTickers: [], removedTickers: [] };
  saveAllLists(lists);
  setActiveListId(id);
  return id;
}

function renameActiveList(newName){
  updateActiveList(list => { list.name = newName; });
}

function deleteActiveList(){
  const lists = getAllLists();
  const id = getActiveListId();
  delete lists[id];
  const remainingIds = Object.keys(lists);
  if(remainingIds.length === 0){
    lists[DEFAULT_LIST_ID] = { name: "Sample List", useBaseData: true, includedCustomTickers: [], removedTickers: [] };
    saveAllLists(lists);
    setActiveListId(DEFAULT_LIST_ID);
  } else {
    saveAllLists(lists);
    setActiveListId(remainingIds[0]);
  }
}

function getWorkingData(){
  const list = getActiveList();
  const removed = list.removedTickers || [];
  const overrides = getGlobalOverrides();
  const baseTickers = list.useBaseData ? marketData.filter(a => !removed.includes(a.ticker)).map(a => a.ticker) : [];
  const customTickers = (list.includedCustomTickers || []).filter(t => !removed.includes(t));
  const allTickers = [...new Set([...baseTickers, ...customTickers])];

  return allTickers.map(ticker => {
    const baseAsset = marketData.find(a => a.ticker === ticker);
    const shell = baseAsset
      ? { ...baseAsset }
      : { ticker, name: ticker, roa: 0, pe: 0, currentPrice: 1, targetPrice: 0, stability: "Not yet rated.", growth: "Unclassified" };
    return { ...shell, _overrides: overrides[ticker] || {} };
  });
}

function addAsset({ ticker, name, targetPrice, stability, growth }){
  const baseAsset = marketData.find(a => a.ticker === ticker);
  const existingOv = getGlobalOverrides()[ticker] || {};
  setGlobalOverride(ticker, 'name', name || existingOv.name || (baseAsset && baseAsset.name) || ticker);
  if(targetPrice) setGlobalOverride(ticker, 'targetPrice', targetPrice);
  if(stability) setGlobalOverride(ticker, 'stability', stability);
  if(growth) setGlobalOverride(ticker, 'growth', growth);
  if(existingOv.dateAdded === undefined) setGlobalOverride(ticker, 'dateAdded', Date.now());

  updateActiveList(list => {
    list.removedTickers = (list.removedTickers || []).filter(t => t !== ticker);
    const inc = list.includedCustomTickers || [];
    if(!inc.includes(ticker)) inc.push(ticker);
    list.includedCustomTickers = inc;
  });
}

function removeAsset(ticker){
  // Removes the ticker from THIS list only — its edited data stays available
  // globally in case it's re-added here or added to another list later.
  updateActiveList(list => {
    list.includedCustomTickers = (list.includedCustomTickers || []).filter(t => t !== ticker);
    const removed = list.removedTickers || [];
    if(!removed.includes(ticker)) removed.push(ticker);
    list.removedTickers = removed;
  });
}

function restoreAllBaseTickers(){
  // Un-hides any base tickers previously removed from this list, WITHOUT
  // touching custom additions — fixes "a base ticker like NVDA disappeared"
  // without wiping anything else you've built in this list.
  updateActiveList(list => { list.removedTickers = []; });
}

function resetAssetsToDefault(){
  updateActiveList(list => {
    list.includedCustomTickers = [];
    list.removedTickers = [];
  });
}

function setCellOverride(ticker, field, value){
  setGlobalOverride(ticker, field, value);
}

function clearPriceOverrides(ticker){
  const ov = getGlobalOverrides();
  if(ov[ticker]){
    delete ov[ticker].currentPrice;
    delete ov[ticker].pe;
    delete ov[ticker].roa;
    saveGlobalOverrides(ov);
  }
}

function renameTicker(oldTicker, newTicker){
  if(!newTicker || newTicker === oldTicker) return;
  // Snapshot the OLD ticker's current effective values (base + any override)
  // so nothing is lost when it becomes a new symbol.
  const current = getWorkingData().find(a => a.ticker === oldTicker);
  if(!current) return;
  const ov = current._overrides || {};
  const snapshot = {
    name: ov.name !== undefined ? ov.name : current.name,
    roa: ov.roa !== undefined ? ov.roa : current.roa,
    pe: ov.pe !== undefined ? ov.pe : current.pe,
    currentPrice: ov.currentPrice !== undefined ? ov.currentPrice : current.currentPrice,
    targetPrice: ov.targetPrice !== undefined ? ov.targetPrice : current.targetPrice,
    stability: ov.stability !== undefined ? ov.stability : current.stability,
    growth: ov.growth !== undefined ? ov.growth : current.growth,
  };
  const globalOv = getGlobalOverrides();
  globalOv[newTicker] = { ...(globalOv[newTicker] || {}), ...snapshot };
  saveGlobalOverrides(globalOv);

  // Swap membership in the ACTIVE list only: hide old symbol here, include new one.
  updateActiveList(list => {
    list.includedCustomTickers = (list.includedCustomTickers || []).filter(t => t !== oldTicker);
    if(!list.includedCustomTickers.includes(newTicker)) list.includedCustomTickers.push(newTicker);
    const removed = list.removedTickers || [];
    if(!removed.includes(oldTicker)) removed.push(oldTicker);
    list.removedTickers = removed.filter(t => t !== newTicker);
  });

  // Live data was fetched under the old symbol; it doesn't necessarily apply to
  // the new one, so clear it and let the next "Fetch live data" refresh it properly.
  delete liveDataMap[oldTicker];
}

function renderListSelector(){
  const selector = document.getElementById("listSelector");
  const heading = document.getElementById("activeListHeading");
  const lists = getAllLists();
  const activeId = getActiveListId();

  if(selector){
    selector.innerHTML = "";
    Object.keys(lists).forEach(id => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = lists[id].name;
      if(id === activeId) opt.selected = true;
      selector.appendChild(opt);
    });
  }

  if(heading){
    const activeName = lists[activeId] ? lists[activeId].name : "—";
    const count = getWorkingData().length;
    heading.textContent = `Now viewing: ${activeName} (${count} assets)`;
  }
}

function showListActionStatus(message){
  const el = document.getElementById("listActionStatus");
  if(!el) return;
  el.textContent = message;
  setTimeout(() => { if(el.textContent === message) el.textContent = ""; }, 4000);
}

function renderRemoveList(){
  const container = document.getElementById("removeList");
  if(!container) return;
  container.innerHTML = "";
  const working = getWorkingData();
  if(working.length === 0){
    container.innerHTML = `<span style="color:var(--text-secondary);">No assets in this list.</span>`;
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
document.getElementById('sortMode')?.addEventListener('change', runMatrixOptimization);

function runMatrixOptimization() {
  const mandate = document.getElementById('riskProfile').value;
  const tbody = document.querySelector('#resultsTable tbody');
  tbody.innerHTML = '';

  const workingData = getWorkingData();

  let processedAssets = workingData.map(asset => {
    const ov = asset._overrides || {};
    const live = liveDataMap[asset.ticker];

    // Precedence for every editable field: manual override > live fetch > static default.
    const name = ov.name !== undefined ? ov.name : asset.name;
    const currentPrice = ov.currentPrice !== undefined ? ov.currentPrice : ((live && live.price !== undefined) ? live.price : asset.currentPrice);
    const pe = ov.pe !== undefined ? ov.pe : ((live && live.pe !== undefined) ? live.pe : asset.pe);
    const roa = ov.roa !== undefined ? ov.roa : ((live && live.roa !== undefined) ? live.roa : asset.roa);
    const targetPrice = ov.targetPrice !== undefined ? ov.targetPrice : asset.targetPrice;
    const stability = ov.stability !== undefined ? ov.stability : asset.stability;
    const growth = ov.growth !== undefined ? ov.growth : asset.growth;

    const priceRelevantOverride = ov.currentPrice !== undefined || ov.pe !== undefined || ov.roa !== undefined;
    const isLive = !!(live && live.price !== undefined) && !priceRelevantOverride;
    const isEdited = priceRelevantOverride;
    const fetchFailed = fetchFailedTickers.has(asset.ticker) && !priceRelevantOverride;

    let upsidePercentage = (targetPrice - currentPrice) / currentPrice;
    let attributionScore = 0;

    if (mandate === 'tactical') {
      attributionScore = upsidePercentage * 100;
    } else if (mandate === 'conservative') {
      if (stability.startsWith("Ultra-High")) attributionScore += 60;
      if (stability.startsWith("High Stability")) attributionScore += 35;
      attributionScore += (120 / (pe + 1));
      if (growth.includes("Cyclical")) attributionScore -= 20;
    } else if (mandate === 'balanced') {
      attributionScore += roa * 1.2;
      attributionScore += upsidePercentage * 80;
    } else if (mandate === 'aggressive') {
      attributionScore += upsidePercentage * 180;
      attributionScore += roa * 0.8;
      if (growth.includes("High") || growth.includes("Moat")) attributionScore += 25;
    }

    return { ticker: asset.ticker, name, currentPrice, pe, roa, targetPrice, stability, growth, isLive, isEdited, fetchFailed, dateAdded: (ov.dateAdded !== undefined ? ov.dateAdded : 0), finalScore: Math.max(0.1, attributionScore), calculatedUpside: upsidePercentage };
  });

  const netMatrixScore = processedAssets.reduce((accum, item) => accum + item.finalScore, 0);

  processedAssets = processedAssets.map(item => {
    let targetAllocationWeight = (item.finalScore / netMatrixScore) * 100;
    return { ...item, allocationWeight: targetAllocationWeight };
  });

  const sortMode = document.getElementById('sortMode') ? document.getElementById('sortMode').value : 'default';
  if(sortMode === 'alpha'){
    processedAssets.sort((a, b) => a.ticker.localeCompare(b.ticker));
  } else if(sortMode === 'date-new'){
    processedAssets.sort((a, b) => b.dateAdded - a.dateAdded);
  } else if(sortMode === 'date-old'){
    processedAssets.sort((a, b) => a.dateAdded - b.dateAdded);
  } else if (mandate === 'tactical') {
    processedAssets.sort((a, b) => b.calculatedUpside - a.calculatedUpside);
  } else {
    processedAssets.sort((a, b) => b.allocationWeight - a.allocationWeight);
  }

  processedAssets.forEach(item => {
    const rowElement = document.createElement('tr');

    let badge;
    if(item.isEdited) badge = `<span style="color:#a78bfa; font-size:0.75rem; font-weight:600;">✎ edited</span> <button class="clear-override-btn" data-ticker="${item.ticker}" title="Clear manual price/P-E/ROA override and restore live/static data" style="background:none; border:none; color:var(--text-secondary); font-size:0.7rem; text-decoration:underline; cursor:pointer; padding:0;">↺ clear</button>`;
    else if(item.isLive) badge = `<span style="color:var(--emerald); font-size:0.75rem; font-weight:600;">● LIVE</span>`;
    else if(item.fetchFailed) badge = `<span style="color:#ef4444; font-size:0.75rem; font-weight:600;" title="Finnhub couldn't return data for this ticker">⚠ fetch failed</span>`;
    else badge = `<span style="color:var(--text-secondary); font-size:0.75rem; font-weight:600;">○ static</span>`;

    rowElement.innerHTML = `
      <td>
        <input class="cell-input cell-input-ticker" data-ticker="${item.ticker}" data-field="__ticker_rename__" type="text" value="${item.ticker}"><br>${badge}
      </td>
      <td><input class="cell-input" data-ticker="${item.ticker}" data-field="name" data-resolved-value="${item.name.replace(/"/g,'&quot;')}" type="text" value="${item.name.replace(/"/g,'&quot;')}"></td>
      <td><input class="cell-input cell-input-num" data-ticker="${item.ticker}" data-field="roa" data-resolved-value="${item.roa}" type="number" step="0.01" value="${item.roa}"></td>
      <td><input class="cell-input cell-input-num" data-ticker="${item.ticker}" data-field="pe" data-resolved-value="${item.pe}" type="number" step="0.01" value="${item.pe}"></td>
      <td><input class="cell-input cell-input-num" data-ticker="${item.ticker}" data-field="currentPrice" data-resolved-value="${item.currentPrice}" type="number" step="0.01" value="${item.currentPrice}"></td>
      <td><input class="cell-input cell-input-num" data-ticker="${item.ticker}" data-field="targetPrice" data-resolved-value="${item.targetPrice}" type="number" step="0.01" value="${item.targetPrice}"></td>
      <td style="color: ${item.calculatedUpside >= 0 ? 'var(--emerald)' : '#ef4444'}; font-weight: 600;">
        ${item.calculatedUpside >= 0 ? '+' : ''}${(item.calculatedUpside * 100).toFixed(1)}%
      </td>
      <td class="moat-cell"><textarea class="cell-input cell-textarea" data-ticker="${item.ticker}" data-field="stability" data-resolved-value="${item.stability.replace(/"/g,'&quot;')}">${item.stability}</textarea></td>
      <td><span class="allocation-badge">${item.allocationWeight.toFixed(2)}%</span></td>
      <td><button class="row-delete-btn" data-ticker="${item.ticker}" title="Remove ${item.ticker} from this list">&times;</button></td>
    `;
    tbody.appendChild(rowElement);
  });

  wireUpEditableCells();
  wireUpRowDeleteButtons();
  wireUpClearOverrideButtons();
}

function wireUpRowDeleteButtons(){
  document.querySelectorAll('.row-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.target.getAttribute('data-ticker');
      removeAsset(ticker);
      runMatrixOptimization();
      renderRemoveList();
      renderListSelector();
    });
  });
}

function wireUpClearOverrideButtons(){
  document.querySelectorAll('.clear-override-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = e.target.getAttribute('data-ticker');
      clearPriceOverrides(ticker);
      runMatrixOptimization();
    });
  });
}

function wireUpEditableCells(){
  document.querySelectorAll('.cell-input').forEach(el => {
    el.addEventListener('change', (e) => {
      const ticker = e.target.getAttribute('data-ticker');
      const field = e.target.getAttribute('data-field');

      if(field === '__ticker_rename__'){
        const newTicker = e.target.value.trim().toUpperCase();
        if(!newTicker){
          e.target.value = ticker; // revert empty input
          return;
        }
        if(newTicker === ticker) return; // no change
        const alreadyInList = getWorkingData().some(a => a.ticker === newTicker);
        if(alreadyInList){
          alert(`${newTicker} is already in this list. Remove it first if you want to replace it.`);
          e.target.value = ticker;
          return;
        }
        renameTicker(ticker, newTicker);
        runMatrixOptimization();
        renderRemoveList();
        renderListSelector();
        return;
      }

      const isNum = e.target.classList.contains('cell-input-num');
      let value = e.target.value;
      if(isNum){
        value = parseFloat(value);
        if(isNaN(value)) return; // ignore invalid numeric input rather than corrupting the override
      }

      const resolvedRaw = e.target.getAttribute('data-resolved-value');
      const resolvedValue = isNum ? parseFloat(resolvedRaw) : resolvedRaw;
      const unchanged = isNum ? (value === resolvedValue) : (String(value) === String(resolvedValue));
      if(unchanged) return; // change event fired but nothing actually changed — don't create a phantom override

      setCellOverride(ticker, field, value);
      runMatrixOptimization();
    });
    // Prevent Enter key in text inputs from doing anything unexpected (like submitting).
    el.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' && el.tagName === 'INPUT'){
        e.preventDefault();
        el.blur();
      }
    });
  });
}

// Default execution initialization
runMatrixOptimization();

// --- Wire up portfolio list management ---
try{
  renderListSelector();

  const listSelector = document.getElementById("listSelector");
  if(listSelector){
    listSelector.addEventListener("change", (e) => {
      setActiveListId(e.target.value);
      renderRemoveList();
      renderListSelector();
      runMatrixOptimization();
      showListActionStatus(`Switched to "${getActiveList().name}".`);
    });
  }

  const newListBtn = document.getElementById("newListBtn");
  if(newListBtn){
    newListBtn.addEventListener("click", () => {
      const name = prompt("Name for the new list:", "List " + (Object.keys(getAllLists()).length + 1));
      if(name === null || name.trim() === "") return; // user cancelled
      createList(name.trim());
      renderListSelector();
      renderRemoveList();
      runMatrixOptimization();
      showListActionStatus(`Created and switched to "${name.trim()}". Use the dropdown above to switch between lists.`);
    });
  }

  const renameListBtn = document.getElementById("renameListBtn");
  if(renameListBtn){
    renameListBtn.addEventListener("click", () => {
      const current = getActiveList();
      const name = prompt("Rename this list:", current.name);
      if(name === null || name.trim() === "") return;
      renameActiveList(name.trim());
      renderListSelector();
      showListActionStatus(`Renamed to "${name.trim()}".`);
    });
  }

  const deleteListBtn = document.getElementById("deleteListBtn");
  if(deleteListBtn){
    deleteListBtn.addEventListener("click", () => {
      const current = getActiveList();
      const confirmed = confirm(`Delete "${current.name}"? This cannot be undone.`);
      if(!confirmed) return;
      deleteActiveList();
      renderListSelector();
      renderRemoveList();
      runMatrixOptimization();
      showListActionStatus(`Deleted "${current.name}". Now viewing "${getActiveList().name}".`);
    });
  }
}catch(err){
  console.error("Failed to wire up list management:", err);
}

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
      renderListSelector();
      showListActionStatus("List reset to default.");
    });
  }

  const restoreBaseBtn = document.getElementById("restoreBaseBtn");
  if(restoreBaseBtn){
    restoreBaseBtn.addEventListener("click", () => {
      restoreAllBaseTickers();
      renderRemoveList();
      runMatrixOptimization();
      renderListSelector();
      showListActionStatus("Restored any missing base tickers (custom additions kept).");
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

