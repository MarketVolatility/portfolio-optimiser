// APP.JS BUILD: v5.26 (Past Purchases multi-list, Word export, CDN retry, Missed Gain %)
console.log("app.js loaded — build v5.26 (Past Purchases multi-list, Word export, CDN retry, Missed Gain %)");

// --- Supabase auth (mandatory gate) + cross-device sync ---
// Design note: localStorage stays the fast synchronous source of truth the
// rest of the app already reads/writes. This layer mirrors the relevant keys
// to a single Supabase row per user: pulling on login (overwrites local with
// cloud), and pushing periodically + on demand while logged in. The whole app
// is hidden behind #authOverlay until a session is confirmed.
const SUPABASE_URL = "https://okbgjjnfxkbbryfgpyap.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cfTIXfQwai1dHSRJmzoqJg_nLHE4UhR";
// The pastPurchasesTickers/Values/DateAdded keys are the OLD (pre-duplicates)
// Past Purchases schema — no longer read or written directly, but kept in the
// sync list as a safety net so a device pulling an older cloud snapshot can
// still migrate it locally (see migratePastPurchasesRowsIfNeeded).
const SYNC_KEYS = ["portfolioLists", "globalOverrides", "customParams", "columnOrder", "activeListId", "apiKey", "pastPurchasesRows", "pastPurchasesParams", "pastPurchasesTickers", "pastPurchasesValues", "pastPurchasesDateAdded", "hiddenBuiltinColumns", "pastPurchasesLists", "activePastPurchasesListId"];

let authClient;
function getAuthClient(){
  if(authClient) return authClient;
  if(!window.supabase) throw new Error('The sign-in library could not load. Check your connection and reload.');
  let storage;
  try{ storage = window.sessionStorage; }catch(_){ /* private-browsing edge case */ }
  authClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage, persistSession: !!storage, autoRefreshToken: true, detectSessionInUrl: false }
  });
  authClient.auth.onAuthStateChange(event => {
    if(event === 'SIGNED_OUT'){ lockDashboard(); showAuthStep('loginStep'); }
  });
  return authClient;
}

function showAuthStep(id){
  document.querySelectorAll('.auth-step').forEach(el => el.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  document.querySelectorAll('.auth-message').forEach(el => { el.textContent = ''; el.className = 'auth-message'; });
}

function setAuthMessage(id, message, type=''){
  const el = document.getElementById(id);
  if(el){ el.textContent = message; el.className = 'auth-message ' + type; }
}

function authError(error){
  if(error.code === 'email_not_confirmed') return 'Email confirmation is still required by the server. Disable "Confirm email" in Supabase\'s Email provider settings.';
  if(/load failed|failed to fetch|network|fetch failed/i.test(error.message || ''))
    return 'Cannot reach the authentication service. Check your internet connection and try again.';
  return error.message || 'Authentication failed. Please try again.';
}

async function authAction(event, messageId, action){
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  if(button?.disabled) return false;
  if(button) button.disabled = true;
  setAuthMessage(messageId, 'Please wait…');
  try{ await action(getAuthClient().auth); }
  catch(error){ setAuthMessage(messageId, authError(error), 'error'); }
  finally{ if(button) button.disabled = false; }
  return false;
}

function lockDashboard(){
  const appShell = document.getElementById('appShell');
  const overlay = document.getElementById('authOverlay');
  if(appShell) appShell.style.display = 'none';
  if(overlay) overlay.style.display = 'flex';
}

async function openDashboard(user){
  if(!user?.id) throw new Error('No authenticated user was returned. Please sign in again.');
  const emailInline = document.getElementById('loggedInEmailInline');
  if(emailInline) emailInline.textContent = user.email || '';
  const overlay = document.getElementById('authOverlay');
  const appShell = document.getElementById('appShell');
  if(overlay) overlay.style.display = 'none';
  if(appShell) appShell.style.display = 'block';
  document.querySelectorAll('input[type="password"]').forEach(el => { el.value = ''; });

  const syncStatusEl = document.getElementById('syncStatus');
  if(syncStatusEl){ syncStatusEl.textContent = 'Checking for cloud data…'; syncStatusEl.style.color = 'var(--sub)'; }

  const pullResult = await pullSnapshotFromCloud();
  if(pullResult.ok && pullResult.found){
    if(syncStatusEl){ syncStatusEl.textContent = 'Loaded your saved data from the cloud.'; syncStatusEl.style.color = 'var(--emerald)'; }
  } else if(pullResult.ok && !pullResult.found){
    await pushSnapshotToCloud();
    if(syncStatusEl){ syncStatusEl.textContent = "No cloud data yet — saved this device's data as your starting point."; syncStatusEl.style.color = 'var(--emerald)'; }
  } else {
    if(syncStatusEl){ syncStatusEl.textContent = `Could not reach cloud data: ${pullResult.reason}`; syncStatusEl.style.color = 'var(--amber)'; }
  }

  // A cloud pull can restore an older, pre-duplicates Past Purchases snapshot
  // (only the legacy ticker-keyed keys, no pastPurchasesRows) and, since
  // pastPurchasesRows isn't in that old snapshot, applyRemoteSnapshot() will have
  // just cleared it locally — re-run the migration now so nothing is lost.
  migratePastPurchasesRowsIfNeeded();

  // Render the whole app now that we have (possibly cloud-restored) data.
  renderListSelector();
  renderRemoveList();
  renderCustomParamList();
  renderColumnOrderList();
  runMatrixOptimization();
  renderPPListSelector();
  renderPastPurchasesTickerList();
  renderPastPurchasesParamList();
  renderPastPurchasesColumnOrderList();
  renderPastPurchasesRowOrderList();
  renderPastPurchasesTable();

  startAutoSync();
}

async function handleRegister(event){
  return authAction(event, 'registerMessage', async auth => {
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    if(password !== document.getElementById('registerPassword2').value) throw new Error('Passwords do not match.');
    if(password.length < 8) throw new Error('Password must contain at least 8 characters.');
    const { data, error } = await auth.signUp({ email, password });
    if(error) throw error;
    if(!data.session) throw new Error('Sign-up did not return a session. Disable "Confirm email" in Supabase\'s Email provider settings, then try signing in.');
    await openDashboard(data.user);
  });
}

async function handleLogin(event){
  return authAction(event, 'loginMessage', async auth => {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const { data, error } = await auth.signInWithPassword({ email, password: document.getElementById('loginPassword').value });
    if(error) throw error;
    if(!data.session) throw new Error('Sign-in did not return a session. Please try again.');
    await openDashboard(data.user);
  });
}

async function logoutUser(){
  stopAutoSync();
  lockDashboard();
  showAuthStep('loginStep');
  try{
    const { error } = await getAuthClient().auth.signOut({ scope: 'local' });
    if(error) throw error;
    document.querySelectorAll('input[type="password"]').forEach(el => { el.value = ''; });
  }catch(error){ setAuthMessage('loginMessage', 'Sign-out could not complete. ' + authError(error), 'error'); }
}

async function checkExistingSession(){
  try{
    const auth = getAuthClient().auth;
    const { data: { session }, error } = await auth.getSession();
    if(error) throw error;
    if(!session) return;
    const { data, error: userError } = await auth.getUser();
    if(userError) throw userError;
    await openDashboard(data.user);
  }catch(error){ setAuthMessage('loginMessage', authError(error), 'error'); }
}

// Expose the handlers the inline HTML attributes call (onsubmit/onclick).
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logoutUser = logoutUser;
window.showAuthStep = showAuthStep;

function snapshotLocalData(){
  const snapshot = {};
  SYNC_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if(v !== null) snapshot[k] = v;
  });
  return snapshot;
}

function applyRemoteSnapshot(snapshot){
  if(!snapshot) return;
  SYNC_KEYS.forEach(k => {
    if(snapshot[k] !== undefined) localStorage.setItem(k, snapshot[k]);
    else localStorage.removeItem(k);
  });
}

async function pushSnapshotToCloud(){
  if(!window.supabase) return { ok: false, reason: "Supabase not initialized" };
  const client = getAuthClient();
  const { data: userData } = await client.auth.getUser();
  const user = userData && userData.user;
  if(!user) return { ok: false, reason: "not logged in" };
  const snapshot = snapshotLocalData();
  const { error } = await client
    .from("user_app_data")
    .upsert({ user_id: user.id, data: snapshot, updated_at: new Date().toISOString() });
  if(error) return { ok: false, reason: error.message };
  return { ok: true };
}

async function pullSnapshotFromCloud(){
  if(!window.supabase) return { ok: false, reason: "Supabase not initialized" };
  const client = getAuthClient();
  const { data: userData } = await client.auth.getUser();
  const user = userData && userData.user;
  if(!user) return { ok: false, reason: "not logged in" };
  const { data, error } = await client
    .from("user_app_data")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  if(error) return { ok: false, reason: error.message };
  if(data && data.data){
    applyRemoteSnapshot(data.data);
    return { ok: true, found: true };
  }
  return { ok: true, found: false };
}

let syncIntervalHandle = null;
function startAutoSync(){
  if(syncIntervalHandle) clearInterval(syncIntervalHandle);
  syncIntervalHandle = setInterval(async () => {
    const result = await pushSnapshotToCloud();
    const statusEl = document.getElementById("syncStatus");
    if(statusEl){
      statusEl.textContent = result.ok ? `Auto-synced at ${new Date().toLocaleTimeString()}.` : `Sync failed: ${result.reason}`;
      statusEl.style.color = result.ok ? "var(--text-secondary)" : "var(--amber)";
    }
  }, 8000);
}
function stopAutoSync(){
  if(syncIntervalHandle){ clearInterval(syncIntervalHandle); syncIntervalHandle = null; }
}


// --- Live data state ---
let liveDataMap = {}; // ticker -> { price, pe, roa, fetchedAt } or undefined if not fetched/failed
let columnSortState = null; // { colId, direction: 'asc'|'desc' } or null (falls back to the Sort-by dropdown)
let fetchFailedTickers = new Set(); // tickers where a live fetch was attempted but errored out
let lastFetchTime = null;

// Snapshots of the exact rows currently on screen for each table (in their
// current sort/column order, with computed values already resolved), kept up
// to date by runMatrixOptimization()/renderPastPurchasesTable() so the export
// functions can read off the same values the user is looking at rather than
// recomputing anything themselves.
let lastMainTableProcessedAssets = [];
let lastPastPurchasesOrderedRows = [];

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

  // Best-effort additions — Finnhub's free-tier /stock/metric endpoint often includes
  // these ratios, but coverage varies by ticker. Each returns undefined (not a guess)
  // if not found, so the static/manual value cleanly takes over instead.
  const revenueGrowth = m.revenueGrowthTTMYoy ?? m.revenueGrowthQuarterlyYoy ?? m.revenueGrowth3Y ?? m.revenueGrowth5Y;
  const netMargin = m.netProfitMarginTTM ?? m.netProfitMarginAnnual;
  const debtToEquity = m.totalDebtToEquityQuarterly ?? m.totalDebtToEquityAnnual ?? m['totalDebt/totalEquityQuarterly'] ?? m['totalDebt/totalEquityAnnual'];
  const beta = m.beta;

  return {
    raw: m,
    pe: (pe !== undefined && pe !== null && !isNaN(pe)) ? pe : undefined,
    roa: (roa !== undefined && roa !== null && !isNaN(roa)) ? roa : undefined,
    revenueGrowth: (revenueGrowth !== undefined && revenueGrowth !== null && !isNaN(revenueGrowth)) ? revenueGrowth : undefined,
    netMargin: (netMargin !== undefined && netMargin !== null && !isNaN(netMargin)) ? netMargin : undefined,
    debtToEquity: (debtToEquity !== undefined && debtToEquity !== null && !isNaN(debtToEquity)) ? debtToEquity : undefined,
    beta: (beta !== undefined && beta !== null && !isNaN(beta)) ? beta : undefined,
    peSource
  };
}

function applyCustomParamLiveData(ticker, rawMetric){
  if(!rawMetric) return;
  getCustomParams().forEach(p => {
    if(!p.finnhubField) return;
    const fields = Array.isArray(p.finnhubField) ? p.finnhubField : [p.finnhubField];
    let value;
    for(const f of fields){
      if(rawMetric[f] !== undefined && rawMetric[f] !== null && !isNaN(rawMetric[f])){
        value = rawMetric[f];
        break;
      }
    }
    if(value !== undefined){
      if(p.finnhubUnitDivisor) value = value / p.finnhubUnitDivisor;
      setGlobalOverride(ticker, p.id, value);
    }
  });
}

async function fetchLiveDataForOneTicker(ticker){
  const apiKey = getSavedApiKey();
  if(!apiKey) return { ok: false, reason: "no-key" };
  try{
    const price = await fetchFinnhubQuote(ticker, apiKey);
    const metrics = await fetchFinnhubMetrics(ticker, apiKey, price);
    liveDataMap[ticker] = {
      price: price,
      pe: metrics.pe,
      roa: metrics.roa,
      revenueGrowth: metrics.revenueGrowth,
      netMargin: metrics.netMargin,
      debtToEquity: metrics.debtToEquity,
      beta: metrics.beta,
    };
    applyCustomParamLiveData(ticker, metrics.raw);
    fetchFailedTickers.delete(ticker);
    return { ok: true };
  }catch(err){
    liveDataMap[ticker] = undefined;
    fetchFailedTickers.add(ticker);
    return { ok: false, reason: err.message };
  }
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
        revenueGrowth: metrics.revenueGrowth,
        netMargin: metrics.netMargin,
        debtToEquity: metrics.debtToEquity,
        beta: metrics.beta,
      };
      applyCustomParamLiveData(asset.ticker, metrics.raw);
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

  // Past Purchases only pulls FROM Portfolio Lists (never the reverse), and only
  // at add/import time by default — re-pull now so any Past Purchases columns
  // that mirror a Portfolio Lists field (e.g. Current Price) pick up what was
  // just fetched, for every row already in that table.
  if(typeof refreshPastPurchasesFromPortfolio === "function"){
    refreshPastPurchasesFromPortfolio();
    if(typeof renderPastPurchasesTable === "function") renderPastPurchasesTable();
    if(typeof renderPastPurchasesParamList === "function") renderPastPurchasesParamList();
  }

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

// --- Column system: built-in columns, user-defined custom parameters, and ordering ---
// Ticker (always first, sticky) and Remove (always last) are NOT part of this reorderable
// set — everything else, including custom parameters, can be repositioned freely.
const BUILTIN_COLUMNS = [
  { id: "name", label: "Company Name", type: "text", computed: false },
  { id: "roa", label: "ROA (%)", type: "number", computed: false },
  { id: "pe", label: "P/E Multiple", type: "number", computed: false },
  { id: "currentPrice", label: "Current Price", type: "number", computed: false },
  { id: "targetPrice", label: "Target Price", type: "number", computed: false },
  { id: "revenueGrowth", label: "Rev Growth (YoY%)", type: "number", computed: false },
  { id: "netMargin", label: "Net Margin (%)", type: "number", computed: false },
  { id: "pegRatio", label: "PEG Ratio", type: "number", computed: false },
  { id: "debtToEquity", label: "D/E Ratio", type: "number", computed: false },
  { id: "freeCashFlow", label: "FCF ($M)", type: "number", computed: false },
  { id: "cashRunway", label: "Cash Runway (yr)", type: "number", computed: false },
  { id: "beta", label: "Beta", type: "number", computed: false },
  { id: "calculatedUpside", label: "Implied Upside", type: "number", computed: true },
  { id: "stability", label: "Stability", type: "select", options: ["Ultra-high", "High", "Med", "Low"], computed: false },
  { id: "allocationWeight", label: "Optimized Weight Allocation", type: "number", computed: true },
];

function getCustomParams(){
  try{ return JSON.parse(localStorage.getItem("customParams") || "[]"); }
  catch(e){ return []; }
}
function saveCustomParams(list){
  try{ localStorage.setItem("customParams", JSON.stringify(list)); }
  catch(e){ /* localStorage unavailable */ }
}

// 40 additional parameters available as presets — deliberately distinct from the
// existing built-in fields (ROA, PE, Current/Target Price, Revenue Growth, Net
// Margin, PEG, D/E, FCF, Cash Runway, Beta) so they add real new coverage.
const PARAM_PRESETS = [
  { label: "Current/Target Price (%)", type: "number", defaultValue: 0, computed: true, formula: "currentToTargetPct" },
  { label: "Actual Upside (%)", type: "number", defaultValue: 0, computed: true, formula: "actualUpsidePct" },
  { label: "Units Purchased", type: "number", defaultValue: 0 },
  { label: "Average Purchase Price ($)", type: "number", defaultValue: 0 },
  { label: "Date Purchased", type: "date", defaultValue: "__today__" },
  { label: "Dividend Yield (%)", type: "number", defaultValue: 0, finnhubField: ["dividendYieldIndicatedAnnual", "currentDividendYieldTTM"] },
  { label: "Dividend Payout Ratio (%)", type: "number", defaultValue: 0 },
  { label: "EPS Diluted ($)", type: "number", defaultValue: 0 },
  { label: "EPS Growth (YoY%)", type: "number", defaultValue: 0 },
  { label: "Forward P/E", type: "number", defaultValue: 0, finnhubField: ["peForward", "forwardPE"] },
  { label: "Price to Book (P/B)", type: "number", defaultValue: 0 },
  { label: "Price to Sales (P/S)", type: "number", defaultValue: 0 },
  { label: "EV/EBITDA", type: "number", defaultValue: 0 },
  { label: "EV/Revenue", type: "number", defaultValue: 0 },
  { label: "Gross Margin (%)", type: "number", defaultValue: 0 },
  { label: "Operating Margin (%)", type: "number", defaultValue: 0 },
  { label: "Return on Equity (ROE %)", type: "number", defaultValue: 0 },
  { label: "Return on Invested Capital (ROIC %)", type: "number", defaultValue: 0 },
  { label: "Current Ratio", type: "number", defaultValue: 0 },
  { label: "Quick Ratio", type: "number", defaultValue: 0 },
  { label: "Interest Coverage Ratio", type: "number", defaultValue: 0 },
  { label: "Asset Turnover", type: "number", defaultValue: 0 },
  { label: "Inventory Turnover", type: "number", defaultValue: 0 },
  { label: "Days Sales Outstanding", type: "number", defaultValue: 0 },
  { label: "Market Cap ($B)", type: "number", defaultValue: 0, finnhubField: ["marketCapitalization"], finnhubUnitDivisor: 1000 },
  { label: "Enterprise Value ($B)", type: "number", defaultValue: 0 },
  { label: "Shares Outstanding (M)", type: "number", defaultValue: 0 },
  { label: "Float (%)", type: "number", defaultValue: 0 },
  { label: "Insider Ownership (%)", type: "number", defaultValue: 0 },
  { label: "Institutional Ownership (%)", type: "number", defaultValue: 0 },
  { label: "Short Interest (%)", type: "number", defaultValue: 0 },
  { label: "Analyst Rating (Consensus)", type: "text", defaultValue: "Hold" },
  { label: "Number of Analysts Covering", type: "number", defaultValue: 0 },
  { label: "52-Week High ($)", type: "number", defaultValue: 0 },
  { label: "52-Week Low ($)", type: "number", defaultValue: 0 },
  { label: "Average Volume (M)", type: "number", defaultValue: 0 },
  { label: "RSI (14-day)", type: "number", defaultValue: 50 },
  { label: "MACD Signal", type: "text", defaultValue: "Neutral" },
  { label: "30-Day Volatility (%)", type: "number", defaultValue: 0 },
  { label: "Sector", type: "text", defaultValue: "" },
  { label: "Industry", type: "text", defaultValue: "" },
  { label: "Country / Region", type: "text", defaultValue: "" },
  { label: "IPO Date", type: "text", defaultValue: "" },
  { label: "Employees", type: "number", defaultValue: 0 },
  { label: "R&D Spend (% of Revenue)", type: "number", defaultValue: 0 },
];

const PARAM_ALIASES = [
  [/\bd\/e\b/g, "debt to equity"],
  [/\bp\/e\b/g, "price to earnings"],
  [/\bfcf\b/g, "free cash flow"],
  [/\broa\b/g, "return on assets"],
  [/\broe\b/g, "return on equity"],
  [/\byoy\b/g, "year over year"],
  [/\brev\b/g, "revenue"],
];

function expandAliases(s){
  let out = " " + String(s).toLowerCase() + " ";
  PARAM_ALIASES.forEach(([pattern, expansion]) => { out = out.replace(pattern, expansion); });
  return out;
}

function normalizeParamLabel(s){
  return expandAliases(s).replace(/[^a-z0-9]+/g, "");
}

function tokenize(s){
  return expandAliases(s).split(/[^a-z0-9]+/).filter(Boolean);
}

// Token-based overlap that also credits abbreviation-style prefix matches
// (e.g. "rev" vs "revenue" already expands via alias, but this also catches
// unlisted abbreviations like "yield" vs "yld" via simple prefix comparison).
function tokenOverlapRatio(a, b){
  const tokensA = tokenize(a), tokensB = tokenize(b);
  if(tokensA.length === 0 || tokensB.length === 0) return 0;
  let matches = 0;
  tokensA.forEach(ta => {
    if(tokensB.some(tb => ta === tb || (ta.length >= 3 && tb.length >= 3 && (ta.startsWith(tb) || tb.startsWith(ta))))){
      matches++;
    }
  });
  return matches / Math.max(tokensA.length, tokensB.length);
}

function levenshteinDistance(a, b){
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for(let i = 0; i <= a.length; i++) dp[i][0] = i;
  for(let j = 0; j <= b.length; j++) dp[0][j] = j;
  for(let i = 1; i <= a.length; i++){
    for(let j = 1; j <= b.length; j++){
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[a.length][b.length];
}

function labelSimilarity(a, b){
  const maxLen = Math.max(a.length, b.length);
  if(maxLen === 0) return 1;
  return 1 - (levenshteinDistance(a, b) / maxLen);
}

// Returns the conflicting column definition if the proposed label is too close to
// an existing one (built-in or custom), or null if it's genuinely distinct.
const DISTINGUISHING_MODIFIERS = ["forward", "trailing", "ttm", "estimated", "projected", "expected", "historical"];

function hasUnmatchedDistinguishingModifier(labelA, labelB){
  const normA = " " + labelA.toLowerCase() + " ";
  const normB = " " + labelB.toLowerCase() + " ";
  return DISTINGUISHING_MODIFIERS.some(mod => {
    const inA = normA.includes(mod);
    const inB = normB.includes(mod);
    return inA !== inB; // present in exactly one, not both and not neither
  });
}

function findSimilarExistingParam(label){
  const norm = normalizeParamLabel(label);
  if(!norm) return null;
  const candidates = getAllColumnDefs().filter(d => !d.computed && d.id !== "name");
  for(const def of candidates){
    const defNorm = normalizeParamLabel(def.label);
    if(!defNorm) continue;
    if(defNorm === norm) return def; // exact match always counts, regardless of modifiers
    if(hasUnmatchedDistinguishingModifier(label, def.label)) continue; // e.g. "Forward P/E" vs "P/E Multiple" — genuinely different metrics
    if(defNorm.length >= 4 && norm.length >= 4 && (defNorm.includes(norm) || norm.includes(defNorm))) return def;
    if(labelSimilarity(norm, defNorm) >= 0.82) return def;
  }
  return null;
}

function addCustomParam({label, type, defaultValue, finnhubField, finnhubUnitDivisor, computed, formula}){
  const order = getColumnOrder(); // capture BEFORE saving, so its defaults don't already include the new param
  const params = getCustomParams();
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const id = "custom_" + (slug || "param") + "_" + Date.now().toString(36);
  const isText = type === "text";
  const isDate = type === "date";
  let resolvedDefault;
  if(isDate){
    resolvedDefault = (!defaultValue || defaultValue === "__today__") ? new Date().toISOString().slice(0,10) : defaultValue;
  } else if(isText){
    resolvedDefault = defaultValue || "";
  } else {
    resolvedDefault = parseFloat(defaultValue) || 0;
  }
  const paramDef = {
    id, label: label.trim(),
    type: isDate ? "date" : (isText ? "text" : "number"),
    defaultValue: resolvedDefault
  };
  if(finnhubField) paramDef.finnhubField = finnhubField;
  if(finnhubUnitDivisor) paramDef.finnhubUnitDivisor = finnhubUnitDivisor;
  if(computed) paramDef.computed = true;
  if(formula) paramDef.formula = formula;
  params.push(paramDef);
  saveCustomParams(params);
  if(!order.includes(id)) order.push(id); // guard against duplicates regardless
  saveColumnOrder(order);
  return id;
}

function removeCustomParam(id){
  saveCustomParams(getCustomParams().filter(p => p.id !== id));
  saveColumnOrder(getColumnOrder().filter(cid => cid !== id));
}

// Built-in (Sample List) columns are normally fixed, but the user can delete —
// really just hide — any of them the same way custom columns are removed. The
// underlying data (marketData, global overrides, scoring formulas) is left
// completely intact, since those columns are still used internally; only the
// column's visibility in getAllColumnDefs()/the table/the dropdowns changes.
// This makes it fully reversible via "restore" in the +/- Parameter panel.
function getHiddenBuiltinColumns(){
  try{ return JSON.parse(localStorage.getItem("hiddenBuiltinColumns") || "[]"); }
  catch(e){ return []; }
}
function saveHiddenBuiltinColumns(list){
  try{ localStorage.setItem("hiddenBuiltinColumns", JSON.stringify(list)); }
  catch(e){ /* localStorage unavailable */ }
}
function removeBuiltinColumn(id){
  const hidden = getHiddenBuiltinColumns();
  if(!hidden.includes(id)) hidden.push(id);
  saveHiddenBuiltinColumns(hidden);
  saveColumnOrder(getColumnOrder().filter(cid => cid !== id));
}
function restoreBuiltinColumn(id){
  saveHiddenBuiltinColumns(getHiddenBuiltinColumns().filter(hid => hid !== id));
  // getColumnOrder()'s "append anything missing from the saved order" logic
  // picks the restored column back up automatically on its next call.
}

function getAllColumnDefs(){
  const hidden = new Set(getHiddenBuiltinColumns());
  const builtins = BUILTIN_COLUMNS.filter(c => !hidden.has(c.id));
  const custom = getCustomParams().map(p => ({ id: p.id, label: p.label, type: p.type, computed: !!p.computed, formula: p.formula, isCustom: true, defaultValue: p.defaultValue }));
  return [...builtins, ...custom];
}

function getColumnOrder(){
  const defs = getAllColumnDefs();
  const defaultOrder = defs.map(d => d.id);
  try{
    const raw = localStorage.getItem("columnOrder");
    if(raw){
      const saved = JSON.parse(raw);
      const validSaved = saved.filter(id => defs.some(d => d.id === id));
      const savedSet = new Set(validSaved);
      // Append any columns not yet in the saved order (new custom params, or new
      // built-in fields added in a future update) so nothing silently disappears.
      defaultOrder.forEach(id => { if(!savedSet.has(id)) validSaved.push(id); });
      return validSaved;
    }
  }catch(e){ /* fall through to default */ }
  return defaultOrder;
}

function saveColumnOrder(order){
  try{ localStorage.setItem("columnOrder", JSON.stringify(order)); }
  catch(e){ /* localStorage unavailable */ }
}

function moveColumn(id, direction){
  const order = getColumnOrder();
  const idx = order.indexOf(id);
  if(idx === -1) return;
  const newIdx = idx + direction;
  if(newIdx < 0 || newIdx >= order.length) return;
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  saveColumnOrder(order);
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

function listNameExists(name, excludeId){
  const lists = getAllLists();
  const normalized = name.trim().toLowerCase();
  return Object.keys(lists).some(id => id !== excludeId && lists[id].name.trim().toLowerCase() === normalized);
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

function getWorkingData(explicitList){
  const list = explicitList || getActiveList();
  const removed = list.removedTickers || [];
  const overrides = getGlobalOverrides();
  const baseTickers = list.useBaseData ? marketData.filter(a => !removed.includes(a.ticker)).map(a => a.ticker) : [];
  const customTickers = (list.includedCustomTickers || []).filter(t => !removed.includes(t));
  const allTickers = [...new Set([...baseTickers, ...customTickers])];

  return allTickers.map(ticker => {
    const baseAsset = marketData.find(a => a.ticker === ticker);
    const shell = baseAsset
      ? { ...baseAsset }
      : { ticker, name: ticker, roa: 0, pe: 0, currentPrice: 1, targetPrice: 0, stability: "Med", stabilityNotes: "",
          revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, cashRunway: 99999, beta: 1.0 };
    return { ...shell, _overrides: overrides[ticker] || {} };
  });
}

// Resolves a ticker's BUILTIN_COLUMNS values (Current Price, ROA, P/E, etc.)
// using the exact same precedence the main table itself renders with — manual
// override > live Finnhub fetch > static default — regardless of which list(s)
// the ticker happens to belong to. This is what lets Past Purchases pull a
// currently-accurate "Current Price" (etc.) rather than a stale one, including
// right after a live "Fetch live data" run. Returns null for a ticker that has
// never appeared on the main table at all (no base data and no overrides), so
// callers don't fabricate values for an asset that only exists in Past Purchases.
function getResolvedBuiltinAssetValues(ticker){
  const baseAsset = marketData.find(a => a.ticker === ticker);
  const ov = getGlobalOverrides()[ticker] || {};
  if(!baseAsset && Object.keys(ov).length === 0) return null;
  const shell = baseAsset || { name: ticker, roa: 0, pe: 0, currentPrice: 1, targetPrice: 0, stability: "Med",
    revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, cashRunway: 99999, beta: 1.0 };
  const live = liveDataMap[ticker];
  return {
    name: ov.name !== undefined ? ov.name : shell.name,
    currentPrice: ov.currentPrice !== undefined ? ov.currentPrice : ((live && live.price !== undefined) ? live.price : shell.currentPrice),
    pe: ov.pe !== undefined ? ov.pe : ((live && live.pe !== undefined) ? live.pe : shell.pe),
    roa: ov.roa !== undefined ? ov.roa : ((live && live.roa !== undefined) ? live.roa : shell.roa),
    targetPrice: ov.targetPrice !== undefined ? ov.targetPrice : shell.targetPrice,
    stability: ov.stability !== undefined ? ov.stability : shell.stability,
    revenueGrowth: ov.revenueGrowth !== undefined ? ov.revenueGrowth : ((live && live.revenueGrowth !== undefined) ? live.revenueGrowth : shell.revenueGrowth),
    netMargin: ov.netMargin !== undefined ? ov.netMargin : ((live && live.netMargin !== undefined) ? live.netMargin : shell.netMargin),
    pegRatio: ov.pegRatio !== undefined ? ov.pegRatio : shell.pegRatio,
    debtToEquity: ov.debtToEquity !== undefined ? ov.debtToEquity : ((live && live.debtToEquity !== undefined) ? live.debtToEquity : shell.debtToEquity),
    freeCashFlow: ov.freeCashFlow !== undefined ? ov.freeCashFlow : shell.freeCashFlow,
    cashRunway: ov.cashRunway !== undefined ? ov.cashRunway : shell.cashRunway,
    beta: ov.beta !== undefined ? ov.beta : ((live && live.beta !== undefined) ? live.beta : shell.beta),
  };
}

function addAsset({ ticker, name, targetPrice, stability, stabilityNotes }){
  const baseAsset = marketData.find(a => a.ticker === ticker);
  const existingOv = getGlobalOverrides()[ticker] || {};
  setGlobalOverride(ticker, 'name', name || existingOv.name || (baseAsset && baseAsset.name) || ticker);
  if(targetPrice) setGlobalOverride(ticker, 'targetPrice', targetPrice);
  if(stability) setGlobalOverride(ticker, 'stability', stability);
  if(stabilityNotes) setGlobalOverride(ticker, 'stabilityNotes', stabilityNotes);
  if(existingOv.dateAdded === undefined) setGlobalOverride(ticker, 'dateAdded', Date.now());

  updateActiveList(list => {
    list.removedTickers = (list.removedTickers || []).filter(t => t !== ticker);
    const inc = list.includedCustomTickers || [];
    if(!inc.includes(ticker)) inc.push(ticker);
    list.includedCustomTickers = inc;
  });
}

function getRowOrder(){
  const list = getActiveList();
  return list.rowOrder || [];
}

function applyRowOrder(tickers){
  const list = getActiveList();
  const saved = list.rowOrder || [];
  const savedValid = saved.filter(t => tickers.includes(t));
  const savedSet = new Set(savedValid);
  const missing = tickers.filter(t => !savedSet.has(t));
  return [...savedValid, ...missing];
}

function moveRowInList(ticker, direction){
  const working = getWorkingData().map(a => a.ticker);
  const order = applyRowOrder(working);
  const idx = order.indexOf(ticker);
  if(idx === -1) return;
  const newIdx = idx + direction;
  if(newIdx < 0 || newIdx >= order.length) return;
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  updateActiveList(list => { list.rowOrder = order; });
  // Moving a row only makes visible sense in custom order — switch to it automatically.
  const sortEl = document.getElementById('sortMode');
  if(sortEl) sortEl.value = 'custom';
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
    stabilityNotes: ov.stabilityNotes !== undefined ? ov.stabilityNotes : current.stabilityNotes,
    revenueGrowth: ov.revenueGrowth !== undefined ? ov.revenueGrowth : current.revenueGrowth,
    netMargin: ov.netMargin !== undefined ? ov.netMargin : current.netMargin,
    pegRatio: ov.pegRatio !== undefined ? ov.pegRatio : current.pegRatio,
    debtToEquity: ov.debtToEquity !== undefined ? ov.debtToEquity : current.debtToEquity,
    freeCashFlow: ov.freeCashFlow !== undefined ? ov.freeCashFlow : current.freeCashFlow,
    cashRunway: ov.cashRunway !== undefined ? ov.cashRunway : current.cashRunway,
    beta: ov.beta !== undefined ? ov.beta : current.beta,
  };
  // Carry over any custom parameter values too, whatever custom params currently exist.
  getCustomParams().forEach(p => {
    snapshot[p.id] = ov[p.id] !== undefined ? ov[p.id] : (current.customValues ? current.customValues[p.id] : p.defaultValue);
  });
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

function importListInto(sourceListId){
  const lists = getAllLists();
  const sourceList = lists[sourceListId];
  if(!sourceList) return { imported: 0 };

  const sourceTickers = getWorkingData(sourceList).map(a => a.ticker);
  let importedCount = 0;

  updateActiveList(list => {
    const inc = list.includedCustomTickers || [];
    const removed = list.removedTickers || [];
    sourceTickers.forEach(ticker => {
      // Un-hide it if this list had it removed, and ensure it's included as a member.
      const removedIdx = removed.indexOf(ticker);
      if(removedIdx !== -1) removed.splice(removedIdx, 1);
      const isBaseTicker = marketData.some(a => a.ticker === ticker);
      const alreadyMember = (list.useBaseData && isBaseTicker && !removed.includes(ticker)) || inc.includes(ticker);
      if(!alreadyMember){
        inc.push(ticker);
        importedCount++;
      }
    });
    list.includedCustomTickers = inc;
    list.removedTickers = removed;
  });

  return { imported: importedCount, total: sourceTickers.length };
}

function renderImportListSelect(){
  const select = document.getElementById("importListSelect");
  if(!select) return;
  const lists = getAllLists();
  const activeId = getActiveListId();
  select.innerHTML = "";
  Object.keys(lists).filter(id => id !== activeId).forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = lists[id].name;
    select.appendChild(opt);
  });
  if(Object.keys(lists).filter(id => id !== activeId).length === 0){
    select.innerHTML = '<option value="">No other lists yet</option>';
  }
}

// --- Past Purchases: a second, fully freeform table with NO built-in columns.
// Unlike the main table (BUILTIN_COLUMNS + optional custom params layered on top),
// every column here is something the user explicitly chose to add — there is
// nothing pre-set beyond the Asset identity column itself. Assets can be typed
// in directly or imported wholesale from any existing Portfolio List above.
//
// Rows are keyed by an internal row id, NOT by asset name — the same asset (e.g.
// AAPL) can appear on multiple rows, since a real position can be bought and sold
// more than once and each round trip deserves its own row.
//
// Preset-only additions that originated with this table. Two groups, both of
// which are ALSO offered in the main table's own "+/- Parameter" dropdown now
// (both dropdowns share the exact same full preset list — see PP_PARAM_PRESETS
// below — so nothing is Past-Purchases-exclusive by omission anymore):
//
// 1. Sale-tracking fields: "Date Sale" / "Selling Price" (plain manual fields)
//    and "Sale Profit" (computed: Units Purchased × (Selling Price − Average
//    Purchase Price), looked up by label among the table's OWN columns —
//    mirrors how the main table's "Actual Upside %" preset looks up "Average
//    Purchase Price ($)" among ITS own custom params. When "Sale Profit" is
//    added on the main table, the main table's own scoring/render code
//    resolves it the same way, independently, among ITS custom params).
//
// 2. Fundamentals fields that mirror the main table's BUILTIN_COLUMNS
//    (ROA, P/E, Current Price, Target Price, Rev Growth, Net Margin, PEG,
//    D/E, FCF, Cash Runway, Beta, Stability). Selecting one of these on the
//    MAIN table and clicking Add is blocked by the existing "already exists
//    as a column" duplicate guard, since the main table already has each of
//    these as a fixed column — that's expected, not a bug: the option stays
//    in the dropdown for discoverability/documentation (and for hiding a
//    built-in column and picking the exact same label back up as a manual
//    custom one, if that's ever wanted), but adding it as a second column on
//    the main table doesn't make sense while the fixed one exists. On the
//    Past Purchases table, which has NO fixed columns at all, these are the
//    only way to record e.g. the Current Price at the time of a purchase or
//    sale. Labels match BUILTIN_COLUMNS exactly.
//    ("Company Name", "Implied Upside", and "Optimized Weight Allocation"
//    are deliberately left out — the first duplicates the Asset/Ticker
//    identity column, and the other two are optimizer outputs computed for
//    a whole Portfolio List, not something that stands alone per row.)
const PP_ONLY_PARAM_PRESETS = [
  { label: "Date Sale", type: "date", defaultValue: "" },
  { label: "Selling Price", type: "number", defaultValue: 0 },
  { label: "Sale Profit", type: "number", defaultValue: 0, computed: true, formula: "salesProfitPP" },
  { label: "Missed Gain %", type: "number", defaultValue: 0, computed: true, formula: "missedGainPct" },
  { label: "ROA (%)", type: "number", defaultValue: 0 },
  { label: "P/E Multiple", type: "number", defaultValue: 0 },
  { label: "Current Price", type: "number", defaultValue: 0 },
  { label: "Target Price", type: "number", defaultValue: 0 },
  { label: "Rev Growth (YoY%)", type: "number", defaultValue: 0 },
  { label: "Net Margin (%)", type: "number", defaultValue: 0 },
  { label: "PEG Ratio", type: "number", defaultValue: 0 },
  { label: "D/E Ratio", type: "number", defaultValue: 0 },
  { label: "FCF ($M)", type: "number", defaultValue: 0 },
  { label: "Cash Runway (yr)", type: "number", defaultValue: 0 },
  { label: "Beta", type: "number", defaultValue: 0 },
  { label: "Stability", type: "text", defaultValue: "" },
];
const PP_PARAM_PRESETS = [...PARAM_PRESETS, ...PP_ONLY_PARAM_PRESETS];
const PP_MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Builds the <option> list for a "+/- Parameter" preset dropdown, sorted
// alphabetically by label (A–Z) for easy scanning — while keeping each
// option's value equal to its index in the ORIGINAL (unsorted) presets array,
// so existing lookup code (`PRESETS[parseInt(val, 10)]`) keeps working
// unchanged regardless of display order.
function buildPresetOptionsHtml(presets){
  const withIndex = presets.map((p, i) => ({ p, i }));
  withIndex.sort((a, b) => a.p.label.localeCompare(b.p.label, undefined, { sensitivity: "base", numeric: true }));
  return '<option value="__custom__">— Custom (type your own) —</option>' +
    withIndex.map(({ p, i }) => `<option value="${i}">${p.label}</option>`).join('');
}

let ppColumnSortState = null; // { colId, direction: 'asc'|'desc' } or null (falls back to the Sort-by dropdown)

// Minimal HTML-text escaping for the free-text "asset" field, which (unlike a
// rigid ticker symbol) can now contain arbitrary characters since duplicates and
// free editing are both allowed. escAttr() elsewhere only escapes quotes, which
// is enough inside a value="..." attribute but not when text is dropped straight
// into innerHTML as content.
function escHtml(str){
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Past Purchases multi-list support ---
// Mirrors the Portfolio Lists architecture exactly: parameters (getPastPurchasesParams)
// stay GLOBAL, shared across every Past Purchases list, while only row membership/order
// is per-list. "pastPurchasesLists" holds { [listId]: { name, rows: [...] } }; the old
// flat "pastPurchasesRows" key (itself the target of the older ticker-keyed migration
// above) is wrapped into a single default list the first time this runs, then left alone
// afterward as an inert legacy fallback — same convention as the older Past Purchases
// keys already in SYNC_KEYS.
const DEFAULT_PP_LIST_ID = "pp-list-default";

function getAllPastPurchasesLists(){
  let lists = null;
  try{
    const raw = localStorage.getItem("pastPurchasesLists");
    if(raw) lists = JSON.parse(raw);
  }catch(e){ /* fall through to migration below */ }

  if(!lists || typeof lists !== "object" || Object.keys(lists).length === 0){
    let flatRows = [];
    try{ flatRows = JSON.parse(localStorage.getItem("pastPurchasesRows") || "[]"); }catch(e){}
    lists = { [DEFAULT_PP_LIST_ID]: { name: "List 1", rows: flatRows } };
    saveAllPastPurchasesLists(lists);
  }

  // Defensive schema safety net, in case a cloud snapshot ever carries a partial shape.
  let changed = false;
  Object.values(lists).forEach(l => {
    if(!Array.isArray(l.rows)){ l.rows = []; changed = true; }
    if(typeof l.name !== "string" || !l.name){ l.name = "List 1"; changed = true; }
  });
  if(changed) saveAllPastPurchasesLists(lists);

  return lists;
}

function saveAllPastPurchasesLists(lists){
  try{ localStorage.setItem("pastPurchasesLists", JSON.stringify(lists)); }
  catch(e){ /* localStorage unavailable */ }
}

function getActivePastPurchasesListId(){
  try{
    const id = localStorage.getItem("activePastPurchasesListId");
    const lists = getAllPastPurchasesLists();
    if(id && lists[id]) return id;
  }catch(e){ /* fall through */ }
  const lists = getAllPastPurchasesLists();
  const firstId = Object.keys(lists)[0] || DEFAULT_PP_LIST_ID;
  setActivePastPurchasesListId(firstId);
  return firstId;
}

function setActivePastPurchasesListId(id){
  try{ localStorage.setItem("activePastPurchasesListId", id); }
  catch(e){ /* localStorage unavailable */ }
}

function getActivePastPurchasesList(){
  const lists = getAllPastPurchasesLists();
  const id = getActivePastPurchasesListId();
  if(!lists[id]){
    lists[id] = { name: "List 1", rows: [] };
    saveAllPastPurchasesLists(lists);
  }
  return lists[id];
}

function updateActivePastPurchasesList(mutatorFn){
  const lists = getAllPastPurchasesLists();
  const id = getActivePastPurchasesListId();
  if(!lists[id]) lists[id] = { name: "List 1", rows: [] };
  mutatorFn(lists[id]);
  saveAllPastPurchasesLists(lists);
}

function createPastPurchasesList(name){
  const lists = getAllPastPurchasesLists();
  const id = "pp-list-" + Date.now();
  lists[id] = { name: name || "New List", rows: [] };
  saveAllPastPurchasesLists(lists);
  setActivePastPurchasesListId(id);
  return id;
}

function pastPurchasesListNameExists(name, excludeId){
  const lists = getAllPastPurchasesLists();
  const normalized = name.trim().toLowerCase();
  return Object.keys(lists).some(id => id !== excludeId && lists[id].name.trim().toLowerCase() === normalized);
}

function renameActivePastPurchasesList(newName){
  updateActivePastPurchasesList(list => { list.name = newName; });
}

function deleteActivePastPurchasesList(){
  const lists = getAllPastPurchasesLists();
  const id = getActivePastPurchasesListId();
  delete lists[id];
  const remainingIds = Object.keys(lists);
  if(remainingIds.length === 0){
    lists[DEFAULT_PP_LIST_ID] = { name: "List 1", rows: [] };
    saveAllPastPurchasesLists(lists);
    setActivePastPurchasesListId(DEFAULT_PP_LIST_ID);
  } else {
    saveAllPastPurchasesLists(lists);
    setActivePastPurchasesListId(remainingIds[0]);
  }
}

function getPastPurchasesRows(){
  return getActivePastPurchasesList().rows || [];
}
function savePastPurchasesRows(rows){
  updateActivePastPurchasesList(list => { list.rows = rows; });
}

function getPastPurchasesParams(){
  try{ return JSON.parse(localStorage.getItem("pastPurchasesParams") || "[]"); }
  catch(e){ return []; }
}
function savePastPurchasesParams(list){
  try{ localStorage.setItem("pastPurchasesParams", JSON.stringify(list)); }
  catch(e){ /* localStorage unavailable */ }
}

// One-time, self-healing migration from the old ticker-keyed schema (one row per
// asset, keyed by its symbol — duplicates were impossible) into the new row-id
// schema (any number of rows per asset). Runs automatically, loses nothing: old
// keys are left in place afterward (and still synced to the cloud) purely as a
// safety net for a device that pulls a pre-migration cloud snapshot later.
function migratePastPurchasesRowsIfNeeded(){
  try{
    if(localStorage.getItem("pastPurchasesRows") !== null) return; // already migrated
    let oldTickers = [];
    try{ oldTickers = JSON.parse(localStorage.getItem("pastPurchasesTickers") || "[]"); }catch(e){}
    if(!Array.isArray(oldTickers) || oldTickers.length === 0){
      savePastPurchasesRows([]);
      return;
    }
    let oldValues = {}, oldDateAdded = {};
    try{ oldValues = JSON.parse(localStorage.getItem("pastPurchasesValues") || "{}"); }catch(e){}
    try{ oldDateAdded = JSON.parse(localStorage.getItem("pastPurchasesDateAdded") || "{}"); }catch(e){}
    const stamp = Date.now().toString(36);
    const rows = oldTickers.map((ticker, idx) => ({
      id: "pp_row_" + stamp + "_" + idx,
      asset: ticker,
      values: { ...(oldValues[ticker] || {}) },
      dateAdded: oldDateAdded[ticker] || 0
    }));
    savePastPurchasesRows(rows);
  }catch(e){ /* leave pastPurchasesRows unset; getPastPurchasesRows() falls back to [] */ }
}
migratePastPurchasesRowsIfNeeded();

function addPastPurchaseRow(asset){
  const rows = getPastPurchasesRows();
  const id = "pp_row_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  rows.push({ id, asset, values: {}, dateAdded: Date.now() });
  savePastPurchasesRows(rows);
  return id;
}

function removePastPurchaseRow(id){
  savePastPurchasesRows(getPastPurchasesRows().filter(r => r.id !== id));
}

function setPastPurchaseRowAsset(id, newAsset){
  const rows = getPastPurchasesRows();
  const row = rows.find(r => r.id === id);
  if(!row) return;
  row.asset = newAsset;
  savePastPurchasesRows(rows);
}

function setPastPurchaseValue(id, paramId, value){
  const rows = getPastPurchasesRows();
  const row = rows.find(r => r.id === id);
  if(!row) return;
  if(!row.values) row.values = {};
  row.values[paramId] = value;
  savePastPurchasesRows(rows);
}

// The rows array's own order doubles as the persisted "custom order" — there's no
// separate base+custom membership split here (unlike the main table's per-list
// rowOrder), so reordering just swaps elements in this one array directly.
function movePastPurchaseRow(id, direction){
  const rows = getPastPurchasesRows();
  const idx = rows.findIndex(r => r.id === id);
  if(idx === -1) return;
  const newIdx = idx + direction;
  if(newIdx < 0 || newIdx >= rows.length) return;
  [rows[idx], rows[newIdx]] = [rows[newIdx], rows[idx]];
  savePastPurchasesRows(rows);
  // Moving a row only makes visible sense in custom order — switch to it automatically.
  const sortEl = document.getElementById('ppSortMode');
  if(sortEl) sortEl.value = 'custom';
}

function addPastPurchaseParam({label, type, defaultValue, computed, formula}){
  const params = getPastPurchasesParams();
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const id = "pp_" + (slug || "param") + "_" + Date.now().toString(36);
  const isText = type === "text";
  const isDate = type === "date";
  let resolvedDefault;
  if(isDate){
    // Only the explicit "__today__" sentinel resolves to today's date — an
    // ordinary blank default (like "Date Sale"'s) stays blank, rather than every
    // unfilled date field silently claiming today's date.
    resolvedDefault = (defaultValue === "__today__") ? new Date().toISOString().slice(0,10) : (defaultValue || "");
  } else if(isText){
    resolvedDefault = defaultValue || "";
  } else {
    resolvedDefault = parseFloat(defaultValue) || 0;
  }
  const paramDef = { id, label: label.trim(), type: isDate ? "date" : (isText ? "text" : "number"), defaultValue: resolvedDefault };
  if(computed) paramDef.computed = true;
  if(formula) paramDef.formula = formula;
  params.push(paramDef);
  savePastPurchasesParams(params);
  return id;
}

function removePastPurchaseParam(id){
  savePastPurchasesParams(getPastPurchasesParams().filter(p => p.id !== id));
  // Params are global across every Past Purchases list (same design as Portfolio
  // Lists' custom params), so removing one has to clean its values out of every
  // list's rows, not just the currently active list.
  const lists = getAllPastPurchasesLists();
  Object.values(lists).forEach(list => {
    (list.rows || []).forEach(r => { if(r.values) delete r.values[id]; });
  });
  saveAllPastPurchasesLists(lists);
  if(ppColumnSortState && ppColumnSortState.colId === id) ppColumnSortState = null;
}

function movePastPurchaseParam(id, direction){
  const params = getPastPurchasesParams();
  const idx = params.findIndex(p => p.id === id);
  if(idx === -1) return;
  const newIdx = idx + direction;
  if(newIdx < 0 || newIdx >= params.length) return;
  [params[idx], params[newIdx]] = [params[newIdx], params[idx]];
  savePastPurchasesParams(params);
}

// Carries data from the Portfolio Lists (main) table onto a Past Purchases row
// for the same asset symbol. This is the ONLY direction data ever moves between
// the two tables — Past Purchases reads from Portfolio Lists; Portfolio Lists
// never reads anything from Past Purchases (nothing in the main table's own
// rendering/scoring code touches getPastPurchasesRows()/getPastPurchasesParams()
// at all). Two tiers, on purpose:
//
// 1. A small fixed whitelist of purchase-record fields — Units Purchased,
//    Average Purchase Price ($), Date Purchased — get pulled AND auto-created
//    as a new Past Purchases column if one doesn't exist yet. This is the
//    original intent of this feature: those three are exactly what belongs on
//    every past-purchase row.
//
// 2. Everything else — any OTHER main-table custom param (e.g. Market Cap,
//    Forward P/E, or any other preset someone added on the main table for
//    unrelated reasons) AND the Sample List built-in fields (Current Price,
//    ROA, P/E, Beta, etc., via getResolvedBuiltinAssetValues) — is pulled ONLY
//    into a Past Purchases column that ALREADY exists with a matching label.
//    Nothing here auto-creates a column. This is the fix for columns like
//    "Market Cap" or "Forward P/E" silently showing up in Past Purchases that
//    were never explicitly added there — that used to happen because ANY
//    non-computed main-table custom param with a value got auto-added as a
//    new column here, whether or not it had anything to do with a purchase.
function pullMainTableDataIntoPastPurchases(rowId, assetSymbol){
  const AUTO_CREATE_LABELS = ["units purchased", "average purchase price ($)", "average purchase price", "date purchased"];
  const mainParams = getCustomParams().filter(p => !p.computed);
  const builtin = getResolvedBuiltinAssetValues(assetSymbol);
  const ov = getGlobalOverrides()[assetSymbol] || {};
  let pulledCount = 0;

  mainParams.forEach(mp => {
    if(ov[mp.id] === undefined) return; // nothing actually entered for this asset on the main table
    const norm = normalizeParamLabel(mp.label);
    const isAutoCreate = AUTO_CREATE_LABELS.includes(mp.label.trim().toLowerCase());
    let ppParam = getPastPurchasesParams().find(p => normalizeParamLabel(p.label) === norm);
    if(!ppParam && !isAutoCreate) return; // not a whitelisted field, and no matching column already added here
    const ppParamId = ppParam ? ppParam.id : addPastPurchaseParam({ label: mp.label, type: mp.type, defaultValue: mp.defaultValue });
    setPastPurchaseValue(rowId, ppParamId, ov[mp.id]);
    pulledCount++;
  });

  if(builtin){
    BUILTIN_COLUMNS.forEach(bc => {
      if(bc.computed) return; // Implied Upside / Optimized Weight Allocation don't stand alone per row
      const val = builtin[bc.id];
      if(val === undefined) return;
      const ppParam = getPastPurchasesParams().find(p => normalizeParamLabel(p.label) === normalizeParamLabel(bc.label));
      if(!ppParam) return; // only fill a builtin-mirroring column the user already added themselves
      setPastPurchaseValue(rowId, ppParam.id, val);
      pulledCount++;
    });
  }

  return pulledCount;
}

// Re-pulls fresh data (custom params + built-in fields, including the latest
// live-fetched prices) from the Portfolio Lists table into every EXISTING Past
// Purchases row, matched by asset symbol. Use this after fetching live data or
// editing values on the Portfolio Lists table, since the initial pull above
// only happens once, at the moment a row is added or a list is imported.
function refreshPastPurchasesFromPortfolio(){
  const rows = getPastPurchasesRows();
  let totalPulled = 0;
  rows.forEach(row => {
    if(!row.asset) return;
    totalPulled += pullMainTableDataIntoPastPurchases(row.id, row.asset.trim().toUpperCase());
  });
  return { rowCount: rows.length, pulled: totalPulled };
}

// Pulls in every ticker currently visible in the chosen Portfolio List (base +
// custom, minus anything removed there) as a brand-new Past Purchases row each —
// re-importing the same list later adds another fresh round of rows rather than
// skipping assets already present, since the same asset can legitimately be
// bought and sold more than once.
function importListIntoPastPurchases(sourceListId){
  const lists = getAllLists();
  const sourceList = lists[sourceListId];
  if(!sourceList) return { imported: 0, total: 0, pulled: 0 };
  const sourceTickers = getWorkingData(sourceList).map(a => a.ticker);
  let pulledTotal = 0;
  sourceTickers.forEach(ticker => {
    const rowId = addPastPurchaseRow(ticker);
    pulledTotal += pullMainTableDataIntoPastPurchases(rowId, ticker);
  });
  return { imported: sourceTickers.length, total: sourceTickers.length, pulled: pulledTotal };
}

function renderPastPurchasesImportSelect(){
  const select = document.getElementById("ppImportListSelect");
  if(!select) return;
  const lists = getAllLists();
  const ids = Object.keys(lists);
  select.innerHTML = "";
  if(ids.length === 0){
    select.innerHTML = '<option value="">No lists yet</option>';
    return;
  }
  ids.forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = lists[id].name;
    select.appendChild(opt);
  });
}

function renderPastPurchasesTickerList(){
  const container = document.getElementById("ppTickerList");
  if(!container) return;
  container.innerHTML = "";
  const rows = getPastPurchasesRows();
  if(rows.length === 0){
    container.innerHTML = `<span style="color:var(--text-secondary);">No assets in Past Purchases yet.</span>`;
    return;
  }
  rows.forEach(row => {
    const chip = document.createElement("div");
    chip.className = "remove-chip";
    chip.innerHTML = `<span>${escHtml(row.asset) || '(blank)'}</span><button data-id="${row.id}" title="Remove this row">&times;</button>`;
    chip.querySelector("button").addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      if(confirm(`Remove this "${row.asset}" row from Past Purchases? This deletes it and all its values.`)){
        removePastPurchaseRow(id);
        renderPastPurchasesTickerList();
        renderPastPurchasesTable();
        renderPastPurchasesRowOrderList();
      }
    });
    container.appendChild(chip);
  });
}

function renderPastPurchasesParamList(){
  const container = document.getElementById("ppParamList");
  if(!container) return;
  container.innerHTML = "";
  const params = getPastPurchasesParams();
  if(params.length === 0){
    container.innerHTML = `<span style="color:var(--text-secondary);">No parameters added yet — use the form above.</span>`;
    return;
  }
  params.forEach(p => {
    const chip = document.createElement("div");
    chip.className = "remove-chip";
    chip.innerHTML = `<span>${p.label} (${p.computed ? 'computed' : p.type})</span><button data-id="${p.id}" title="Remove ${p.label}">&times;</button>`;
    chip.querySelector("button").addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      if(confirm(`Remove the "${p.label}" column? This deletes its values for every row.`)){
        removePastPurchaseParam(id);
        renderPastPurchasesParamList();
        renderPastPurchasesTable();
        renderPastPurchasesColumnOrderList();
      }
    });
    container.appendChild(chip);
  });
}

function renderPastPurchasesColumnOrderList(){
  const container = document.getElementById("ppColumnOrderList");
  if(!container) return;
  container.innerHTML = "";
  const params = getPastPurchasesParams();
  if(params.length === 0){
    container.innerHTML = `<span style="color:var(--text-secondary);">No parameters yet.</span>`;
    return;
  }
  params.forEach((p, idx) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; align-items:center; gap:0.75rem; background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; padding:0.5rem 0.75rem;";
    row.innerHTML = `
      <span style="flex:1;">${p.label}${p.computed ? ' <span style="color:var(--text-secondary); font-size:0.75rem;">(computed)</span>' : ''}</span>
      <button class="pp-col-order-btn" data-id="${p.id}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} title="Move left" style="background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); width:32px; height:32px; border-radius:6px; cursor:pointer;">&larr;</button>
      <button class="pp-col-order-btn" data-id="${p.id}" data-dir="1" ${idx === params.length-1 ? 'disabled' : ''} title="Move right" style="background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); width:32px; height:32px; border-radius:6px; cursor:pointer;">&rarr;</button>
    `;
    container.appendChild(row);
  });
  container.querySelectorAll(".pp-col-order-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      const dir = parseInt(e.currentTarget.getAttribute("data-dir"), 10);
      movePastPurchaseParam(id, dir);
      renderPastPurchasesColumnOrderList();
      renderPastPurchasesTable();
    });
  });
}

function renderPastPurchasesRowOrderList(){
  const container = document.getElementById("ppRowOrderList");
  if(!container) return;
  container.innerHTML = "";
  const rows = getPastPurchasesRows();
  if(rows.length === 0){
    container.innerHTML = `<span style="color:var(--text-secondary);">No assets yet.</span>`;
    return;
  }
  rows.forEach((row, idx) => {
    const rowEl = document.createElement("div");
    rowEl.style.cssText = "display:flex; align-items:center; gap:0.75rem; background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; padding:0.5rem 0.75rem;";
    rowEl.innerHTML = `
      <span style="flex:1;">${escHtml(row.asset) || '(blank)'}</span>
      <button class="pp-row-order-btn" data-row-id="${row.id}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} title="Move up" style="background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); width:32px; height:32px; border-radius:6px; cursor:pointer;">&uarr;</button>
      <button class="pp-row-order-btn" data-row-id="${row.id}" data-dir="1" ${idx === rows.length-1 ? 'disabled' : ''} title="Move down" style="background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); width:32px; height:32px; border-radius:6px; cursor:pointer;">&darr;</button>
    `;
    container.appendChild(rowEl);
  });
  container.querySelectorAll(".pp-row-order-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const rowId = e.currentTarget.getAttribute("data-row-id");
      const dir = parseInt(e.currentTarget.getAttribute("data-dir"), 10);
      movePastPurchaseRow(rowId, dir);
      renderPastPurchasesRowOrderList();
      renderPastPurchasesTable();
    });
  });
}

// Resolves every column's effective value for one row: stored value (or the
// column's default) for plain columns, and a live calculation for "Sale Profit"
// looked up by label among THIS table's own columns (Units Purchased, Average
// Purchase Price, Selling Price) — same precedence pattern as the main table's
// own computed presets, just scoped to Past Purchases' own data.
function resolvePastPurchaseRowValues(row){
  const params = getPastPurchasesParams();
  const stored = row.values || {};
  const resolved = {};
  params.forEach(p => {
    if(!p.computed) resolved[p.id] = stored[p.id] !== undefined ? stored[p.id] : p.defaultValue;
  });
  params.forEach(p => {
    if(p.computed && p.formula === 'salesProfitPP'){
      const norm = s => String(s).trim().toLowerCase();
      const unitsParam = params.find(pp => !pp.computed && norm(pp.label) === 'units purchased');
      const avgParam = params.find(pp => !pp.computed && (norm(pp.label) === 'average purchase price ($)' || norm(pp.label) === 'average purchase price'));
      const sellParam = params.find(pp => !pp.computed && norm(pp.label) === 'selling price');
      const units = unitsParam ? (Number(resolved[unitsParam.id]) || 0) : 0;
      const avg = avgParam ? (Number(resolved[avgParam.id]) || 0) : 0;
      const sell = sellParam ? (Number(resolved[sellParam.id]) || 0) : 0;
      // A real, completed sale needs the three columns to exist AND a non-zero
      // quantity and a non-zero selling price — Selling Price defaulting to 0
      // means "not sold yet", not "sold for $0", so treat that case as exactly
      // 0 rather than a misleading raw (units × -avg) "loss". This mirrors the
      // main table's own computed presets, which zero out the same way when
      // their required inputs aren't really filled in yet.
      const ready = !!(unitsParam && avgParam && sellParam) && units !== 0 && sell !== 0;
      resolved[p.id] = ready ? units * (sell - avg) : 0;
      resolved['_' + p.id + '_ready'] = ready;
    }
    if(p.computed && p.formula === 'missedGainPct'){
      // (Current Price − Selling Price) ÷ Selling Price × 100. Current Price is
      // resolved live via getResolvedBuiltinAssetValues (override > live Finnhub
      // fetch > static default) rather than read from a frozen Past Purchases
      // column, so this recomputes automatically every time the row re-renders
      // after a live data fetch — it "fluctuates" as the user's Current Price does.
      const norm = s => String(s).trim().toLowerCase();
      const sellParam = params.find(pp => !pp.computed && norm(pp.label) === 'selling price');
      const sell = sellParam ? (Number(resolved[sellParam.id]) || 0) : 0;
      const builtin = row.asset ? getResolvedBuiltinAssetValues(row.asset.trim().toUpperCase()) : null;
      const current = builtin ? (Number(builtin.currentPrice) || 0) : 0;
      const ready = !!sellParam && sell !== 0 && !!builtin;
      resolved[p.id] = ready ? ((current - sell) / sell) * 100 : 0;
      resolved['_' + p.id + '_ready'] = ready;
    }
  });
  return resolved;
}

function getPastPurchasesSortedRows(){
  const rows = getPastPurchasesRows().slice(); // persisted custom order, as a starting point

  if(ppColumnSortState){
    const { colId, direction } = ppColumnSortState;
    rows.sort((a, b) => {
      const va = resolvePastPurchaseRowValues(a)[colId];
      const vb = resolvePastPurchaseRowValues(b)[colId];
      let cmp;
      if(typeof va === 'string' || typeof vb === 'string') cmp = String(va).localeCompare(String(vb));
      else cmp = (va || 0) - (vb || 0);
      return direction === 'asc' ? cmp : -cmp;
    });
    return rows;
  }

  const sortMode = document.getElementById('ppSortMode') ? document.getElementById('ppSortMode').value : 'custom';
  if(sortMode === 'alpha') rows.sort((a, b) => String(a.asset).localeCompare(String(b.asset)));
  else if(sortMode === 'date-new') rows.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
  else if(sortMode === 'date-old') rows.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
  // 'custom' (or anything else): leave as the persisted order.
  return rows;
}

// Parses a <input type="date"> value ("YYYY-MM-DD") into {year, month(1-12)},
// or null if blank/unparseable — used to group sold rows into monthly subtotals.
function ppParseDateSale(val){
  if(!val || typeof val !== 'string') return null;
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return null;
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
}

function renderPastPurchasesTable(){
  const thead = document.getElementById("ppTableHead");
  const tbody = document.getElementById("ppTableBody");
  const tfoot = document.getElementById("ppTableFoot");
  if(!thead || !tbody) return;

  const params = getPastPurchasesParams();
  const orderedRows = getPastPurchasesSortedRows();
  lastPastPurchasesOrderedRows = orderedRows;

  let headHtml = '<tr><th>Past Purchases</th>';
  params.forEach((p, idx) => {
    const isSorted = ppColumnSortState && ppColumnSortState.colId === p.id;
    const sortIcon = isSorted ? (ppColumnSortState.direction === 'asc' ? '▲' : '▼') : '⇅';
    headHtml += `<th>
      <div>${p.label}${p.computed ? ' <span style="color:var(--text-secondary); font-size:0.7rem;">(computed)</span>' : ''}</div>
      <div class="col-header-controls">
        <button class="pp-col-btn col-ctrl-btn ${isSorted ? 'col-ctrl-sort-active' : ''}" data-action="sort" data-id="${p.id}" title="Sort by this column">${sortIcon}</button>
        <button class="pp-col-btn col-ctrl-btn" data-action="move" data-id="${p.id}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} title="Move left">&lt;</button>
        <button class="pp-col-btn col-ctrl-btn" data-action="move" data-id="${p.id}" data-dir="1" ${idx === params.length - 1 ? 'disabled' : ''} title="Move right">&gt;</button>
        <button class="pp-col-btn col-ctrl-btn col-ctrl-remove" data-action="remove" data-id="${p.id}" title="Remove this parameter">&times;</button>
      </div>
    </th>`;
  });
  headHtml += '</tr>';
  thead.innerHTML = headHtml;

  thead.querySelectorAll('.pp-col-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      if(action === 'sort'){
        if(!ppColumnSortState || ppColumnSortState.colId !== id){
          ppColumnSortState = { colId: id, direction: 'asc' };
        } else if(ppColumnSortState.direction === 'asc'){
          ppColumnSortState = { colId: id, direction: 'desc' };
        } else {
          ppColumnSortState = null; // third click clears back to the Sort-by dropdown
        }
        renderPastPurchasesTable();
      } else if(action === 'move'){
        movePastPurchaseParam(id, parseInt(btn.getAttribute('data-dir'), 10));
        renderPastPurchasesTable();
        renderPastPurchasesColumnOrderList();
      } else if(action === 'remove'){
        const def = params.find(p => p.id === id);
        if(confirm(`Remove the "${def.label}" column? This deletes its values for every row.`)){
          removePastPurchaseParam(id);
          renderPastPurchasesTable();
          renderPastPurchasesParamList();
          renderPastPurchasesColumnOrderList();
        }
      }
    });
  });

  tbody.innerHTML = "";
  if(orderedRows.length === 0 || params.length === 0){
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = params.length + 1;
    td.style.color = "var(--text-secondary)";
    td.style.padding = "1.25rem 1rem";
    td.textContent = orderedRows.length === 0
      ? "No assets yet — add one above, or import a list."
      : "Add at least one parameter above to start tracking data for these assets.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    if(tfoot) tfoot.innerHTML = "";
    return;
  }

  orderedRows.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');
    const resolved = resolvePastPurchaseRowValues(row);
    const upDisabled = rowIdx === 0 ? 'disabled' : '';
    const downDisabled = rowIdx === orderedRows.length - 1 ? 'disabled' : '';
    let rowHtml = `<td>
      <input class="cell-input cell-input-ticker pp-asset-input" data-row-id="${row.id}" data-resolved-value="${escHtml(row.asset)}" type="text" value="${escHtml(row.asset)}">
      <div class="row-ctrl-controls">
        <button class="pp-row-btn row-ctrl-btn" data-action="up" data-row-id="${row.id}" ${upDisabled} title="Move row up">&uarr;</button>
        <button class="pp-row-btn row-ctrl-btn" data-action="down" data-row-id="${row.id}" ${downDisabled} title="Move row down">&darr;</button>
        <button class="pp-row-btn row-ctrl-btn row-ctrl-remove" data-action="delete" data-row-id="${row.id}" title="Remove this row">&times;</button>
      </div>
    </td>`;
    params.forEach(p => {
      if(p.computed && p.formula === 'salesProfitPP'){
        const val = resolved[p.id] || 0;
        const ready = resolved['_' + p.id + '_ready'];
        const sign = val >= 0 ? '+' : '-';
        const color = !ready ? 'var(--text-secondary)' : (val >= 0 ? 'var(--emerald)' : '#ef4444');
        const titleAttr = ready ? '' : ` title="Add Units Purchased, Average Purchase Price, and Selling Price columns to compute this."`;
        rowHtml += `<td style="color:${color}; font-weight:600;"${titleAttr}>${sign}$${Math.abs(val).toFixed(2)}</td>`;
      } else if(p.computed && p.formula === 'missedGainPct'){
        const val = resolved[p.id] || 0;
        const ready = resolved['_' + p.id + '_ready'];
        const titleAttr = ready ? '' : ` title="Add a Selling Price column, and make sure this asset has Current Price data on Portfolio Lists, to compute this."`;
        rowHtml += `<td class="${ready ? '' : 'cell-input-unconfirmed'}"${titleAttr}>${Number(val).toFixed(1)}%</td>`;
      } else if(p.computed){
        const val = resolved[p.id] || 0;
        const ready = resolved['_' + p.id + '_ready'];
        rowHtml += `<td class="${ready === false ? 'cell-input-unconfirmed' : ''}">${Number(val).toFixed(1)}%</td>`;
      } else {
        const val = resolved[p.id];
        if(p.type === 'text'){
          rowHtml += `<td><input class="cell-input pp-cell-input" data-row-id="${row.id}" data-field="${p.id}" data-type="text" type="text" value="${escAttr(val)}"></td>`;
        } else if(p.type === 'date'){
          rowHtml += `<td><input class="cell-input pp-cell-input" data-row-id="${row.id}" data-field="${p.id}" data-type="date" type="date" value="${escAttr(val)}"></td>`;
        } else {
          rowHtml += `<td><input class="cell-input cell-input-num pp-cell-input" data-row-id="${row.id}" data-field="${p.id}" data-type="number" type="number" step="0.01" value="${val}"></td>`;
        }
      }
    });
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.pp-asset-input').forEach(el => {
    el.addEventListener('change', (e) => {
      const rowId = e.target.getAttribute('data-row-id');
      const newAsset = e.target.value.trim().toUpperCase();
      if(!newAsset){
        e.target.value = e.target.getAttribute('data-resolved-value'); // revert an empty edit
        return;
      }
      setPastPurchaseRowAsset(rowId, newAsset);
      renderPastPurchasesTable();
      renderPastPurchasesTickerList();
      renderPastPurchasesRowOrderList();
    });
    el.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){ e.preventDefault(); el.blur(); }
    });
  });

  tbody.querySelectorAll('.pp-cell-input').forEach(el => {
    el.addEventListener('change', (e) => {
      const rowId = e.target.getAttribute('data-row-id');
      const field = e.target.getAttribute('data-field');
      const isNum = e.target.getAttribute('data-type') === 'number';
      let value = e.target.value;
      if(isNum){
        value = parseFloat(value);
        if(isNaN(value)) value = 0;
      }
      setPastPurchaseValue(rowId, field, value);
      renderPastPurchasesTable(); // refresh any computed "Sale Profit" cells + the totals rows
    });
    el.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' && el.tagName === 'INPUT'){
        e.preventDefault();
        el.blur();
      }
    });
  });

  tbody.querySelectorAll('.pp-row-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rowId = btn.getAttribute('data-row-id');
      const action = btn.getAttribute('data-action');
      if(action === 'delete'){
        const target = getPastPurchasesRows().find(r => r.id === rowId);
        if(confirm(`Remove this "${target ? target.asset : ''}" row from Past Purchases? This deletes it and all its values.`)){
          removePastPurchaseRow(rowId);
          renderPastPurchasesTickerList();
          renderPastPurchasesTable();
          renderPastPurchasesRowOrderList();
          if(typeof renderPPListSelector === "function") renderPPListSelector();
        }
      } else if(action === 'up'){
        movePastPurchaseRow(rowId, -1);
        renderPastPurchasesTable();
        renderPastPurchasesRowOrderList();
      } else if(action === 'down'){
        movePastPurchaseRow(rowId, 1);
        renderPastPurchasesTable();
        renderPastPurchasesRowOrderList();
      }
    });
  });

  if(tfoot){
    const saleProfitParam = params.find(p => p.computed && p.formula === 'salesProfitPP');
    const dateSaleParam = params.find(p => !p.computed && String(p.label).trim().toLowerCase() === 'date sale');
    let footHtml = '';

    if(saleProfitParam && dateSaleParam){
      // Group rows that actually have a Date Sale entered into per-month subtotals,
      // most recent month first, inserted above the grand total below.
      const groups = {};
      orderedRows.forEach(row => {
        const dateVal = (row.values && row.values[dateSaleParam.id]) || '';
        const parsed = ppParseDateSale(dateVal);
        if(!parsed) return;
        const key = parsed.year + '-' + String(parsed.month).padStart(2, '0');
        if(!groups[key]) groups[key] = { year: parsed.year, month: parsed.month, total: 0 };
        groups[key].total += resolvePastPurchaseRowValues(row)[saleProfitParam.id] || 0;
      });
      const colIndex = params.findIndex(p => p.id === saleProfitParam.id);
      const groupKeys = Object.keys(groups).sort((a, b) => {
        if(groups[b].year !== groups[a].year) return groups[b].year - groups[a].year;
        return groups[b].month - groups[a].month;
      });
      groupKeys.forEach(key => {
        const g = groups[key];
        const sign = g.total >= 0 ? '+' : '-';
        const color = g.total >= 0 ? 'var(--emerald)' : '#ef4444';
        const label = `Sales for month of ${PP_MONTH_ABBR[g.month - 1]} of ${g.year}`;
        footHtml += `<tr style="background:rgba(255,255,255,0.02);"><td style="font-weight:600; color:var(--text-secondary);">${label}</td>`;
        params.forEach((p, idx) => {
          footHtml += idx === colIndex
            ? `<td style="font-weight:600; color:${color};">${sign}$${Math.abs(g.total).toFixed(2)}</td>`
            : `<td></td>`;
        });
        footHtml += `</tr>`;
      });
    }

    if(saleProfitParam){
      const total = orderedRows.reduce((sum, row) => sum + (resolvePastPurchaseRowValues(row)[saleProfitParam.id] || 0), 0);
      const sign = total >= 0 ? '+' : '-';
      const color = total >= 0 ? 'var(--emerald)' : '#ef4444';
      const colIndex = params.findIndex(p => p.id === saleProfitParam.id);
      footHtml += `<tr style="background:rgba(255,255,255,0.03); border-top:2px solid var(--border-color);"><td style="font-weight:700; color:#fff;">Total Sale Profit to date</td>`;
      params.forEach((p, idx) => {
        footHtml += idx === colIndex
          ? `<td style="font-weight:700; color:${color};">${sign}$${Math.abs(total).toFixed(2)}</td>`
          : `<td></td>`;
      });
      footHtml += `</tr>`;
    }

    tfoot.innerHTML = footHtml;
  }
}

// --- Export: Excel / Text / PDF, for both tables ---
// Both builders read from the snapshots kept up to date by
// runMatrixOptimization()/renderPastPurchasesTable() (lastMainTableProcessedAssets /
// lastPastPurchasesOrderedRows), so an export always reflects exactly what's
// currently on screen — same sort order, same column order, same resolved
// computed values — never a silent recompute that could drift from the view.
// Excel and PDF need the SheetJS (XLSX) / jsPDF+autotable libraries, loaded via
// CDN in index.html; Text needs nothing beyond the browser itself.

function downloadTextBlob(filename, content, mimeType){
  const blob = new Blob([content], { type: mimeType + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- On-demand CDN loading with retry, for the Excel/PDF export helper libraries ---
// index.html still loads these once at page-load time (so the common case has zero
// extra delay), but that's a single unretried attempt — if it ever fails (a flaky
// connection, an ad-blocker/firewall momentarily blocking cdn.jsdelivr.net, a
// transient CDN hiccup), the feature used to stay broken until a full page reload.
// These export functions now re-attempt the load right at click time instead, so a
// working connection at export time is all that's needed, regardless of what
// happened when the page first opened.
const EXPORT_LIB_URLS = {
  xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  jspdf: "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
  jspdfAutotable: "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js",
};
const _libraryLoadPromises = {};
function loadScriptOnce(url){
  if(_libraryLoadPromises[url]) return _libraryLoadPromises[url];
  _libraryLoadPromises[url] = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { delete _libraryLoadPromises[url]; reject(new Error("Failed to load " + url)); };
    document.head.appendChild(script);
  });
  return _libraryLoadPromises[url];
}
// checkFn reports whether the library's global is already usable; urls is one or
// more script URLs to inject (in order) if it isn't. Returns whether it's usable
// after trying.
async function ensureLibraryLoaded(checkFn, urls){
  if(checkFn()) return true;
  for(const url of urls){
    try{ await loadScriptOnce(url); }catch(e){ /* try the next url / fall through to the final check */ }
  }
  return checkFn();
}

async function exportTableAsExcel(filename, sheetName, headers, rows){
  const ok = await ensureLibraryLoaded(() => typeof XLSX !== "undefined", [EXPORT_LIB_URLS.xlsx]);
  if(!ok){
    alert('Excel export needs its helper library, and it could not be loaded just now. Please check your internet connection (or any ad-blocker/firewall that might be blocking cdn.jsdelivr.net) and try again.');
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Excel sheet-name length limit
  XLSX.writeFile(wb, filename);
}

function exportTableAsText(filename, headers, rows){
  const escCell = (v) => {
    const s = (v === undefined || v === null) ? "" : String(v);
    return s.replace(/\t/g, " ").replace(/\r?\n/g, " ");
  };
  const lines = [headers, ...rows].map(r => r.map(escCell).join("\t"));
  downloadTextBlob(filename, lines.join("\n"), "text/plain");
}

// Dependency-free: wraps the table as HTML with Word-specific XML namespaces and a
// .doc extension/MIME type, which Word (and most word processors) open directly as
// a formatted document — no CDN library involved, so unlike Excel/PDF this can never
// fail on a network hiccup.
function exportTableAsWord(filename, title, headers, rows){
  const escCell = (v) => {
    const s = (v === undefined || v === null) ? "" : String(v);
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  const headHtml = "<tr>" + headers.map(h => `<th style="background:#1e293b;color:#ffffff;padding:6px 10px;border:1px solid #334155;">${escCell(h)}</th>`).join("") + "</tr>";
  const bodyHtml = rows.map(r => "<tr>" + r.map(c => `<td style="padding:6px 10px;border:1px solid #334155;">${escCell(c)}</td>`).join("") + "</tr>").join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escCell(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
</head>
<body>
<h2 style="font-family:Segoe UI, Arial, sans-serif;">${escCell(title)}</h2>
<p style="font-family:Segoe UI, Arial, sans-serif; color:#555555; font-size:11px;">Exported ${escCell(new Date().toLocaleString())}</p>
<table style="border-collapse:collapse; font-family:Segoe UI, Arial, sans-serif; font-size:11px;">${headHtml}${bodyHtml}</table>
</body></html>`;
  downloadTextBlob(filename, html, "application/msword");
}

async function exportTableAsPdf(filename, title, headers, rows){
  const ok = await ensureLibraryLoaded(
    () => { const c = window.jspdf && window.jspdf.jsPDF; return !!(c && typeof c.prototype.autoTable === "function"); },
    [EXPORT_LIB_URLS.jspdf, EXPORT_LIB_URLS.jspdfAutotable]
  );
  if(!ok){
    alert('PDF export needs its helper library, and it could not be loaded just now. Please check your internet connection (or any ad-blocker/firewall that might be blocking cdn.jsdelivr.net) and try again.');
    return;
  }
  const jsPDFCtor = window.jspdf.jsPDF;
  const doc = new jsPDFCtor({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Exported " + new Date().toLocaleString(), 14, 21);
  doc.autoTable({
    head: [headers], body: rows, startY: 26,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    theme: "grid",
  });
  doc.save(filename);
}

// Renders one main-table cell to a plain export value (mirrors renderCellHTML's
// formatting for computed/custom columns, but returns text/numbers instead of HTML).
function getMainTableExportValue(item, colDef){
  if(colDef.id === "stability") return item.stability;
  if(colDef.id === "calculatedUpside") return (item.calculatedUpside >= 0 ? "+" : "") + (item.calculatedUpside * 100).toFixed(1) + "%";
  if(colDef.id === "allocationWeight") return item.allocationWeight.toFixed(2) + "%";
  if(colDef.isCustom){
    const val = item.customValues[colDef.id];
    const isDefault = item.customIsDefault && item.customIsDefault[colDef.id];
    if(colDef.computed && colDef.formula === "salesProfitPP"){
      if(isDefault) return "—";
      const num = Number(val) || 0;
      return (num >= 0 ? "+" : "-") + "$" + Math.abs(num).toFixed(2);
    }
    if(colDef.computed) return Number(val).toFixed(1) + "%";
    return val;
  }
  return item[colDef.id];
}

function buildMainTableExportTable(){
  const columnOrder = getColumnOrder();
  const defsById = Object.fromEntries(getAllColumnDefs().map(d => [d.id, d]));
  const headers = ["Ticker", ...columnOrder.map(id => (defsById[id] ? defsById[id].label : id))];
  const rows = lastMainTableProcessedAssets.map(item => [
    item.ticker,
    ...columnOrder.map(id => defsById[id] ? getMainTableExportValue(item, defsById[id]) : "")
  ]);
  return { headers, rows };
}

// Mirrors the tfoot logic in renderPastPurchasesTable() (monthly subtotals +
// grand total) so exports carry the same summary rows shown on screen.
function buildPastPurchasesExportTable(){
  const params = getPastPurchasesParams();
  const orderedRows = lastPastPurchasesOrderedRows || [];
  const headers = ["Past Purchases", ...params.map(p => p.label)];

  const rows = orderedRows.map(row => {
    const resolved = resolvePastPurchaseRowValues(row);
    const cells = params.map(p => {
      if(p.computed && p.formula === "salesProfitPP"){
        const ready = resolved["_" + p.id + "_ready"];
        if(!ready) return "—";
        const val = resolved[p.id] || 0;
        return (val >= 0 ? "+" : "-") + "$" + Math.abs(val).toFixed(2);
      }
      if(p.computed){
        const ready = resolved["_" + p.id + "_ready"];
        if(ready === false) return "—";
        return Number(resolved[p.id] || 0).toFixed(1) + "%";
      }
      return resolved[p.id];
    });
    return [row.asset, ...cells];
  });

  const saleProfitParam = params.find(p => p.computed && p.formula === "salesProfitPP");
  const dateSaleParam = params.find(p => !p.computed && String(p.label).trim().toLowerCase() === "date sale");

  if(saleProfitParam && dateSaleParam){
    const groups = {};
    orderedRows.forEach(row => {
      const dateVal = (row.values && row.values[dateSaleParam.id]) || "";
      const parsed = ppParseDateSale(dateVal);
      if(!parsed) return;
      const key = parsed.year + "-" + String(parsed.month).padStart(2, "0");
      if(!groups[key]) groups[key] = { year: parsed.year, month: parsed.month, total: 0 };
      groups[key].total += resolvePastPurchaseRowValues(row)[saleProfitParam.id] || 0;
    });
    const colIndex = params.findIndex(p => p.id === saleProfitParam.id);
    Object.keys(groups).sort((a, b) => {
      if(groups[b].year !== groups[a].year) return groups[b].year - groups[a].year;
      return groups[b].month - groups[a].month;
    }).forEach(key => {
      const g = groups[key];
      const row = new Array(headers.length).fill("");
      row[0] = `Sales for month of ${PP_MONTH_ABBR[g.month - 1]} of ${g.year}`;
      row[colIndex + 1] = (g.total >= 0 ? "+" : "-") + "$" + Math.abs(g.total).toFixed(2);
      rows.push(row);
    });
  }

  if(saleProfitParam){
    const total = orderedRows.reduce((sum, row) => sum + (resolvePastPurchaseRowValues(row)[saleProfitParam.id] || 0), 0);
    const colIndex = params.findIndex(p => p.id === saleProfitParam.id);
    const row = new Array(headers.length).fill("");
    row[0] = "Total Sale Profit to date";
    row[colIndex + 1] = (total >= 0 ? "+" : "-") + "$" + Math.abs(total).toFixed(2);
    rows.push(row);
  }

  return { headers, rows };
}

function wireUpPastPurchasesRefreshButton(){
  const btn = document.getElementById("ppRefreshFromPortfolioBtn");
  const statusEl = document.getElementById("ppRefreshStatus");
  if(!btn) return;
  btn.addEventListener("click", () => {
    const { rowCount, pulled } = refreshPastPurchasesFromPortfolio();
    renderPastPurchasesTable();
    renderPastPurchasesParamList();
    if(statusEl){
      statusEl.textContent = rowCount === 0
        ? "No Past Purchases rows to refresh yet."
        : `Refreshed ${rowCount} row(s) from Portfolio Lists (${pulled} value(s) pulled).`;
      statusEl.style.color = "var(--emerald)";
    }
  });
}

function wireUpExportButtons(){
  const activeListName = () => (getActiveList().name || "Portfolio List").replace(/[^a-z0-9]+/gi, "_");

  const excelBtn = document.getElementById("exportExcelBtn");
  if(excelBtn) excelBtn.addEventListener("click", () => {
    const { headers, rows } = buildMainTableExportTable();
    exportTableAsExcel(`${activeListName()}.xlsx`, getActiveList().name || "Portfolio List", headers, rows);
  });
  const textBtn = document.getElementById("exportTextBtn");
  if(textBtn) textBtn.addEventListener("click", () => {
    const { headers, rows } = buildMainTableExportTable();
    exportTableAsText(`${activeListName()}.txt`, headers, rows);
  });
  const wordBtn = document.getElementById("exportWordBtn");
  if(wordBtn) wordBtn.addEventListener("click", () => {
    const { headers, rows } = buildMainTableExportTable();
    exportTableAsWord(`${activeListName()}.doc`, getActiveList().name || "Portfolio List", headers, rows);
  });
  const pdfBtn = document.getElementById("exportPdfBtn");
  if(pdfBtn) pdfBtn.addEventListener("click", () => {
    const { headers, rows } = buildMainTableExportTable();
    exportTableAsPdf(`${activeListName()}.pdf`, getActiveList().name || "Portfolio List", headers, rows);
  });

  const ppExcelBtn = document.getElementById("ppExportExcelBtn");
  if(ppExcelBtn) ppExcelBtn.addEventListener("click", () => {
    const { headers, rows } = buildPastPurchasesExportTable();
    exportTableAsExcel("Past_Purchases.xlsx", "Past Purchases", headers, rows);
  });
  const ppTextBtn = document.getElementById("ppExportTextBtn");
  if(ppTextBtn) ppTextBtn.addEventListener("click", () => {
    const { headers, rows } = buildPastPurchasesExportTable();
    exportTableAsText("Past_Purchases.txt", headers, rows);
  });
  const ppWordBtn = document.getElementById("ppExportWordBtn");
  if(ppWordBtn) ppWordBtn.addEventListener("click", () => {
    const { headers, rows } = buildPastPurchasesExportTable();
    exportTableAsWord("Past_Purchases.doc", "Past Purchases", headers, rows);
  });
  const ppPdfBtn = document.getElementById("ppExportPdfBtn");
  if(ppPdfBtn) ppPdfBtn.addEventListener("click", () => {
    const { headers, rows } = buildPastPurchasesExportTable();
    exportTableAsPdf("Past_Purchases.pdf", "Past Purchases", headers, rows);
  });
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

  renderImportListSelect();
  renderPastPurchasesImportSelect();
}

function showListActionStatus(message){
  const el = document.getElementById("listActionStatus");
  if(!el) return;
  el.textContent = message;
  setTimeout(() => { if(el.textContent === message) el.textContent = ""; }, 4000);
}

// Mirrors renderListSelector()/showListActionStatus() for the Past Purchases table's
// own list selector.
function renderPPListSelector(){
  const selector = document.getElementById("ppListSelector");
  const heading = document.getElementById("ppActiveListHeading");
  const lists = getAllPastPurchasesLists();
  const activeId = getActivePastPurchasesListId();

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
    const count = getPastPurchasesRows().length;
    heading.textContent = `Now viewing: ${activeName} (${count} row${count === 1 ? "" : "s"})`;
  }
}

function showPPListActionStatus(message){
  const el = document.getElementById("ppListActionStatus");
  if(!el) return;
  el.textContent = message;
  setTimeout(() => { if(el.textContent === message) el.textContent = ""; }, 4000);
}

function renderCustomParamList(){
  const container = document.getElementById("customParamList");
  if(!container) return;
  container.innerHTML = "";
  const params = getCustomParams();
  if(params.length === 0){
    container.innerHTML = `<span style="color:var(--text-secondary);">No custom parameters yet.</span>`;
  } else {
    params.forEach(p => {
      const chip = document.createElement("div");
      chip.className = "remove-chip";
      chip.innerHTML = `<span>${p.label} (${p.type})</span><button data-id="${p.id}" title="Remove ${p.label}">&times;</button>`;
      chip.querySelector("button").addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        if(confirm(`Remove the "${p.label}" column? This deletes its values for every ticker.`)){
          removeCustomParam(id);
          renderCustomParamList();
          runMatrixOptimization();
        }
      });
      container.appendChild(chip);
    });
  }
  renderBuiltinColumnLists();
}

// Fixed (Sample List) columns can be hidden/restored the same way custom
// columns are removed/added — this just uses two chip lists instead of one,
// since a hidden built-in column isn't "gone", it's parked for restoring.
function renderBuiltinColumnLists(){
  const visibleContainer = document.getElementById("builtinColumnList");
  const hiddenContainer = document.getElementById("hiddenBuiltinColumnList");
  const hiddenSection = document.getElementById("hiddenBuiltinColumnSection");
  const hidden = getHiddenBuiltinColumns();

  if(visibleContainer){
    visibleContainer.innerHTML = "";
    const visible = BUILTIN_COLUMNS.filter(c => !hidden.includes(c.id));
    if(visible.length === 0){
      visibleContainer.innerHTML = `<span style="color:var(--text-secondary);">All Sample List columns are hidden.</span>`;
    } else {
      visible.forEach(c => {
        const chip = document.createElement("div");
        chip.className = "remove-chip";
        chip.innerHTML = `<span>${c.label}</span><button data-id="${c.id}" title="Hide ${c.label}">&times;</button>`;
        chip.querySelector("button").addEventListener("click", (e) => {
          const id = e.target.getAttribute("data-id");
          if(confirm(`Hide the "${c.label}" column? Its data is kept (and still used in scoring, if applicable) — restore it any time from here.`)){
            removeBuiltinColumn(id);
            renderCustomParamList();
            runMatrixOptimization();
          }
        });
        visibleContainer.appendChild(chip);
      });
    }
  }

  if(hiddenContainer && hiddenSection){
    hiddenSection.style.display = hidden.length === 0 ? "none" : "block";
    hiddenContainer.innerHTML = "";
    hidden.forEach(id => {
      const c = BUILTIN_COLUMNS.find(bc => bc.id === id);
      if(!c) return;
      const chip = document.createElement("div");
      chip.className = "remove-chip";
      chip.innerHTML = `<span>${c.label}</span><button data-id="${c.id}" title="Restore ${c.label}" style="color:var(--emerald);">+</button>`;
      chip.querySelector("button").addEventListener("click", (e) => {
        const restoreId = e.target.getAttribute("data-id");
        restoreBuiltinColumn(restoreId);
        renderCustomParamList();
        runMatrixOptimization();
      });
      hiddenContainer.appendChild(chip);
    });
  }
}

function renderRowOrderList(){
  const container = document.getElementById("rowOrderList");
  if(!container) return;
  container.innerHTML = "";
  const tickers = getWorkingData().map(a => a.ticker);
  const order = applyRowOrder(tickers);

  order.forEach((ticker, idx) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; align-items:center; gap:0.75rem; background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; padding:0.5rem 0.75rem;";
    row.innerHTML = `
      <span style="flex:1;">${ticker}</span>
      <button class="row-move-btn" data-ticker="${ticker}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} title="Move up" style="background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); width:32px; height:32px; border-radius:6px; cursor:pointer;">↑</button>
      <button class="row-move-btn" data-ticker="${ticker}" data-dir="1" ${idx === order.length-1 ? 'disabled' : ''} title="Move down" style="background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); width:32px; height:32px; border-radius:6px; cursor:pointer;">↓</button>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll(".row-move-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const ticker = e.target.getAttribute("data-ticker");
      const dir = parseInt(e.target.getAttribute("data-dir"), 10);
      moveRowInList(ticker, dir);
      renderRowOrderList();
      runMatrixOptimization();
    });
  });
}

function renderColumnOrderList(){
  const container = document.getElementById("columnOrderList");
  if(!container) return;
  container.innerHTML = "";
  const order = getColumnOrder();
  const defsById = Object.fromEntries(getAllColumnDefs().map(d => [d.id, d]));

  order.forEach((colId, idx) => {
    const def = defsById[colId];
    if(!def) return;
    const row = document.createElement("div");
    row.style.cssText = "display:flex; align-items:center; gap:0.75rem; background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; padding:0.5rem 0.75rem;";
    row.innerHTML = `
      <span style="flex:1;">${def.label}${def.isCustom ? ' <span style="color:var(--text-secondary); font-size:0.75rem;">(custom)</span>' : ''}${def.computed ? ' <span style="color:var(--text-secondary); font-size:0.75rem;">(computed)</span>' : ''}</span>
      <button class="col-move-btn" data-id="${colId}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} title="Move left" style="background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); width:32px; height:32px; border-radius:6px; cursor:pointer;">←</button>
      <button class="col-move-btn" data-id="${colId}" data-dir="1" ${idx === order.length-1 ? 'disabled' : ''} title="Move right" style="background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); width:32px; height:32px; border-radius:6px; cursor:pointer;">→</button>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll(".col-move-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      const dir = parseInt(e.target.getAttribute("data-dir"), 10);
      moveColumn(id, dir);
      renderColumnOrderList();
      runMatrixOptimization();
    });
  });
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
      if(confirm(`Remove the "${t}" row? This deletes the entire row.`)){
        removeAsset(t);
        renderRemoveList();
        runMatrixOptimization();
      }
    });
    container.appendChild(chip);
  });
}

document.getElementById('optimizeBtn').addEventListener('click', runMatrixOptimization);
document.getElementById('sortMode')?.addEventListener('change', runMatrixOptimization);

function escAttr(str){
  return String(str).replace(/"/g, '&quot;');
}

function renderCellHTML(colDef, item, badge){
  if(!colDef) return '<td></td>'; // defensive: a stale column id with no matching def

  if(colDef.id === 'name'){
    return `<td>
        <input class="cell-input" data-ticker="${item.ticker}" data-field="name" data-resolved-value="${escAttr(item.name)}" type="text" value="${escAttr(item.name)}">
        <div style="margin-top:4px;">${badge}</div>
      </td>`;
  }
  if(colDef.id === 'stability'){
    const options = colDef.options.map(opt =>
      `<option value="${opt}" ${item.stability === opt ? 'selected' : ''}>${opt}</option>`
    ).join('');
    return `<td><select class="cell-input" data-ticker="${item.ticker}" data-field="stability" data-resolved-value="${escAttr(item.stability)}">${options}</select></td>`;
  }
  if(colDef.id === 'stabilityNotes'){
    return `<td class="moat-cell"><textarea class="cell-input cell-textarea" data-ticker="${item.ticker}" data-field="stabilityNotes" data-resolved-value="${escAttr(item.stabilityNotes)}">${item.stabilityNotes}</textarea></td>`;
  }
  if(colDef.id === 'calculatedUpside'){
    return `<td style="color: ${item.calculatedUpside >= 0 ? 'var(--emerald)' : '#ef4444'}; font-weight: 600;">${item.calculatedUpside >= 0 ? '+' : ''}${(item.calculatedUpside * 100).toFixed(1)}%</td>`;
  }
  if(colDef.id === 'allocationWeight'){
    return `<td><span class="allocation-badge">${item.allocationWeight.toFixed(2)}%</span></td>`;
  }
  if(colDef.isCustom){
    const val = item.customValues[colDef.id];
    const isDefault = item.customIsDefault && item.customIsDefault[colDef.id];
    const defaultClass = isDefault ? ' cell-input-unconfirmed' : '';
    if(colDef.computed && colDef.formula === 'salesProfitPP'){
      const num = Number(val) || 0;
      const sign = num >= 0 ? '+' : '-';
      const color = isDefault ? 'var(--text-secondary)' : (num >= 0 ? 'var(--emerald)' : '#ef4444');
      const titleAttr = isDefault ? ` title="Add Units Purchased, Average Purchase Price, and Selling Price columns to compute this."` : '';
      return `<td style="color:${color}; font-weight:600;"${titleAttr}>${sign}$${Math.abs(num).toFixed(2)}</td>`;
    }
    if(colDef.computed){
      return `<td class="${isDefault ? 'cell-input-unconfirmed' : ''}">${Number(val).toFixed(1)}%</td>`;
    }
    if(colDef.type === 'text'){
      return `<td><input class="cell-input${defaultClass}" data-ticker="${item.ticker}" data-field="${colDef.id}" data-resolved-value="${escAttr(val)}" type="text" value="${escAttr(val)}"></td>`;
    }
    if(colDef.type === 'date'){
      return `<td><input class="cell-input${defaultClass}" data-ticker="${item.ticker}" data-field="${colDef.id}" data-resolved-value="${escAttr(val)}" type="date" value="${escAttr(val)}"></td>`;
    }
    return `<td><input class="cell-input cell-input-num${defaultClass}" data-ticker="${item.ticker}" data-field="${colDef.id}" data-resolved-value="${val}" type="number" step="0.01" value="${val}"></td>`;
  }
  // Default: built-in numeric field (roa, pe, currentPrice, targetPrice, revenueGrowth, etc.)
  const val = item[colDef.id];
  return `<td><input class="cell-input cell-input-num" data-ticker="${item.ticker}" data-field="${colDef.id}" data-resolved-value="${val}" type="number" step="0.01" value="${val}"></td>`;
}

function renderTableHeader(){
  const thead = document.getElementById('resultsTableHead');
  if(!thead) return;
  const columnOrder = getColumnOrder();
  const allDefs = getAllColumnDefs();
  const defsById = Object.fromEntries(allDefs.map(d => [d.id, d]));

  let html = '<tr><th>Ticker</th>';
  columnOrder.forEach((colId, idx) => {
    const def = defsById[colId];
    if(!def) return;
    const leftDisabled = idx === 0 ? 'disabled' : '';
    const rightDisabled = idx === columnOrder.length - 1 ? 'disabled' : '';
    const isSorted = columnSortState && columnSortState.colId === colId;
    const sortIcon = isSorted ? (columnSortState.direction === 'asc' ? '▲' : '▼') : '⇅';
    html += `<th>
      <div>${def.label}</div>
      <div class="col-header-controls">
        <button class="col-ctrl-btn ${isSorted ? 'col-ctrl-sort-active' : ''}" data-action="sort" data-id="${colId}" title="Sort by this column">${sortIcon}</button>
        <button class="col-ctrl-btn" data-action="move" data-id="${colId}" data-dir="-1" ${leftDisabled} title="Move left">&lt;</button>
        <button class="col-ctrl-btn" data-action="move" data-id="${colId}" data-dir="1" ${rightDisabled} title="Move right">&gt;</button>
        <button class="col-ctrl-btn col-ctrl-remove" data-action="remove" data-id="${colId}" title="Remove this parameter">&times;</button>
      </div>
    </th>`;
  });
  html += '</tr>';
  thead.innerHTML = html;

  thead.querySelectorAll('.col-ctrl-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      if(action === 'sort'){
        if(!columnSortState || columnSortState.colId !== id){
          columnSortState = { colId: id, direction: 'asc' };
        } else if(columnSortState.direction === 'asc'){
          columnSortState = { colId: id, direction: 'desc' };
        } else {
          columnSortState = null; // third click clears back to the Sort-by dropdown
        }
        runMatrixOptimization();
      } else if(action === 'move'){
        moveColumn(id, parseInt(btn.getAttribute('data-dir'), 10));
        runMatrixOptimization();
      } else if(action === 'remove'){
        const def = defsById[id];
        if(def.isCustom){
          if(confirm(`Remove the "${def.label}" column? This deletes its values for every ticker.`)){
            removeCustomParam(id);
            runMatrixOptimization();
            renderCustomParamList();
          }
        } else {
          if(confirm(`Hide the "${def.label}" column? Its data is kept (and still used in scoring, if applicable) — restore it any time from the "+/- Parameter" panel.`)){
            removeBuiltinColumn(id);
            runMatrixOptimization();
            renderCustomParamList();
          }
        }
      }
    });
  });
}

function runMatrixOptimization() {
  renderTableHeader();
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
    const stabilityNotes = ov.stabilityNotes !== undefined ? ov.stabilityNotes : (asset.stabilityNotes || "");

    // New fundamentals — live fetch (where attempted) still wins over static default,
    // manual override still wins over everything, same pattern as the fields above.
    const revenueGrowth = ov.revenueGrowth !== undefined ? ov.revenueGrowth : ((live && live.revenueGrowth !== undefined) ? live.revenueGrowth : asset.revenueGrowth);
    const netMargin = ov.netMargin !== undefined ? ov.netMargin : ((live && live.netMargin !== undefined) ? live.netMargin : asset.netMargin);
    const pegRatio = ov.pegRatio !== undefined ? ov.pegRatio : asset.pegRatio;
    const debtToEquity = ov.debtToEquity !== undefined ? ov.debtToEquity : ((live && live.debtToEquity !== undefined) ? live.debtToEquity : asset.debtToEquity);
    const freeCashFlow = ov.freeCashFlow !== undefined ? ov.freeCashFlow : asset.freeCashFlow;
    const cashRunway = ov.cashRunway !== undefined ? ov.cashRunway : asset.cashRunway;
    const beta = ov.beta !== undefined ? ov.beta : ((live && live.beta !== undefined) ? live.beta : asset.beta);

    const priceRelevantOverride = ov.currentPrice !== undefined || ov.pe !== undefined || ov.roa !== undefined;
    const isLive = !!(live && live.price !== undefined) && !priceRelevantOverride;
    const isEdited = priceRelevantOverride;
    const fetchFailed = fetchFailedTickers.has(asset.ticker) && !priceRelevantOverride;

    let upsidePercentage = (targetPrice - currentPrice) / currentPrice;
    let attributionScore = 0;

    if (mandate === 'tactical') {
      attributionScore = upsidePercentage * 100;
      // Tactical still leads with upside, but gives a modest nod to growth momentum
      // and to names already carrying volatility (beta) as tactical trades tend to.
      attributionScore += revenueGrowth * 0.3;
      if (beta > 1) attributionScore += (beta - 1) * 5;
    } else if (mandate === 'conservative') {
      if (stability === "Ultra-high") attributionScore += 60;
      if (stability === "High") attributionScore += 35;
      attributionScore += (120 / (pe + 1));
      // Conservative cares about quality and safety: profitability, low leverage,
      // low volatility, and actually generating cash rather than burning it.
      attributionScore += netMargin * 0.5;
      attributionScore -= debtToEquity * 8;
      attributionScore += beta < 1 ? (1 - beta) * 20 : -(beta - 1) * 10;
      attributionScore += freeCashFlow > 0 ? 15 : -15;
      if (pegRatio > 0 && pegRatio < 2) attributionScore += (2 - pegRatio) * 5;
    } else if (mandate === 'balanced') {
      attributionScore += roa * 1.2;
      attributionScore += upsidePercentage * 80;
      // Balanced blends growth-at-a-reasonable-price signals with efficiency.
      attributionScore += revenueGrowth * 0.4;
      attributionScore += netMargin * 0.3;
      if (pegRatio > 0) attributionScore += Math.max(0, 3 - pegRatio) * 4;
      attributionScore -= debtToEquity * 3;
    } else if (mandate === 'aggressive') {
      attributionScore += upsidePercentage * 180;
      attributionScore += roa * 0.8;
      // Aggressive leans into growth and volatility, but for cash-burning speculative
      // names specifically, a longer cash runway is what keeps the bet alive long
      // enough to pay off — so runway matters here more than anywhere else.
      attributionScore += revenueGrowth * 0.6;
      if (freeCashFlow < 0 && cashRunway < 99999) attributionScore += Math.min(cashRunway, 3) * 6;
      if (beta > 1.5) attributionScore += (beta - 1.5) * 8;
    }

    // Custom user-defined parameters: computed formula (if any) always wins;
    // otherwise override value if set, else the param's default.
    const customValues = {};
    const customIsDefault = {};
    const allCustomParams = getCustomParams();

    // Pass 1: values that don't depend on other custom params.
    allCustomParams.forEach(p => {
      if(p.computed && p.formula === "currentToTargetPct"){
        customValues[p.id] = targetPrice !== 0 ? (currentPrice / targetPrice) * 100 : 0;
        customIsDefault[p.id] = false; // a computed value is always "real", never a placeholder
      } else if(p.computed && (p.formula === "actualUpsidePct" || p.formula === "salesProfitPP" || p.formula === "missedGainPct")){
        // resolved in pass 2, once their sibling custom params (if present) are available
      } else {
        customValues[p.id] = ov[p.id] !== undefined ? ov[p.id] : p.defaultValue;
        customIsDefault[p.id] = ov[p.id] === undefined;
      }
    });

    // Pass 2: values that depend on another custom param's resolved value from pass 1.
    allCustomParams.forEach(p => {
      if(p.computed && p.formula === "actualUpsidePct"){
        const avgPriceParam = allCustomParams.find(cp => cp.label === "Average Purchase Price ($)");
        const avgPrice = avgPriceParam ? customValues[avgPriceParam.id] : undefined;
        const hasRealPurchasePrice = avgPrice !== undefined && avgPrice !== 0;
        customValues[p.id] = hasRealPurchasePrice ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
        // Grey it out until there's both an Average Purchase Price column AND a real (non-zero) value entered.
        customIsDefault[p.id] = !hasRealPurchasePrice;
      } else if(p.computed && p.formula === "salesProfitPP"){
        // Same formula and "ready" logic as the Past Purchases table's own Sale
        // Profit column (see resolvePastPurchaseRowValues), just looked up among
        // THIS table's custom params instead of a Past Purchases row's columns.
        const norm = s => String(s).trim().toLowerCase();
        const unitsParam = allCustomParams.find(cp => !cp.computed && norm(cp.label) === "units purchased");
        const avgParam = allCustomParams.find(cp => !cp.computed && (norm(cp.label) === "average purchase price ($)" || norm(cp.label) === "average purchase price"));
        const sellParam = allCustomParams.find(cp => !cp.computed && norm(cp.label) === "selling price");
        const units = unitsParam ? (Number(customValues[unitsParam.id]) || 0) : 0;
        const avg = avgParam ? (Number(customValues[avgParam.id]) || 0) : 0;
        const sell = sellParam ? (Number(customValues[sellParam.id]) || 0) : 0;
        const ready = !!(unitsParam && avgParam && sellParam) && units !== 0 && sell !== 0;
        customValues[p.id] = ready ? units * (sell - avg) : 0;
        customIsDefault[p.id] = !ready;
      } else if(p.computed && p.formula === "missedGainPct"){
        // (Current Price − Selling Price) ÷ Selling Price × 100, using the already-
        // resolved (override > live fetch > static) currentPrice for this row, so it
        // fluctuates automatically every time live data is fetched/updated.
        const norm = s => String(s).trim().toLowerCase();
        const sellParam = allCustomParams.find(cp => !cp.computed && norm(cp.label) === "selling price");
        const sell = sellParam ? (Number(customValues[sellParam.id]) || 0) : 0;
        const ready = !!sellParam && sell !== 0;
        customValues[p.id] = ready ? ((currentPrice - sell) / sell) * 100 : 0;
        customIsDefault[p.id] = !ready;
      }
    });

    return { ticker: asset.ticker, name, currentPrice, pe, roa, targetPrice, stability, stabilityNotes,
      revenueGrowth, netMargin, pegRatio, debtToEquity, freeCashFlow, cashRunway, beta, customValues, customIsDefault,
      isLive, isEdited, fetchFailed, dateAdded: (ov.dateAdded !== undefined ? ov.dateAdded : 0),
      finalScore: Math.max(0.1, attributionScore), calculatedUpside: upsidePercentage };
  });

  const netMatrixScore = processedAssets.reduce((accum, item) => accum + item.finalScore, 0);

  processedAssets = processedAssets.map(item => {
    let targetAllocationWeight = (item.finalScore / netMatrixScore) * 100;
    return { ...item, allocationWeight: targetAllocationWeight };
  });

  const STABILITY_SORT_ORDER = { "Low": 0, "Med": 1, "High": 2, "Ultra-high": 3 };

  function getSortValue(item, colId){
    if(colId === 'stability') return STABILITY_SORT_ORDER[item.stability] ?? -1;
    if(colId === 'calculatedUpside') return item.calculatedUpside;
    if(colId === 'allocationWeight') return item.allocationWeight;
    if(colId === 'name') return item.name.toLowerCase();
    if(item.customValues && colId in item.customValues){
      const v = item.customValues[colId];
      return typeof v === 'string' ? v.toLowerCase() : v;
    }
    const v = item[colId];
    return typeof v === 'string' ? v.toLowerCase() : v;
  }

  const sortMode = document.getElementById('sortMode') ? document.getElementById('sortMode').value : 'default';
  if(columnSortState){
    const { colId, direction } = columnSortState;
    processedAssets.sort((a, b) => {
      const va = getSortValue(a, colId), vb = getSortValue(b, colId);
      let cmp;
      if(typeof va === 'string' || typeof vb === 'string') cmp = String(va).localeCompare(String(vb));
      else cmp = va - vb;
      return direction === 'asc' ? cmp : -cmp;
    });
  } else if(sortMode === 'alpha'){
    processedAssets.sort((a, b) => a.ticker.localeCompare(b.ticker));
  } else if(sortMode === 'date-new'){
    processedAssets.sort((a, b) => b.dateAdded - a.dateAdded);
  } else if(sortMode === 'date-old'){
    processedAssets.sort((a, b) => a.dateAdded - b.dateAdded);
  } else if(sortMode === 'custom'){
    const order = applyRowOrder(processedAssets.map(a => a.ticker));
    processedAssets.sort((a, b) => order.indexOf(a.ticker) - order.indexOf(b.ticker));
  } else if (mandate === 'tactical') {
    processedAssets.sort((a, b) => b.calculatedUpside - a.calculatedUpside);
  } else {
    processedAssets.sort((a, b) => b.allocationWeight - a.allocationWeight);
  }

  lastMainTableProcessedAssets = processedAssets;

  processedAssets.forEach((item, rowIdx) => {
    const rowElement = document.createElement('tr');

    let badge;
    if(item.isEdited) badge = `<span style="color:#a78bfa; font-size:0.75rem; font-weight:600;">✎ edited</span> <button class="clear-override-btn" data-ticker="${item.ticker}" title="Clear manual price/P-E/ROA override and restore live/static data" style="background:none; border:none; color:var(--text-secondary); font-size:0.7rem; text-decoration:underline; cursor:pointer; padding:0;">↺ clear</button>`;
    else if(item.isLive) badge = `<span style="color:var(--emerald); font-size:0.75rem; font-weight:600;">● LIVE</span>`;
    else if(item.fetchFailed) badge = `<span style="color:#ef4444; font-size:0.75rem; font-weight:600;" title="Finnhub couldn't return data for this ticker">⚠ fetch failed</span>`;
    else badge = `<span style="color:var(--text-secondary); font-size:0.75rem; font-weight:600;">○ static</span>`;

    const columnOrder = getColumnOrder();
    const allDefs = getAllColumnDefs();
    const defsById = Object.fromEntries(allDefs.map(d => [d.id, d]));

    const upDisabled = rowIdx === 0 ? 'disabled' : '';
    const downDisabled = rowIdx === processedAssets.length - 1 ? 'disabled' : '';
    const tickerCell = `<td>
        <input class="cell-input cell-input-ticker" data-ticker="${item.ticker}" data-field="__ticker_rename__" type="text" value="${item.ticker}">
        <div class="row-ctrl-controls">
          <button class="row-ctrl-btn" data-action="up" data-ticker="${item.ticker}" ${upDisabled} title="Move row up">&uarr;</button>
          <button class="row-ctrl-btn" data-action="down" data-ticker="${item.ticker}" ${downDisabled} title="Move row down">&darr;</button>
          <button class="row-ctrl-btn row-ctrl-remove" data-action="delete" data-ticker="${item.ticker}" title="Remove ${item.ticker} from this list">&times;</button>
        </div>
      </td>`;

    const middleCells = columnOrder.map(colId => renderCellHTML(defsById[colId], item, badge)).join("\n      ");

    rowElement.innerHTML = tickerCell + "\n      " + middleCells;
    tbody.appendChild(rowElement);
  });

  wireUpRowControls();
  wireUpEditableCells();
  wireUpClearOverrideButtons();
}

function wireUpRowControls(){
  document.querySelectorAll('.row-ctrl-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ticker = btn.getAttribute('data-ticker');
      const action = btn.getAttribute('data-action');
      if(action === 'delete'){
        if(confirm(`Remove the "${ticker}" row? This deletes the entire row.`)){
          removeAsset(ticker);
          runMatrixOptimization();
          renderRemoveList();
          renderListSelector();
        }
      } else if(action === 'up'){
        moveRowInList(ticker, -1);
        runMatrixOptimization();
      } else if(action === 'down'){
        moveRowInList(ticker, 1);
        runMatrixOptimization();
      }
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

// --- Wire up portfolio list management ---
try{
  renderListSelector();

  const listSelector = document.getElementById("listSelector");
  if(listSelector){
    listSelector.addEventListener("change", async (e) => {
      setActiveListId(e.target.value);
      renderRemoveList();
      renderListSelector();
      runMatrixOptimization();
      showListActionStatus(`Switched to "${getActiveList().name}". Fetching live data…`);
      await fetchLiveDataForAllAssets();
      showListActionStatus(`Switched to "${getActiveList().name}".`);
    });
  }

  const newListBtn = document.getElementById("newListBtn");
  if(newListBtn){
    newListBtn.addEventListener("click", () => {
      let name = prompt("Name for the new list:", "List " + (Object.keys(getAllLists()).length + 1));
      while(name !== null && name.trim() !== "" && listNameExists(name)){
        name = prompt(`"${name.trim()}" is already in use. Please choose a different name:`, "");
      }
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
      const activeId = getActiveListId();
      let name = prompt("Rename this list:", current.name);
      while(name !== null && name.trim() !== "" && listNameExists(name, activeId)){
        name = prompt(`"${name.trim()}" is already in use by another list. Please choose a different name:`, "");
      }
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

  const importListBtn = document.getElementById("importListBtn");
  if(importListBtn){
    importListBtn.addEventListener("click", async () => {
      const select = document.getElementById("importListSelect");
      const statusEl = document.getElementById("importListStatus");
      const sourceId = select.value;
      if(!sourceId){
        statusEl.textContent = "No other list available to import from.";
        statusEl.style.color = "var(--amber)";
        return;
      }
      const lists = getAllLists();
      const sourceName = lists[sourceId].name;
      const result = importListInto(sourceId);
      renderRemoveList();
      renderListSelector();
      runMatrixOptimization();

      if(result.imported === 0){
        statusEl.textContent = `Nothing new to import — every ticker from "${sourceName}" is already in this list.`;
        statusEl.style.color = "var(--sub)";
      } else {
        statusEl.textContent = `Imported ${result.imported} ticker(s) from "${sourceName}". Fetching live data…`;
        statusEl.style.color = "var(--sub)";
        await fetchLiveDataForAllAssets();
        statusEl.textContent = `Imported ${result.imported} ticker(s) from "${sourceName}".`;
        statusEl.style.color = "var(--emerald)";
      }
    });
  }
}catch(err){
  console.error("Failed to wire up list management:", err);
}

// --- Wire up Add/Remove asset panel + new Add Parameter / Reorder Columns tabs ---
try{
  const tabs = [
    { btn: "tabAddBtn", panel: "addPanel", onShow: renderRemoveList },
    { btn: "tabAddParamBtn", panel: "addParamPanel", onShow: renderCustomParamList },
    { btn: "tabColumnsBtn", panel: "columnsPanel", onShow: renderColumnOrderList },
    { btn: "tabRowsBtn", panel: "rowsPanel", onShow: renderRowOrderList },
  ];
  const missing = tabs.some(t => !document.getElementById(t.btn) || !document.getElementById(t.panel));
  if(missing){
    console.warn("One or more tab elements missing — index.html may be out of date.");
  } else {
    tabs.forEach(t => {
      document.getElementById(t.btn).addEventListener("click", () => {
        tabs.forEach(other => {
          document.getElementById(other.panel).style.display = (other.btn === t.btn) ? "block" : "none";
          document.getElementById(other.btn).classList.toggle("active-tab", other.btn === t.btn);
        });
        if(t.onShow) t.onShow();
      });
    });
  }

  const addAssetBtn = document.getElementById("addAssetBtn");
  if(addAssetBtn){
    addAssetBtn.addEventListener("click", async () => {
      const ticker = document.getElementById("newTicker").value.trim().toUpperCase();
      const name = document.getElementById("newName").value.trim();
      const targetPrice = parseFloat(document.getElementById("newTarget").value);
      const stability = document.getElementById("newStability").value;
      const statusEl = document.getElementById("addStatus");

      if(!ticker || !name){
        statusEl.textContent = "Ticker and Company Name are required.";
        statusEl.style.color = "var(--amber)";
        return;
      }

      const alreadyInList = getWorkingData().some(a => a.ticker === ticker);
      if(alreadyInList){
        statusEl.textContent = `${ticker} is already in this list. Edit it directly in the table, or remove it first if you want to re-add it fresh.`;
        statusEl.style.color = "var(--amber)";
        return;
      }

      addAsset({ ticker, name, targetPrice: isNaN(targetPrice) ? 0 : targetPrice, stability });
      runMatrixOptimization();

      statusEl.textContent = `${ticker} added. Fetching live price/P-E/ROA…`;
      statusEl.style.color = "var(--sub)";

      const result = await fetchLiveDataForOneTicker(ticker);
      runMatrixOptimization();

      if(result.ok){
        statusEl.textContent = `${ticker} added and live data fetched successfully.`;
        statusEl.style.color = "var(--emerald)";
      } else if(result.reason === "no-key"){
        statusEl.textContent = `${ticker} added. Save a Finnhub API key above, then click "Fetch live data" to pull its real numbers.`;
        statusEl.style.color = "var(--amber)";
      } else {
        statusEl.textContent = `${ticker} added, but the live fetch failed: ${result.reason}. It'll show as static data — edit the cells manually or try "Fetch live data" again later.`;
        statusEl.style.color = "var(--amber)";
      }

      document.getElementById("newTicker").value = "";
      document.getElementById("newName").value = "";
      document.getElementById("newTarget").value = "";
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

  const newParamPreset = document.getElementById("newParamPreset");
  let selectedPresetMeta = null;
  if(newParamPreset){
    // Same full preset list as Past Purchases (PP_PARAM_PRESETS) — every
    // parameter that started in either table's dropdown is now offered in
    // both, sorted A–Z. Picking one of the fields that mirror a Sample List
    // built-in (e.g. "Current Price") is still blocked by the duplicate
    // guard below when that built-in column is currently visible — see the
    // comment above PP_ONLY_PARAM_PRESETS for why that's expected.
    newParamPreset.innerHTML = buildPresetOptionsHtml(PP_PARAM_PRESETS);
    newParamPreset.addEventListener("change", () => {
      const val = newParamPreset.value;
      if(val === "__custom__"){
        document.getElementById("newParamLabel").value = "";
        document.getElementById("newParamType").value = "number";
        document.getElementById("newParamDefault").value = "";
        selectedPresetMeta = null;
      } else {
        const preset = PP_PARAM_PRESETS[parseInt(val, 10)];
        document.getElementById("newParamLabel").value = preset.label;
        document.getElementById("newParamType").value = preset.type;
        document.getElementById("newParamDefault").value = preset.defaultValue === "__today__" ? new Date().toISOString().slice(0,10) : preset.defaultValue;
        selectedPresetMeta = (preset.finnhubField || preset.computed) ? {
          finnhubField: preset.finnhubField, finnhubUnitDivisor: preset.finnhubUnitDivisor,
          computed: preset.computed, formula: preset.formula
        } : null;
      }
    });
  }

  const addParamBtn = document.getElementById("addParamBtn");
  if(addParamBtn){
    addParamBtn.addEventListener("click", async () => {
      const label = document.getElementById("newParamLabel").value.trim();
      const type = document.getElementById("newParamType").value;
      const defaultValue = document.getElementById("newParamDefault").value.trim();
      const statusEl = document.getElementById("addParamStatus");

      if(!label){
        statusEl.textContent = "Parameter name is required.";
        statusEl.style.color = "var(--amber)";
        return;
      }
      // Bypass the similarity check for computed presets regardless of HOW the
      // label got here (dropdown selection, or typed directly) — these are a
      // small curated set I already know are genuinely distinct metrics.
      const matchingComputedPreset = PP_PARAM_PRESETS.find(p => p.computed && p.label.toLowerCase() === label.toLowerCase());
      const effectiveMeta = selectedPresetMeta || (matchingComputedPreset ? { computed: true, formula: matchingComputedPreset.formula } : null);

      const matchingBuiltin = BUILTIN_COLUMNS.find(c => c.label.trim().toLowerCase() === label.toLowerCase());
      const exactDuplicate = getCustomParams().some(p => p.label.trim().toLowerCase() === label.toLowerCase()) || !!matchingBuiltin;
      if(exactDuplicate){
        const isHidden = matchingBuiltin && getHiddenBuiltinColumns().includes(matchingBuiltin.id);
        statusEl.textContent = isHidden
          ? `"${label}" already exists as a Sample List column — it's just hidden right now. Restore it below instead of adding a new one with the same name.`
          : `"${label}" already exists as a column. Edit it directly in the table instead of adding it again.`;
        statusEl.style.color = "var(--amber)";
        return;
      }

      const conflict = effectiveMeta?.computed ? null : findSimilarExistingParam(label);
      if(conflict){
        statusEl.textContent = `"${label}" is too similar to the existing "${conflict.label}" column. Choose a more distinct name, or edit that column directly instead.`;
        statusEl.style.color = "var(--amber)";
        return;
      }

      addCustomParam({ label, type, defaultValue, finnhubField: effectiveMeta?.finnhubField, finnhubUnitDivisor: effectiveMeta?.finnhubUnitDivisor, computed: effectiveMeta?.computed, formula: effectiveMeta?.formula });
      renderCustomParamList();
      renderColumnOrderList();
      runMatrixOptimization();

      statusEl.textContent = `"${label}" added as a new column. Refreshing live data…`;
      statusEl.style.color = "var(--sub)";
      document.getElementById("newParamLabel").value = "";
      document.getElementById("newParamDefault").value = "";
      if(newParamPreset) newParamPreset.value = "__custom__";

      await fetchLiveDataForAllAssets();
      statusEl.textContent = `"${label}" added as a new column, appended to the end (reorder it from the "⇄ Reorder Columns" tab, or with the < > arrows in the table header).`;
      statusEl.style.color = "var(--emerald)";
    });
  }

  renderCustomParamList();
  renderColumnOrderList();
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

// --- Wire up the in-app sync controls (logout/sync-now, once already logged in) ---
try{
  const logOutBtnInline = document.getElementById("logOutBtnInline");
  if(logOutBtnInline){
    logOutBtnInline.addEventListener("click", logoutUser);
  }

  const syncNowBtn = document.getElementById("syncNowBtn");
  if(syncNowBtn){
    syncNowBtn.addEventListener("click", async () => {
      const syncStatusEl = document.getElementById("syncStatus");
      syncStatusEl.textContent = "Syncing…"; syncStatusEl.style.color = "var(--sub)";
      const result = await pushSnapshotToCloud();
      syncStatusEl.textContent = result.ok ? `Synced at ${new Date().toLocaleTimeString()}.` : `Sync failed: ${result.reason}`;
      syncStatusEl.style.color = result.ok ? "var(--emerald)" : "var(--amber)";
    });
  }
}catch(err){
  console.error("Failed to wire up sync controls:", err);
}

// --- Wire up Past Purchases list management (mirrors Portfolio Lists' own) ---
try{
  renderPPListSelector();

  const ppListSelector = document.getElementById("ppListSelector");
  if(ppListSelector){
    ppListSelector.addEventListener("change", (e) => {
      setActivePastPurchasesListId(e.target.value);
      renderPPListSelector();
      renderPastPurchasesTickerList();
      renderPastPurchasesParamList();
      renderPastPurchasesColumnOrderList();
      renderPastPurchasesRowOrderList();
      renderPastPurchasesTable();
      showPPListActionStatus(`Switched to "${getActivePastPurchasesList().name}".`);
    });
  }

  const ppNewListBtn = document.getElementById("ppNewListBtn");
  if(ppNewListBtn){
    ppNewListBtn.addEventListener("click", () => {
      let name = prompt("Name for the new Past Purchases list:", "List " + (Object.keys(getAllPastPurchasesLists()).length + 1));
      while(name !== null && name.trim() !== "" && pastPurchasesListNameExists(name)){
        name = prompt(`"${name.trim()}" is already in use. Please choose a different name:`, "");
      }
      if(name === null || name.trim() === "") return; // user cancelled
      createPastPurchasesList(name.trim());
      renderPPListSelector();
      renderPastPurchasesTickerList();
      renderPastPurchasesParamList();
      renderPastPurchasesColumnOrderList();
      renderPastPurchasesRowOrderList();
      renderPastPurchasesTable();
      showPPListActionStatus(`Created and switched to "${name.trim()}". Use the dropdown above to switch between lists.`);
    });
  }

  const ppRenameListBtn = document.getElementById("ppRenameListBtn");
  if(ppRenameListBtn){
    ppRenameListBtn.addEventListener("click", () => {
      const current = getActivePastPurchasesList();
      const activeId = getActivePastPurchasesListId();
      let name = prompt("Rename this Past Purchases list:", current.name);
      while(name !== null && name.trim() !== "" && pastPurchasesListNameExists(name, activeId)){
        name = prompt(`"${name.trim()}" is already in use by another list. Please choose a different name:`, "");
      }
      if(name === null || name.trim() === "") return;
      renameActivePastPurchasesList(name.trim());
      renderPPListSelector();
      showPPListActionStatus(`Renamed to "${name.trim()}".`);
    });
  }

  const ppDeleteListBtn = document.getElementById("ppDeleteListBtn");
  if(ppDeleteListBtn){
    ppDeleteListBtn.addEventListener("click", () => {
      const current = getActivePastPurchasesList();
      const confirmed = confirm(`Delete "${current.name}"? This cannot be undone.`);
      if(!confirmed) return;
      deleteActivePastPurchasesList();
      renderPPListSelector();
      renderPastPurchasesTickerList();
      renderPastPurchasesParamList();
      renderPastPurchasesColumnOrderList();
      renderPastPurchasesRowOrderList();
      renderPastPurchasesTable();
      showPPListActionStatus(`Deleted "${current.name}". Now viewing "${getActivePastPurchasesList().name}".`);
    });
  }
}catch(err){
  console.error("Failed to wire up Past Purchases list management:", err);
}

// --- Wire up the Past Purchases table (freeform assets + freeform parameters) ---
try{
  const ppTabs = [
    { btn: "ppTabTickerBtn", panel: "ppTickerPanel", onShow: renderPastPurchasesTickerList },
    { btn: "ppTabParamBtn", panel: "ppParamPanel", onShow: renderPastPurchasesParamList },
    { btn: "ppTabColumnsBtn", panel: "ppColumnsPanel", onShow: renderPastPurchasesColumnOrderList },
    { btn: "ppTabRowsBtn", panel: "ppRowsPanel", onShow: renderPastPurchasesRowOrderList },
  ];
  const ppTabsMissing = ppTabs.some(t => !document.getElementById(t.btn) || !document.getElementById(t.panel));
  if(ppTabsMissing){
    console.warn("Past Purchases tab elements missing — index.html may be out of date.");
  } else {
    ppTabs.forEach(t => {
      document.getElementById(t.btn).addEventListener("click", () => {
        ppTabs.forEach(other => {
          document.getElementById(other.panel).style.display = (other.btn === t.btn) ? "block" : "none";
          document.getElementById(other.btn).classList.toggle("active-tab", other.btn === t.btn);
        });
        if(t.onShow) t.onShow();
      });
    });
  }

  const ppSortMode = document.getElementById("ppSortMode");
  if(ppSortMode){
    ppSortMode.addEventListener("change", () => {
      ppColumnSortState = null; // dropdown takes back over from any column-header sort
      renderPastPurchasesTable();
    });
  }

  const ppImportListBtn = document.getElementById("ppImportListBtn");
  if(ppImportListBtn){
    ppImportListBtn.addEventListener("click", () => {
      const select = document.getElementById("ppImportListSelect");
      const statusEl = document.getElementById("ppImportStatus");
      const sourceId = select.value;
      if(!sourceId){
        statusEl.textContent = "No list available to import from.";
        statusEl.style.color = "var(--amber)";
        return;
      }
      const lists = getAllLists();
      const sourceName = lists[sourceId].name;
      const result = importListIntoPastPurchases(sourceId);
      renderPastPurchasesTickerList();
      renderPastPurchasesParamList();
      renderPastPurchasesTable();
      renderPastPurchasesColumnOrderList();
      renderPastPurchasesRowOrderList();
      renderPPListSelector();

      if(result.total === 0){
        statusEl.textContent = `"${sourceName}" has no assets to import.`;
        statusEl.style.color = "var(--text-secondary)";
      } else {
        const pulledNote = result.pulled > 0 ? ` Pulled in ${result.pulled} field value(s) already entered on your Portfolio Lists (e.g. Units Purchased, Average Purchase Price, Date Purchased).` : "";
        statusEl.textContent = `Added ${result.imported} new row(s) from "${sourceName}" — importing again later adds another fresh round of rows.${pulledNote}`;
        statusEl.style.color = "var(--emerald)";
      }
    });
  }

  const ppAddTickerBtn = document.getElementById("ppAddTickerBtn");
  if(ppAddTickerBtn){
    ppAddTickerBtn.addEventListener("click", () => {
      const tickerInput = document.getElementById("ppNewTicker");
      const statusEl = document.getElementById("ppAddTickerStatus");
      const asset = tickerInput.value.trim().toUpperCase();
      if(!asset){
        statusEl.textContent = "Enter an asset first.";
        statusEl.style.color = "var(--amber)";
        return;
      }
      const rowId = addPastPurchaseRow(asset);
      const pulled = pullMainTableDataIntoPastPurchases(rowId, asset);
      renderPastPurchasesTickerList();
      renderPastPurchasesParamList();
      renderPastPurchasesTable();
      renderPastPurchasesColumnOrderList();
      renderPastPurchasesRowOrderList();
      renderPPListSelector();
      statusEl.textContent = `${asset} added to Past Purchases as a new row.` + (pulled > 0 ? ` Pulled in ${pulled} field value(s) already entered on your Portfolio Lists.` : "");
      statusEl.style.color = "var(--emerald)";
      tickerInput.value = "";
    });
  }

  // Same preset list as the main table's "+/- Parameter" panel, plus this
  // table's own additions: sale-tracking fields (Date Sale, Selling Price,
  // Sale Profit) and fundamentals fields that mirror the main table's fixed
  // columns (Current Price, ROA, P/E, Target Price, Rev Growth, Net Margin,
  // PEG, D/E, FCF, Cash Runway, Beta, Stability) — offered here since Past
  // Purchases has no fixed columns of its own to hold them.
  // Picking a plain preset autofills name/type/default; picking "Sale Profit"
  // also flags it as computed so it gets calculated rather than typed in.
  let ppSelectedPresetMeta = null;
  const ppNewParamPreset = document.getElementById("ppNewParamPreset");
  if(ppNewParamPreset){
    ppNewParamPreset.innerHTML = buildPresetOptionsHtml(PP_PARAM_PRESETS);
    ppNewParamPreset.addEventListener("change", () => {
      const val = ppNewParamPreset.value;
      if(val === "__custom__"){
        document.getElementById("ppNewParamLabel").value = "";
        document.getElementById("ppNewParamType").value = "number";
        document.getElementById("ppNewParamDefault").value = "";
        ppSelectedPresetMeta = null;
      } else {
        const preset = PP_PARAM_PRESETS[parseInt(val, 10)];
        document.getElementById("ppNewParamLabel").value = preset.label;
        document.getElementById("ppNewParamType").value = preset.type;
        document.getElementById("ppNewParamDefault").value = preset.defaultValue === "__today__" ? new Date().toISOString().slice(0,10) : preset.defaultValue;
        ppSelectedPresetMeta = preset.computed ? { computed: true, formula: preset.formula } : null;
      }
    });
  }

  const ppAddParamBtn = document.getElementById("ppAddParamBtn");
  if(ppAddParamBtn){
    ppAddParamBtn.addEventListener("click", () => {
      const label = document.getElementById("ppNewParamLabel").value.trim();
      const type = document.getElementById("ppNewParamType").value;
      const defaultValue = document.getElementById("ppNewParamDefault").value.trim();
      const statusEl = document.getElementById("ppAddParamStatus");

      if(!label){
        statusEl.textContent = "Parameter name is required.";
        statusEl.style.color = "var(--amber)";
        return;
      }
      const exactDuplicate = getPastPurchasesParams().some(p => p.label.trim().toLowerCase() === label.toLowerCase());
      if(exactDuplicate){
        statusEl.textContent = `"${label}" already exists as a column in Past Purchases. Edit it directly in the table instead.`;
        statusEl.style.color = "var(--amber)";
        return;
      }

      // Bypass needing the dropdown for a computed preset's label to be typed directly.
      const matchingComputedPreset = PP_PARAM_PRESETS.find(p => p.computed && p.label.toLowerCase() === label.toLowerCase());
      const effectiveMeta = ppSelectedPresetMeta || (matchingComputedPreset ? { computed: true, formula: matchingComputedPreset.formula } : null);

      addPastPurchaseParam({ label, type, defaultValue, computed: effectiveMeta?.computed, formula: effectiveMeta?.formula });
      renderPastPurchasesParamList();
      renderPastPurchasesTable();
      renderPastPurchasesColumnOrderList();

      statusEl.textContent = `"${label}" added as a new column.`;
      statusEl.style.color = "var(--emerald)";
      document.getElementById("ppNewParamLabel").value = "";
      document.getElementById("ppNewParamDefault").value = "";
      ppSelectedPresetMeta = null;
      if(ppNewParamPreset) ppNewParamPreset.value = "__custom__";
    });
  }

  renderPastPurchasesImportSelect();
  renderPastPurchasesTickerList();
  renderPastPurchasesParamList();
  renderPastPurchasesColumnOrderList();
  renderPastPurchasesRowOrderList();
  renderPastPurchasesTable();
}catch(err){
  console.error("Failed to wire up Past Purchases table:", err);
}

try{
  wireUpPastPurchasesRefreshButton();
}catch(err){
  console.error("Failed to wire up the Past Purchases refresh button:", err);
}

try{
  wireUpExportButtons();
}catch(err){
  console.error("Failed to wire up export buttons:", err);
}

// On page load, check if a session already exists (e.g. returning to the app
// in the same browser) and open the dashboard automatically if so. Otherwise
// the auth overlay (already visible by default) stays up until sign-in/sign-up.
checkExistingSession();

