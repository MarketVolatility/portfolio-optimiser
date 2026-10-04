// APP.JS BUILD: v5.73 (Five Sales Strategy refinements. 1) A completed
// (realized) sale now drops off the table — and its exports — 28 days after
// its sale date (SALES_STRATEGY_COMPLETED_SALE_DISPLAY_DAYS/
// isSalesStrategyRowExpired); the real record stays permanently on Past
// Purchases/Lot Matching, so nothing is lost. 2) "Total Units Purchased" is
// relabeled "Total Units Purchase (Current)" and now shows the ticker's
// actual CURRENT holding (refreshed down as real sales are confirmed) instead
// of the lifetime-ever-purchased count. 3) A completed sale's ticker cell now
// also shows ↑ ↓ × (no Dup/Save — nothing left to plan) instead of plain,
// button-less text; removing one explains it only clears the Sales Strategy
// display record, not the real sale. 4) Column headers gained the same
// move-left/right (&lt; &gt;) and hide (×) buttons as Past Purchases' own
// header — reinterpreted as reorder/hide (not destroy, since there's no
// per-row value to delete for a fixed/computed column) via new
// ssColumnOrder/ssHiddenColumns settings (getSsColumnOrder/hideSsColumn/
// moveSsColumn/showAllSsColumns, surfaced through a "N columns hidden — Show
// all columns" notice above the table); renderSalesStrategyRowHTML's cells
// now render through a per-column dispatch (renderSalesStrategyCellHTML) that
// follows this order, and buildSalesStrategyExportTable exports exactly what's
// visible, in the same order. 5) The manual "Ticker [dropdown] + Add Row" UI
// is gone — auto-populate and the Save button's own auto-split already cover
// it, with nothing left for a manual add to do.)
//
// v5.72 (Added a "Save" button to each draft Sales
// Strategy row's ticker cell (alongside ↑/↓/Dup/×). Clicking it commits
// whatever's currently typed into that row's Units to Sell/Selling Price
// (reading the live input values directly, even if the field hasn't been
// blurred yet) and, if any of that ticker's held units are still left over
// once every non-realized row for it is added up, immediately inserts a
// fresh blank draft row directly below to plan them — e.g. a ticker with 10
// units held, saved as "5 units to sell", gets a new row below showing
// "5 units left", with no manual "+ Add Row"/"Dup" click needed. Skips adding
// a row when nothing's left over, or when a ready-to-use blank continuation
// row for that ticker is already sitting right there (so repeated Save
// clicks never pile up redundant empty rows). The goal: no held ticker's
// units are ever left unaccounted-for and forgotten. New function:
// saveSalesStrategyRowAndSplit().)
//
// v5.71 (Sales Strategy now carries the same set of
// functions as Past Purchases. Added "Sample Excel for Data Entry" / "Import
// Excel" (scoped to its two typed-in fields, Ticker/Units to Sell/Selling
// Price — a line that exactly matches an already-planned draft row is skipped,
// so re-importing is a safe no-op, while two lines for the same ticker become
// two separate batches rather than a conflict) and "Export to Excel/Text/
// Word/PDF" (mirrors exactly what's on screen, including any active column
// sort, with the over-committed Units Left flagged red and a confirmed Sale
// Realized Date in green on the Word/PDF exports). The header row's columns
// each got their own per-column sort button (⇅, same asc -> desc -> clear
// 3-click cycle as Past Purchases' header), and the ticker cell got ↑/↓
// buttons to reorder a row (alongside the existing Dup/×) — same row-ctrl-btn
// look as Past Purchases' own ticker-cell buttons, hidden once a row is
// realized just like Dup/× already were. A manual ↑/↓ move always clears any
// active column sort first (same convention as Past Purchases' per-ticker
// ↑/↓), since reordering only makes visible sense back in the table's own
// custom order.)
//
// v5.70 (The "Sales Strategy" table no longer starts
// empty — it now auto-populates with one draft row for every ticker
// currently held on the active Past Purchases list (at least one still-unsold
// unit), so there's always something to look at without first clicking
// "+ Add Row". Runs automatically on every Past Purchases re-render (so a
// fresh page load, not just a later edit, already shows it) via a new
// syncSalesStrategyFromHoldings(), which tracks which tickers have already
// been auto-seeded (a new salesStrategySeededTickers array stored alongside
// a list's own rows/salesStrategy, same self-healing-on-read convention) so
// that: a row the user deliberately removes is never silently re-added later;
// a pre-existing install's manually-added rows are folded into the seeded set
// the first time this runs rather than duplicated; and a ticker bought for
// the first time gets its own draft row on the very next render. A ticker
// that's been fully sold off is never auto-seeded — only currently-held
// tickers are. Updated the Sales Strategy disclaimer box to mention this.)
//
// v5.69 (Added a new "Sales Strategy" section below Past
// Purchases: plan a future sale of a ticker already on the active Past
// Purchases list without touching real purchase/sale history yet. Pick a
// ticker and "+ Add Row", enter Units to Sell and a Selling Price; the ticker
// cell's "Dup" button adds another draft row for the same ticker directly
// below it (same ticker, Units to Sell/Selling Price start blank) so one
// holding can be planned as several batches at different prices. Every row
// pulls Current Price, Total Units Purchased, and Total Units Sold fresh from
// the real Past Purchases data on every render (computePastPurchasesFifoLot
// Breakdown — the same FIFO engine the Lot Matching table uses), and computes:
//   - Units Left = Total Units Purchased - Total Units Sold - Units to Sell
//     already planned in every OTHER still-pending draft row for that ticker
//     (a row's OWN Units to Sell is deliberately not subtracted — Units Left
//     is the ceiling for what THIS row can still plan against). A realized
//     sibling row is excluded from that subtraction (its effect already
//     landed in Total Units Sold via the real sale it created), and an
//     over-committed ticker (other rows alone already exceed what's held)
//     floors Units Left at 0 and is flagged in red.
//   - Average Purchase Price of Units Left = the FIFO-blended cost of
//     whichever lots would remain after those other rows' units are consumed
//     oldest-first — "—" when nothing would be left.
// "Confirm Sale" opens a popup (date defaults to today) — confirming adds a
// REAL sale row to the Lot Matching table above (via the same per-ticker
// "Sell" helper its own Sell button uses) with this row's Units to
// Sell/Selling Price/the confirmed date, then re-renders Past Purchases/Lot
// Matching/Current Holding so every total updates. The draft row then locks
// (green checkmark + date, inputs disabled, Dup/remove hidden) and can't be
// realized again. New draft rows live alongside each Past Purchases list's
// own rows (own array, same object) so they ride along on its existing cloud
// sync for free.)
//
// v5.68 (Renamed the Lot Matching table's "Total Current Book
// Value" footer row to "Total current market and book value", and it now carries
// TWO totals side by side instead of one — the existing Book Value total, plus a
// new Current Market Value total — each sitting under its own column, so neither
// overwrites the other. Each total is colored a shade darker than that column's
// own live cell color above it: Book Value's total keeps its existing
// var(--accent-blue), and the new Current Market Value total uses #7c3aed (a
// darker companion to the live cells' #a78bfa). The row still renders even if
// only one of the two columns is present. Updated the matching glossary/
// disclaimer text in the Lot Matching table's own explanation box and in the
// Book Value / Current Market Value glossary entries.)
//
// v5.67 (Added a new computed "Current Market Value" column —
// units still held × live Current Price — to Past Purchases, positioned between
// Unrealized Gain and Book Value (Book Value + Unrealized Gain = Current Market
// Value): e.g. buy 5 @ $5 -> Book Value $25; price now $7 -> Unrealized Gain
// +$10, Current Market Value $35. Only shows a value for still-held lots — a
// fully sold lot shows "—", same as Book Value, since its value has converted
// into Realized Gain instead. Wired into the merged FIFO table (the live
// editable UI), the row-level resolver used for sorting/export, and — since the
// same formula presets are shared by both tables' "Add parameter" dropdowns —
// the main Portfolio Lists table's custom-column path too, so selecting it
// there computes and renders correctly instead of falling through to the
// generic percentage renderer. Added as a one-time migration for existing
// accounts (inserted right before Book Value) and as part of the default
// starting columns for brand-new ones.)
//
// v5.66 (Moved the copyright note from directly under the top
// "Not financial advice" disclaimer down to the very end of the page — after the
// Methodology and Glossary section, but still inside the page's own container so
// it stays visible at the bottom regardless of which accordion section is open.
// Same .disclaimer box styling as before, unchanged.)
//
// v5.65 (Added a copyright note directly below the top "Not
// financial advice" disclaimer, using the same .disclaimer box styling — same
// background, border, font color, and size — so it reads as part of the same
// notice area rather than a separately-styled afterthought.)
//
// v5.64 (Merged the raw, individually-editable Past Purchases table
// into the Lot Matching (FIFO) table — deleted the old table and its "Lot Matching
// (FIFO)" heading entirely, and restyled the disclaimer above the merged table to
// match the app's other in-box explanations. The merged table now carries every
// ticker-cell control the old table had (Up/Down/Sell/Delete) plus a live
// "Held: x/y" tag, and every cell is editable: split-safe delta writes for Units
// Purchased/Units Sold (so editing one FIFO fragment never corrupts a sibling
// fragment derived from the same underlying row), direct writes for everything
// else. Fixed a latent bug found while making Current Price editable: it was being
// force-overridden with the live price on every render, silently discarding
// anything typed into it — it's now a plain manual column like any other, while
// the Unrealized Gain / Missed Gain % formulas still independently use the live
// price. Added a new "Current Holding" Portfolio list — auto-synced from the FIFO
// breakdown across every Past Purchases list, always showing exactly what's still
// held — and made it the default view on login. Replaced the old independent
// per-section collapse state with a true single-open-at-a-time accordion
// (Portfolio, Past Purchases, Fetch Live Data, Detailed Update for Selected
// Assets, Update Current Price and Consensus Target Price, Methodology and
// Glossary), and added a header row of quick-nav buttons that jump straight to
// and highlight the Fetch Live Data / Detailed Update / Update Current Price
// sections.)
//
// v5.63 (Moved the summary totals — Total Current Book Value, Total
// Realized Gain to date, per-month Realized Gain breakdown — OFF the main Past
// Purchases table and onto the Lot Matching (FIFO) table below it instead: a
// per-row total on the editable table isn't reliably accurate once a purchase or
// sale has been split across multiple lots, so the FIFO-matched fragments are now
// the sole, accurate source for these totals (also removed from the Past Purchases
// Excel/Text/PDF export, which no longer carries a footer). Unrealized Gain, on
// BOTH the Past Purchases table and the Lot Matching table, now also computes for
// units that have ALREADY been sold — a hypothetical "what would this have been
// worth today, at its original buy price, had it never been sold" — instead of
// showing "—" once something is fully or partially sold. A never-sold row/fragment
// is unaffected (identical number as before).
//
// v5.62 (Lot Matching (FIFO) table now has full column parity with
// the main Past Purchases table: same header row (every current parameter,
// including computed columns like Current Price and Missed Gain %), and the same
// per-column sort/move-left/move-right/remove controls, sharing the main table's
// column list and sort state (ppColumnSortState) — so acting on either table's
// header keeps both in sync. Added a dedicated sort button to the Ticker/Asset
// column on ALL THREE tables: the main Past Purchases table, the new Lot Matching
// table, and the main Portfolio Lists table (previously only sortable via the
// "Sort by" dropdown). Lot Matching now also shows EVERY purchase and sale on the
// list, including a ticker that was never sold at all (shown as its own "(held)"
// row) — earlier it only showed tickers with actual FIFO match activity. Fixed a
// bug from this same round's WIP where the Lot Matching table's "Current Price"
// column never actually applied the emerald "at buy target" highlight (it computed
// the check but discarded the result, and passed it an empty column list instead
// of the real one) — it now matches the main table's own highlight exactly. Also
// fixed a related edge case where turning on "Current Holdings" until nothing
// matched left the Lot Matching table stale instead of still reflecting the full list.
//
// v5.61 (Fixed a pre-existing bug, unrelated to the Lot Matching
// work below: NEW_USER_STARTING_TICKERS was declared near the bottom of the file
// but referenced by several "wire up ___" blocks (asset selector dropdowns, Quick
// Paste, Detailed Update, Past Purchases list/table wiring) that run immediately
// at page load, before that declaration executed — throwing "Cannot access
// 'NEW_USER_STARTING_TICKERS' before initialization" on every single load. It was
// always caught and re-rendered correctly once openDashboard() re-ran the same
// functions after login (so it never broke anything a logged-in user could see),
// but it was pure console noise on every load and could plausibly slow the very
// first paint of those dropdowns. Moved the declaration to near the top of the
// file, well before anything can reference it.)
//
// v5.60 (Added a read-only "Lot Matching (FIFO)" section under the
// Past Purchases table: shows exactly which purchase(s) each sale was matched
// against, oldest purchase first, splitting a purchase across several lines if it
// fed more than one sale, or a sale across several lines if it drew from more
// than one purchase. E.g. buy 10 @ $200 (D1), buy 10 @ $210 (D2), sell 8 @ $215
// (D3), sell 5 @ $220 (D4) -> "D1 buy 8 -> D3 sell 8" (+$120), "D1 buy 2 -> D4
// sell 2" (+$40), "D2 buy 3 -> D4 sell 3" (+$30), "D2 buy 7, still held". Always
// uses FIFO here regardless of the "Cost basis" selector (which only drives the
// aggregate Realized Gain column on the main table) — Average cost blends prices
// across lots and has nothing clean to split into rows this way. Purely derived
// for display (computePastPurchasesFifoLotBreakdown) — never writes to any row,
// so your entered/imported rows are unaffected and stay fully editable; recomputes
// automatically from whatever's on the active list, so an Excel import that adds
// separate buy/sell lines is reflected here with no extra steps. A ticker only
// appears once it has an actual sale to reconcile — a plain, never-sold holding
// isn't listed. See renderPastPurchasesLotMatchBreakdown().)
//
// v5.59 (Past Purchases can now record buys and sells on SEPARATE
// rows, with Realized Gain computed per sale: e.g. buy 10 A @ $2, then sale rows
// "sell 5 @ $3" and "sell 5 @ $5" -> +$5 and +$15, $20 total. See
// computePastPurchasesLedger(). A sale row = Units Sold + Selling Price + Date Sale
// with no Units Purchased; it's matched against that ticker's purchase rows on the
// same list, dated on/before the sale. New "Cost basis" selector (Average cost —
// default — or FIFO), synced per account. Rows that have both purchase and sale on
// one line work exactly as before. New per-row "Sell" button adds a sale row right
// below. Book Value / Unrealized Gain / Current Holdings now use the units still
// held after sales; each purchase row shows "Held: x / y" under its ticker, sale
// rows show a SALE tag, and hovering Realized Gain explains the calculation.
// Import Excel rewritten: one table row per spreadsheet line (no more merging by
// ticker), identical lines ignored, new lines added next to that ticker's rows,
// and lines that match an existing row's ticker + dates but differ open a
// "Keep existing / Replace / Add as new" chooser (or cancel the import). Sample
// Excel now lists every row of the open list. Refresh-from-Portfolio no longer
// overwrites a purchase row's own Units Purchased / Avg Price / Date Purchased,
// and never puts them onto a sale row.)
//
// v5.58 (Added a "Units Sold" column to Past Purchases — a plain
// manual number field (how many shares/units were sold in that sale), placed right
// after "Date Sale" and before "Current Price", matching the Past Purchases data-
// entry spreadsheet layout. Included in the brand-new-account default columns, in
// the "+/- Parameter" preset dropdown, and added to existing accounts once via the
// new insertUnitsSoldColumnIfNeeded() migration. Because the Sample Excel template
// and Import Excel both match columns by label, "Units Sold" now round-trips through
// them automatically. It's record-keeping only for now — Realized Gain is still
// computed from Units Purchased. Also fixed the startup console.log, which still
// said v5.55.)
//
// v5.57 (Follow-up on the "TSM missing from September's total"
// report: re-verified the monthly grouping/summing logic line by line — given the
// current code, a row that's visible in the Past Purchases table body is
// mathematically guaranteed to be included in its own list's monthly totals below
// it (the footer sums the exact same array the table body renders from, via the
// exact same per-row calculation). So the two most likely explanations left, if
// this is still happening after loading this exact build, are: (a) the deployed
// site is still serving an older cached copy of these files (try a hard refresh —
// Ctrl/Cmd+Shift+R — after redeploying), or (b) the two rows are actually on two
// DIFFERENT Past Purchases lists (see the list dropdown near the top of the Past
// Purchases section) rather than one, so each list's own September total is
// separately correct but doesn't include the other list's row. Added a hover
// tooltip on every "Realized Gain for month of X of Y" row — hovering it now shows
// exactly which tickers (and how many rows) were added into that total, which
// should make either of those two situations immediately obvious.
//
// v5.56 (1. "Sale Profit" is now labeled "Realized Gain" everywhere
// (Past Purchases and, if added there too, the main Portfolio Lists table) — same
// id/formula ("salesProfitPP"), so nothing about how it's computed or how existing
// values are stored changes, only the label. A one-time
// renameSaleProfitToRealizedGainIfNeeded() migration relabels any already-added
// column on an existing account; a brand-new account gets the new label from the
// start via getNewUserDefaultPastPurchasesParams().
// 2. Added a new computed "Unrealized Gain" column — Units Purchased × (Current
// Price − Average Purchase Price), shown only while a position is still unsold
// (Selling Price is 0); once sold, that gain becomes Realized Gain instead and this
// reverts to 0/not-ready. Green when positive, dusty pink (#c98a9e, the same token
// used elsewhere for "excluded") when negative. Sits immediately after Realized Gain
// in the default column layout, the "+/- Parameter" preset list (available on both
// tables, like the other sale-tracking presets), and every render/export code path
// that already handled Realized Gain/Book Value. A one-time
// insertUnrealizedGainColumnIfNeeded() migration adds it to existing accounts'
// already-seeded Past Purchases columns, right after their Realized Gain column.
// 3. Confirmed (no code change needed): the monthly "Realized Gain for month of X
// of Y" footer/export subtotals already group strictly by each row's own Date Sale
// value, not by any other date — verified against the exact numbers from a user
// report via an automated test using the real production code.
// 4. Hardened that same monthly grouping (live footer + export) against a stray
// duplicate "Date Sale" column: it now checks every column labeled "Date Sale" for
// a row's date instead of only the first one found, so a row's contribution can no
// longer be silently dropped from its month's subtotal just because its date
// happens to be stored under a second column with the same label. (Investigated a
// report of one asset's profit missing from a month's total; the grouping math
// itself checked out correctly against clean data in an automated test, so this is
// a defensive hardening for the leading alternate explanation, not a confirmed
// root-cause fix — please let us know if a total still looks off after this.)
//
// v5.55 (1. Added Alpha Vantage as its own independent "Fetch live
// data" source (Current Price, P/E, ROA, Revenue Growth, Net Margin, Beta) —
// fetchAlphaVantageLiveDataForAllAssets() — completely separate from Finnhub's own
// fetchLiveDataForAllAssets(): different key, different button (#fetchAlphaVantageLiveBtn),
// different status element (#alphaVantageFetchStatus), different in-memory map
// (alphaVantageLiveDataMap vs. liveDataMap). getMergedLiveData() combines the two only
// at render time — Finnhub wins per-field when it has data, Alpha Vantage only fills
// gaps — so neither button's fetch can be triggered or clobbered by the other.
// 2. Investigated the "Current Price disappears on refresh" report: by design, a
// live fetch's results live only in memory (liveDataMap/alphaVantageLiveDataMap) and
// are never persisted, so they reset to the static/override value on a real page
// reload until "Fetch live data" runs again — no separate race-condition bug found;
// openDashboard() already awaits the cloud pull before any rendering happens.
// 3. Forward P/E now sits immediately after P/E Multiple in NEW_USER_DEFAULT_COLUMN_ORDER,
// plus a one-time reorderForwardPEIfNeeded() migration repositions it for existing
// accounts' already-saved column order too.
// 4. Parameter glossary: stripped the repeated "Fixed column on the main Portfolio
// Lists table..." boilerplate from every row — definitions now stick to the metric
// itself.
// 5. All Information/Disclaimer boxes now consistently use the same light-blue style
// as the Live data panel (a single default .disclaimer color instead of per-box
// overrides), converted to point-form bullets, and the "How each mandate calculates"
// / "Parameter glossary" section notes use the same light blue. Outdated disclaimer
// text (the old "manually entered placeholder figures" banner; "Past Purchases starts
// completely empty") was rewritten to match current behavior.
// 6. Past Purchases' Date Purchased and Date Sale both default to blank instead of
// today's date for a newly-added ticker — fixed at the source
// (getNewUserDefaultPastPurchasesParams()) — and the same "blank stays blank, only the
// explicit __today__ sentinel resolves to today" fix was applied to the shared
// PARAM_PRESETS "Date Purchased" preset and to addCustomParam() (previously ANY blank
// date default silently became today's date there, on the Portfolio Lists side).
//
// v5.54 (Fixes a bug from v5.53: Past Purchases' default starting
// columns were seeded only inside initializeNewUserDefaults(), which ONLY runs for a
// truly brand-new signup (gated on portfolioLists === null) — so an existing account
// that simply hadn't configured Past Purchases yet never got them, showing just a bare
// "TICKER" column with "Add at least one parameter above to start tracking data for
// these assets" even after adding a ticker row. Fixed by extracting the seed into its
// own independently-gated seedPastPurchasesDefaultParamsIfNeeded() — checked directly
// against localStorage.getItem("pastPurchasesParams") !== null, so it distinguishes
// "never touched" (null) from "deliberately emptied" (stored as "[]") — and calling it
// from openDashboard() (same one-time-migration pattern as migrateLegacyMarketTickersToCustomIfNeeded()),
// so it now retroactively reaches any existing account too, on next login/reload. Also,
// the "New User. Pending data when user activate live update." banner row is now
// left-aligned instead of centered.
//
// v5.53 (New users' first impression: 1. data.js trimmed to just the
// 9-ticker Sample List with every financial field zeroed/blank instead of fabricated
// example numbers — see data.js's own header comment; a new migrateLegacyMarketTickersToCustomIfNeeded()
// (run once per account, from openDashboard) promotes any of the 21 removed legacy
// tickers an EXISTING account still had visible into a "custom" ticker so nothing
// silently vanishes; calculatedUpside's (targetPrice-currentPrice)/currentPrice is now
// guarded against currentPrice===0 (was NaN/Infinity). 2. A "New User. Pending data
// when user activate live update." banner row now appears in the Portfolio table
// whenever every visible asset still has a zero Current Price, and disappears the
// moment any one gets real data. 3. Past Purchases' default "List 1" now starts
// pre-seeded with 10 columns (Realized Gain, Unrealized Gain, Book Value, Date Purchased, Units Purchased,
// Average Purchase Price ($), Selling Price, Date Sale, Current Price, Missed Gain %)
// for a brand-new account, via getNewUserDefaultPastPurchasesParams(). 4. "Delete List"
// on both Portfolio Lists and Past Purchases now requires re-entering and verifying
// the account password first, via the same verifyAccountPasswordForDestructiveAction()
// helper "Reset my account data" now also shares.)
console.log("app.js loaded — build v5.73 (Sales Strategy: completed sales auto-hide after 28 days, \"Total Units Purchase (Current)\" tracks real current holding, completed rows get ↑↓×, column headers get move/hide buttons, and the manual Add Row UI is gone)");

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
// FIX (found while debugging "Fetch live data" not working on a freshly deployed
// origin): this used to list "apiKey", but the Finnhub key is actually stored
// under localStorage key "finnhubApiKey" (see getSavedApiKey/saveApiKey below) —
// "apiKey" was never written to by anything, so the real key was silently NEVER
// included in snapshotLocalData()'s push, and applyRemoteSnapshot() never
// restored it on login either. Net effect: the Finnhub key lived only in
// whichever single browser/origin you clicked "Save key" in, and never traveled
// with the rest of your synced data (lists/overrides, which use correctly-named
// keys and always synced fine) to a new device, browser, or newly deployed URL.
const SYNC_KEYS = ["portfolioLists", "globalOverrides", "customParams", "columnOrder", "activeListId", "finnhubApiKey", "alphaVantageApiKey", "pastPurchasesRows", "pastPurchasesParams", "pastPurchasesTickers", "pastPurchasesValues", "pastPurchasesDateAdded", "hiddenBuiltinColumns", "pastPurchasesLists", "activePastPurchasesListId", "dusAssetStates", "legacyMarketTickersMigrated", "forwardPeReordered", "saleProfitRenamedToRealizedGain", "unrealizedGainColumnAdded", "unitsSoldColumnAdded", "currentMarketValueColumnAdded", "ppCostBasisMethod", "ssColumnOrder", "ssHiddenColumns"];

// --- Local data ownership guard ---
// localStorage is shared by EVERY Supabase account that ever signs in on a given
// browser/device — it is not scoped per account the way the cloud (user_app_data,
// keyed by user_id) is. Without this guard: if Account A's data is sitting in
// localStorage (they never explicitly logged out, or logout couldn't reach the
// network) and a DIFFERENT Account B then registers or signs in on that same
// browser, openDashboard() would render Account A's leftover local data as if it
// were Account B's own — and, worse, pullSnapshotFromCloud() finding nothing yet
// for a brand-new Account B would cause pushSnapshotToCloud() to upload Account
// A's leftover local data to Account B's own cloud row, permanently. This tracks,
// purely on-device, which account's data local storage currently holds, and wipes
// it the instant a different account is about to use this device — before any
// pull, push, or render can happen. It is intentionally NOT in SYNC_KEYS: it is
// this device's own bookkeeping and must never itself be synced or copied to
// another device.
const LOCAL_DATA_OWNER_KEY = "appDataOwnerUserId";

// App-owned local keys that hold real account data/preferences but, for one
// reason or another (legacy pre-multi-list migration, or deliberately
// per-device UI state), aren't in SYNC_KEYS. Still must never leak from one
// account to another on a shared device, so a full local wipe clears these too.
// alphaVantageCallLog is here (not synced) because it tracks THIS device's
// count against a specific Alpha Vantage key's daily quota — carrying it over
// to a different account (which likely has its own, separate Alpha Vantage
// key with its own fresh quota) would just show a false, borrowed number.
const NON_SYNCED_LOCAL_KEYS = ["customAssets", "removedTickers", "accordionOpenSection", "ppShowCurrentHoldingsOnly", "uiViewMode", "alphaVantageCallLog"];

// v5.60 fix: declared here (rather than down by "New-user starting defaults" below,
// where it conceptually belongs and is explained) because several top-level
// "wire up ___" blocks call getDefaultSampleListRemovedTickers() unconditionally
// at script load — before login, so their result isn't yet visible — and those
// blocks run, in file order, before that section. A `const` this early get
// referenced still throws (temporal dead zone) until its own declaration line has
// executed, so keeping the ONLY declaration down there meant every such call
// before it threw "Cannot access before initialization" (caught by each block's
// own try/catch and logged to console, then silently re-rendered correctly once
// openDashboard() re-runs the same functions after login, when this line has long
// since executed — so it was never visible to a logged-in user, only noise in the
// console on every load). See "New-user starting defaults" below for what this is.
const NEW_USER_STARTING_TICKERS = ["NVDA", "MU", "AMZN", "TSM", "GOOGL", "SNDK", "PLTR", "META", "AAPL"];

function clearAllLocalAppData(){
  SYNC_KEYS.concat(NON_SYNCED_LOCAL_KEYS).forEach(k => {
    try{ localStorage.removeItem(k); }catch(e){ /* localStorage unavailable */ }
  });
}

// Call this before doing ANYTHING else with local data for a just-authenticated
// user. If local storage currently belongs to a different account, it wipes it
// (then reseeds the same clean starting defaults a brand-new visitor gets, so the
// device isn't left in a broken empty state) before any pull/push/render can see
// or propagate the wrong account's data. If no owner is recorded yet — either a
// genuinely fresh browser, or an existing installation from before this guard
// existed — it does NOT wipe (that would destroy a legitimate returning user's
// own data the very first time this ships); it just adopts whatever's already
// there as belonging to this user from now on.
function ensureLocalDataOwnedBy(userId){
  let storedOwner = null;
  try{ storedOwner = localStorage.getItem(LOCAL_DATA_OWNER_KEY); }catch(e){ /* localStorage unavailable */ }
  const isDifferentAccount = !!(storedOwner && storedOwner !== userId);
  if(isDifferentAccount){
    clearAllLocalAppData();
    initializeNewUserDefaults();
  }
  try{ localStorage.setItem(LOCAL_DATA_OWNER_KEY, userId); }catch(e){ /* localStorage unavailable */ }
  return isDifferentAccount;
}

// --- Desktop/Mobile interface toggle ---
// A manual, per-device override (deliberately NOT in SYNC_KEYS — a phone and a
// desktop reasonably want independent choices here) that forces the mobile-
// optimized CSS layout (via a body.view-mobile class — see index.html's <style>)
// regardless of actual viewport width, so either interface can be previewed or used
// on demand from the two tabs under the top disclaimer. Defaults to whichever
// roughly matches this device's screen the first time it's ever loaded, then
// remembers whatever the user explicitly picks from then on.
function getUiViewMode(){
  try{
    const stored = localStorage.getItem("uiViewMode");
    if(stored === "mobile" || stored === "desktop") return stored;
  }catch(e){ /* fall through to the device-width guess below */ }
  return (typeof window !== "undefined" && window.innerWidth && window.innerWidth <= 700) ? "mobile" : "desktop";
}
function setUiViewMode(mode){
  try{ localStorage.setItem("uiViewMode", mode); }catch(e){ /* localStorage unavailable */ }
}
function applyUiViewMode(){
  const mode = getUiViewMode();
  document.body.classList.toggle("view-mobile", mode === "mobile");
  const desktopBtn = document.getElementById("viewDesktopBtn");
  const mobileBtn = document.getElementById("viewMobileBtn");
  if(desktopBtn) desktopBtn.classList.toggle("active-tab", mode === "desktop");
  if(mobileBtn) mobileBtn.classList.toggle("active-tab", mode === "mobile");
}

// --- True single-open-at-a-time accordion across the app's 6 named sections ---
// Per-device UI preference (deliberately NOT in SYNC_KEYS, same reasoning as
// uiViewMode above — a phone and a desktop reasonably want independent choices).
// v5.64: replaced the old independent-per-section "collapsedSections" set (each
// section toggled on its own) with a single "which one section is open" id — only
// ever one of these is expanded at a time, in this fixed order. Portfolio is the
// default landing section the very first time the page is ever loaded.
const ACCORDION_SECTIONS = [
  { id: "portfolioSectionBody", toggleBtn: "portfolioToggleBtn" },
  { id: "pastPurchasesSectionBody", toggleBtn: "pastPurchasesToggleBtn" },
  { id: "fetchLiveDataSectionBody", toggleBtn: "fetchLiveDataToggleBtn", navBtn: "navFetchLiveDataBtn" },
  { id: "detailedUpdateSectionBody", toggleBtn: "detailedUpdateToggleBtn", navBtn: "navDetailedUpdateBtn" },
  { id: "quickPriceUpdateSectionBody", toggleBtn: "quickPriceUpdateToggleBtn", navBtn: "navQuickPriceUpdateBtn" },
  { id: "methodologyGlossarySectionBody", toggleBtn: "methodologyGlossaryToggleBtn" },
];
const DEFAULT_ACCORDION_SECTION = "portfolioSectionBody";

function getOpenAccordionSection(){
  try{
    const id = localStorage.getItem("accordionOpenSection");
    // "" is a valid stored value (every section collapsed, by the user's own
    // choice) -- only fall back to the default when nothing has been stored yet.
    if(id !== null && (id === "" || ACCORDION_SECTIONS.some(s => s.id === id))) return id;
  }catch(e){ /* fall through */ }
  return DEFAULT_ACCORDION_SECTION;
}
function setOpenAccordionSection(id){
  try{ localStorage.setItem("accordionOpenSection", id || ""); }catch(e){ /* localStorage unavailable */ }
}
function applyAllCollapsedSections(){
  const openId = getOpenAccordionSection();
  ACCORDION_SECTIONS.forEach(s => {
    const body = document.getElementById(s.id);
    const btn = document.getElementById(s.toggleBtn);
    const isOpen = s.id === openId;
    if(body) body.style.display = isOpen ? "" : "none";
    if(btn){ btn.textContent = isOpen ? "▼" : "▶"; btn.setAttribute("aria-expanded", String(isOpen)); }
    if(s.navBtn){
      const navEl = document.getElementById(s.navBtn);
      if(navEl) navEl.classList.toggle("nav-btn-active", isOpen);
    }
  });
}
// A section's own ▼/▶ header button: clicking the currently-open section
// collapses it (nothing open); clicking any other section's header switches the
// accordion to it, closing whichever was open before.
function toggleCollapsibleSection(sectionId, toggleBtnId){
  void toggleBtnId; // kept for compatibility with existing onclick call sites
  const openId = getOpenAccordionSection();
  setOpenAccordionSection(openId === sectionId ? "" : sectionId);
  applyAllCollapsedSections();
}
// The header quick-nav buttons always OPEN their section (never toggle it closed)
// and scroll it into view -- a one-way jump, not a toggle.
function openAccordionSectionFromNav(sectionId){
  setOpenAccordionSection(sectionId);
  applyAllCollapsedSections();
  const body = document.getElementById(sectionId);
  if(body && typeof body.scrollIntoView === "function") body.scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- Past Purchases "Current Holdings" view filter ---
// Per-device UI preference (deliberately NOT in SYNC_KEYS, same reasoning as
// uiViewMode/collapsedSections above). When on, only rows that haven't been sold
// yet (Selling Price = 0, or there's no Selling Price column at all, in which case
// nothing counts as sold) are shown in the table body and included in exports —
// this is purely a display filter, so the footer totals (Total current market
// and book value, Total Realized Gain to date, monthly breakdowns) keep
// summarizing the WHOLE list regardless, the same way they already don't change
// based on sort order.
function getPpShowCurrentHoldingsOnly(){
  try{ return localStorage.getItem("ppShowCurrentHoldingsOnly") === "true"; }
  catch(e){ return false; }
}
function setPpShowCurrentHoldingsOnly(on){
  try{ localStorage.setItem("ppShowCurrentHoldingsOnly", on ? "true" : "false"); }
  catch(e){ /* localStorage unavailable */ }
}
// v5.59: "still held" now comes from the lot-matching ledger (see
// computePastPurchasesLedger) rather than just "Selling Price is 0" — a purchase
// row counts as a current holding while any of its units are still unsold after
// every sale row on the list has been matched against it; separate sale rows
// never count. A row with nothing entered yet (no units, no sale) still shows.
function isPastPurchaseRowCurrentHolding(row, params){
  const info = getPastPurchaseRowLedgerInfo(row);
  if(!info || info.kind === "none") return true;
  if(info.kind === "sale") return false;
  return info.heldUnits > PP_EPS;
}

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

// Shared password re-verification gate for irreversible/destructive actions
// (resetting account data, deleting a Portfolio List or a Past Purchases
// list). Prompts for the account's password and verifies it against Supabase
// itself via signInWithPassword — the same call the login form uses — rather
// than trusting anything typed locally, so a wrong password can't slip
// through. `actionLabel` is a lowercase noun phrase used in the prompt/status
// text (e.g. "the reset", "deleting this list"). `statusEl`, if given, gets a
// cancelled/failure message written to it; the caller still gets a plain
// true/false back either way. Returns true only once the password has
// actually been confirmed correct.
async function verifyAccountPasswordForDestructiveAction(actionLabel, statusEl){
  const emailInline = document.getElementById("loggedInEmailInline");
  const currentEmail = (emailInline && emailInline.textContent || "").trim();
  const enteredPassword = prompt(`For your security, re-enter the password for ${currentEmail || "this account"} to confirm ${actionLabel}:`);
  if(enteredPassword === null) return false; // cancelled
  if(!enteredPassword){
    if(statusEl){ statusEl.textContent = `Cancelled — a password is required to confirm ${actionLabel}.`; statusEl.style.color = "var(--amber)"; }
    return false;
  }
  if(statusEl){ statusEl.textContent = "Verifying password…"; statusEl.style.color = "var(--sub)"; }
  try{
    const { error: verifyError } = await getAuthClient().auth.signInWithPassword({ email: currentEmail, password: enteredPassword });
    if(verifyError) throw verifyError;
    return true;
  }catch(verifyError){
    if(statusEl){ statusEl.textContent = `Cancelled — password could not be verified: ${authError(verifyError)}`; statusEl.style.color = "#ef4444"; }
    return false;
  }
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

  // Must run before anything below touches local storage: if this device's local
  // data currently belongs to a different account, wipe it first so it's never
  // rendered as this account's own, and never pushed up into this account's cloud
  // row by the "no cloud data found yet" branch further down.
  ensureLocalDataOwnedBy(user.id);

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

  // Same reasoning applies to the "Buy Price" -> "To Buy Price" rename: the
  // top-level call at script-load time (see renameBuyPriceParamsIfNeeded's
  // definition) runs against whatever was in localStorage BEFORE this cloud pull
  // just overwrote it above — so on every login, an un-renamed "Buy Price" saved
  // to the cloud from an older session would silently reappear, undoing the
  // rename every time. Re-running it here, against the just-pulled data, is what
  // actually makes it stick. And since this can genuinely change data (unlike a
  // passive migration), push the fix back up right away — otherwise it would only
  // reach the cloud on the next 8-second auto-sync tick, or not at all if the tab
  // closes before then, letting it "un-rename" itself again on the next pull.
  if(renameBuyPriceParamsIfNeeded()){
    pushSnapshotToCloud();
  }

  // Same reasoning as above, for the data.js legacy-ticker trim: this needs to run
  // against the just-pulled (real, possibly pre-trim) data, and push back up right
  // away if it actually changed anything, so a legacy ticker that got promoted to
  // "custom" here stays that way rather than reverting on the next pull.
  if(migrateLegacyMarketTickersToCustomIfNeeded()){
    pushSnapshotToCloud();
  }

  // Same reasoning again: seeds Past Purchases' starting columns for any account
  // (brand-new, or an existing one that has simply never touched Past Purchases
  // yet) whose pastPurchasesParams the cloud pull above just left unset — then
  // pushes that seed up right away so it isn't lost before the next auto-sync.
  if(seedPastPurchasesDefaultParamsIfNeeded()){
    pushSnapshotToCloud();
  }

  // One more one-time migration, same pattern: moves Forward P/E to sit right after
  // P/E Multiple in this account's own saved column order, if it isn't already there.
  if(reorderForwardPEIfNeeded()){
    pushSnapshotToCloud();
  }

  // Relabels "Sale Profit" to "Realized Gain" wherever it's already been added,
  // then inserts the new "Unrealized Gain" column right after it — same
  // "act on the just-pulled real data, then push the result back up right away"
  // pattern as every migration above.
  if(renameSaleProfitToRealizedGainIfNeeded()){
    pushSnapshotToCloud();
  }
  if(insertUnrealizedGainColumnIfNeeded()){
    pushSnapshotToCloud();
  }
  // Adds the manual "Units Sold" column (right after Date Sale) to existing accounts.
  if(insertUnitsSoldColumnIfNeeded()){
    pushSnapshotToCloud();
  }
  // Adds the computed "Current Market Value" column (right before Book Value) to
  // existing accounts.
  if(insertCurrentMarketValueColumnIfNeeded()){
    pushSnapshotToCloud();
  }

  // v5.64: "Current Holding" is the default landing view every time the user logs
  // in -- refresh its FIFO-verified ticker membership against the just-loaded data
  // first, then make it the active Portfolio list, so the very first render below
  // already shows it (switching lists mid-session, afterward, is unaffected).
  syncCurrentHoldingsList();
  setActiveListId(CURRENT_HOLDINGS_LIST_ID);

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
  // Best-effort final save of anything not yet auto-synced (must happen while still
  // authenticated, i.e. before signOut() below) — then wipe this device's local copy
  // of the account's data. Extra privacy hardening on top of the ensureLocalDataOwnedBy()
  // guard in openDashboard(): on a shared/public computer, a logged-out session should
  // leave nothing of this account's portfolio data sitting in local storage.
  try{ await pushSnapshotToCloud(); }catch(e){ /* offline or push failed — proceed with logout regardless */ }
  clearAllLocalAppData();
  try{ localStorage.removeItem(LOCAL_DATA_OWNER_KEY); }catch(e){ /* localStorage unavailable */ }
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
// Same idea, but narrowed to whichever rows are actually visible in the table body
// right now (i.e. after the "Current Holdings" filter, if it's on) — this is what
// exports use for their row data, while lastPastPurchasesOrderedRows above (the
// FULL list) is what footer totals are always computed from.
let lastPastPurchasesVisibleRows = [];
// Same idea for Sales Strategy — the last fully-resolved (Current Price/Units
// Left/etc. already computed) set of draft rows, kept up to date by
// renderSalesStrategyTable() for anything that wants to read what's on screen.
let lastSalesStrategyResolvedRows = [];
// v5.71: Sales Strategy's own per-column header-click sort state, same
// { colId, direction } shape and 3-click (asc -> desc -> clear) cycle as Past
// Purchases' ppColumnSortState, just a separate variable since the two tables
// sort independently.
let ssColumnSortState = null;

function getSavedApiKey(){
  try{ return localStorage.getItem("finnhubApiKey") || ""; }
  catch(e){ return ""; }
}
function saveApiKey(key){
  try{ localStorage.setItem("finnhubApiKey", key); }
  catch(e){ /* localStorage unavailable */ }
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

// --- Cash & Equivalents ($M) and Operating Expenses ($M): SEC EDGAR (primary, ---
// --- free/unlimited/no key) falling back to Alpha Vantage (secondary, free ---
// --- key, capped at 25/day) ---
// Cash Runway (yr) = Cash & Equivalents ÷ Operating Expenses (see
// computeCashRunway) needs both figures, and Finnhub's free tier has no source
// for either raw balance-sheet/income-statement dollar figure (only ratios) —
// see the SEC EDGAR / Alpha Vantage research this was built from. Both fields
// are fetched the same way, tried automatically as part of "Fetch live data";
// nothing here ever overwrites a value the user entered by hand or via the
// Detailed/Brief Update paste flows unless a fresh number was actually found
// (mirrors how price/P-E/ROA already behave).

function getSavedAlphaVantageKey(){
  try{ return localStorage.getItem("alphaVantageApiKey") || ""; }
  catch(e){ return ""; }
}
function saveAlphaVantageKey(key){
  try{ localStorage.setItem("alphaVantageApiKey", key); }
  catch(e){ /* localStorage unavailable */ }
}

// --- SEC EDGAR ---
// data.sec.gov is free, requires no API key/signup, and has no documented
// per-caller request cap for reasonable, non-bulk use. Its one real requirement
// is a descriptive User-Agent header identifying the caller — something a
// browser's own fetch()/XHR can never override (User-Agent is a forbidden
// header name in both), so this simply sends whatever the browser sends and
// relies on that being a normal, non-empty UA string. If SEC ever does reject
// browser-origin requests for that reason (or blocks the cross-origin request
// entirely), every call below fails safely into a caught exception and the
// Alpha Vantage fallback further down takes over — this is never treated as
// fatal to the overall "Fetch live data" run.
let secTickerCikMapPromise = null;

async function getSecTickerCikMap(){
  // Cached in localStorage (not SYNC_KEYS/NON_SYNCED_LOCAL_KEYS: it holds no
  // account data at all, just SEC's public ticker→CIK reference table, so
  // there's no reason to wipe it on an account switch or sync it between
  // devices — every device is equally happy re-downloading or reusing it).
  const CACHE_KEY = "secTickerCikMapCache";
  const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — this file changes rarely
  try{
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if(cached && cached.map && (Date.now() - cached.fetchedAt) < CACHE_MAX_AGE_MS){
      return cached.map;
    }
  }catch(e){ /* fall through and refetch */ }

  if(!secTickerCikMapPromise){
    secTickerCikMapPromise = (async () => {
      const res = await fetch("https://www.sec.gov/files/company_tickers.json");
      if(!res.ok) throw new Error("company_tickers.json fetch failed: " + res.status);
      const data = await res.json();
      const map = {};
      Object.values(data).forEach(entry => {
        if(entry && entry.ticker && entry.cik_str !== undefined){
          map[String(entry.ticker).toUpperCase()] = String(entry.cik_str).padStart(10, "0");
        }
      });
      try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), map })); }
      catch(e){ /* localStorage full/unavailable — still usable for this page load */ }
      return map;
    })();
  }
  return secTickerCikMapPromise;
}

// Fetches one us-gaap XBRL concept's most recent 10-K/10-Q value for a ticker,
// in $M. `concepts` is tried in order — useful because different filers tag
// the "same" line item under different us-gaap concept names depending on how
// their income statement is presented (see fetchSecOperatingExpenses below);
// the first concept that actually has data wins.
async function fetchSecConceptValue(ticker, concepts){
  const map = await getSecTickerCikMap();
  const cik = map && map[ticker.toUpperCase()];
  if(!cik) return undefined; // not a US SEC filer under this ticker, or map unavailable

  for(const concept of concepts){
    const res = await fetch(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${concept}.json`);
    if(!res.ok) continue; // 404 is normal here — e.g. foreign private issuers (20-F filers, like TSM) often don't tag us-gaap concepts at all; try the next concept, if any
    const data = await res.json();
    const entries = data?.units?.USD;
    if(!Array.isArray(entries) || entries.length === 0) continue;

    // Prefer an actual 10-K/10-Q figure over other filing types, and within
    // those, the most recently REPORTED period (not just most recently filed —
    // "end" is the balance-sheet/period date the figure is as-of).
    const relevant = entries.filter(e => e.form === "10-K" || e.form === "10-Q");
    const pool = relevant.length ? relevant : entries;
    const latest = pool.reduce((best, e) => (!best || e.end > best.end) ? e : best, null);
    if(latest && typeof latest.val === "number") return latest.val / 1e6; // USD -> $M
  }
  return undefined;
}

function fetchSecCashAndEquivalents(ticker){
  return fetchSecConceptValue(ticker, ["CashAndCashEquivalentsAtCarryingValue"]);
}

// "OperatingExpenses" (SG&A + R&D + etc., excluding cost of revenue) is the
// closer name match for "total operating expenses," and is what companies
// that separately break out a cost-of-revenue line tend to tag; a filer whose
// income statement doesn't present that subtotal separately (common outside
// software/tech) more often tags the broader "CostsAndExpenses" (cost of
// revenue + operating expenses combined) instead — tried second, as the next
// best "total spend" figure, only if the first concept has no data.
function fetchSecOperatingExpenses(ticker){
  return fetchSecConceptValue(ticker, ["OperatingExpenses", "CostsAndExpenses"]);
}

// --- Alpha Vantage (fallback) ---
// Free API key, works directly from the browser (no CORS proxy needed), and
// its BALANCE_SHEET function does carry the real cashAndCashEquivalentsAtCarryingValue
// figure — but the free key is capped at a shared 25 requests/day across
// however this key gets used. getAlphaVantageCallCountToday/recordAlphaVantageCall
// track THIS device's calls against that cap (see NON_SYNCED_LOCAL_KEYS' note on
// why this isn't synced), and confirmAlphaVantageQuota() surfaces a heads-up
// confirmation once that count would pass 20/day, so the last few daily calls
// are spent deliberately rather than silently.
function getAlphaVantageCallCountToday(){
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, local Date but stable enough for a daily counter
  try{
    const log = JSON.parse(localStorage.getItem("alphaVantageCallLog") || "null");
    if(log && log.date === today) return log.count;
  }catch(e){ /* treat as no calls logged yet */ }
  return 0;
}

function recordAlphaVantageCall(){
  const today = new Date().toISOString().slice(0, 10);
  const count = getAlphaVantageCallCountToday() + 1;
  try{ localStorage.setItem("alphaVantageCallLog", JSON.stringify({ date: today, count })); }
  catch(e){ /* localStorage unavailable */ }
  return count;
}

// Returns true if it's fine to make one more Alpha Vantage call right now.
// Silent for the first 20 calls of the day; from the 21st on, asks first and
// shows exactly which call number this would be out of the free 25/day cap
// (e.g. "21/25"). NOTE: this only ever sees calls made from THIS browser/device
// against whatever key is currently saved — if the same Alpha Vantage key is
// also used elsewhere today, the real server-side count can be higher than
// what's shown here.
function confirmAlphaVantageQuota(){
  const next = getAlphaVantageCallCountToday() + 1;
  if(next <= 20) return true;
  return confirm(`Alpha Vantage free-tier requests today (this device): ${next}/25. This is close to (or over) the daily free limit — further requests today may start failing once it's reached. Continue and use one more?`);
}

// Fetches one field from an Alpha Vantage fundamentals endpoint's most recent
// report (quarterly preferred over annual, same as the cash-equivalents call).
// `apiFunction` is "BALANCE_SHEET" or "INCOME_STATEMENT"; `reportField` is the
// field name Alpha Vantage uses on that report object.
async function fetchAlphaVantageReportField(ticker, apiKey, apiFunction, reportField){
  const res = await fetch(`https://www.alphavantage.co/query?function=${apiFunction}&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`);
  const data = await res.json();
  if(data.Note || data.Information) throw new Error(data.Note || data.Information); // rate-limit/invalid-key messages come back as 200 OK with one of these instead of report data
  const report = (data.quarterlyReports && data.quarterlyReports[0]) || (data.annualReports && data.annualReports[0]);
  if(!report) return undefined;
  const raw = report[reportField];
  if(raw === undefined || raw === null || raw === "None") return undefined;
  const val = Number(raw);
  if(isNaN(val)) return undefined;
  return val / 1e6; // USD -> $M
}

function fetchAlphaVantageCashAndEquivalents(ticker, apiKey){
  return fetchAlphaVantageReportField(ticker, apiKey, "BALANCE_SHEET", "cashAndCashEquivalentsAtCarryingValue");
}

function fetchAlphaVantageOperatingExpenses(ticker, apiKey){
  return fetchAlphaVantageReportField(ticker, apiKey, "INCOME_STATEMENT", "operatingExpenses");
}

// --- Alpha Vantage as its OWN standalone "Fetch live data" source ---
// A separate, independently-triggered counterpart to Finnhub's "Fetch live data"
// button above (see fetchLiveDataForAllAssets) — pulls Current Price, P/E, ROA,
// Revenue Growth, Net Margin, and Beta straight from Alpha Vantage, for anyone who
// doesn't have a Finnhub key or wants a second source to compare against. This is
// deliberately kept separate end-to-end so the two "Fetch live data" buttons never
// cross-function: each reads only its own saved API key, writes only into its own
// map (alphaVantageLiveDataMap here vs. liveDataMap for Finnhub), and reports to
// its own status element (#alphaVantageFetchStatus vs. #fetchStatus) — clicking
// one never triggers, requires, or clears the other's key, data, or status text.
// The only place the two ever meet is getMergedLiveData() below, at render time,
// where Alpha Vantage's value for a field is used only if Finnhub's own fetch
// didn't already return one for that same ticker+field — the same "layered
// fallback" shape already used for Cash Runway's SEC-then-Alpha-Vantage pair,
// not a merge that lets either button overwrite what the other one fetched.
async function fetchAlphaVantageQuoteForPrice(ticker, apiKey){
  const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`);
  const data = await res.json();
  if(data.Note || data.Information) throw new Error(data.Note || data.Information); // rate-limit/invalid-key messages
  const quote = data["Global Quote"];
  const price = quote && Number(quote["05. price"]);
  if(!price || isNaN(price)) throw new Error("no price returned");
  return price;
}

// Alpha Vantage's OVERVIEW endpoint reports ROA/margins/growth as decimal fractions
// (e.g. 0.1234), unlike Finnhub's roaTTM/netProfitMarginTTM which already come back
// as whole percentages (e.g. 12.34) — every "(%)"-labeled field here is scaled ×100
// so it lands in the same units the rest of the app (static defaults, the scoring
// formulas, Finnhub's own fetch) already expects. No Debt-to-Equity field exists on
// this endpoint, so that one field is intentionally left for Finnhub/static/manual
// only rather than guessing at the wrong source field.
async function fetchAlphaVantageOverview(ticker, apiKey){
  const res = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`);
  const data = await res.json();
  if(data.Note || data.Information) throw new Error(data.Note || data.Information);
  if(!data || !data.Symbol) return {}; // unknown ticker / empty response — leave every field undefined

  const toNum = raw => (raw === undefined || raw === null || raw === "None" || raw === "-") ? undefined : (isNaN(Number(raw)) ? undefined : Number(raw));
  const roaFraction = toNum(data.ReturnOnAssetsTTM);
  const revenueGrowthFraction = toNum(data.QuarterlyRevenueGrowthYOY);
  const netMarginFraction = toNum(data.ProfitMargin);

  return {
    pe: toNum(data.PERatio),
    roa: roaFraction !== undefined ? roaFraction * 100 : undefined,
    revenueGrowth: revenueGrowthFraction !== undefined ? revenueGrowthFraction * 100 : undefined,
    netMargin: netMarginFraction !== undefined ? netMarginFraction * 100 : undefined,
    beta: toNum(data.Beta),
  };
}

// Alpha Vantage's own live-data store — kept entirely separate from Finnhub's
// liveDataMap (see the big comment above) so neither "Fetch live data" button's
// results ever get silently clobbered or claimed by the other one.
let alphaVantageLiveDataMap = {};
let alphaVantageFetchFailedTickers = new Set();
let lastAlphaVantageFetchTime = null;

// Combines both sources for rendering/scoring: Finnhub wins per-field whenever it
// has a value for that ticker; Alpha Vantage only fills in a field Finnhub's own
// fetch left blank. Returns undefined if NEITHER source has ever fetched this
// ticker, matching liveDataMap's own "not fetched" convention.
function getMergedLiveData(ticker){
  const fh = liveDataMap[ticker];
  const av = alphaVantageLiveDataMap[ticker];
  if(!fh && !av) return undefined;
  const pick = field => (fh && fh[field] !== undefined) ? fh[field] : (av ? av[field] : undefined);
  return {
    price: pick("price"),
    pe: pick("pe"),
    roa: pick("roa"),
    revenueGrowth: pick("revenueGrowth"),
    netMargin: pick("netMargin"),
    debtToEquity: pick("debtToEquity"),
    beta: pick("beta"),
  };
}

async function fetchAlphaVantageLiveDataForAllAssets(){
  const statusEl = document.getElementById("alphaVantageFetchStatus");
  const apiKey = getSavedAlphaVantageKey();
  if(!apiKey){
    if(statusEl){ statusEl.textContent = "Add and save an Alpha Vantage API key first."; statusEl.style.color = "var(--amber)"; }
    return;
  }

  const workingAssets = getWorkingData();
  if(workingAssets.length === 0){
    if(statusEl){ statusEl.textContent = "No tickers on this list to fetch."; statusEl.style.color = "var(--amber)"; }
    return;
  }

  // Alpha Vantage's free tier caps at ~25 requests/day, and this needs 2 per ticker
  // (a quote call plus an overview call) — confirm once, up front, rather than
  // prompting per ticker like the Cash Runway fallback does, since here Alpha
  // Vantage is the primary source being asked to cover the whole list, not an
  // occasional fallback for two fields.
  const callsNeeded = workingAssets.length * 2;
  const alreadyToday = getAlphaVantageCallCountToday();
  if(alreadyToday + callsNeeded > 25){
    const proceed = confirm(`This will make about ${callsNeeded} Alpha Vantage requests (2 per ticker). You've used ${alreadyToday}/25 free-tier requests today already, so this run may run out partway through and leave some tickers unfetched. Continue anyway?`);
    if(!proceed){
      if(statusEl){ statusEl.textContent = "Cancelled — would exceed today's Alpha Vantage free-tier quota."; statusEl.style.color = "var(--amber)"; }
      return;
    }
  }

  if(statusEl){ statusEl.textContent = "Fetching live data via Alpha Vantage… this can take a while (the free tier allows about 5 requests/minute)."; statusEl.style.color = "var(--text-secondary)"; }

  let successCount = 0, failCount = 0;
  const failedTickers = [];

  for(let i = 0; i < workingAssets.length; i++){
    const asset = workingAssets[i];
    try{
      const price = await fetchAlphaVantageQuoteForPrice(asset.ticker, apiKey);
      recordAlphaVantageCall();
      await sleep(13000); // stay under Alpha Vantage's free-tier ~5-requests/minute cap
      const overview = await fetchAlphaVantageOverview(asset.ticker, apiKey);
      recordAlphaVantageCall();
      alphaVantageLiveDataMap[asset.ticker] = { price, ...overview };
      alphaVantageFetchFailedTickers.delete(asset.ticker);
      successCount++;
    }catch(err){
      alphaVantageLiveDataMap[asset.ticker] = undefined;
      alphaVantageFetchFailedTickers.add(asset.ticker);
      failCount++;
      failedTickers.push(asset.ticker);
    }
    if(i < workingAssets.length - 1) await sleep(13000);
  }

  lastAlphaVantageFetchTime = new Date();
  runMatrixOptimization();

  // Same reasoning as Finnhub's own fetch: re-pull into Past Purchases now, so any
  // column mirroring a Portfolio Lists field (e.g. Current Price) picks this up too.
  if(typeof refreshPastPurchasesFromPortfolio === "function"){
    refreshPastPurchasesFromPortfolio();
    if(typeof renderPastPurchasesTable === "function") renderPastPurchasesTable();
    if(typeof renderPastPurchasesParamList === "function") renderPastPurchasesParamList();
  }

  if(statusEl){
    statusEl.textContent = failCount === 0
      ? `Live data updated for all ${successCount} tickers via Alpha Vantage at ${lastAlphaVantageFetchTime.toLocaleTimeString()}.`
      : `Updated ${successCount}/${workingAssets.length} tickers via Alpha Vantage at ${lastAlphaVantageFetchTime.toLocaleTimeString()}. Failed (using Finnhub/static fallback): ${failedTickers.join(", ")}.`;
    statusEl.style.color = failCount === 0 ? "var(--emerald)" : "var(--amber)";
  }
}

// --- Combined orchestrator: SEC EDGAR first, Alpha Vantage only if needed ---
// Shared by both Cash & Equivalents and Operating Expenses — same SEC-then-AV
// fallback shape, just pointed at different fetchers and a different override
// field. batchCtx is an optional shared {avDeclined} object passed by a caller
// looping over many tickers (and, within one ticker, shared across BOTH the
// cash and opex calls — see fetchCashRunwayInputsForTicker below), so declining
// the Alpha Vantage quota prompt once stops it from being asked again (silently
// skipping Alpha Vantage) for the rest of that same run, instead of popping up
// once per remaining ticker or per remaining field.
async function fetchFieldFromSecThenAv(ticker, batchCtx, { secFetch, avFetch, overrideField }){
  try{
    const secVal = await secFetch(ticker);
    if(secVal !== undefined){
      setGlobalOverride(ticker, overrideField, secVal);
      return { ok: true, source: "sec" };
    }
  }catch(e){ /* SEC EDGAR failed (CORS, network, no data) — fall through to Alpha Vantage */ }

  if(batchCtx && batchCtx.avDeclined) return { ok: false, source: null };

  const avKey = getSavedAlphaVantageKey();
  if(!avKey) return { ok: false, source: null, reason: "no-secondary-source" };

  if(!confirmAlphaVantageQuota()){
    if(batchCtx) batchCtx.avDeclined = true;
    return { ok: false, source: null, declined: true };
  }
  recordAlphaVantageCall();

  try{
    const avVal = await avFetch(ticker, avKey);
    if(avVal !== undefined){
      setGlobalOverride(ticker, overrideField, avVal);
      return { ok: true, source: "av" };
    }
  }catch(e){ /* no source had data for this ticker today */ }

  return { ok: false, source: null };
}

function fetchCashAndEquivalentsForTicker(ticker, batchCtx){
  return fetchFieldFromSecThenAv(ticker, batchCtx, {
    secFetch: fetchSecCashAndEquivalents,
    avFetch: fetchAlphaVantageCashAndEquivalents,
    overrideField: "cashAndEquivalents",
  });
}

function fetchOperatingExpensesForTicker(ticker, batchCtx){
  return fetchFieldFromSecThenAv(ticker, batchCtx, {
    secFetch: fetchSecOperatingExpenses,
    avFetch: fetchAlphaVantageOperatingExpenses,
    overrideField: "operatingExpenses",
  });
}

// Fetches BOTH Cash Runway inputs for one ticker, sharing one batchCtx (so an
// Alpha Vantage quota decline on the first field suppresses the prompt for the
// second field too, not just for the next ticker). Returns a small summary
// used to roll up "N via SEC, N via Alpha Vantage, N with no source" messaging.
async function fetchCashRunwayInputsForTicker(ticker, batchCtx){
  const cash = await fetchCashAndEquivalentsForTicker(ticker, batchCtx);
  const opex = await fetchOperatingExpensesForTicker(ticker, batchCtx);
  return { cash, opex };
}

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
  let result;
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
    result = { ok: true };
  }catch(err){
    liveDataMap[ticker] = undefined;
    fetchFailedTickers.add(ticker);
    result = { ok: false, reason: err.message };
  }
  // Best-effort, independent of whether the Finnhub price/metrics call above
  // succeeded — Finnhub has no free-tier source for either Cash Runway input
  // (see fetchFieldFromSecThenAv's own comments), so this always tries SEC
  // EDGAR, then Alpha Vantage, on its own for both Cash & Equivalents and
  // Operating Expenses.
  try{ await fetchCashRunwayInputsForTicker(ticker); }catch(e){ /* non-fatal to this ticker's live-data result */ }
  return result;
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

  // Shared across the whole run (both fields, every ticker): once the Alpha
  // Vantage daily-quota prompt is declined once, stop asking again — see
  // fetchFieldFromSecThenAv's own comment.
  const cashFetchCtx = { avDeclined: false };
  let cashSecCount = 0, cashAvCount = 0, cashNoneCount = 0;
  let opexSecCount = 0, opexAvCount = 0, opexNoneCount = 0;

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

    // Cash Runway (yr)'s two inputs: Finnhub has no free source for either, so
    // both are tried independently of whether the Finnhub call above succeeded
    // — SEC EDGAR first (free/unlimited) for each, Alpha Vantage as a fallback
    // (free key, capped at 25/day — see confirmAlphaVantageQuota).
    try{
      const { cash: cashResult, opex: opexResult } = await fetchCashRunwayInputsForTicker(asset.ticker, cashFetchCtx);
      if(cashResult.source === "sec") cashSecCount++;
      else if(cashResult.source === "av") cashAvCount++;
      else cashNoneCount++;
      if(opexResult.source === "sec") opexSecCount++;
      else if(opexResult.source === "av") opexAvCount++;
      else opexNoneCount++;
    }catch(e){ cashNoneCount++; opexNoneCount++; }

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
  if(cashSecCount > 0 || cashAvCount > 0){
    msgParts.push(`Cash & Equivalents updated for ${cashSecCount + cashAvCount}/${workingAssets.length} tickers (${cashSecCount} via SEC EDGAR, ${cashAvCount} via Alpha Vantage)${cashNoneCount > 0 ? `; no source had data for ${cashNoneCount}` : ""}.`);
  } else if(cashNoneCount > 0){
    msgParts.push(`Cash & Equivalents: no data found via SEC EDGAR${getSavedAlphaVantageKey() ? " or Alpha Vantage" : " (add an Alpha Vantage key above to also try that as a fallback)"} for ${cashNoneCount} ticker(s).`);
  }
  if(opexSecCount > 0 || opexAvCount > 0){
    msgParts.push(`Operating Expenses updated for ${opexSecCount + opexAvCount}/${workingAssets.length} tickers (${opexSecCount} via SEC EDGAR, ${opexAvCount} via Alpha Vantage)${opexNoneCount > 0 ? `; no source had data for ${opexNoneCount}` : ""}.`);
  } else if(opexNoneCount > 0){
    msgParts.push(`Operating Expenses: no data found via SEC EDGAR${getSavedAlphaVantageKey() ? " or Alpha Vantage" : " (add an Alpha Vantage key above to also try that as a fallback)"} for ${opexNoneCount} ticker(s).`);
  }
  statusEl.textContent = msgParts.join(" ");
  statusEl.style.color = failCount === 0 && noPeTickers.length === 0 ? "var(--emerald)" : "var(--amber)";
}

// --- Quick Paste Update ("Update Current Price and Consensus Target Price for all assets") ---
// A network-free companion to "Fetch live data": generates a fixed-order prompt
// listing every ticker across ALL Portfolio Lists (deduplicated) for a fixed set of
// fields, that the user can hand to any AI assistant, then pastes the AI's numeric
// reply back in to apply it. Applied via setGlobalOverride (ticker-keyed, not
// list-keyed) — exactly like a manual cell edit or a "Fetch live data" result — so a
// paste updates a ticker's values everywhere that ticker appears, across every
// Portfolio List at once, and takes the same "manual override beats live fetch beats
// static default" precedence used everywhere else in the app.
//
// Deliberately scoped down (per the user's explicit request) to just the two
// always-present BUILTIN_COLUMNS fields most worth a quick, no-API-key refresh:
// Current Price and Consensus Target Price. resolveQpuFieldId is kept generic
// (rather than hard-coded to these two ids) in case this list needs to grow again
// later — it still supports an optional custom-param entry (no builtinId) that
// gets added automatically the first time "Parse & Update" runs, the way Dividend
// Yield/Market Cap/Forward P/E used to when this list carried 7 fields.
const QPU_FIELDS = [
  { label: "Current Price", builtinId: "currentPrice" },
  { label: "Consensus Target Price", builtinId: "targetPrice" },
];

// Resolves the override-able field id for one QPU_FIELDS entry: the fixed
// BUILTIN_COLUMNS id for the 4 always-present fields, or an existing/newly-added
// custom param's id for the 3 optional ones. findSimilarExistingParam is the same
// fuzzy matcher the "+ Parameter" UI itself uses, so a column already added by hand
// under a slightly different label (e.g. "Fwd P/E") is recognized and reused
// instead of creating a duplicate column.
function resolveQpuFieldId(field){
  if(field.builtinId) return field.builtinId;
  const existing = findSimilarExistingParam(field.label);
  if(existing) return existing.id;
  const preset = PARAM_PRESETS.find(p => p.label === field.label);
  return preset ? addCustomParam(preset) : null;
}

function getQuickPasteTickers(){
  const seen = new Set();
  const tickers = [];
  Object.values(getAllLists()).forEach(list => {
    getWorkingData(list).forEach(asset => {
      if(!seen.has(asset.ticker)){
        seen.add(asset.ticker);
        tickers.push(asset.ticker);
      }
    });
  });
  return tickers.sort();
}

function buildQuickPasteUpdatePrompt(tickers){
  if(tickers.length === 0){
    return "No tickers yet — add at least one asset to a Portfolio List first.";
  }
  const fieldLabels = QPU_FIELDS.map(f => f.label).join(", ");
  const lines = tickers.map(t => `${t}: ${fieldLabels}`);
  return `Generate the latest values, in numbers only, in the following order, separated by commas — ${QPU_FIELDS.length} numbers per ticker (${fieldLabels}), no ticker symbols, no labels, no extra text:\n\n${lines.join("\n")}\n\nReply with only the numbers, comma-separated, in that exact order (${tickers.length * QPU_FIELDS.length} numbers total).`;
}

function renderQuickPasteUpdatePrompt(){
  const box = document.getElementById("qpuPromptBox");
  if(!box) return;
  const tickers = getQuickPasteTickers();
  box.value = buildQuickPasteUpdatePrompt(tickers);
}

function wireUpQuickPasteUpdate(){
  const copyBtn = document.getElementById("qpuCopyBtn");
  const refreshBtn = document.getElementById("qpuRefreshBtn");
  const parseBtn = document.getElementById("qpuParseBtn");
  const promptBox = document.getElementById("qpuPromptBox");
  const promptStatus = document.getElementById("qpuPromptStatus");
  const parseStatus = document.getElementById("qpuParseStatus");
  const pasteInput = document.getElementById("qpuPasteInput");
  if(!parseBtn || !promptBox) return; // index.html may be out of date

  renderQuickPasteUpdatePrompt();

  if(copyBtn) copyBtn.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(promptBox.value);
      if(promptStatus){ promptStatus.textContent = "Copied to clipboard."; promptStatus.style.color = "var(--emerald)"; }
    }catch(e){
      promptBox.select();
      if(promptStatus){ promptStatus.textContent = "Couldn't use the clipboard automatically — the text is selected, so Ctrl/Cmd+C will copy it."; promptStatus.style.color = "var(--amber)"; }
    }
  });

  if(refreshBtn) refreshBtn.addEventListener("click", () => {
    renderQuickPasteUpdatePrompt();
    if(promptStatus){ promptStatus.textContent = "Ticker list refreshed."; promptStatus.style.color = "var(--text-secondary)"; }
  });

  parseBtn.addEventListener("click", () => {
    const tickers = getQuickPasteTickers();
    if(tickers.length === 0){
      parseStatus.textContent = "No tickers yet — add at least one asset to a Portfolio List first.";
      parseStatus.style.color = "var(--amber)";
      return;
    }
    const raw = (pasteInput.value || "").trim();
    if(!raw){
      parseStatus.textContent = "Paste the AI's numbers into the box above first.";
      parseStatus.style.color = "var(--amber)";
      return;
    }
    const tokens = raw.split(/[,\n]+/).map(s => s.trim()).filter(s => s.length > 0);
    const fieldCount = QPU_FIELDS.length;
    const expected = tickers.length * fieldCount;
    if(tokens.length !== expected){
      parseStatus.textContent = `Expected ${expected} numbers (${tickers.length} ticker(s) × ${fieldCount} fields) but found ${tokens.length}. Nothing was updated — check the paste matches the prompt's order and try again.`;
      parseStatus.style.color = "#ef4444";
      return;
    }
    const numbers = tokens.map(t => Number(t));
    const invalidIndex = numbers.findIndex(n => !isFinite(n));
    if(invalidIndex !== -1){
      parseStatus.textContent = `"${tokens[invalidIndex]}" (item ${invalidIndex + 1}) isn't a valid number. Nothing was updated — fix the paste and try again.`;
      parseStatus.style.color = "#ef4444";
      return;
    }

    // Resolve (creating any missing optional custom param) once, up front, so every
    // ticker below applies against the same field ids.
    const fieldIds = QPU_FIELDS.map(resolveQpuFieldId);

    tickers.forEach((ticker, i) => {
      const values = numbers.slice(i * fieldCount, i * fieldCount + fieldCount);
      fieldIds.forEach((fieldId, j) => {
        if(fieldId) setGlobalOverride(ticker, fieldId, values[j]);
      });
    });

    runMatrixOptimization();
    // Past Purchases only pulls FROM Portfolio Lists (never the reverse) — re-pull
    // now so any Past Purchases columns that mirror a Portfolio Lists field (e.g.
    // Current Price) pick up what was just pasted in, same as after a live fetch.
    if(typeof refreshPastPurchasesFromPortfolio === "function"){
      refreshPastPurchasesFromPortfolio();
      if(typeof renderPastPurchasesTable === "function") renderPastPurchasesTable();
      if(typeof renderPastPurchasesParamList === "function") renderPastPurchasesParamList();
    }
    if(typeof renderColumnOrderList === "function") renderColumnOrderList();
    if(typeof renderCustomParamList === "function") renderCustomParamList();

    pasteInput.value = "";
    parseStatus.textContent = `Updated ${QPU_FIELDS.map(f => f.label).join(", ")} for ${tickers.length} ticker(s), applied across every Portfolio List they appear on.`;
    parseStatus.style.color = "var(--emerald)";
  });
}

// --- "Detailed Update for Selected Assets" ---
// Same copy/paste-to-an-AI idea as the Brief Update above, but scoped to a
// hand-picked set of tickers (checked ✓ included/✕ excluded per-asset, kept in
// localStorage under DUS_STATES_KEY so the choices survive a reload/re-login)
// and covering EVERY numeric
// parameter currently on the Portfolio table — built-in and custom alike —
// rather than the fixed 2-field QPU_FIELDS set. Non-numeric columns (Company
// Name, Stability, any text/date custom param) are left out since the AI
// reply is numbers-only, matching the prompt's own instructions.
// Every asset across every Portfolio List is shown as a checklist row here —
// { [ticker]: "included" | "excluded" } — rather than a hand-typed queue, so a
// ticker added anywhere else in the app shows up automatically. A ticker with
// no entry at all (never toggled) is "undecided" and treated the same as
// excluded for request-generation purposes, but rendered with both the ✕ and
// ✓ icons grey rather than either one colored, so it reads as "not decided
// yet" rather than "actively excluded."
const DUS_STATES_KEY = "dusAssetStates";

function getDusAssetStates(){
  try{ return JSON.parse(localStorage.getItem(DUS_STATES_KEY) || "{}"); }
  catch(e){ return {}; }
}
function saveDusAssetStates(states){
  try{ localStorage.setItem(DUS_STATES_KEY, JSON.stringify(states)); }
  catch(e){ /* localStorage unavailable */ }
}
function setDusAssetState(ticker, state){
  const states = getDusAssetStates();
  states[ticker] = state;
  saveDusAssetStates(states);
}

// Same source ticker list as the Brief Update below (every ticker across every
// Portfolio List, deduped), but carrying each one's current display name too,
// since the checklist shows both.
function getAllPortfolioAssetsForDetailedUpdate(){
  const seen = new Set();
  const rows = [];
  Object.values(getAllLists()).forEach(list => {
    getWorkingData(list).forEach(asset => {
      if(!seen.has(asset.ticker)){
        seen.add(asset.ticker);
        const ov = asset._overrides || {};
        rows.push({ ticker: asset.ticker, name: ov.name !== undefined ? ov.name : asset.name });
      }
    });
  });
  rows.sort((a, b) => a.ticker.localeCompare(b.ticker));
  return rows;
}

function getDusIncludedAssets(){
  const states = getDusAssetStates();
  return getAllPortfolioAssetsForDetailedUpdate().filter(a => states[a.ticker] === "included");
}

// addAsset is idempotent — it falls back to any existing name/override rather
// than clobbering it (the same behavior Import Excel already relies on for a
// ticker that already has data elsewhere) — so it's safe to call every time an
// asset is marked "included," whether or not it's already a member of the
// currently open Portfolio List.
function ensureTickerInActiveList(ticker, name){
  addAsset({ ticker, name });
}

// These fields are strictly manual-entry (typed in by hand) or Import-Excel
// only — never fetched from the internet, and never asked of an AI via the
// Detailed Update / Brief Update paste flows either, since that's still an
// external source providing the number rather than the user's own manual
// entry or spreadsheet import. Matched by label (not id) so this also catches
// a user manually re-adding one of these via the "+/- Parameter" preset
// dropdown, which generates its own non-deterministic id.
const MANUAL_ONLY_FIELD_LABELS = ["Actual Upside (%)", "Units Purchased", "Average Purchase Price ($)", "To Buy Price"];

// getEditableMainColumnDefs is defined further below (with the Excel sample/import
// feature) but, as a function declaration, is hoisted — safe to call here at
// runtime since this only ever runs from a click handler, after the whole file
// has loaded.
function getDetailedUpdateFields(){
  return getEditableMainColumnDefs().filter(d => d.type === "number" && !MANUAL_ONLY_FIELD_LABELS.includes(d.label));
}

// A few numeric fields use an app-specific sentinel value instead of a plain
// "no data" 0 — a generic AI has no way to know that convention, so without a
// hint it reliably answers a literal 0 for these instead, which then LOOKS
// like a real (and wrong) value once pasted back in. Nothing uses this right
// now — Cash Runway (yr) used to (see computeCashRunway), but it's now
// computed in-app from "Cash & Equivalents ($M)" and "Operating Expenses ($M)"
// instead of asked of the AI at all, so it's no longer part of
// getDetailedUpdateFields()'s output.
// Left in place, keyed by BUILTIN_COLUMNS/custom-param id, for the next field
// that turns out to need this treatment.
const DETAILED_UPDATE_FIELD_HINTS = {};

function buildDetailedUpdatePrompt(assets){
  if(assets.length === 0){
    return "No requested assets yet — add at least one ticker above first.";
  }
  const fields = getDetailedUpdateFields();
  if(fields.length === 0){
    return "No numeric parameters found on the Portfolio table to request.";
  }
  const fieldLabels = fields.map(f => f.label).join(", ");
  const lines = assets.map(a => `${a.ticker}: ${fieldLabels}`);
  const hints = fields
    .filter(f => DETAILED_UPDATE_FIELD_HINTS[f.id])
    .map(f => `- ${f.label}: ${DETAILED_UPDATE_FIELD_HINTS[f.id]}`);
  const hintBlock = hints.length ? `\n\nNotes on specific fields — read before answering:\n${hints.join("\n")}` : "";
  return `Generate the latest values, in numbers only, in the following order, separated by commas — ${fields.length} numbers per ticker (${fieldLabels}), no ticker symbols, no labels, no extra text:\n\n${lines.join("\n")}${hintBlock}\n\nReply with only the numbers, comma-separated, in that exact order (${assets.length * fields.length} numbers total).`;
}

// Selected-state colors for the ✕ / ✓ checklist buttons below. Grey/undecided
// stays var(--text-secondary) regardless. ✕ excluded uses a dull/dusty pink
// (not the app's usual bright red, which reads as more of an alarm/error
// color) and ✓ included uses a plain yellow (not var(--amber), which is
// visually more orange and is already used app-wide for warning states),
// per the user's explicit request.
const DUS_EXCLUDED_COLOR = "#c98a9e";
const DUS_INCLUDED_COLOR = "#eab308";

function updateDusSelectAllLabel(){
  const label = document.getElementById("dusCurrentListNameLabel");
  if(!label) return;
  let name = "";
  try{ name = getActiveList().name || ""; }catch(e){ /* not ready yet */ }
  label.textContent = name;
}

function renderDusRequestList(){
  const container = document.getElementById("dusRequestList");
  updateDusSelectAllLabel();
  if(!container) return;
  const assets = getAllPortfolioAssetsForDetailedUpdate();
  const states = getDusAssetStates();
  container.innerHTML = "";
  if(assets.length === 0){
    container.innerHTML = `<span style="color:var(--text-secondary);">No assets on any Portfolio List yet — add one below.</span>`;
    return;
  }
  assets.forEach(a => {
    const state = states[a.ticker]; // "included" | "excluded" | undefined (undecided)
    const row = document.createElement("div");
    row.className = "remove-chip";
    row.innerHTML = `<span>${a.ticker} — ${a.name || a.ticker}</span>` +
      `<button data-ticker="${a.ticker}" data-state="excluded" title="Exclude ${a.ticker} from the request" style="color:${state === 'excluded' ? DUS_EXCLUDED_COLOR : 'var(--text-secondary)'};">&#10007;</button>` +
      `<button data-ticker="${a.ticker}" data-state="included" title="Include ${a.ticker} in the request" style="color:${state === 'included' ? DUS_INCLUDED_COLOR : 'var(--text-secondary)'};">&#10003;</button>`;
    row.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const newState = btn.getAttribute("data-state");
        setDusAssetState(a.ticker, newState);
        if(newState === "included"){
          ensureTickerInActiveList(a.ticker, a.name);
          if(typeof renderRemoveList === "function") renderRemoveList();
        }
        renderDusRequestList();
      });
    });
    container.appendChild(row);
  });
}

// "Request all for current Portfolio list" quick-select: marks every ticker
// already on the currently active Portfolio List as ✓ included, in one click,
// instead of checking them one by one. Assets on OTHER lists are left as-is.
function selectAllCurrentListForDetailedUpdate(){
  const list = getActiveList();
  const workingData = getWorkingData(list);
  workingData.forEach(asset => setDusAssetState(asset.ticker, "included"));
  renderDusRequestList();
  return { list, count: workingData.length };
}

// "Reset request list" — clears every asset's ✓/✕ choice back to grey/
// undecided, across every Portfolio List, in one click. This is the
// counterpart to the one-by-one problem "Request all..." solves: there was
// previously no way to blank out the whole checklist except clicking ✕ on
// each asset individually (which sets it to "excluded," not undecided).
function resetDetailedUpdateSelections(){
  const count = Object.keys(getDusAssetStates()).length;
  saveDusAssetStates({});
  renderDusRequestList();
  return { count };
}

function wireUpDetailedUpdate(){
  const addBtn = document.getElementById("dusAddBtn");
  const tickerInput = document.getElementById("dusTicker");
  const nameInput = document.getElementById("dusName");
  const addStatus = document.getElementById("dusAddStatus");
  const generateBtn = document.getElementById("dusGenerateBtn");
  const refreshBtn = document.getElementById("dusRefreshBtn");
  const copyBtn = document.getElementById("dusCopyBtn");
  const parseBtn = document.getElementById("dusParseBtn");
  const promptBox = document.getElementById("dusPromptBox");
  const promptStatus = document.getElementById("dusPromptStatus");
  const parseStatus = document.getElementById("dusParseStatus");
  const pasteInput = document.getElementById("dusPasteInput");
  const selectAllCurrentListBtn = document.getElementById("dusSelectAllCurrentListBtn");
  const resetSelectionsBtn = document.getElementById("dusResetSelectionsBtn");
  if(!addBtn || !generateBtn || !parseBtn || !promptBox) return; // index.html may be out of date

  renderDusRequestList();

  if(selectAllCurrentListBtn){
    selectAllCurrentListBtn.addEventListener("click", () => {
      const { list, count } = selectAllCurrentListForDetailedUpdate();
      addStatus.textContent = count > 0
        ? `Marked all ${count} asset(s) on "${list.name}" as ✓ included in the request.`
        : `"${list.name}" has no assets yet.`;
      addStatus.style.color = count > 0 ? "var(--emerald)" : "var(--amber)";
    });
  }

  if(resetSelectionsBtn){
    resetSelectionsBtn.addEventListener("click", () => {
      const { count } = resetDetailedUpdateSelections();
      addStatus.textContent = count > 0
        ? `Reset ${count} asset(s) back to grey/undecided.`
        : "Nothing was selected — already all grey/undecided.";
      addStatus.style.color = "var(--text-secondary)";
    });
  }

  addBtn.addEventListener("click", () => {
    const ticker = (tickerInput.value || "").trim().toUpperCase();
    const name = (nameInput.value || "").trim();
    if(!ticker || !name){
      addStatus.textContent = "Ticker and Company Name are required.";
      addStatus.style.color = "var(--amber)";
      return;
    }
    // Adding here means "include this in the request" — mark it included and
    // drop it onto the currently open Portfolio List right away, same as
    // checking ✓ on an asset already in the checklist below.
    setDusAssetState(ticker, "included");
    ensureTickerInActiveList(ticker, name);
    if(typeof renderRemoveList === "function") renderRemoveList();
    renderDusRequestList();
    addStatus.textContent = `${ticker} added to your current list and marked ✓ included in the request.`;
    addStatus.style.color = "var(--emerald)";
    tickerInput.value = "";
    nameInput.value = "";
  });

  generateBtn.addEventListener("click", () => {
    const assets = getDusIncludedAssets();
    promptBox.value = buildDetailedUpdatePrompt(assets);
    if(assets.length === 0){
      promptStatus.textContent = "Mark at least one asset ✓ included below first (or add a new one above).";
      promptStatus.style.color = "var(--amber)";
    }else{
      promptStatus.textContent = `Request generated for ${assets.length} asset(s).`;
      promptStatus.style.color = "var(--emerald)";
    }
  });

  if(refreshBtn) refreshBtn.addEventListener("click", () => {
    renderDusRequestList();
    addStatus.textContent = "Asset list refreshed.";
    addStatus.style.color = "var(--text-secondary)";
  });

  if(copyBtn) copyBtn.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(promptBox.value);
      promptStatus.textContent = "Copied to clipboard.";
      promptStatus.style.color = "var(--emerald)";
    }catch(e){
      promptBox.select();
      promptStatus.textContent = "Couldn't use the clipboard automatically — the text is selected, so Ctrl/Cmd+C will copy it.";
      promptStatus.style.color = "var(--amber)";
    }
  });

  parseBtn.addEventListener("click", () => {
    const assets = getDusIncludedAssets();
    if(assets.length === 0){
      parseStatus.textContent = "No assets marked ✓ included yet — check at least one above, or add a new one.";
      parseStatus.style.color = "var(--amber)";
      return;
    }
    const raw = (pasteInput.value || "").trim();
    if(!raw){
      parseStatus.textContent = "Paste the AI's numbers into the box above first.";
      parseStatus.style.color = "var(--amber)";
      return;
    }
    const fields = getDetailedUpdateFields();
    const fieldCount = fields.length;
    const tokens = raw.split(/[,\n]+/).map(s => s.trim()).filter(s => s.length > 0);
    const expected = assets.length * fieldCount;
    if(tokens.length !== expected){
      parseStatus.textContent = `Expected ${expected} numbers (${assets.length} ticker(s) × ${fieldCount} fields) but found ${tokens.length}. Nothing was updated — check the paste matches the generated request's order and try again.`;
      parseStatus.style.color = "#ef4444";
      return;
    }
    const numbers = tokens.map(t => Number(t));
    const invalidIndex = numbers.findIndex(n => !isFinite(n));
    if(invalidIndex !== -1){
      parseStatus.textContent = `"${tokens[invalidIndex]}" (item ${invalidIndex + 1}) isn't a valid number. Nothing was updated — fix the paste and try again.`;
      parseStatus.style.color = "#ef4444";
      return;
    }

    assets.forEach((asset, i) => {
      const values = numbers.slice(i * fieldCount, i * fieldCount + fieldCount);
      // Marking an asset ✓ included already drops it onto the active list at
      // that moment (see setDusAssetState/ensureTickerInActiveList above) — this
      // is just a defensive, idempotent re-check in case its inclusion state was
      // set in an earlier session before this behavior existed.
      ensureTickerInActiveList(asset.ticker, asset.name);
      fields.forEach((f, j) => setGlobalOverride(asset.ticker, f.id, values[j]));
    });

    runMatrixOptimization();
    // Same as the Brief Update: Past Purchases only pulls FROM Portfolio Lists, so
    // re-pull now in case any Past Purchases column mirrors one of the fields
    // just pasted in (e.g. Current Price).
    if(typeof refreshPastPurchasesFromPortfolio === "function"){
      refreshPastPurchasesFromPortfolio();
      if(typeof renderPastPurchasesTable === "function") renderPastPurchasesTable();
      if(typeof renderPastPurchasesParamList === "function") renderPastPurchasesParamList();
    }
    if(typeof renderColumnOrderList === "function") renderColumnOrderList();
    if(typeof renderCustomParamList === "function") renderCustomParamList();
    if(typeof renderRemoveList === "function") renderRemoveList();
    renderDusRequestList();

    pasteInput.value = "";
    parseStatus.textContent = `Updated ${fieldCount} parameter(s) for ${assets.length} requested asset(s), applied across every Portfolio List they appear on.`;
    parseStatus.style.color = "var(--emerald)";
  });
}

// --- Column system: built-in columns, user-defined custom parameters, and ordering ---
// Ticker (always first, sticky) and Remove (always last) are NOT part of this reorderable
// set — everything else, including custom parameters, can be repositioned freely.
const BUILTIN_COLUMNS = [
  { id: "name", label: "Company Name", type: "text", computed: false },
  { id: "roa", label: "ROA (%)", type: "number", computed: false },
  { id: "pe", label: "P/E Multiple", type: "number", computed: false },
  { id: "currentPrice", label: "Current Price", type: "number", computed: false },
  { id: "targetPrice", label: "Consensus Target Price", type: "number", computed: false },
  { id: "revenueGrowth", label: "Rev Growth (YoY%)", type: "number", computed: false },
  { id: "netMargin", label: "Net Margin (%)", type: "number", computed: false },
  { id: "pegRatio", label: "PEG Ratio", type: "number", computed: false },
  { id: "debtToEquity", label: "D/E Ratio", type: "number", computed: false },
  { id: "freeCashFlow", label: "FCF ($M)", type: "number", computed: false },
  { id: "cashAndEquivalents", label: "Cash & Equivalents ($M)", type: "number", computed: false },
  { id: "operatingExpenses", label: "Operating Expenses ($M)", type: "number", computed: false },
  { id: "cashRunway", label: "Cash Runway (yr)", type: "number", computed: true },
  { id: "beta", label: "Beta", type: "number", computed: false },
  { id: "calculatedUpside", label: "Implied Upside", type: "number", computed: true },
  { id: "stability", label: "Stability", type: "select", options: ["Ultra-high", "High", "Med", "Low"], computed: false },
  { id: "allocationWeight", label: "Optimized Weight Allocation", type: "number", computed: true },
];

// Cash Runway (yr) is COMPUTED, not a manually/AI-filled number:
//   Cash Runway (yr) = Cash & Equivalents ($M) ÷ Annual Operating Expenses ($M)
// This is a "zero revenue" runway — how long the company's current cash would
// last covering its total annual operating expenses alone, regardless of how
// much revenue is actually offsetting that spend — so, unlike the previous
// FCF-based version of this metric, it no longer depends on whether the
// company is profitable: a profitable company still gets a real (typically
// large) number of years here, not an "infinite" special case. The 99999
// sentinel now means exactly one thing — missing data — and only fires when
// either figure isn't on file yet (0/blank is this app's existing convention
// for "not entered" on every other numeric field, so 0 is treated as missing
// here too, not as a real zero). Fill in Cash & Equivalents ($M) and/or
// Operating Expenses ($M) (via Sample Excel, Import Excel, Detailed/Brief
// Update, "Fetch live data", or by typing directly into the table) to get a
// real computed years-of-runway figure; it recalculates automatically every
// time either input changes.
function computeCashRunway(cashAndEquivalents, operatingExpenses){
  const cash = Number(cashAndEquivalents) || 0;
  const opex = Number(operatingExpenses) || 0;
  if(cash <= 0 || opex <= 0) return 99999;
  return cash / opex;
}

function getCustomParams(){
  try{ return JSON.parse(localStorage.getItem("customParams") || "[]"); }
  catch(e){ return []; }
}
function saveCustomParams(list){
  try{ localStorage.setItem("customParams", JSON.stringify(list)); }
  catch(e){ /* localStorage unavailable */ }
}

// 40 additional parameters available as presets — deliberately distinct from the
// existing built-in fields (ROA, PE, Current/Consensus Target Price, Revenue Growth,
// Net Margin, PEG, D/E, FCF, Cash Runway, Beta) so they add real new coverage.
const PARAM_PRESETS = [
  { label: "Current/Consensus Target Price (%)", type: "number", defaultValue: 0, computed: true, formula: "currentToTargetPct" },
  { label: "Actual Upside (%)", type: "number", defaultValue: 0, computed: true, formula: "actualUpsidePct" },
  { label: "Units Purchased", type: "number", defaultValue: 0 },
  { label: "Average Purchase Price ($)", type: "number", defaultValue: 0 },
  { label: "To Buy Price", type: "number", defaultValue: 0 },
  { label: "Date Purchased", type: "date", defaultValue: "" },
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
    // Only the explicit "__today__" sentinel resolves to today's date — an
    // ordinary blank default stays blank, rather than every unfilled date field
    // silently claiming today's date (same fix as Past Purchases' own
    // addPastPurchaseParam, and for the same reason — see its comment).
    resolvedDefault = (defaultValue === "__today__") ? new Date().toISOString().slice(0,10) : (defaultValue || "");
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
    // If neither old-schema key is present, there's nothing to migrate — this is really a
    // fresh Sample List being (re)created, not a real legacy user, so it gets the same
    // reduced ticker set as everywhere else rather than the now-obsolete full 30-ticker list.
    const hasLegacyData = localStorage.getItem("customAssets") !== null || localStorage.getItem("removedTickers") !== null;
    let migratedCustom = [], migratedRemoved = hasLegacyData ? [] : getDefaultSampleListRemovedTickers();
    try{ migratedCustom = JSON.parse(localStorage.getItem("customAssets") || "[]"); }catch(e){}
    if(hasLegacyData){ try{ migratedRemoved = JSON.parse(localStorage.getItem("removedTickers") || "[]"); }catch(e){} }
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
    lists[id] = { name: "Sample List", useBaseData: true, includedCustomTickers: [], removedTickers: getDefaultSampleListRemovedTickers() };
    saveAllLists(lists);
  }
  return lists[id];
}

function updateActiveList(mutatorFn){
  const lists = getAllLists();
  const id = getActiveListId();
  if(!lists[id]) lists[id] = { name: "Sample List", useBaseData: true, includedCustomTickers: [], removedTickers: getDefaultSampleListRemovedTickers() };
  mutatorFn(lists[id]);
  saveAllLists(lists);
}

function createList(name){
  const lists = getAllLists();
  // Date.now() alone can collide when two lists are created within the same
  // millisecond (e.g. back-to-back programmatic creation) — the random suffix
  // makes that practically impossible, same pattern used for Past Purchases
  // list/row ids elsewhere in this file.
  const id = "list-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
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
    lists[DEFAULT_LIST_ID] = { name: "Sample List", useBaseData: true, includedCustomTickers: [], removedTickers: getDefaultSampleListRemovedTickers() };
    saveAllLists(lists);
    setActiveListId(DEFAULT_LIST_ID);
  } else {
    saveAllLists(lists);
    setActiveListId(remainingIds[0]);
  }
}

// v5.64: "Current Holding" is a fixed-id Portfolio list whose ticker membership is
// managed automatically, not by hand like an ordinary list -- it always mirrors
// exactly which tickers still have at least one unsold unit, verified straight
// from the FIFO Lot Matching engine (computePastPurchasesFifoLotBreakdown, the
// same one behind the Past Purchases table), combined across every Past
// Purchases list (a holding is a holding regardless of which ledger it was
// logged on). It's a real Portfolio list otherwise -- freely viewable, its
// tickers' other columns (Current Price, targets, etc.) editable, live-data-
// fetchable -- only its ticker SET is computer-managed. It's shown by default
// every time the user logs in (see openDashboard).
const CURRENT_HOLDINGS_LIST_ID = "list-current-holdings";
const CURRENT_HOLDINGS_LIST_NAME = "Current Holding";

function computeCurrentlyHeldTickersFromFifo(){
  const params = getPastPurchasesParams();
  const held = new Set();
  const ppLists = getAllPastPurchasesLists();
  Object.values(ppLists).forEach(list => {
    const breakdown = computePastPurchasesFifoLotBreakdown(list.rows || [], params);
    Object.keys(breakdown).forEach(ticker => {
      const stillHeld = breakdown[ticker].unmatched.some(u => (u.qty || 0) > PP_EPS);
      if(stillHeld) held.add(ticker);
    });
  });
  return Array.from(held).sort();
}

// Recomputes the Current Holding list's ticker membership and writes it if (and
// only if) it actually changed, to avoid needless localStorage/cloud-sync churn
// on every single Past Purchases render. Re-renders the Portfolio table too, but
// only when Current Holding happens to be the list currently on screen -- editing
// Past Purchases shouldn't otherwise disturb whatever Portfolio list is showing.
function syncCurrentHoldingsList(){
  const lists = getAllLists();
  const tickers = computeCurrentlyHeldTickersFromFifo();
  const existing = lists[CURRENT_HOLDINGS_LIST_ID];
  const unchanged = existing && Array.isArray(existing.includedCustomTickers)
    && existing.includedCustomTickers.length === tickers.length
    && existing.includedCustomTickers.every((t, i) => t === tickers[i]);
  if(unchanged) return;
  if(!existing){
    lists[CURRENT_HOLDINGS_LIST_ID] = { name: CURRENT_HOLDINGS_LIST_NAME, useBaseData: false, includedCustomTickers: tickers, removedTickers: [] };
  } else {
    existing.includedCustomTickers = tickers;
  }
  saveAllLists(lists);
  if(getActiveListId() === CURRENT_HOLDINGS_LIST_ID && typeof runMatrixOptimization === "function"){
    renderListSelector();
    runMatrixOptimization();
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
          revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, cashAndEquivalents: 0, operatingExpenses: 0, beta: 1.0 };
    return { ...shell, _overrides: overrides[ticker] || {} };
  });
}

// Resolves a ticker's BUILTIN_COLUMNS values (Current Price, ROA, P/E, etc.)
// using the exact same precedence the main table itself renders with — manual
// override > live fetch (Finnhub, or Alpha Vantage filling in whatever Finnhub
// didn't have — see getMergedLiveData) > static default — regardless of which
// list(s) the ticker happens to belong to. This is what lets Past Purchases pull a
// currently-accurate "Current Price" (etc.) rather than a stale one, including
// right after a live "Fetch live data" run. Returns null for a ticker that has
// never appeared on the main table at all (no base data and no overrides), so
// callers don't fabricate values for an asset that only exists in Past Purchases.
function getResolvedBuiltinAssetValues(ticker){
  const baseAsset = marketData.find(a => a.ticker === ticker);
  const ov = getGlobalOverrides()[ticker] || {};
  if(!baseAsset && Object.keys(ov).length === 0) return null;
  const shell = baseAsset || { name: ticker, roa: 0, pe: 0, currentPrice: 1, targetPrice: 0, stability: "Med",
    revenueGrowth: 0, netMargin: 0, pegRatio: 0, debtToEquity: 0, freeCashFlow: 0, cashAndEquivalents: 0, operatingExpenses: 0, beta: 1.0 };
  const live = getMergedLiveData(ticker);
  const freeCashFlow = ov.freeCashFlow !== undefined ? ov.freeCashFlow : shell.freeCashFlow;
  const cashAndEquivalents = ov.cashAndEquivalents !== undefined ? ov.cashAndEquivalents : shell.cashAndEquivalents;
  const operatingExpenses = ov.operatingExpenses !== undefined ? ov.operatingExpenses : shell.operatingExpenses;
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
    freeCashFlow,
    cashAndEquivalents,
    operatingExpenses,
    cashRunway: computeCashRunway(cashAndEquivalents, operatingExpenses),
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
    cashAndEquivalents: ov.cashAndEquivalents !== undefined ? ov.cashAndEquivalents : current.cashAndEquivalents,
    operatingExpenses: ov.operatingExpenses !== undefined ? ov.operatingExpenses : current.operatingExpenses,
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
  // Both sources are cleared — Finnhub's own map and Alpha Vantage's separate one.
  delete liveDataMap[oldTicker];
  delete alphaVantageLiveDataMap[oldTicker];
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
// 1. Sale-tracking fields: "Date Sale" / "Selling Price" (plain manual fields),
//    "Realized Gain" (computed: Units Purchased × (Selling Price − Average
//    Purchase Price), only once Selling Price is actually entered), and
//    "Unrealized Gain" (computed: Units Purchased × (Current Price − Average
//    Purchase Price), only WHILE the position is still unsold) — all looked
//    up by label among the table's OWN columns, mirroring how the main
//    table's "Actual Upside %" preset looks up "Average Purchase Price ($)"
//    among ITS own custom params. When either is added on the main table,
//    the main table's own scoring/render code resolves it the same way,
//    independently, among ITS custom params).
//
// 2. Fundamentals fields that mirror the main table's BUILTIN_COLUMNS
//    (ROA, P/E, Current Price, Consensus Target Price, Rev Growth, Net Margin, PEG,
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
  { label: "Units Sold", type: "number", defaultValue: 0 },
  { label: "Realized Gain", type: "number", defaultValue: 0, computed: true, formula: "salesProfitPP" },
  { label: "Unrealized Gain", type: "number", defaultValue: 0, computed: true, formula: "unrealizedGainPP" },
  { label: "Current Market Value", type: "number", defaultValue: 0, computed: true, formula: "currentMarketValuePP" },
  { label: "Missed Gain %", type: "number", defaultValue: 0, computed: true, formula: "missedGainPct" },
  { label: "Book Value", type: "number", defaultValue: 0, computed: true, formula: "bookValuePP" },
  { label: "ROA (%)", type: "number", defaultValue: 0 },
  { label: "P/E Multiple", type: "number", defaultValue: 0 },
  { label: "Current Price", type: "number", defaultValue: 0 },
  { label: "Consensus Target Price", type: "number", defaultValue: 0 },
  { label: "Rev Growth (YoY%)", type: "number", defaultValue: 0 },
  { label: "Net Margin (%)", type: "number", defaultValue: 0 },
  { label: "PEG Ratio", type: "number", defaultValue: 0 },
  { label: "D/E Ratio", type: "number", defaultValue: 0 },
  { label: "FCF ($M)", type: "number", defaultValue: 0 },
  { label: "Cash & Equivalents ($M)", type: "number", defaultValue: 0 },
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
    // v5.69: "Sales Strategy" draft rows live alongside a list's real purchase/
    // sale rows (same list, own array) — defaults to [] for every pre-existing
    // list/account, same self-healing convention as `rows` above.
    if(!Array.isArray(l.salesStrategy)){ l.salesStrategy = []; changed = true; }
    // v5.70: tracks which held tickers have already been auto-seeded into Sales
    // Strategy, so the table starts populated on first use but a row the user
    // deliberately removes is never silently re-added on the next render.
    if(!Array.isArray(l.salesStrategySeededTickers)){ l.salesStrategySeededTickers = []; changed = true; }
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
    lists[id] = { name: "List 1", rows: [], salesStrategy: [], salesStrategySeededTickers: [] };
    saveAllPastPurchasesLists(lists);
  }
  return lists[id];
}

function updateActivePastPurchasesList(mutatorFn){
  const lists = getAllPastPurchasesLists();
  const id = getActivePastPurchasesListId();
  if(!lists[id]) lists[id] = { name: "List 1", rows: [], salesStrategy: [], salesStrategySeededTickers: [] };
  mutatorFn(lists[id]);
  saveAllPastPurchasesLists(lists);
}

function createPastPurchasesList(name){
  const lists = getAllPastPurchasesLists();
  // See the matching comment in createList() above — the random suffix avoids an
  // id collision when two lists are created within the same millisecond, which
  // the new PP-to-PP "Import list" feature makes slightly more likely to matter
  // (creating a source and a target list back-to-back).
  const id = "pp-list-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  lists[id] = { name: name || "New List", rows: [], salesStrategy: [], salesStrategySeededTickers: [] };
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
    lists[DEFAULT_PP_LIST_ID] = { name: "List 1", rows: [], salesStrategy: [], salesStrategySeededTickers: [] };
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

// --- Sales Strategy (v5.69): draft, not-yet-real planned sales for tickers
// already on this Past Purchases list. Lives alongside `rows` on the SAME
// active list (own array, same object), so switching Past Purchases list also
// switches which draft sale plan is shown, and it rides along for free on the
// existing pastPurchasesLists cloud sync (no new SYNC_KEYS entry needed). A
// draft row touches nothing in the real purchase/sale data until its "Confirm
// Sale" button is used (see realizeSalesStrategyRow below) — until then it's
// pure what-if planning, re-pulling Current Price/Total Purchased/Total Sold/
// Units Left/Average Purchase Price of Units Left fresh on every render.
function getSalesStrategyRows(){
  return getActivePastPurchasesList().salesStrategy || [];
}
function saveSalesStrategyRows(rows){
  updateActivePastPurchasesList(list => { list.salesStrategy = rows; });
}
function addSalesStrategyRow(ticker){
  const t = String(ticker || "").trim().toUpperCase();
  if(!t) return null;
  const rows = getSalesStrategyRows();
  const id = "ss_row_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  rows.push({ id, ticker: t, unitsToSell: 0, sellingPrice: 0, dateAdded: Date.now(), saleRealizedDate: null, realizedSaleRowId: null });
  saveSalesStrategyRows(rows);
  return id;
}
// The Ticker cell's "Dup" button: inserts a new draft row directly below this
// one, same ticker — the quick way to plan selling the same holding in several
// batches (different Units to sell / Selling Price per row) without re-picking
// the ticker from the dropdown each time. The pulled-in columns (Current Price,
// Total Units Purchased, Total Units Sold, Units Left, Average Purchase Price
// of Units Left) are always computed fresh on render regardless; only
// Units to sell / Selling Price are copyable "seed" values, and per the spec
// they start blank (0) on the duplicate — it's a new batch, not a repeat of
// the same one.
function duplicateSalesStrategyRow(id){
  const rows = getSalesStrategyRows();
  const idx = rows.findIndex(r => r.id === id);
  if(idx === -1) return null;
  const newId = "ss_row_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  const dup = { id: newId, ticker: rows[idx].ticker, unitsToSell: 0, sellingPrice: 0, dateAdded: Date.now(), saleRealizedDate: null, realizedSaleRowId: null };
  rows.splice(idx + 1, 0, dup);
  saveSalesStrategyRows(rows);
  return newId;
}
function removeSalesStrategyRow(id){
  saveSalesStrategyRows(getSalesStrategyRows().filter(r => r.id !== id));
}
// The ticker cell's ↑/↓ buttons (v5.71): moves this one draft row earlier/later
// in the table — Sales Strategy's equivalent of Past Purchases' per-ticker ↑/↓
// (movePastPurchaseTickerBlock), just per-ROW here since draft rows aren't
// grouped into a fixed block the way FIFO fragments are. Manual reordering only
// makes visible sense back in the table's own custom/insertion order, so — same
// convention as movePastPurchaseTickerBlock — it clears any active column sort
// first rather than leaving a confusing mix of the two.
function moveSalesStrategyRow(id, direction){
  ssColumnSortState = null;
  const rows = getSalesStrategyRows();
  const idx = rows.findIndex(r => r.id === id);
  if(idx === -1) return;
  const newIdx = idx + direction;
  if(newIdx < 0 || newIdx >= rows.length) return;
  [rows[idx], rows[newIdx]] = [rows[newIdx], rows[idx]];
  saveSalesStrategyRows(rows);
}
function setSalesStrategyValue(id, field, value){
  const rows = getSalesStrategyRows();
  const row = rows.find(r => r.id === id);
  if(!row || row.saleRealizedDate) return; // locked once realized
  row[field] = value;
  saveSalesStrategyRows(rows);
}

// FIFO-consumes `consumeQty` off the FRONT (oldest-first) of `lots`
// ([{price, qty}, ...], already oldest-first) and returns the weighted-average
// price of whatever's left, plus that remaining quantity — same oldest-first
// convention as every other FIFO computation in this app (computePastPurchases
// FifoLotBreakdown above). Used to work out, for one Sales Strategy row, what
// the blended cost of its ticker's remaining holding would be AFTER every
// OTHER still-pending draft row for that ticker takes its planned units first.
function fifoConsumeFromFront(lots, consumeQty){
  let left = Math.max(0, consumeQty);
  let remainingQty = 0, remainingCost = 0;
  lots.forEach(lot => {
    let qty = lot.qty;
    if(left > PP_EPS){
      const take = Math.min(qty, left);
      qty -= take;
      left -= take;
    }
    if(qty > PP_EPS){ remainingQty += qty; remainingCost += qty * lot.price; }
  });
  return { remainingQty, avgPrice: remainingQty > PP_EPS ? remainingCost / remainingQty : 0 };
}

// Per-ticker Total Units Purchased / Total Units Sold / still-held FIFO lots
// (oldest-first), derived from the SAME FIFO engine as the Lot Matching table
// (computePastPurchasesFifoLotBreakdown) so Sales Strategy can never disagree
// with it: every match row is sold units, every unmatched row is still-held
// units, and purchased = sold + held.
function getSalesStrategyTickerStats(ticker){
  const t = String(ticker || "").trim().toUpperCase();
  const breakdown = computePastPurchasesFifoLotBreakdown(getPastPurchasesRows(), getPastPurchasesParams());
  const b = breakdown[t] || { matches: [], unmatched: [] };
  const totalSold = b.matches.reduce((sum, m) => sum + m.qty, 0);
  const heldLots = b.unmatched.map(u => ({ price: u.buyPrice, qty: u.qty })); // already oldest-first
  const totalHeld = heldLots.reduce((sum, l) => sum + l.qty, 0);
  return { totalPurchased: totalSold + totalHeld, totalSold, totalHeld, heldLots };
}

// v5.73: a completed (realized) row older than this many days drops off the
// Sales Strategy table (and its exports) entirely — its real, permanent
// record already lives on Past Purchases/Lot Matching, so a planning table
// doesn't need to keep displaying it forever. A draft (not yet realized) row
// is never affected, however old.
const SALES_STRATEGY_COMPLETED_SALE_DISPLAY_DAYS = 28;
function isSalesStrategyRowExpired(row){
  if(!row || !row.saleRealizedDate) return false;
  const realizedMs = new Date(row.saleRealizedDate).getTime();
  if(isNaN(realizedMs)) return false;
  const ageDays = (Date.now() - realizedMs) / 86400000;
  return ageDays > SALES_STRATEGY_COMPLETED_SALE_DISPLAY_DAYS;
}

// Fully resolves every Sales Strategy row into exactly what the table should
// show — Current Price, Total Units Purchase (Current)/Sold, Units Left, and
// Average Purchase Price of Units Left — WITHOUT touching the DOM, so this is
// also what the tests exercise directly. "Units Left" and the average price it
// implies both account for every OTHER still-pending (not yet realized) draft
// row for the same ticker, per the spec's own formula; a row's OWN Units to
// sell is deliberately NOT subtracted (Units Left is the ceiling for what
// THIS row can still plan against, not what remains after it). A completed
// sale older than SALES_STRATEGY_COMPLETED_SALE_DISPLAY_DAYS is filtered out
// of the returned list at the very end (see isSalesStrategyRowExpired) —
// safe to do here since a realized row of any age already never contributes
// to any OTHER row's otherPendingUnits/overCommitted math below.
function buildSalesStrategyRowsResolved(){
  const rows = getSalesStrategyRows();
  const statsByTicker = {};
  rows.forEach(r => { if(!statsByTicker[r.ticker]) statsByTicker[r.ticker] = getSalesStrategyTickerStats(r.ticker); });
  const resolved = rows.map(row => {
    const stats = statsByTicker[row.ticker] || { totalPurchased: 0, totalSold: 0, totalHeld: 0, heldLots: [] };
    const otherPendingUnits = rows.reduce((sum, r) => {
      if(r.id === row.id || r.ticker !== row.ticker || r.saleRealizedDate) return sum;
      return sum + (Number(r.unitsToSell) || 0);
    }, 0);
    const { remainingQty, avgPrice } = fifoConsumeFromFront(stats.heldLots, otherPendingUnits);
    const builtin = getResolvedBuiltinAssetValues(row.ticker);
    const currentPrice = builtin ? (Number(builtin.currentPrice) || 0) : null;
    return {
      id: row.id,
      ticker: row.ticker,
      unitsToSell: Number(row.unitsToSell) || 0,
      sellingPrice: Number(row.sellingPrice) || 0,
      currentPrice,
      // v5.73: this column now tracks the CURRENT real holding (totalHeld),
      // not the lifetime-ever-purchased count (stats.totalPurchased) — per
      // the spec's own example, confirming a sale updates this down to
      // whatever's still actually held. Relabeled "Total Units Purchase
      // (Current)" below; the field name stays totalPurchased to avoid
      // rippling into every sort/export/test key that already reads it.
      totalPurchased: stats.totalHeld,
      totalSold: stats.totalSold,
      unitsLeft: remainingQty, // = stats.totalHeld - otherPendingUnits, floored at 0 by fifoConsumeFromFront
      avgPurchasePriceOfUnitsLeft: avgPrice,
      overCommitted: otherPendingUnits > stats.totalHeld + PP_EPS,
      saleRealizedDate: row.saleRealizedDate,
      realizedSaleRowId: row.realizedSaleRowId,
    };
  });

  // v5.71: an active column-header sort (ssColumnSortState, set by clicking one
  // of the <th> sort buttons) reorders the already-resolved rows by whichever
  // field that column shows — same 3-click asc/desc/clear convention as Past
  // Purchases' own column sort. No sort state (the default) keeps insertion/
  // Dup order exactly as before, so existing callers (and every pre-v5.71 test)
  // see no change.
  if(ssColumnSortState){
    const { colId, direction } = ssColumnSortState;
    resolved.sort((a, b) => {
      const va = a[colId], vb = b[colId];
      let cmp;
      if(typeof va === "string" || typeof vb === "string") cmp = String(va || "").localeCompare(String(vb || ""));
      else cmp = (Number(va) || 0) - (Number(vb) || 0);
      return direction === "asc" ? cmp : -cmp;
    });
  }

  // v5.73: drop completed sales older than the display window — see
  // isSalesStrategyRowExpired's own comment above for why this is safe.
  return resolved.filter(r => !isSalesStrategyRowExpired(r));
}

// The ticker cell's new "Save" button (v5.72): commits whatever's currently
// typed into THIS row's Units to Sell / Selling Price (even if the input
// hasn't been blurred yet, so the "change" event that normally writes it
// hasn't fired) and, if any of this ticker's held units are still left over
// once every non-realized row for it (including this one) is added up, adds a
// fresh blank draft row directly below — same insert duplicateSalesStrategyRow
// already does — pre-positioned to plan that remainder. This is how "Units
// Left" (10 - this row's 5 = 5) becomes visible as its own row's ceiling
// without the user having to remember to click "Dup" or "+ Add Row" — the
// point being nothing held ever gets silently left unaccounted-for. Skips
// adding a new row when: nothing's left over (this row's units already cover
// everything held), or a ready-to-use blank continuation row for this same
// ticker is already sitting directly below (so repeated Save clicks, or
// Save after an earlier Dup, don't pile up redundant empty rows). Returns the
// new row's id, or null if none was added.
function saveSalesStrategyRowAndSplit(id, unitsToSell, sellingPrice){
  setSalesStrategyValue(id, "unitsToSell", Number(unitsToSell) || 0);
  setSalesStrategyValue(id, "sellingPrice", Number(sellingPrice) || 0);

  const rows = getSalesStrategyRows();
  const idx = rows.findIndex(r => r.id === id);
  if(idx === -1) return null;
  const row = rows[idx];
  if(row.saleRealizedDate) return null; // locked rows have no Save button anyway

  const stats = getSalesStrategyTickerStats(row.ticker);
  const totalPlanned = rows.reduce((sum, r) => {
    if(r.ticker !== row.ticker || r.saleRealizedDate) return sum;
    return sum + (Number(r.unitsToSell) || 0);
  }, 0); // every non-realized row for this ticker, INCLUDING this one's just-saved amount
  const remaining = stats.totalHeld - totalPlanned;
  if(remaining <= PP_EPS) return null; // nothing left over -- no follow-up row needed

  const next = rows[idx + 1];
  const nextIsReadyBlankContinuation = next && next.ticker === row.ticker && !next.saleRealizedDate
    && (Number(next.unitsToSell) || 0) === 0 && (Number(next.sellingPrice) || 0) === 0;
  if(nextIsReadyBlankContinuation) return null;

  return duplicateSalesStrategyRow(id);
}

// The "Confirm Sale" button's action: turns a draft row into a REAL sale on the
// active Past Purchases list — adds a new sale row for the ticker (same helper
// the Lot Matching table's own per-ticker "Sell" button uses, so it also seeds
// a "Units Sold" column if this list doesn't have one yet), fills it with this
// row's Units to sell / Selling Price / the confirmed date, then locks the
// draft row (green, read-only) and points it at the real row it created.
// Returns false (no-op) if there's nothing sensible to realize (no units) or
// the row is already realized.
function realizeSalesStrategyRow(id, dateStr){
  const rows = getSalesStrategyRows();
  const row = rows.find(r => r.id === id);
  if(!row || row.saleRealizedDate) return false;
  const units = Number(row.unitsToSell) || 0;
  if(units <= 0) return false;
  const price = Number(row.sellingPrice) || 0;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || "") ? dateStr : new Date().toISOString().slice(0, 10);

  const newRowId = addPastPurchaseSaleRowForTicker(row.ticker);
  if(!newRowId) return false;
  const params = getPastPurchasesParams(); // re-fetch: addPastPurchaseSaleRowForTicker may have just added "Units Sold"
  const soldP = ppFindParamByLabel(params, "units sold");
  const sellP = ppFindParamByLabel(params, "selling price");
  const dateSaleP = params.find(p => !p.computed && String(p.label).trim().toLowerCase() === "date sale");
  if(soldP) setPastPurchaseValue(newRowId, soldP.id, units);
  if(sellP) setPastPurchaseValue(newRowId, sellP.id, price);
  if(dateSaleP) setPastPurchaseValue(newRowId, dateSaleP.id, date);

  row.saleRealizedDate = date;
  row.realizedSaleRowId = newRowId;
  saveSalesStrategyRows(rows);
  return true;
}

function getSalesStrategySeededTickers(){
  return getActivePastPurchasesList().salesStrategySeededTickers || [];
}
function saveSalesStrategySeededTickers(tickers){
  updateActivePastPurchasesList(list => { list.salesStrategySeededTickers = tickers; });
}

// v5.70: makes sure the Sales Strategy table is never left empty to start --
// auto-adds one draft row for every ticker currently held on this Past
// Purchases list (at least one still-unsold/unmatched FIFO unit) that has never
// had a Sales Strategy row before. Tracks "already seeded" tickers, rather than
// just looking at which tickers currently have a row, so that:
//  - removing an auto-seeded row never brings it back on the next render/reload
//    (once seeded, a ticker stays considered seeded whether or not a row for it
//    still exists);
//  - a pre-existing (e.g. v5.69) install's manual rows are never duplicated --
//    every ticker that already has ANY row, seeded by this or added by hand, is
//    folded into the seeded set before any new rows get added;
//  - a ticker bought for the first time after this list already has draft rows
//    still gets auto-seeded on the very next Past Purchases re-render, since it
//    was never in the seeded set before.
// Only currently-held tickers are seeded -- planning a sale for a ticker with
// zero units left wouldn't make sense. Returns true iff it added anything.
function syncSalesStrategyFromHoldings(){
  const breakdown = computePastPurchasesFifoLotBreakdown(getPastPurchasesRows(), getPastPurchasesParams());
  const heldTickers = Object.keys(breakdown).filter(t => breakdown[t].unmatched.some(u => (u.qty || 0) > PP_EPS));

  const existingRows = getSalesStrategyRows();
  const seeded = new Set(getSalesStrategySeededTickers());
  const seededSizeBefore = seeded.size;
  // Fold in every ticker that already has a row (manually added or previously
  // seeded) so it's never mistaken for "new" and never duplicated.
  existingRows.forEach(r => seeded.add(r.ticker));

  const toSeed = heldTickers.filter(t => !seeded.has(t));
  toSeed.forEach(t => { addSalesStrategyRow(t); seeded.add(t); });

  if(seeded.size !== seededSizeBefore) saveSalesStrategySeededTickers(Array.from(seeded));
  return toSeed.length > 0;
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

// One-time, self-healing rename: a user could freely type "Buy Price" as a custom
// parameter's name (it was never a preset/glossary entry — just whatever label
// someone typed into "Add Parameter"). Renaming it here, by label, wherever a
// param with that exact name is stored, keeps it linked to the same param id
// (and every value already entered under it) while updating just the display
// text to "To Buy Price". Runs on every load — harmless once already renamed,
// since "buy price" no longer matches anything afterward — and covers BOTH the
// Portfolio Lists table's custom params and the Past Purchases table's params
// (they're stored separately; a user could have added it to either).
// Returns true if it actually renamed anything, so callers (see openDashboard,
// below) know whether the fix needs pushing back up to the cloud.
function renameBuyPriceParamsIfNeeded(){
  const isBuyPrice = label => String(label).trim().toLowerCase() === "buy price";
  let anyChanged = false;
  try{
    const mainParams = getCustomParams();
    let changed = false;
    mainParams.forEach(p => { if(isBuyPrice(p.label)){ p.label = "To Buy Price"; changed = true; } });
    if(changed){ saveCustomParams(mainParams); anyChanged = true; }
  }catch(e){ /* localStorage unavailable */ }
  try{
    const ppParams = getPastPurchasesParams();
    let changed = false;
    ppParams.forEach(p => { if(isBuyPrice(p.label)){ p.label = "To Buy Price"; changed = true; } });
    if(changed){ savePastPurchasesParams(ppParams); anyChanged = true; }
  }catch(e){ /* localStorage unavailable */ }
  return anyChanged;
}
renameBuyPriceParamsIfNeeded();

// Shared by both tables: is `currentPrice` at or below the "To Buy Price" target
// (a user-added custom column, on either table), signaling "this hit my buy
// target"? `params` is that table's own param/column list, `valuesById` the
// row's (or ticker's) resolved custom values keyed by param id. Matches both the
// current "To Buy Price" label and the pre-rename "Buy Price" spelling, purely
// as a defensive fallback — renameBuyPriceParamsIfNeeded() above normally means
// only the new spelling is ever actually stored. A zero/blank target isn't a
// real buy-price entry yet, so it never triggers the highlight.
function isAtOrBelowBuyPriceTarget(currentPrice, params, valuesById){
  const norm = s => String(s).trim().toLowerCase();
  const buyPriceParam = (params || []).find(p => !p.computed && (norm(p.label) === "to buy price" || norm(p.label) === "buy price"));
  if(!buyPriceParam) return false;
  const buyPriceVal = Number((valuesById || {})[buyPriceParam.id]) || 0;
  if(buyPriceVal === 0) return false;
  return Number(currentPrice) <= buyPriceVal;
}

// One-time-per-account migration for data.js's marketData trim (30-ish legacy
// tickers down to just the 9-ticker Sample List). Before that trim, any of these
// tickers could be a list's *base* ticker (useBaseData: true, not in that list's
// own removedTickers) with no entry in includedCustomTickers at all — now that
// they're gone from marketData, getWorkingData() would silently drop them from
// view entirely unless they're promoted to a "custom" ticker here first. A list
// that already had one of these tickers in removedTickers (the user's own
// deliberate exclusion) is left alone — it's already hidden either way. Any of
// the user's own overrides for that ticker in globalOverrides are untouched and
// keep applying on top of the "custom ticker" shell in getWorkingData.
//
// Gated by the "legacyMarketTickersMigrated" flag (a SYNC_KEY) so it runs
// exactly once per account, against that account's REAL pre-trim list data —
// never against a genuinely fresh account's brand-new list. That's what
// initializeNewUserDefaults() setting this flag preemptively (see below) is
// for: a brand-new list is created directly from the already-trimmed
// marketData, so there is nothing to migrate for it, and letting this function
// run against a fresh list's empty removedTickers would incorrectly re-inject
// every legacy ticker into it. Being a SYNC_KEY means applyRemoteSnapshot()
// correctly clears a locally-set flag once a real (older, flag-less) cloud
// snapshot is pulled in for an existing account, so the migration still runs
// for them exactly once, using their real data, the first time this ships.
const LEGACY_REMOVED_MARKET_TICKERS = ["WDC", "MA", "MELI", "ANET", "ASML", "LLY", "ELF", "APH", "UBER", "WMT", "PG", "XOM", "JPM", "DELL", "PANW", "MSCI", "TSLA", "AMD", "3968", "IONQ", "INFQ"];
function migrateLegacyMarketTickersToCustomIfNeeded(){
  try{
    if(localStorage.getItem("legacyMarketTickersMigrated") === "1") return false;
    const lists = getAllLists();
    let anyPromoted = false;
    Object.keys(lists).forEach(id => {
      const list = lists[id];
      if(!list.useBaseData) return;
      const removed = list.removedTickers || [];
      const included = list.includedCustomTickers || [];
      LEGACY_REMOVED_MARKET_TICKERS.forEach(ticker => {
        if(!removed.includes(ticker) && !included.includes(ticker)){
          included.push(ticker);
          anyPromoted = true;
        }
      });
      list.includedCustomTickers = included;
    });
    if(anyPromoted) saveAllLists(lists);
    localStorage.setItem("legacyMarketTickersMigrated", "1");
    return anyPromoted;
  }catch(e){ return false; }
}

// One-time-per-account migration: moves "Forward P/E" to sit immediately after
// "P/E Multiple" in an existing account's saved column order. NEW_USER_DEFAULT_COLUMN_ORDER
// above already places it there for a brand-new signup, but that constant is only
// ever read once, at account creation — an existing account's own columnOrder is a
// separate, already-saved array that changing the default never touches on its own
// (the same class of gap fixed for Past Purchases' starting columns — see
// seedPastPurchasesDefaultParamsIfNeeded()'s own comment). Gated by the
// "forwardPeReordered" flag (a SYNC_KEY) so it runs exactly once per account and
// never re-fights a deliberate reorder the user makes afterward.
function reorderForwardPEIfNeeded(){
  try{
    if(localStorage.getItem("forwardPeReordered") === "1") return false;
    localStorage.setItem("forwardPeReordered", "1");
    const raw = localStorage.getItem("columnOrder");
    if(!raw) return false; // no saved order yet — the default array above already has it right
    const order = JSON.parse(raw);
    const peIdx = order.indexOf("pe");
    const fpeIdx = order.indexOf("custom_forward_pe");
    if(peIdx === -1 || fpeIdx === -1) return false; // one or both not present — nothing to reorder
    if(fpeIdx === peIdx + 1) return false; // already exactly where it should be
    order.splice(fpeIdx, 1);
    const newPeIdx = order.indexOf("pe"); // re-find pe's index — the splice above may have shifted it
    order.splice(newPeIdx + 1, 0, "custom_forward_pe");
    saveColumnOrder(order);
    return true;
  }catch(e){ return false; }
}

// One-time-per-account migration: relabels the "Sale Profit" preset/column to
// "Realized Gain" everywhere it's already been added (Past Purchases' own
// columns AND any main-table custom param using the same preset — same two
// places renameBuyPriceParamsIfNeeded() above touches, for the same reason:
// only the LABEL changes, never the id or the "salesProfitPP" formula, so
// every existing row's stored values, sort/footer lookups, and exports keep
// working unchanged once they're updated to look for the new label). Gated
// by the "saleProfitRenamedToRealizedGain" flag (a SYNC_KEY) so it runs
// exactly once per account and never re-fights a user who deliberately
// relabels their own column back to something else afterward.
function renameSaleProfitToRealizedGainIfNeeded(){
  const isSaleProfit = label => String(label).trim().toLowerCase() === "sale profit";
  try{
    if(localStorage.getItem("saleProfitRenamedToRealizedGain") === "1") return false;
    localStorage.setItem("saleProfitRenamedToRealizedGain", "1");
    let anyChanged = false;
    try{
      const mainParams = getCustomParams();
      let changed = false;
      mainParams.forEach(p => { if(p.computed && p.formula === "salesProfitPP" && isSaleProfit(p.label)){ p.label = "Realized Gain"; changed = true; } });
      if(changed){ saveCustomParams(mainParams); anyChanged = true; }
    }catch(e){ /* localStorage unavailable */ }
    try{
      const ppParams = getPastPurchasesParams();
      let changed = false;
      ppParams.forEach(p => { if(p.computed && p.formula === "salesProfitPP" && isSaleProfit(p.label)){ p.label = "Realized Gain"; changed = true; } });
      if(changed){ savePastPurchasesParams(ppParams); anyChanged = true; }
    }catch(e){ /* localStorage unavailable */ }
    return anyChanged;
  }catch(e){ return false; }
}

// One-time-per-account migration: inserts a new computed "Unrealized Gain"
// column — (Current Price − Average Purchase Price) × Units Purchased, for a
// position that hasn't been sold yet — into every existing Past Purchases
// column list that already has a "Realized Gain"/"Sale Profit" column
// (formula "salesProfitPP"), positioned immediately after it, mirroring
// where NEW_USER_DEFAULT_PAST_PURCHASES_PARAMS now places it for a brand-new
// account. Only touches Past Purchases' own param list — unlike the rename
// above, this doesn't retroactively add a new column to the main table's
// custom params, since the main table has no equivalent auto-seeded starting
// layout to keep in sync with. Gated by the "unrealizedGainColumnAdded" flag
// (a SYNC_KEY) so it runs exactly once per account; also defensively checks
// for an existing "unrealizedGainPP" column first, so it's a no-op if one is
// somehow already there (e.g. a brand-new account whose fresh defaults
// already include it).
function insertUnrealizedGainColumnIfNeeded(){
  try{
    if(localStorage.getItem("unrealizedGainColumnAdded") === "1") return false;
    localStorage.setItem("unrealizedGainColumnAdded", "1");
    const raw = localStorage.getItem("pastPurchasesParams");
    if(raw === null) return false; // never seeded yet — seedPastPurchasesDefaultParamsIfNeeded() will include it fresh
    const params = JSON.parse(raw);
    if(params.some(p => p.computed && p.formula === "unrealizedGainPP")) return false; // already present
    const saleProfitIdx = params.findIndex(p => p.computed && p.formula === "salesProfitPP");
    const newParam = { id: "pp_unrealized_gain_" + Date.now().toString(36), label: "Unrealized Gain", type: "number", defaultValue: 0, computed: true, formula: "unrealizedGainPP" };
    if(saleProfitIdx === -1){
      params.push(newParam); // no Realized Gain column on this list — just append it
    } else {
      params.splice(saleProfitIdx + 1, 0, newParam);
    }
    savePastPurchasesParams(params);
    return true;
  }catch(e){ return false; }
}

// One-time-per-account migration: inserts a new computed "Current Market Value"
// column — units still held × live Current Price, i.e. what a still-held FIFO lot
// is worth right now (Book Value + Unrealized Gain = Current Market Value) — into
// every existing Past Purchases column list, positioned right before "Book Value"
// (falling back to right after "Unrealized Gain", then to appending) to match
// where getNewUserDefaultPastPurchasesParams() now places it for a brand-new
// account. Gated by the "currentMarketValueColumnAdded" flag (a SYNC_KEY); no-op
// if a "currentMarketValuePP" column is somehow already there.
function insertCurrentMarketValueColumnIfNeeded(){
  try{
    if(localStorage.getItem("currentMarketValueColumnAdded") === "1") return false;
    localStorage.setItem("currentMarketValueColumnAdded", "1");
    const raw = localStorage.getItem("pastPurchasesParams");
    if(raw === null) return false; // never seeded yet — seedPastPurchasesDefaultParamsIfNeeded() will include it fresh
    const params = JSON.parse(raw);
    if(params.some(p => p.computed && p.formula === "currentMarketValuePP")) return false; // already present
    const newParam = { id: "pp_current_market_value_" + Date.now().toString(36), label: "Current Market Value", type: "number", defaultValue: 0, computed: true, formula: "currentMarketValuePP" };
    const bookValueIdx = params.findIndex(p => p.computed && p.formula === "bookValuePP");
    const unrealizedIdx = params.findIndex(p => p.computed && p.formula === "unrealizedGainPP");
    if(bookValueIdx !== -1){
      params.splice(bookValueIdx, 0, newParam); // right before Book Value
    } else if(unrealizedIdx !== -1){
      params.splice(unrealizedIdx + 1, 0, newParam); // right after Unrealized Gain
    } else {
      params.push(newParam);
    }
    savePastPurchasesParams(params);
    return true;
  }catch(e){ return false; }
}

// One-time-per-account migration: inserts a plain manual "Units Sold" column
// (number, default 0) into existing Past Purchases column lists, positioned right
// after the (first) "Date Sale" column — matching the new-user default layout and
// the user's own data-entry spreadsheet (… Selling Price, Date Sale, Units Sold,
// Current Price). Falls back to right after "Selling Price", then to appending.
// Purely a record-keeping field for now: it does NOT feed any computed formula
// (Realized Gain still uses Units Purchased). Gated by the "unitsSoldColumnAdded"
// flag (a SYNC_KEY); no-op if a "Units Sold" column already exists by label.
function insertUnitsSoldColumnIfNeeded(){
  try{
    if(localStorage.getItem("unitsSoldColumnAdded") === "1") return false;
    localStorage.setItem("unitsSoldColumnAdded", "1");
    const raw = localStorage.getItem("pastPurchasesParams");
    if(raw === null) return false; // never seeded yet — seedPastPurchasesDefaultParamsIfNeeded() will include it fresh
    const params = JSON.parse(raw);
    const norm = s => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
    if(params.some(p => norm(p.label) === "units sold")) return false; // already present
    const newParam = { id: "pp_units_sold_" + Date.now().toString(36), label: "Units Sold", type: "number", defaultValue: 0 };
    let anchorIdx = params.findIndex(p => !p.computed && norm(p.label) === "date sale");
    if(anchorIdx === -1) anchorIdx = params.findIndex(p => !p.computed && norm(p.label) === "selling price");
    if(anchorIdx === -1) params.push(newParam);
    else params.splice(anchorIdx + 1, 0, newParam);
    savePastPurchasesParams(params);
    return true;
  }catch(e){ return false; }
}

function addPastPurchaseRow(asset){
  const rows = getPastPurchasesRows();
  const id = "pp_row_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  rows.push({ id, asset, values: {}, dateAdded: Date.now() });
  savePastPurchasesRows(rows);
  return id;
}

// Inserts a new, empty SALE row for the same ticker directly below the given row
// (the per-row "Sell" button). Deliberately does NOT pull any Portfolio Lists data
// in — a sale row carries only Selling Price / Date Sale / Units Sold. Makes sure a
// "Units Sold" column exists first, since a separate sale row needs it.
function addPastPurchaseSaleRowAfter(rowId){
  const params = getPastPurchasesParams();
  if(!ppFindParamByLabel(params, "units sold")){
    const dateSaleIdx = params.findIndex(p => !p.computed && String(p.label).trim().toLowerCase() === "date sale");
    addPastPurchaseParam({ label: "Units Sold", type: "number", defaultValue: 0 });
    if(dateSaleIdx !== -1){ // move it right after Date Sale, matching the default layout
      const updated = getPastPurchasesParams();
      const added = updated.pop();
      updated.splice(dateSaleIdx + 1, 0, added);
      savePastPurchasesParams(updated);
    }
  }
  const rows = getPastPurchasesRows();
  const i = rows.findIndex(r => r.id === rowId);
  if(i === -1) return null;
  const id = "pp_row_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  rows.splice(i + 1, 0, { id, asset: rows[i].asset, values: {}, dateAdded: Date.now() });
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

// v5.64: the order tickers currently appear in the raw row array, one entry per
// distinct ticker (first occurrence) -- what the merged Lot Matching table's
// ticker-block Up/Down buttons actually reorder, and what disables them at
// either end.
function getPastPurchaseTickerOrder(){
  const rows = getPastPurchasesRows();
  const seen = new Set();
  const order = [];
  rows.forEach(r => {
    const t = String(r.asset || '').trim().toUpperCase();
    if(t && !seen.has(t)){ seen.add(t); order.push(t); }
  });
  return order;
}

// Moves an entire ticker's rows as one block, swapping it with the adjacent
// ticker's block. Rows for a ticker aren't necessarily already contiguous (a
// user could, in principle, have interleaved them via the per-row "Reorder Rows"
// panel), so this also consolidates every row of both swapped tickers into two
// contiguous blocks as a side effect -- a ticker's rows are always kept together
// in the merged, FIFO-grouped table anyway, so this never loses anything.
function movePastPurchaseTickerBlock(ticker, direction){
  const rows = getPastPurchasesRows();
  const t = String(ticker || '').trim().toUpperCase();
  const order = getPastPurchaseTickerOrder();
  const idx = order.indexOf(t);
  if(idx === -1) return;
  const newIdx = idx + direction;
  if(newIdx < 0 || newIdx >= order.length) return;
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  const grouped = [];
  order.forEach(tk => { rows.forEach(r => { if(String(r.asset || '').trim().toUpperCase() === tk) grouped.push(r); }); });
  savePastPurchasesRows(grouped);
  // Moving a block only makes visible sense in custom order — switch to it
  // automatically, same convention as the per-row Up/Down above.
  const sortEl = document.getElementById('ppSortMode');
  if(sortEl) sortEl.value = 'custom';
}

// Renames every row belonging to one ticker at once (the merged table's ticker
// cell edits the whole block together, not one fragment's row in isolation --
// otherwise a split ticker would end up spelled two different ways).
function renamePastPurchaseTickerBlock(oldTicker, newTicker){
  const oldT = String(oldTicker || '').trim().toUpperCase();
  const newT = String(newTicker || '').trim().toUpperCase();
  if(!newT || oldT === newT) return;
  const rows = getPastPurchasesRows();
  let changed = false;
  rows.forEach(r => { if(String(r.asset || '').trim().toUpperCase() === oldT){ r.asset = newT; changed = true; } });
  if(changed) savePastPurchasesRows(rows);
}

// The merged table's per-ticker "Sell" button: same as the old raw table's
// per-row "Sell" button (adds a blank sale row via addPastPurchaseSaleRowAfter,
// which also seeds a "Units Sold" column if needed), anchored to the LAST row
// currently in that ticker's block so it doesn't land in the middle of it.
function addPastPurchaseSaleRowForTicker(ticker){
  const rows = getPastPurchasesRows();
  const t = String(ticker || '').trim().toUpperCase();
  let lastId = null;
  rows.forEach(r => { if(String(r.asset || '').trim().toUpperCase() === t) lastId = r.id; });
  if(!lastId) return null;
  return addPastPurchaseSaleRowAfter(lastId);
}

// Decides where an edit to one merged Lot Matching cell should actually be
// written: which underlying row (a fragment often represents only PART of one),
// and whether the new value should replace that row's stored field outright
// ("direct" — Date Purchased/Average Purchase Price/Selling Price/Date Sale, and
// any other custom column: never split across fragments) or be applied as a
// DELTA on top of it ("delta" — Units Purchased/Units Sold, which a FIFO split
// can legitimately divide across several fragments of the same row; adding the
// difference between the new and old value shown on THIS fragment leaves every
// other fragment of that same row alone). Returns null when the field has
// nothing to write to yet — a sell-side field on a still-held fragment; use the
// ticker cell's "Sell" button to record a sale first.
function fifoFragmentFieldTarget(p, fragmentData, isMatch){
  const label = String(p.label).trim().toLowerCase();
  const isSellSide = label === "selling price" || label === "date sale" || label === "units sold";
  if(isSellSide){
    if(!isMatch) return null;
    return { rowId: fragmentData.sellRowId, mode: label === "units sold" ? "delta" : "direct" };
  }
  return { rowId: fragmentData.buyRowId, mode: label === "units purchased" ? "delta" : "direct" };
}

// Applies a "delta" write for a split-sensitive field (see
// fifoFragmentFieldTarget above): the row's real stored total changes by exactly
// (new − old) as shown on THIS fragment. Mathematically identical to a plain
// overwrite whenever the field isn't actually split across more than one
// fragment (the common case), and never lets a quantity go negative.
function adjustPastPurchaseValueByDelta(rowId, paramId, oldFragmentValue, newFragmentValue){
  const rows = getPastPurchasesRows();
  const row = rows.find(r => r.id === rowId);
  if(!row) return;
  const stored = row.values && row.values[paramId] !== undefined ? (Number(row.values[paramId]) || 0) : 0;
  const delta = (Number(newFragmentValue) || 0) - (Number(oldFragmentValue) || 0);
  setPastPurchaseValue(rowId, paramId, Math.max(0, stored + delta));
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
// v5.59: the whitelisted purchase-record fields (Units Purchased, Average Purchase
// Price, Date Purchased) are now per-LOT data, since one ticker can have several
// purchase rows and separate sale rows. So they are (a) never pulled onto a
// sale-only row (no Units Purchased, but a Selling Price / Units Sold entered), and
// (b) only filled in where that row's own value is still blank/0 — never
// overwriting a lot's own recorded purchase. opts.skipParamIds lets Import Excel
// protect the columns the file itself supplied.
function pullMainTableDataIntoPastPurchases(rowId, assetSymbol, opts){
  const AUTO_CREATE_LABELS = ["units purchased", "average purchase price ($)", "average purchase price", "date purchased"];
  const skipIds = new Set((opts && opts.skipParamIds) || []);
  const mainParams = getCustomParams().filter(p => !p.computed);
  const builtin = getResolvedBuiltinAssetValues(assetSymbol);
  const ov = getGlobalOverrides()[assetSymbol] || {};
  let pulledCount = 0;
  const targetRow = getPastPurchasesRows().find(r => r.id === rowId);
  const targetValues = (targetRow && targetRow.values) || {};
  const isBlankValue = v => v === undefined || v === null || v === "" || v === 0;
  const isSaleOnlyRow = (() => {
    const ppParams = getPastPurchasesParams();
    const n = pp => pp ? (Number(targetValues[pp.id]) || 0) : 0;
    const unitsP = ppFindParamByLabel(ppParams, "units purchased");
    const sellP = ppFindParamByLabel(ppParams, "selling price");
    const soldP = ppFindParamByLabel(ppParams, "units sold");
    return n(unitsP) <= 0 && (n(sellP) !== 0 || n(soldP) > 0);
  })();

  mainParams.forEach(mp => {
    if(ov[mp.id] === undefined) return; // nothing actually entered for this asset on the main table
    const norm = normalizeParamLabel(mp.label);
    const isAutoCreate = AUTO_CREATE_LABELS.includes(mp.label.trim().toLowerCase());
    if(isAutoCreate && isSaleOnlyRow) return; // a sale row has no purchase record of its own
    let ppParam = getPastPurchasesParams().find(p => normalizeParamLabel(p.label) === norm);
    if(!ppParam && !isAutoCreate) return; // not a whitelisted field, and no matching column already added here
    if(ppParam && skipIds.has(ppParam.id)) return;
    if(isAutoCreate && ppParam && !isBlankValue(targetValues[ppParam.id])) return; // never overwrite this lot's own purchase record
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
      if(skipIds.has(ppParam.id)) return;
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

// Copies every row from another Past Purchases list into the ACTIVE Past Purchases
// list, as brand-new rows with fresh ids. Since params are global across every Past
// Purchases list (see getPastPurchasesParams), a copied row's `values` map — keyed
// by param id — still resolves correctly with no translation needed. Like importing
// from a Portfolio List, re-importing the same source list later adds another fresh
// round of rows rather than skipping rows already copied once, since the same asset
// can legitimately appear more than once (a second purchase, say).
function importPastPurchasesListIntoActive(sourceListId){
  const lists = getAllPastPurchasesLists();
  const sourceList = lists[sourceListId];
  if(!sourceList) return { imported: 0, total: 0 };
  const sourceRows = sourceList.rows || [];
  const newRows = sourceRows.map((row, idx) => ({
    id: "pp_row_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7) + "_" + idx,
    asset: row.asset,
    values: { ...(row.values || {}) },
    dateAdded: Date.now(),
  }));
  updateActivePastPurchasesList(list => { list.rows = (list.rows || []).concat(newRows); });
  return { imported: newRows.length, total: sourceRows.length };
}

// Import sources come from two independent stores — Portfolio Lists (getAllLists)
// and other Past Purchases lists (getAllPastPurchasesLists) — so each option value
// is prefixed ("portfolio:<id>" / "pp:<id>") to tell the two apart once selected.
// The currently active Past Purchases list is left out of its own group, since
// importing a list into itself isn't a meaningful action.
function renderPastPurchasesImportSelect(){
  const select = document.getElementById("ppImportListSelect");
  if(!select) return;
  const portfolioLists = getAllLists();
  const portfolioIds = Object.keys(portfolioLists);
  const ppLists = getAllPastPurchasesLists();
  const activePpId = getActivePastPurchasesListId();
  const ppIds = Object.keys(ppLists).filter(id => id !== activePpId);

  select.innerHTML = "";
  if(portfolioIds.length === 0 && ppIds.length === 0){
    select.innerHTML = '<option value="">No lists yet</option>';
    return;
  }

  if(portfolioIds.length){
    const group = document.createElement("optgroup");
    group.label = "Portfolio Lists";
    portfolioIds.forEach(id => {
      const opt = document.createElement("option");
      opt.value = "portfolio:" + id;
      opt.textContent = portfolioLists[id].name;
      group.appendChild(opt);
    });
    select.appendChild(group);
  }

  if(ppIds.length){
    const group = document.createElement("optgroup");
    group.label = "Past Purchases Lists";
    ppIds.forEach(id => {
      const opt = document.createElement("option");
      opt.value = "pp:" + id;
      opt.textContent = ppLists[id].name;
      group.appendChild(opt);
    });
    select.appendChild(group);
  }
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
// column's default) for plain columns, and a live calculation for "Realized Gain"
// looked up by label among THIS table's own columns (Units Purchased, Average
// Purchase Price, Selling Price) — same precedence pattern as the main table's
// own computed presets, just scoped to Past Purchases' own data.
// --- Past Purchases lot matching (v5.59) ---
// Lets one ticker have several PURCHASE rows (Units Purchased + Average Purchase
// Price [+ Date Purchased]) and several separate SALE rows (Units Sold + Selling
// Price + Date Sale, no Units Purchased), with each sale row's Realized Gain
// computed against that ticker's purchase rows on the SAME Past Purchases list:
//   e.g. buy 10 @ $2 (20 Sep); sell 5 @ $3 (21 Sep) -> +$5; sell 5 @ $5 (22 Sep)
//   -> +$15; total Realized Gain $20.
// Row kinds:
//   "buy"      — Units Purchased > 0, no sale data.
//   "buy+sale" — Units Purchased > 0 AND a Selling Price / Units Sold on the same
//                row (the original one-row-per-trade style). Matched against its
//                OWN purchase price only (qty = Units Sold, or all Units Purchased
//                if Units Sold is blank) — so every pre-v5.59 row computes exactly
//                what it did before. Any unsold remainder joins the ticker's pool.
//   "sale"     — no Units Purchased, but a Selling Price / Units Sold: consumes
//                units from the ticker's pool of purchase rows.
//   "none"     — nothing entered yet.
// Pool events are processed in date order (Date Purchased for buys, Date Sale for
// sales; a blank date sorts first; buys before sales on the same day; then row
// order), so a sale is only matched against units bought on/before its date.
// Cost basis is the per-account "ppCostBasisMethod" setting:
//   "average" (default) — running average cost of units held at the time of the
//                sale; sales reduce every held lot proportionally (so the average
//                itself doesn't change on a sale, as brokers show it).
//   "fifo"      — oldest purchase lots are sold first.
// Each purchase row's "heldUnits" (units still unsold after all matching) drives
// Book Value, Unrealized Gain and the Current Holdings filter.
const PP_EPS = 1e-9;
function getPpCostBasisMethod(){
  try{ return localStorage.getItem("ppCostBasisMethod") === "fifo" ? "fifo" : "average"; }
  catch(e){ return "average"; }
}
function setPpCostBasisMethod(method){
  try{ localStorage.setItem("ppCostBasisMethod", method === "fifo" ? "fifo" : "average"); }
  catch(e){ /* localStorage unavailable */ }
}
function ppFindParamByLabel(params, labels){
  const norm = x => String(x || "").trim().toLowerCase().replace(/\s+/g, " ");
  const wanted = Array.isArray(labels) ? labels : [labels];
  return params.find(p => !p.computed && wanted.includes(norm(p.label)));
}
function ppFmtNum(n){
  const v = +Number(n || 0).toFixed(4);
  return String(v);
}
function computePastPurchasesLedger(rows, params, method){
  const unitsP = ppFindParamByLabel(params, "units purchased");
  const avgP = ppFindParamByLabel(params, ["average purchase price ($)", "average purchase price"]);
  const sellP = ppFindParamByLabel(params, "selling price");
  const soldP = ppFindParamByLabel(params, "units sold");
  const datePurchasedP = ppFindParamByLabel(params, "date purchased");
  const dateSalePs = params.filter(p => !p.computed && String(p.label).trim().toLowerCase() === "date sale");
  const valOf = (row, p) => { const v = row.values || {}; return v[p.id] !== undefined ? v[p.id] : p.defaultValue; };
  const numOf = (row, p) => p ? (Number(valOf(row, p)) || 0) : 0;
  const dateOf = (row, p) => { const d = p ? String(valOf(row, p) || "") : ""; return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ""; };
  const methodName = method === "fifo" ? "FIFO" : "average";
  const out = {};
  const eventsByTicker = {};

  rows.forEach((row, idx) => {
    const ticker = String(row.asset || "").trim().toUpperCase();
    const units = numOf(row, unitsP), avg = numOf(row, avgP), sell = numOf(row, sellP), sold = numOf(row, soldP);
    const datePurchased = dateOf(row, datePurchasedP);
    let dateSale = "";
    for(const dsp of dateSalePs){ dateSale = dateOf(row, dsp); if(dateSale) break; }
    const info = { kind: "none", units, avg, sell, unitsSold: 0, realized: 0, realizedReady: false, note: "", heldUnits: 0, costBasis: null, method };
    out[row.id] = info;
    if(!eventsByTicker[ticker]) eventsByTicker[ticker] = [];
    const events = eventsByTicker[ticker];
    const hasSaleData = sell !== 0 || sold > PP_EPS;

    if(units > PP_EPS){
      let residual = units;
      if(hasSaleData){
        info.kind = "buy+sale";
        const qty = sold > PP_EPS ? sold : units;
        info.unitsSold = qty;
        if(qty > units + PP_EPS){
          info.note = `Units Sold (${ppFmtNum(qty)}) is more than this row's own Units Purchased (${ppFmtNum(units)}). Record a sale that spans several purchases as its own sale row (no Units Purchased) instead.`;
        } else {
          residual = units - qty;
          if(!(unitsP && avgP && sellP)) info.note = "Add Units Purchased, Average Purchase Price, and Selling Price columns to compute this.";
          else if(sell === 0) info.note = "Enter a Selling Price to compute this.";
          else {
            info.realized = qty * (sell - avg);
            info.realizedReady = true;
            info.costBasis = avg;
            info.note = `Sold ${ppFmtNum(qty)} unit(s) at $${sell.toFixed(2)} against this row's own purchase price of $${avg.toFixed(2)}.`;
          }
        }
      } else {
        info.kind = "buy";
      }
      if(residual > PP_EPS) events.push({ type: "buy", date: datePurchased, idx, rowId: row.id, units: residual, price: avg });
    } else if(hasSaleData){
      info.kind = "sale";
      info.unitsSold = sold;
      if(!soldP) info.note = "Add a \"Units Sold\" column and enter how many units this sale was, to compute this.";
      else if(sold <= PP_EPS) info.note = "Enter Units Sold for this sale to compute this.";
      else events.push({ type: "sale", date: dateSale, idx, rowId: row.id, qty: sold, sell });
    }
  });

  Object.keys(eventsByTicker).forEach(ticker => {
    const events = eventsByTicker[ticker];
    events.sort((a, b) => {
      if(a.date !== b.date) return a.date < b.date ? -1 : 1; // "" (no date) sorts first
      if(a.type !== b.type) return a.type === "buy" ? -1 : 1;
      return a.idx - b.idx;
    });
    const lots = [];
    const label = ticker || "this asset";
    events.forEach(ev => {
      if(ev.type === "buy"){ lots.push({ rowId: ev.rowId, remaining: ev.units, price: ev.price }); return; }
      const info = out[ev.rowId];
      const held = lots.reduce((sum, l) => sum + l.remaining, 0);
      if(held <= PP_EPS){
        info.note = `No units of ${label} are held on this list before this sale — add a purchase row (Units Purchased + Average Purchase Price, with a Date Purchased on or before this Date Sale).`;
        return;
      }
      if(ev.qty > held + PP_EPS){
        info.note = `Units Sold (${ppFmtNum(ev.qty)}) is more than the ${ppFmtNum(held)} unit(s) of ${label} held on this list at that point — check the units and dates.`;
        return;
      }
      let cost = 0, missingPrice = false;
      if(method === "fifo"){
        let left = ev.qty;
        for(const lot of lots){
          if(left <= PP_EPS) break;
          if(lot.remaining <= PP_EPS) continue;
          const take = Math.min(lot.remaining, left);
          if(lot.price === 0) missingPrice = true;
          cost += take * lot.price;
          lot.remaining -= take;
          left -= take;
        }
      } else {
        const heldCost = lots.reduce((sum, l) => sum + l.remaining * l.price, 0);
        if(lots.some(l => l.remaining > PP_EPS && l.price === 0)) missingPrice = true;
        cost = ev.qty * (heldCost / held);
        const frac = ev.qty / held;
        lots.forEach(l => { l.remaining -= l.remaining * frac; });
      }
      lots.forEach(l => { if(l.remaining < PP_EPS) l.remaining = 0; });
      const basis = cost / ev.qty;
      info.costBasis = basis;
      if(missingPrice){ info.note = "A purchase row this sale is matched against has no Average Purchase Price yet — fill it in to compute this."; return; }
      if(ev.sell === 0){ info.note = "Enter a Selling Price to compute this."; return; }
      info.realized = ev.qty * (ev.sell - basis);
      info.realizedReady = true;
      info.note = `Sold ${ppFmtNum(ev.qty)} unit(s) at $${ev.sell.toFixed(2)} against ${methodName} cost of $${ppFmtNum(basis)} per unit.`;
    });
    lots.forEach(l => { out[l.rowId].heldUnits = l.remaining; });
  });
  return out;
}

// Memoized ledger for the ACTIVE Past Purchases list — resolvePastPurchaseRowValues
// is called per row, per render, and inside sort comparators, so the whole-list
// matching is only recomputed when the stored lists/params/method actually change.
let _ppLedgerCache = { key: null, ledger: null };
function getPastPurchasesLedger(){
  let key = null;
  try{
    key = (localStorage.getItem("pastPurchasesLists") || "") + "\u0001" + (localStorage.getItem("activePastPurchasesListId") || "") + "\u0001" + (localStorage.getItem("pastPurchasesParams") || "") + "\u0001" + getPpCostBasisMethod();
  }catch(e){ key = null; }
  if(key !== null && _ppLedgerCache.key === key) return _ppLedgerCache.ledger;
  const ledger = computePastPurchasesLedger(getPastPurchasesRows(), getPastPurchasesParams(), getPpCostBasisMethod());
  _ppLedgerCache = { key, ledger };
  return ledger;
}
function getPastPurchaseRowLedgerInfo(row){
  const ledger = getPastPurchasesLedger();
  if(ledger[row.id]) return ledger[row.id];
  // Row isn't on the active list (shouldn't normally happen) — evaluate it alone.
  return computePastPurchasesLedger([row], getPastPurchasesParams(), getPpCostBasisMethod())[row.id];
}

// v5.60: read-only "Lot Matching" breakdown — shows exactly which purchase lot(s)
// each sale was matched against, splitting a purchase across several output lines
// whenever it feeds more than one sale, or splitting a sale across several lines
// whenever it draws from more than one purchase. E.g. buy 10 @ $200 (D1), buy 10 @
// $210 (D2), sell 8 @ $215 (D3), sell 5 @ $220 (D4) becomes:
//   D1 buy 8 @ $200 -> D3 sell 8 @ $215   (+$120)
//   D1 buy 2 @ $200 -> D4 sell 2 @ $220   (+$40)
//   D2 buy 3 @ $210 -> D4 sell 3 @ $220   (+$30)
//   D2 buy 7 @ $210 -> still held
// ALWAYS matches oldest-purchase-first (FIFO), independent of the account-wide
// "Cost basis" setting (getPpCostBasisMethod/computePastPurchasesLedger above),
// which only drives the aggregate Realized Gain shown per row on the main Past
// Purchases table — FIFO is the only method that resolves into clean, non-
// overlapping pairs like this; Average cost blends prices across held lots, so it
// has nothing meaningful to split into discrete rows here. Purely derived for
// display: takes rows/params as plain data, never reads/writes localStorage or a
// row's own values, so the source rows (typed or imported, on one line or split
// across several) are completely unaffected and stay exactly as entered.
function computePastPurchasesFifoLotBreakdown(rows, params){
  const unitsP = ppFindParamByLabel(params, "units purchased");
  const avgP = ppFindParamByLabel(params, ["average purchase price ($)", "average purchase price"]);
  const sellP = ppFindParamByLabel(params, "selling price");
  const soldP = ppFindParamByLabel(params, "units sold");
  const datePurchasedP = ppFindParamByLabel(params, "date purchased");
  const dateSalePs = params.filter(p => !p.computed && String(p.label).trim().toLowerCase() === "date sale");
  const valOf = (row, p) => { const v = row.values || {}; return v[p.id] !== undefined ? v[p.id] : p.defaultValue; };
  const numOf = (row, p) => p ? (Number(valOf(row, p)) || 0) : 0;
  const dateOf = (row, p) => { const d = p ? String(valOf(row, p) || "") : ""; return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ""; };

  // Pass 1: turn each row into a "buy" (adds to the FIFO queue), a "match" (a
  // single row with its own Units Purchased AND Selling Price — resolved directly
  // against its own price, same convention as the ledger's "buy+sale" rows; any
  // leftover units still join the queue), or a "sale" (consumes from the queue).
  const eventsByTicker = {};
  rows.forEach((row, idx) => {
    const ticker = String(row.asset || "").trim().toUpperCase();
    if(!ticker) return;
    const units = numOf(row, unitsP), avg = numOf(row, avgP), sell = numOf(row, sellP), sold = numOf(row, soldP);
    const datePurchased = dateOf(row, datePurchasedP);
    let dateSale = "";
    for(const dsp of dateSalePs){ dateSale = dateOf(row, dsp); if(dateSale) break; }
    const hasSaleData = sell !== 0 || sold > PP_EPS;
    if(!eventsByTicker[ticker]) eventsByTicker[ticker] = [];
    const events = eventsByTicker[ticker];

    if(units > PP_EPS){
      let residual = units;
      if(hasSaleData && sell !== 0 && !(sold > units + PP_EPS)){
        const qty = sold > PP_EPS ? sold : units;
        events.push({ type: "match", date: datePurchased, idx, buyRowId: row.id, buyDate: datePurchased, buyPrice: avg, sellRowId: row.id, sellDate: dateSale, sellPrice: sell, qty });
        residual = units - qty;
      }
      if(residual > PP_EPS) events.push({ type: "buy", date: datePurchased, idx, rowId: row.id, units: residual, price: avg });
    } else if(hasSaleData && sold > PP_EPS && sellP){
      events.push({ type: "sale", date: dateSale, idx, rowId: row.id, qty: sold, sell });
    }
  });

  // Pass 2: per ticker, walk events oldest-first (buys/same-row matches before a
  // plain sale on the same date, so a same-day purchase is available to it), and
  // consume the FIFO queue for each sale — emitting one output row per lot touched.
  const breakdown = {};
  Object.keys(eventsByTicker).forEach(ticker => {
    const events = eventsByTicker[ticker];
    events.sort((a, b) => {
      if(a.date !== b.date) return a.date < b.date ? -1 : 1;
      const rank = t => (t === "sale" ? 1 : 0);
      if(rank(a.type) !== rank(b.type)) return rank(a.type) - rank(b.type);
      return a.idx - b.idx;
    });
    const lots = [];
    const out = { matches: [], unmatched: [], issues: [] };
    events.forEach(ev => {
      if(ev.type === "buy"){ lots.push({ rowId: ev.rowId, date: ev.date, price: ev.price, remaining: ev.units }); return; }
      if(ev.type === "match"){
        out.matches.push({ ticker, buyRowId: ev.buyRowId, buyDate: ev.buyDate, buyPrice: ev.buyPrice, sellRowId: ev.sellRowId, sellDate: ev.sellDate, sellPrice: ev.sellPrice, qty: ev.qty, realized: ev.qty * (ev.sellPrice - ev.buyPrice) });
        return;
      }
      // ev.type === "sale": draw from the oldest lot(s) with units remaining.
      let left = ev.qty;
      for(const lot of lots){
        if(left <= PP_EPS) break;
        if(lot.remaining <= PP_EPS) continue;
        const take = Math.min(lot.remaining, left);
        out.matches.push({ ticker, buyRowId: lot.rowId, buyDate: lot.date, buyPrice: lot.price, sellRowId: ev.rowId, sellDate: ev.date, sellPrice: ev.sell, qty: take, realized: take * (ev.sell - lot.price) });
        lot.remaining -= take;
        left -= take;
      }
      if(left > PP_EPS){
        out.issues.push(`Sale of ${ppFmtNum(ev.qty)} unit(s) on ${ev.date || "an unspecified date"} is ${ppFmtNum(left)} unit(s) more than were held at that point.`);
      }
    });
    lots.forEach(lot => {
      if(lot.remaining > PP_EPS) out.unmatched.push({ ticker, buyRowId: lot.rowId, buyDate: lot.date, buyPrice: lot.price, qty: lot.remaining });
    });
    breakdown[ticker] = out;
  });
  return breakdown;
}

function resolvePastPurchaseRowValues(row){
  const params = getPastPurchasesParams();
  const stored = row.values || {};
  const resolved = {};
  params.forEach(p => {
    if(!p.computed) resolved[p.id] = stored[p.id] !== undefined ? stored[p.id] : p.defaultValue;
  });
  const ledgerInfo = getPastPurchaseRowLedgerInfo(row);
  resolved._ledger = ledgerInfo;
  const isPurchaseRow = ledgerInfo.kind === 'buy' || ledgerInfo.kind === 'buy+sale';
  params.forEach(p => {
    if(p.computed && p.formula === 'salesProfitPP'){
      // v5.59: comes from the lot-matching ledger (computePastPurchasesLedger) — a
      // single row with its own Units Purchased + Selling Price computes exactly as
      // before; a separate sale row is matched against the ticker's purchase rows.
      resolved[p.id] = ledgerInfo.realizedReady ? ledgerInfo.realized : 0;
      resolved['_' + p.id + '_ready'] = ledgerInfo.realizedReady;
      resolved['_' + p.id + '_note'] = ledgerInfo.note;
      return;
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
    if(p.computed && p.formula === 'bookValuePP'){
      // Units Purchased × Average Purchase Price — what the position cost, independent
      // of whether it's been sold yet (unlike Realized Gain, this doesn't need a Selling
      // Price at all).
      const norm = s => String(s).trim().toLowerCase();
      const unitsParam = params.find(pp => !pp.computed && norm(pp.label) === 'units purchased');
      const avgParam = params.find(pp => !pp.computed && (norm(pp.label) === 'average purchase price ($)' || norm(pp.label) === 'average purchase price'));
      const units = unitsParam ? (Number(resolved[unitsParam.id]) || 0) : 0;
      const avg = avgParam ? (Number(resolved[avgParam.id]) || 0) : 0;
      // v5.59: cost of the units STILL HELD on this purchase row (after every sale
      // row has been matched against it), so this column and the "Total Current Book
      // Value" footer now agree. Sale rows have no book value of their own.
      const ready = !!(unitsParam && avgParam) && isPurchaseRow && units !== 0 && avg !== 0;
      resolved[p.id] = ready ? ledgerInfo.heldUnits * avg : 0;
      resolved['_' + p.id + '_ready'] = ready;
    }
    if(p.computed && p.formula === 'unrealizedGainPP'){
      // Units Purchased × (Current Price − Average Purchase Price). Current Price is
      // resolved live (override > live fetch > static default), same as Missed Gain %,
      // so this fluctuates automatically as the market price does.
      // v5.63: uses the row's FULL original Units Purchased (not just heldUnits), so
      // this now also computes for a row that's been partially or fully sold — a
      // hypothetical "what would my unrealized gain be right now had none of this
      // purchase ever been sold?" On a never-sold row, units === heldUnits, so the
      // number is identical to the real current unrealized gain, same as before.
      const norm = s => String(s).trim().toLowerCase();
      const unitsParam = params.find(pp => !pp.computed && norm(pp.label) === 'units purchased');
      const avgParam = params.find(pp => !pp.computed && (norm(pp.label) === 'average purchase price ($)' || norm(pp.label) === 'average purchase price'));
      const sellParam = params.find(pp => !pp.computed && norm(pp.label) === 'selling price');
      const units = unitsParam ? (Number(resolved[unitsParam.id]) || 0) : 0;
      const avg = avgParam ? (Number(resolved[avgParam.id]) || 0) : 0;
      const sell = sellParam ? (Number(resolved[sellParam.id]) || 0) : 0;
      const builtin = row.asset ? getResolvedBuiltinAssetValues(row.asset.trim().toUpperCase()) : null;
      const current = builtin ? (Number(builtin.currentPrice) || 0) : 0;
      void sell;
      const ready = !!(unitsParam && avgParam) && isPurchaseRow && units !== 0 && avg !== 0 && !!builtin;
      resolved[p.id] = ready ? units * (current - avg) : 0;
      resolved['_' + p.id + '_ready'] = ready;
    }
    if(p.computed && p.formula === 'currentMarketValuePP'){
      // Units still held (after every sale row has been matched, respecting the
      // "Cost basis" setting via the same ledger Book Value uses) × live Current
      // Price — what the remaining position is worth right now. Book Value +
      // Unrealized Gain === Current Market Value whenever both are ready.
      const norm = s => String(s).trim().toLowerCase();
      const unitsParam = params.find(pp => !pp.computed && norm(pp.label) === 'units purchased');
      const avgParam = params.find(pp => !pp.computed && (norm(pp.label) === 'average purchase price ($)' || norm(pp.label) === 'average purchase price'));
      const units = unitsParam ? (Number(resolved[unitsParam.id]) || 0) : 0;
      const avg = avgParam ? (Number(resolved[avgParam.id]) || 0) : 0;
      const builtin = row.asset ? getResolvedBuiltinAssetValues(row.asset.trim().toUpperCase()) : null;
      const current = builtin ? (Number(builtin.currentPrice) || 0) : 0;
      const ready = !!(unitsParam && avgParam) && isPurchaseRow && units !== 0 && avg !== 0 && !!builtin;
      resolved[p.id] = ready ? ledgerInfo.heldUnits * current : 0;
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
      // v5.62: "asset" is the Ticker column's own sort id — it isn't a param, so
      // it's read straight off the row rather than through resolvePastPurchaseRowValues.
      const va = colId === "asset" ? String(a.asset || "") : resolvePastPurchaseRowValues(a)[colId];
      const vb = colId === "asset" ? String(b.asset || "") : resolvePastPurchaseRowValues(b)[colId];
      let cmp;
      if(typeof va === 'string' || typeof vb === 'string') cmp = String(va).localeCompare(String(vb));
      else cmp = (va || 0) - (vb || 0);
      return direction === 'asc' ? cmp : -cmp;
    });
    return rows;
  }

  // Sorts by whichever Past Purchases column matches this label, if one exists yet
  // (silently leaves the order unchanged if it doesn't — e.g. "Date Purchased" was
  // never added on this list). Mirrors the column-header sort's own comparator.
  const sortByParamLabel = (label, direction) => {
    const norm = s => String(s).trim().toLowerCase();
    const param = getPastPurchasesParams().find(p => norm(p.label) === norm(label));
    if(!param) return;
    rows.sort((a, b) => {
      const va = resolvePastPurchaseRowValues(a)[param.id];
      const vb = resolvePastPurchaseRowValues(b)[param.id];
      let cmp;
      if(typeof va === 'string' || typeof vb === 'string') cmp = String(va || '').localeCompare(String(vb || ''));
      else cmp = (va || 0) - (vb || 0);
      return direction === 'asc' ? cmp : -cmp;
    });
  };

  const sortMode = document.getElementById('ppSortMode') ? document.getElementById('ppSortMode').value : 'custom';
  if(sortMode === 'alpha') rows.sort((a, b) => String(a.asset).localeCompare(String(b.asset)));
  else if(sortMode === 'date-new') rows.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
  else if(sortMode === 'date-old') rows.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
  else if(sortMode === 'param-date-purchased') sortByParamLabel('Date Purchased', 'desc'); // most recent purchase first
  else if(sortMode === 'param-date-purchased-old') sortByParamLabel('Date Purchased', 'asc'); // oldest purchase first
  else if(sortMode === 'param-date-sale') sortByParamLabel('Date Sale', 'desc'); // most recently sold first
  else if(sortMode === 'param-date-sale-old') sortByParamLabel('Date Sale', 'asc'); // oldest sale first
  else if(sortMode === 'param-sale-profit') sortByParamLabel('Realized Gain', 'desc'); // highest profit first
  else if(sortMode === 'param-missed-gain') sortByParamLabel('Missed Gain %', 'desc'); // biggest missed gain first
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

// v5.62: shared by BOTH the main Past Purchases table's <thead> and the Lot
// Matching (FIFO) table's <thead> below it — same columns (Ticker + every
// current param, in the same order), same sort/move/remove controls, because
// both tables show the exact same shared, global column set
// (pastPurchasesParams). Sorting, reordering, or removing a column from EITHER
// table's header acts on that one shared list/sort-state, so the two headers —
// and their sort arrows — always stay in lockstep. The Ticker/Asset column gets
// only a sort toggle (it's not reorderable or removable).
function buildPastPurchasesHeaderRow(params){
  const assetSorted = ppColumnSortState && ppColumnSortState.colId === "asset";
  const assetSortIcon = assetSorted ? (ppColumnSortState.direction === "asc" ? "▲" : "▼") : "⇅";
  let html = `<tr><th>
    <div>Ticker</div>
    <div class="col-header-controls">
      <button class="pp-col-btn col-ctrl-btn ${assetSorted ? "col-ctrl-sort-active" : ""}" data-action="sort" data-id="asset" title="Sort by ticker">${assetSortIcon}</button>
    </div>
  </th>`;
  params.forEach((p, idx) => {
    const isSorted = ppColumnSortState && ppColumnSortState.colId === p.id;
    const sortIcon = isSorted ? (ppColumnSortState.direction === "asc" ? "▲" : "▼") : "⇅";
    html += `<th>
      <div>${p.label}${p.computed ? ' <span style="color:var(--text-secondary); font-size:0.7rem;">(computed)</span>' : ''}</div>
      <div class="col-header-controls">
        <button class="pp-col-btn col-ctrl-btn ${isSorted ? "col-ctrl-sort-active" : ""}" data-action="sort" data-id="${p.id}" title="Sort by this column">${sortIcon}</button>
        <button class="pp-col-btn col-ctrl-btn" data-action="move" data-id="${p.id}" data-dir="-1" ${idx === 0 ? "disabled" : ""} title="Move left">&lt;</button>
        <button class="pp-col-btn col-ctrl-btn" data-action="move" data-id="${p.id}" data-dir="1" ${idx === params.length - 1 ? "disabled" : ""} title="Move right">&gt;</button>
        <button class="pp-col-btn col-ctrl-btn col-ctrl-remove" data-action="remove" data-id="${p.id}" title="Remove this parameter">&times;</button>
      </div>
    </th>`;
  });
  html += "</tr>";
  return html;
}

// Wires the sort/move/remove buttons in a header row built by
// buildPastPurchasesHeaderRow above. Used for both the main table's thead and the
// Lot Matching table's thead — both act on the same shared params/sort state, and
// every action finishes with a full renderPastPurchasesTable() re-render, which
// refreshes both tables (and keeps their header arrows in sync) together.
function wirePastPurchasesHeaderButtons(theadEl){
  theadEl.querySelectorAll(".pp-col-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      if(action === "sort"){
        if(!ppColumnSortState || ppColumnSortState.colId !== id){
          ppColumnSortState = { colId: id, direction: "asc" };
        } else if(ppColumnSortState.direction === "asc"){
          ppColumnSortState = { colId: id, direction: "desc" };
        } else {
          ppColumnSortState = null; // third click clears back to the Sort-by dropdown
        }
        renderPastPurchasesTable();
      } else if(action === "move"){
        movePastPurchaseParam(id, parseInt(btn.getAttribute("data-dir"), 10));
        renderPastPurchasesTable();
        renderPastPurchasesColumnOrderList();
      } else if(action === "remove"){
        const def = getPastPurchasesParams().find(p => p.id === id);
        if(def && confirm(`Remove the "${def.label}" column? This deletes its values for every row.`)){
          removePastPurchaseParam(id);
          renderPastPurchasesTable();
          renderPastPurchasesParamList();
          renderPastPurchasesColumnOrderList();
        }
      }
    });
  });
}

// v5.64: the raw, individually-editable Past Purchases table is gone — the Lot
// Matching (FIFO) table (renderPastPurchasesLotMatchBreakdown, below) is now the
// only Past Purchases table, and it's fully editable itself. This function is now
// just the shared orchestrator: it works out the current row order and the
// "Current Holdings" filter (still needed for Excel/Text/Word/PDF exports, which
// keep working from the raw rows — see buildPastPurchasesExportTable/
// lastPastPurchasesVisibleRows — since the underlying row data model hasn't
// changed, only how it's displayed/edited), keeps the "Current Holding" Portfolio
// list's FIFO-verified ticker membership in sync, and hands off to the FIFO table.
function renderPastPurchasesTable(){
  const params = getPastPurchasesParams();
  const orderedRows = getPastPurchasesSortedRows();
  lastPastPurchasesOrderedRows = orderedRows;

  const showHoldingsOnly = getPpShowCurrentHoldingsOnly();
  const visibleRows = showHoldingsOnly ? orderedRows.filter(r => isPastPurchaseRowCurrentHolding(r, params)) : orderedRows;
  lastPastPurchasesVisibleRows = visibleRows;
  const holdingsBtn = document.getElementById("ppCurrentHoldingsToggle");
  if(holdingsBtn) holdingsBtn.classList.toggle("active-tab", showHoldingsOnly);
  const costBasisSelect = document.getElementById("ppCostBasisSelect");
  if(costBasisSelect) costBasisSelect.value = getPpCostBasisMethod();

  // Keeps "Current Holding" (the auto-synced Portfolio list) in step with every
  // Past Purchases edit, not just at login.
  syncCurrentHoldingsList();

  renderPastPurchasesLotMatchBreakdown(params, orderedRows);

  // v5.70: before drawing it, make sure Sales Strategy has a draft row for every
  // currently-held ticker it hasn't already seeded (or that the user removed) --
  // see syncSalesStrategyFromHoldings for why it's safe to call on every render.
  if(typeof syncSalesStrategyFromHoldings === "function") syncSalesStrategyFromHoldings();
  // v5.69: Sales Strategy re-pulls Total Units Purchased/Sold, Units Left, and
  // Average Purchase Price of Units Left from this SAME data on every Past
  // Purchases re-render, so it never goes stale behind an edit made here.
  if(typeof renderSalesStrategyTable === "function") renderSalesStrategyTable();
}

// v5.64: works out what EVERY current Past Purchases column should show for one
// FIFO lot-matching fragment (a "match" — a specific buy lot paired with a
// specific sale — or an "unmatched" still-held remainder). Mirrors
// resolvePastPurchaseRowValues's shape (values by param id, plus "_<id>_ready"
// flags) so the two share a cell renderer.
//   - The well-known buy/sale fields (Date Purchased, Units Purchased, Average
//     Purchase Price, Selling Price, Date Sale, Units Sold) come from the
//     fragment itself (qty/prices/dates already resolved by the FIFO match), not
//     from re-reading either original row — a fragment is often a PART of one,
//     so its own row's stored Units Purchased, say, would be wrong to show.
//   - "Current Price" is left as a plain manual column here (same as the old raw
//     table — see the glossary), not force-overridden with the live price; the
//     live price is still used for the Unrealized Gain / Missed Gain % formulas
//     below regardless of what this column shows.
//   - The computed formulas (Realized/Unrealized Gain, Book Value, Missed Gain %)
//     are recomputed for this fragment's own qty/prices, on the same "which side
//     is this ready on" rules as the live formulas: a sold fragment has a
//     Realized Gain (and no Book Value, since those units aren't held anymore);
//     a still-held remainder has Book Value (and no Realized Gain/Missed Gain %,
//     since nothing sold yet); Unrealized Gain computes for both (a hypothetical
//     "had it never been sold" on a sold fragment, same convention as
//     resolvePastPurchaseRowValues).
//   - Any OTHER (custom) column isn't fragment-specific — it falls back to the
//     buy row's own stored value, then the sell row's, so it still shows
//     something rather than a blank; an edit to it writes the same way (see
//     fifoFragmentFieldTarget).
function resolveFifoFragmentValues(fragment, isMatch, params, rowsById, builtinCache){
  const resolved = {};
  const known = new Set();
  const unitsP = ppFindParamByLabel(params, "units purchased");
  const avgP = ppFindParamByLabel(params, ["average purchase price ($)", "average purchase price"]);
  const sellP = ppFindParamByLabel(params, "selling price");
  const soldP = ppFindParamByLabel(params, "units sold");
  const dpP = ppFindParamByLabel(params, "date purchased");
  const dsP = params.find(p => !p.computed && String(p.label).trim().toLowerCase() === "date sale");

  const qty = fragment.qty, buyPrice = fragment.buyPrice;
  const sellPrice = isMatch ? fragment.sellPrice : 0;
  if(!builtinCache[fragment.ticker]) builtinCache[fragment.ticker] = getResolvedBuiltinAssetValues(fragment.ticker);
  const builtin = builtinCache[fragment.ticker];
  const current = builtin ? (Number(builtin.currentPrice) || 0) : 0;

  if(unitsP){ resolved[unitsP.id] = qty; known.add(unitsP.id); }
  if(avgP){ resolved[avgP.id] = buyPrice; known.add(avgP.id); }
  if(dpP){ resolved[dpP.id] = fragment.buyDate || ""; known.add(dpP.id); }
  if(sellP){ resolved[sellP.id] = isMatch ? sellPrice : 0; known.add(sellP.id); }
  if(dsP){ resolved[dsP.id] = isMatch ? (fragment.sellDate || "") : ""; known.add(dsP.id); }
  if(soldP){ resolved[soldP.id] = isMatch ? qty : 0; known.add(soldP.id); }

  params.forEach(p => {
    if(known.has(p.id) || !p.computed) return;
    known.add(p.id);
    if(p.formula === "salesProfitPP"){
      resolved[p.id] = isMatch ? fragment.realized : 0;
      resolved["_" + p.id + "_ready"] = isMatch;
    } else if(p.formula === "unrealizedGainPP"){
      // v5.63: no longer gated on `!isMatch` — a MATCHED (sold) fragment now also
      // computes this, as a hypothetical: what this exact matched quantity would be
      // worth today, at its own buy price, had it never been sold. An unmatched
      // (still-held) fragment's value is unchanged (the real current gain).
      const ready = buyPrice !== 0 && !!builtin;
      resolved[p.id] = ready ? qty * (current - buyPrice) : 0;
      resolved["_" + p.id + "_ready"] = ready;
    } else if(p.formula === "bookValuePP"){
      const ready = !isMatch && buyPrice !== 0;
      resolved[p.id] = ready ? qty * buyPrice : 0;
      resolved["_" + p.id + "_ready"] = ready;
    } else if(p.formula === "currentMarketValuePP"){
      // Units still held × live Current Price — what this lot is worth right now.
      // Only meaningful for a still-held (unmatched) fragment, same as Book Value
      // (a sold lot's value converts into Realized Gain instead); also needs a
      // live price, same gate as Unrealized Gain. When both this and Unrealized
      // Gain are ready, Book Value + Unrealized Gain === Current Market Value
      // (e.g. buy 5 @ $5 -> Book Value $25; price now $7 -> Unrealized Gain $10,
      // Current Market Value $35).
      const ready = !isMatch && buyPrice !== 0 && !!builtin;
      resolved[p.id] = ready ? qty * current : 0;
      resolved["_" + p.id + "_ready"] = ready;
    } else if(p.formula === "missedGainPct"){
      const ready = isMatch && sellPrice !== 0 && !!builtin;
      resolved[p.id] = ready ? ((current - sellPrice) / sellPrice) * 100 : 0;
      resolved["_" + p.id + "_ready"] = ready;
    } else {
      resolved[p.id] = 0;
      resolved["_" + p.id + "_ready"] = false;
    }
  });

  // Anything left (a custom manual column, or a preset like "ROA (%)"/"Stability"
  // that mirrors the Portfolio Lists table) — fall back to whichever of this
  // fragment's two source rows actually has a value for it.
  const buyRow = rowsById[fragment.buyRowId];
  const sellRow = isMatch ? rowsById[fragment.sellRowId] : null;
  params.forEach(p => {
    if(known.has(p.id)) return;
    const fromBuy = buyRow && buyRow.values ? buyRow.values[p.id] : undefined;
    const fromSell = sellRow && sellRow.values ? sellRow.values[p.id] : undefined;
    resolved[p.id] = fromBuy !== undefined ? fromBuy : (fromSell !== undefined ? fromSell : p.defaultValue);
  });

  return resolved;
}

// One cell in the merged Lot Matching (FIFO) table. Computed columns are
// unchanged from before — still read-only math, recomputed for this fragment's
// own qty/prices — but every OTHER column is now a real <input> that writes back
// to the underlying purchase or sale row via fifoFragmentFieldTarget: buy-side
// fields (and any custom column) target the purchase row; Selling Price/Date
// Sale/Units Sold target the sale row and only exist once this fragment IS a
// match — a still-held fragment has nothing to sell yet, so those show a
// placeholder pointing at the ticker cell's "Sell" button instead.
function renderFifoFragmentCellHTML(p, f, params){
  const resolved = f.resolved;
  if(p.computed && p.formula === "salesProfitPP"){
    const ready = resolved["_" + p.id + "_ready"];
    if(!ready) return `<td style="color:var(--text-secondary);">—</td>`;
    const val = resolved[p.id] || 0;
    const sign = val >= 0 ? "+" : "-";
    const color = val >= 0 ? "var(--emerald)" : "#ef4444";
    return `<td style="color:${color}; font-weight:600;">${sign}$${Math.abs(val).toFixed(2)}</td>`;
  }
  if(p.computed && p.formula === "unrealizedGainPP"){
    const ready = resolved["_" + p.id + "_ready"];
    if(!ready) return `<td style="color:var(--text-secondary);">—</td>`;
    const val = resolved[p.id] || 0;
    const sign = val >= 0 ? "+" : "-";
    const color = val >= 0 ? "var(--emerald)" : DUS_EXCLUDED_COLOR;
    return `<td style="color:${color}; font-weight:600;">${sign}$${Math.abs(val).toFixed(2)}</td>`;
  }
  if(p.computed && p.formula === "currentMarketValuePP"){
    const ready = resolved["_" + p.id + "_ready"];
    if(!ready) return `<td style="color:var(--text-secondary);">—</td>`;
    const val = resolved[p.id] || 0;
    return `<td style="font-weight:600; color:#a78bfa;">$${Math.abs(val).toFixed(2)}</td>`;
  }
  if(p.computed && p.formula === "bookValuePP"){
    const ready = resolved["_" + p.id + "_ready"];
    if(!ready) return `<td style="color:var(--text-secondary);">—</td>`;
    const val = resolved[p.id] || 0;
    return `<td style="font-weight:600; color:#7dd3fc;">$${Math.abs(val).toFixed(2)}</td>`;
  }
  if(p.computed && p.formula === "missedGainPct"){
    const ready = resolved["_" + p.id + "_ready"];
    const val = resolved[p.id] || 0;
    if(!ready || val === 0) return `<td style="color:var(--text-secondary);">—</td>`;
    const color = val > 0 ? "var(--emerald)" : "#ef4444";
    return `<td style="color:${color}; font-weight:600;">${Number(val).toFixed(1)}%</td>`;
  }
  if(p.computed){
    const ready = resolved["_" + p.id + "_ready"];
    if(ready === false) return `<td style="color:var(--text-secondary);">—</td>`;
    return `<td>${Number(resolved[p.id] || 0).toFixed(1)}%</td>`;
  }

  const target = fifoFragmentFieldTarget(p, f.data, f.isMatch);
  if(!target){
    return `<td style="color:var(--text-secondary);" title="Nothing sold on this lot yet — use the ticker cell's Sell button to record a sale.">—</td>`;
  }
  const val = resolved[p.id];
  const commonAttrs = `data-row-id="${target.rowId}" data-field="${p.id}" data-frag-mode="${target.mode}"`;
  if(p.type === "text"){
    const v = val === undefined || val === null ? "" : val;
    return `<td><input class="cell-input pp-frag-input" ${commonAttrs} data-type="text" data-frag-base="${escAttr(v)}" type="text" value="${escAttr(v)}"></td>`;
  }
  if(p.type === "date"){
    return `<td><input class="cell-input pp-frag-input" ${commonAttrs} data-type="date" data-frag-base="${escAttr(val || '')}" type="date" value="${escAttr(val || '')}"></td>`;
  }
  // Same "hit your buy target" emerald highlight as the old raw table's Current
  // Price column.
  const isCurrentPriceCol = String(p.label).trim().toLowerCase() === "current price";
  const isAtTarget = isCurrentPriceCol && isAtOrBelowBuyPriceTarget(val, params || [], resolved);
  const styleAttr = isAtTarget ? ' style="color:var(--emerald);"' : '';
  const numVal = Number(val) || 0;
  return `<td><input class="cell-input cell-input-num pp-frag-input" ${commonAttrs} data-type="number" data-frag-base="${numVal}" type="number" step="0.01" value="${numVal}"${styleAttr}></td>`;
}

// Renders the merged, fully editable Past Purchases + Lot Matching (FIFO) table
// into #ppLotMatchContent — the ONLY Past Purchases table now (see the comment on
// renderPastPurchasesTable). Same header (same columns, same sort/move/remove
// controls, via buildPastPurchasesHeaderRow/wirePastPurchasesHeaderButtons) as
// before. Shows EVERY purchase and sale currently on the active list, split into
// FIFO-matched fragments (computePastPurchasesFifoLotBreakdown) — not only
// tickers that happen to have a sale — so a plain, never-sold holding still
// appears here as its own "still held" row. Always computed over the FULL active
// list (orderedRows); the "Current Holdings" filter is applied below at the
// fragment level (ON hides matched/sold fragments, showing only still-held
// ones) — the footer totals always summarize every fragment regardless.
//
// Ticker grouping order follows orderedRows' own order (i.e. the "Sort by"
// dropdown, including "Custom order" — the order the ticker-block Up/Down
// buttons below actually edit) whenever no column-header sort is active;
// ppColumnSortState (shared with the header) sorts the flat fragment list by
// that column instead, same as before.
function renderPastPurchasesLotMatchBreakdown(params, orderedRows){
  const container = document.getElementById("ppLotMatchContent");
  if(!container) return;
  const breakdown = computePastPurchasesFifoLotBreakdown(orderedRows, params);
  const allTickers = Object.keys(breakdown);

  if(allTickers.length === 0){
    container.innerHTML = `<div style="color:var(--text-secondary); font-size:0.9rem; padding:0.75rem 0;">${params.length === 0 ? "Add at least one parameter above to start tracking data for these assets." : "Nothing to show yet — add a purchase (Units Purchased + Average Purchase Price) to see it here."}</div>`;
    return;
  }

  let tickers;
  if(ppColumnSortState){
    tickers = allTickers; // fragments are sorted flat below regardless of grouping order
  } else {
    const seen = new Set();
    tickers = [];
    orderedRows.forEach(r => {
      const t = String(r.asset || "").trim().toUpperCase();
      if(t && breakdown[t] && !seen.has(t)){ seen.add(t); tickers.push(t); }
    });
    allTickers.forEach(t => { if(!seen.has(t)){ seen.add(t); tickers.push(t); } });
  }
  const tickerIndex = {};
  tickers.forEach((t, i) => { tickerIndex[t] = i; });

  const rowsById = {};
  orderedRows.forEach(r => { rowsById[r.id] = r; });
  const unitsP = ppFindParamByLabel(params, "units purchased");
  const builtinCache = {};
  const allIssues = [];
  const fragments = []; // { ticker, isMatch, data, resolved }
  tickers.forEach(ticker => {
    const t = breakdown[ticker];
    t.matches.forEach(m => fragments.push({ ticker, isMatch: true, data: m, resolved: resolveFifoFragmentValues(m, true, params, rowsById, builtinCache) }));
    t.unmatched.forEach(u => fragments.push({ ticker, isMatch: false, data: u, resolved: resolveFifoFragmentValues(u, false, params, rowsById, builtinCache) }));
    t.issues.forEach(msg => allIssues.push(`${ticker}: ${msg}`));
  });

  // "Held: x/y" tag, per purchase row (buyRowId) — always computed straight from
  // THIS (always-FIFO) breakdown, never the Cost-Basis-dependent ledger used
  // elsewhere, so it can never disagree with what these rows actually show. "y"
  // is that row's own full stored Units Purchased; "x" is however much of it
  // still shows up in `unmatched` (0 if the row isn't in there at all, i.e. fully
  // sold).
  const heldByBuyRow = {};
  Object.values(breakdown).forEach(t => { t.unmatched.forEach(u => { heldByBuyRow[u.buyRowId] = (heldByBuyRow[u.buyRowId] || 0) + u.qty; }); });
  const totalUnitsForRow = (rowId) => {
    const row = rowsById[rowId];
    if(!row || !unitsP) return 0;
    const v = row.values ? row.values[unitsP.id] : undefined;
    return Number(v !== undefined ? v : unitsP.defaultValue) || 0;
  };

  if(ppColumnSortState){
    const { colId, direction } = ppColumnSortState;
    fragments.sort((a, b) => {
      const va = colId === "asset" ? a.ticker : a.resolved[colId];
      const vb = colId === "asset" ? b.ticker : b.resolved[colId];
      let cmp;
      if(typeof va === "string" || typeof vb === "string") cmp = String(va || "").localeCompare(String(vb || ""));
      else cmp = (va || 0) - (vb || 0);
      return direction === "asc" ? cmp : -cmp;
    });
  }

  // "Current Holdings" ON, at fragment granularity: only still-held (unmatched)
  // fragments — a sold lot isn't a "current holding" anymore. The footer below
  // always totals the FULL, unfiltered `fragments` list regardless.
  const showHoldingsOnly = getPpShowCurrentHoldingsOnly();
  const visibleFragments = showHoldingsOnly ? fragments.filter(f => !f.isMatch) : fragments;

  let bodyHtml = "";
  if(visibleFragments.length === 0){
    bodyHtml = `<tr><td colspan="${params.length + 1}" style="color:var(--text-secondary); padding:1.25rem 1rem;">No current holdings — every purchase on this list has been fully sold. Turn off "Current Holdings" to see everything.</td></tr>`;
  } else {
    visibleFragments.forEach(f => {
      const totalUnits = totalUnitsForRow(f.data.buyRowId);
      const heldUnits = heldByBuyRow[f.data.buyRowId] || 0;
      const heldTag = unitsP ? `<div style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.25rem;" title="Units of this purchase still held after every sale on this list is matched (always FIFO here, independent of the Cost basis setting above)">Held: ${ppFmtNum(heldUnits)} / ${ppFmtNum(totalUnits)}</div>` : "";
      const idx = tickerIndex[f.ticker];
      const upDisabled = idx === 0 ? "disabled" : "";
      const downDisabled = idx === tickers.length - 1 ? "disabled" : "";
      const deleteRowId = f.isMatch ? f.data.sellRowId : f.data.buyRowId;
      const deleteKind = f.isMatch ? "sale" : "purchase";
      const deleteTitle = f.isMatch ? "Remove this sale (the purchase it was matched against stays)" : "Remove this purchase";
      let rowHtml = `<td>
        <input class="cell-input cell-input-ticker pp-frag-asset-input" data-ticker="${escAttr(f.ticker)}" type="text" value="${escHtml(f.ticker)}">
        ${f.isMatch ? `<div style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.25rem;">(sold lot)</div>` : ""}
        ${heldTag}
        <div class="row-ctrl-controls">
          <button class="pp-frag-btn row-ctrl-btn" data-action="up" data-ticker="${escAttr(f.ticker)}" ${upDisabled} title="Move this whole ticker's rows up">&uarr;</button>
          <button class="pp-frag-btn row-ctrl-btn" data-action="down" data-ticker="${escAttr(f.ticker)}" ${downDisabled} title="Move this whole ticker's rows down">&darr;</button>
          <button class="pp-frag-btn row-ctrl-btn" data-action="sell" data-ticker="${escAttr(f.ticker)}" title="Record a sale of this ticker — adds a new sale row (enter Units Sold, Selling Price, Date Sale)" style="width:auto; padding:0 0.4rem; font-size:0.7rem; color:#fbbf24;">Sell</button>
          <button class="pp-frag-btn row-ctrl-btn row-ctrl-remove" data-action="delete" data-row-id="${deleteRowId}" data-ticker="${escAttr(f.ticker)}" data-kind="${deleteKind}" title="${escAttr(deleteTitle)}">&times;</button>
        </div>
      </td>`;
      params.forEach(p => { rowHtml += renderFifoFragmentCellHTML(p, f, params); });
      bodyHtml += `<tr>${rowHtml}</tr>`;
    });
  }

  const issuesHtml = allIssues.length
    ? `<div style="color:var(--amber); font-size:0.85rem; margin-top:0.6rem;">${allIssues.map(m => escHtml(m)).join("<br>")}</div>`
    : "";

  container.innerHTML = `<div class="table-container">
    <table>
      <thead id="ppLotMatchHead"></thead>
      <tbody id="ppLotMatchBody">${bodyHtml}</tbody>
      <tfoot id="ppLotMatchFoot"></tfoot>
    </table>
  </div>${issuesHtml}`;

  const lotHead = document.getElementById("ppLotMatchHead");
  lotHead.innerHTML = buildPastPurchasesHeaderRow(params);
  wirePastPurchasesHeaderButtons(lotHead);

  const lotFoot = document.getElementById("ppLotMatchFoot");
  if(lotFoot) lotFoot.innerHTML = renderFifoLotMatchFooter(params, fragments);

  wireFifoFragmentEditing(document.getElementById("ppLotMatchBody"));
}

// Wires every editable input + row-action button in the merged Lot Matching
// (FIFO) table body built by renderPastPurchasesLotMatchBreakdown above.
function wireFifoFragmentEditing(tbody){
  if(!tbody) return;

  tbody.querySelectorAll(".pp-frag-asset-input").forEach(el => {
    el.addEventListener("change", (e) => {
      const oldTicker = e.target.getAttribute("data-ticker");
      const newTicker = e.target.value.trim().toUpperCase();
      if(!newTicker){ e.target.value = oldTicker; return; } // revert an empty edit
      if(newTicker !== oldTicker) renamePastPurchaseTickerBlock(oldTicker, newTicker);
      renderPastPurchasesTable();
      renderPastPurchasesTickerList();
      renderPastPurchasesRowOrderList();
    });
    el.addEventListener("keydown", (e) => { if(e.key === "Enter"){ e.preventDefault(); el.blur(); } });
  });

  tbody.querySelectorAll(".pp-frag-input").forEach(el => {
    el.addEventListener("change", (e) => {
      const rowId = e.target.getAttribute("data-row-id");
      const field = e.target.getAttribute("data-field");
      const mode = e.target.getAttribute("data-frag-mode");
      const isNum = e.target.getAttribute("data-type") === "number";
      let value = e.target.value;
      if(isNum){ value = parseFloat(value); if(isNaN(value)) value = 0; }
      if(mode === "delta"){
        const base = parseFloat(e.target.getAttribute("data-frag-base")) || 0;
        adjustPastPurchaseValueByDelta(rowId, field, base, value);
      } else {
        setPastPurchaseValue(rowId, field, value);
      }
      renderPastPurchasesTable(); // refresh every fragment + the totals rows
    });
    el.addEventListener("keydown", (e) => {
      if(e.key === "Enter" && el.tagName === "INPUT"){ e.preventDefault(); el.blur(); }
    });
  });

  tbody.querySelectorAll(".pp-frag-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const ticker = btn.getAttribute("data-ticker");
      if(action === "delete"){
        const rowId = btn.getAttribute("data-row-id");
        const kind = btn.getAttribute("data-kind") || "row";
        if(confirm(`Remove this "${ticker}" ${kind} from Past Purchases? This deletes it and all its values.`)){
          removePastPurchaseRow(rowId);
          renderPastPurchasesTickerList();
          renderPastPurchasesTable();
          renderPastPurchasesRowOrderList();
          if(typeof renderPPListSelector === "function") renderPPListSelector();
        }
      } else if(action === "sell"){
        addPastPurchaseSaleRowForTicker(ticker);
        renderPastPurchasesTable();
        renderPastPurchasesParamList();
        renderPastPurchasesColumnOrderList();
        renderPastPurchasesRowOrderList();
        renderPastPurchasesTickerList();
        if(typeof renderPPListSelector === "function") renderPPListSelector();
      } else if(action === "up"){
        movePastPurchaseTickerBlock(ticker, -1);
        renderPastPurchasesTable();
        renderPastPurchasesRowOrderList();
      } else if(action === "down"){
        movePastPurchaseTickerBlock(ticker, 1);
        renderPastPurchasesTable();
        renderPastPurchasesRowOrderList();
      }
    });
  });
}

// v5.63: the summary totals that used to live on the main Past Purchases table's
// own tfoot (Total current market and book value, Total Realized Gain to date,
// per-month Realized Gain breakdown) now live HERE instead — totaling the FIFO
// fragments (this table's own rows) rather than the raw editable rows, since a
// per-row total on the table above isn't reliably accurate once a purchase or
// sale has been split across multiple lots/rows; the FIFO-matched fragments are
// the accurate source. Mirrors renderPastPurchasesFooter's old row-building
// exactly, one column per current param (same column count/order as
// buildPastPurchasesHeaderRow), just summing over `fragments` (each with its own
// pre-resolved values from resolveFifoFragmentValues) instead of `orderedRows`.
//
// v5.68: "Total current market and book value" is a single row carrying TWO
// totals side by side, each sitting under its own column — Book Value's total
// under the Book Value column, Current Market Value's total under the Current
// Market Value column — so the row still renders (with whichever total(s) it
// has data for) even if one of those two columns has been removed. Each total
// is colored a shade darker than that column's own live cell color above it:
// Book Value's live cells are var(--accent-cyan) (#7dd3fc), so its total keeps
// the pre-existing darker var(--accent-blue) (#2563eb); Current Market Value's
// live cells are #a78bfa, so its total uses the darker #7c3aed (also
// EXPORT_COLORS.violet).
function renderFifoLotMatchFooter(params, fragments){
  const bookValueParam = params.find(p => p.computed && p.formula === 'bookValuePP');
  const cmvParam = params.find(p => p.computed && p.formula === 'currentMarketValuePP');
  const saleProfitParam = params.find(p => p.computed && p.formula === 'salesProfitPP');
  const dateSaleParam = params.find(p => !p.computed && String(p.label).trim().toLowerCase() === 'date sale');
  let footHtml = '';

  if(bookValueParam || cmvParam){
    const bookColIndex = bookValueParam ? params.findIndex(p => p.id === bookValueParam.id) : -1;
    const cmvColIndex = cmvParam ? params.findIndex(p => p.id === cmvParam.id) : -1;
    const totalBookValue = bookValueParam ? fragments.reduce((sum, f) => {
      return sum + (f.resolved['_' + bookValueParam.id + '_ready'] ? (f.resolved[bookValueParam.id] || 0) : 0);
    }, 0) : 0;
    const totalCmv = cmvParam ? fragments.reduce((sum, f) => {
      return sum + (f.resolved['_' + cmvParam.id + '_ready'] ? (f.resolved[cmvParam.id] || 0) : 0);
    }, 0) : 0;
    footHtml += `<tr style="background:rgba(255,255,255,0.02);"><td style="font-weight:600; color:var(--text-secondary);">Total current market and book value</td>`;
    params.forEach((p, idx) => {
      if(idx === bookColIndex){
        footHtml += `<td style="font-weight:600; color:var(--accent-blue);">$${totalBookValue.toFixed(2)}</td>`;
      } else if(idx === cmvColIndex){
        footHtml += `<td style="font-weight:600; color:#7c3aed;">$${totalCmv.toFixed(2)}</td>`;
      } else {
        footHtml += `<td></td>`;
      }
    });
    footHtml += `</tr>`;
  }

  if(saleProfitParam){
    const colIndex = params.findIndex(p => p.id === saleProfitParam.id);
    const total = fragments.reduce((sum, f) => {
      return sum + (f.resolved['_' + saleProfitParam.id + '_ready'] ? (f.resolved[saleProfitParam.id] || 0) : 0);
    }, 0);
    const sign = total >= 0 ? '+' : '-';
    const color = total >= 0 ? 'var(--emerald)' : '#ef4444';
    footHtml += `<tr style="background:rgba(255,255,255,0.03); border-top:2px solid var(--border-color);"><td style="font-weight:700; color:#fff;">Total Realized Gain to date</td>`;
    params.forEach((p, idx) => {
      footHtml += idx === colIndex
        ? `<td style="font-weight:700; color:${color};">${sign}$${Math.abs(total).toFixed(2)}</td>`
        : `<td></td>`;
    });
    footHtml += `</tr>`;
  }

  if(saleProfitParam && dateSaleParam){
    const groups = {};
    fragments.forEach(f => {
      if(!f.isMatch) return; // only a matched (sold) fragment has a real Date Sale
      const parsed = ppParseDateSale(f.resolved[dateSaleParam.id] || '');
      if(!parsed) return;
      const key = parsed.year + '-' + String(parsed.month).padStart(2, '0');
      if(!groups[key]) groups[key] = { year: parsed.year, month: parsed.month, total: 0, tickers: [] };
      groups[key].total += (f.resolved['_' + saleProfitParam.id + '_ready'] ? (f.resolved[saleProfitParam.id] || 0) : 0);
      groups[key].tickers.push(f.ticker);
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
      const label = `Realized Gain for month of ${PP_MONTH_ABBR[g.month - 1]} of ${g.year}`;
      const tickerTitle = ` title="Includes: ${escAttr(g.tickers.join(', '))} (${g.tickers.length} row${g.tickers.length === 1 ? '' : 's'})"`;
      footHtml += `<tr style="background:rgba(255,255,255,0.02);"${tickerTitle}><td style="font-weight:600; color:var(--text-secondary);">${label}</td>`;
      params.forEach((p, idx) => {
        footHtml += idx === colIndex
          ? `<td style="font-weight:600; color:${color};">${sign}$${Math.abs(g.total).toFixed(2)}</td>`
          : `<td></td>`;
      });
      footHtml += `</tr>`;
    });
  }

  return footHtml;
}

// --- Sales Strategy (v5.69) ---
// Draft, what-if sale planning for tickers already on the active Past
// Purchases list — see the big comment above getSalesStrategyRows for the data
// model. Rendered into #ssTableContent, same table/th/td/.cell-input styling
// as the Lot Matching table above it (no separate CSS needed — it's the same
// global `table`/`.table-container` rules), below the Past Purchases section.
// v5.71: columns carry their own per-column "sort" button (see
// buildSalesStrategyHeaderRow/wireSalesStrategyHeaderButtons below), same
// convention as Past Purchases' header (buildPastPurchasesHeaderRow/
// wirePastPurchasesHeaderButtons). `id` is the field name on a resolved row
// (buildSalesStrategyRowsResolved's return shape) that column sorts by.
// v5.73: unlike Past Purchases' pastPurchasesParams, these 9 columns are a
// FIXED schema (each one either a plain input or computed fresh on every
// render) — there's no per-row stored value to actually delete the way
// removePastPurchaseParam does. So move-left/right/× here (see
// getSsColumnOrder/getSsHiddenColumns and friends, just below) reorder and
// HIDE a column rather than destroying anything; showAllSsColumns() is the
// undo. The Ticker column itself is never move-able or hide-able, same as
// Past Purchases' own Asset/Ticker column.
const SALES_STRATEGY_COLUMNS = [
  { id: "ticker", label: "Ticker" },
  { id: "currentPrice", label: "Current Price" },
  { id: "unitsToSell", label: "Units to Sell" },
  { id: "sellingPrice", label: "Selling Price" },
  { id: "totalPurchased", label: "Total Units Purchase (Current)" },
  { id: "totalSold", label: "Total Units Sold" },
  { id: "unitsLeft", label: "Units Left" },
  { id: "avgPurchasePriceOfUnitsLeft", label: "Average Purchase Price of Units Left" },
  { id: "saleRealizedDate", label: "Sale Realized Date" },
];
const SALES_STRATEGY_NON_TICKER_COLUMN_IDS = SALES_STRATEGY_COLUMNS.filter(c => c.id !== "ticker").map(c => c.id);

function getSsColumnOrder(){
  let order;
  try{ order = JSON.parse(localStorage.getItem("ssColumnOrder") || "null"); }
  catch(e){ order = null; }
  if(!Array.isArray(order)) order = SALES_STRATEGY_NON_TICKER_COLUMN_IDS.slice();
  const hidden = new Set(getSsHiddenColumns());
  order = order.filter(id => SALES_STRATEGY_NON_TICKER_COLUMN_IDS.includes(id) && !hidden.has(id));
  // Self-heal: an id that's neither in the saved order nor hidden (a brand-new
  // column added in a later version, or simply the very first read) gets
  // appended at the end rather than silently never shown.
  SALES_STRATEGY_NON_TICKER_COLUMN_IDS.forEach(id => { if(!hidden.has(id) && !order.includes(id)) order.push(id); });
  return order;
}
function saveSsColumnOrder(order){
  try{ localStorage.setItem("ssColumnOrder", JSON.stringify(order)); }
  catch(e){ /* localStorage unavailable */ }
}
function getSsHiddenColumns(){
  try{ return JSON.parse(localStorage.getItem("ssHiddenColumns") || "[]"); }
  catch(e){ return []; }
}
function saveSsHiddenColumns(ids){
  try{ localStorage.setItem("ssHiddenColumns", JSON.stringify(ids)); }
  catch(e){ /* localStorage unavailable */ }
}

// Swaps a column with its visible neighbor to the left (-1) / right (1).
// Clears any active column sort first, same convention as moveSalesStrategyRow
// — a reorder only makes visible sense back in the table's own custom order.
function moveSsColumn(id, direction){
  if(id === "ticker") return;
  ssColumnSortState = null;
  const order = getSsColumnOrder();
  const idx = order.indexOf(id);
  if(idx === -1) return;
  const newIdx = idx + direction;
  if(newIdx < 0 || newIdx >= order.length) return;
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  saveSsColumnOrder(order);
}

// Hides a column from the table and every export. Nothing is deleted — every
// one of these columns is either a fixed input or computed fresh on every
// render, so showAllSsColumns() below brings it right back, in whatever
// relative order it's remembered in.
function hideSsColumn(id){
  if(id === "ticker") return;
  saveSsColumnOrder(getSsColumnOrder().filter(cid => cid !== id));
  const hidden = getSsHiddenColumns();
  if(!hidden.includes(id)) saveSsHiddenColumns([...hidden, id]);
  if(ssColumnSortState && ssColumnSortState.colId === id) ssColumnSortState = null;
}

// The undo for hideSsColumn — restores every hidden column, appended back
// onto the end of the visible order.
function showAllSsColumns(){
  const hidden = getSsHiddenColumns();
  if(hidden.length === 0) return;
  saveSsColumnOrder([...getSsColumnOrder(), ...hidden]);
  saveSsHiddenColumns([]);
}

// The single source of truth for "what does the table look like right now":
// the Ticker column definition, plus the currently-visible non-ticker columns
// already in display order. The header, the row renderer, the empty-state
// colspan, and the Excel/Text/Word/PDF exports all build from this, so hiding
// or reordering a column changes every one of them together.
function getSalesStrategyDisplayColumns(){
  const byId = {};
  SALES_STRATEGY_COLUMNS.forEach(c => { byId[c.id] = c; });
  const columns = getSsColumnOrder().map(id => byId[id]).filter(Boolean);
  return { ticker: byId.ticker, columns };
}

function buildSalesStrategyHeaderRow(){
  const { ticker, columns } = getSalesStrategyDisplayColumns();
  const tickerSorted = ssColumnSortState && ssColumnSortState.colId === ticker.id;
  const tickerIcon = tickerSorted ? (ssColumnSortState.direction === "asc" ? "▲" : "▼") : "⇅";
  let html = `<th>
    <div><span class="ss-th-label">${escHtml(ticker.label)}</span></div>
    <div class="col-header-controls">
      <button type="button" class="ss-col-btn col-ctrl-btn ${tickerSorted ? "col-ctrl-sort-active" : ""}" data-action="sort" data-col-id="${ticker.id}" title="Sort by ${escAttr(ticker.label)}">${tickerIcon}</button>
    </div>
  </th>`;
  columns.forEach((c, idx) => {
    const isSorted = ssColumnSortState && ssColumnSortState.colId === c.id;
    const icon = isSorted ? (ssColumnSortState.direction === "asc" ? "▲" : "▼") : "⇅";
    html += `<th>
      <div><span class="ss-th-label">${escHtml(c.label)}</span></div>
      <div class="col-header-controls">
        <button type="button" class="ss-col-btn col-ctrl-btn ${isSorted ? "col-ctrl-sort-active" : ""}" data-action="sort" data-col-id="${c.id}" title="Sort by ${escAttr(c.label)}">${icon}</button>
        <button type="button" class="ss-col-btn col-ctrl-btn" data-action="move" data-col-id="${c.id}" data-dir="-1" ${idx === 0 ? "disabled" : ""} title="Move left">&lt;</button>
        <button type="button" class="ss-col-btn col-ctrl-btn" data-action="move" data-col-id="${c.id}" data-dir="1" ${idx === columns.length - 1 ? "disabled" : ""} title="Move right">&gt;</button>
        <button type="button" class="ss-col-btn col-ctrl-btn col-ctrl-remove" data-action="remove" data-col-id="${c.id}" title="Hide this column (use “Show all columns” below the table to bring it back)">&times;</button>
      </div>
    </th>`;
  });
  return html;
}

// Wires the sort/move/remove buttons built by buildSalesStrategyHeaderRow
// above — same convention as Past Purchases' own
// wirePastPurchasesHeaderButtons, just hide instead of destroy for "remove".
function wireSalesStrategyHeaderButtons(theadEl){
  if(!theadEl) return;
  theadEl.querySelectorAll(".ss-col-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const colId = btn.getAttribute("data-col-id");
      const action = btn.getAttribute("data-action");
      if(action === "sort"){
        if(!ssColumnSortState || ssColumnSortState.colId !== colId){
          ssColumnSortState = { colId, direction: "asc" };
        } else if(ssColumnSortState.direction === "asc"){
          ssColumnSortState = { colId, direction: "desc" };
        } else {
          ssColumnSortState = null;
        }
        renderSalesStrategyTable();
      } else if(action === "move"){
        moveSsColumn(colId, parseInt(btn.getAttribute("data-dir"), 10));
        renderSalesStrategyTable();
      } else if(action === "remove"){
        hideSsColumn(colId);
        renderSalesStrategyTable();
      }
    });
  });
}

// Small "N column(s) hidden" notice + "Show all columns" link, shown right
// above the table whenever hideSsColumn has hidden at least one column — the
// only way back, since (unlike Past Purchases' own Columns panel) there's no
// separate column-management UI for Sales Strategy to restore one from.
function renderSsHiddenColumnsNotice(){
  const el = document.getElementById("ssHiddenColumnsNotice");
  if(!el) return;
  const hidden = getSsHiddenColumns();
  if(hidden.length === 0){ el.innerHTML = ""; return; }
  const labelById = {};
  SALES_STRATEGY_COLUMNS.forEach(c => { labelById[c.id] = c.label; });
  const names = hidden.map(id => labelById[id] || id).join(", ");
  el.innerHTML = `<span style="color:var(--text-secondary); font-size:0.85rem;">${hidden.length} column${hidden.length === 1 ? "" : "s"} hidden (${escHtml(names)}) — </span> <button type="button" id="ssShowAllColumnsBtn" class="tab-btn" style="padding:0.3rem 0.8rem; font-size:0.8rem;">Show all columns</button>`;
  const btn = el.querySelector("#ssShowAllColumnsBtn");
  if(btn) btn.addEventListener("click", () => { showAllSsColumns(); renderSalesStrategyTable(); });
}

// Renders one <td> for a given non-ticker column id — exactly the same
// formatting/color/title logic each column has always had, just factored out
// so renderSalesStrategyRowHTML (below) can loop over whichever columns are
// currently visible, in whatever order the user has them in, instead of
// assuming a fixed sequence.
function renderSalesStrategyCellHTML(colId, r){
  switch(colId){
    case "currentPrice": {
      const priceText = r.currentPrice === null ? "—" : `$${r.currentPrice.toFixed(2)}`;
      return `<td>${priceText}</td>`;
    }
    case "unitsToSell": {
      const disabled = r.saleRealizedDate ? "disabled" : "";
      const overOwnInput = (!r.saleRealizedDate && r.unitsToSell > r.unitsLeft + PP_EPS) ? ' style="border-color:#ef4444;"' : "";
      return `<td><input class="cell-input cell-input-num ss-input" data-row-id="${r.id}" data-field="unitsToSell" type="number" step="1" value="${r.unitsToSell}" ${disabled}${overOwnInput}></td>`;
    }
    case "sellingPrice": {
      const disabled = r.saleRealizedDate ? "disabled" : "";
      return `<td><input class="cell-input cell-input-num ss-input" data-row-id="${r.id}" data-field="sellingPrice" type="number" step="0.01" value="${r.sellingPrice}" ${disabled}></td>`;
    }
    case "totalPurchased":
      return `<td>${ppFmtNum(r.totalPurchased)}</td>`;
    case "totalSold":
      return `<td>${ppFmtNum(r.totalSold)}</td>`;
    case "unitsLeft": {
      const overCommittedTitle = r.overCommitted
        ? ` title="Other pending draft rows for ${escAttr(r.ticker)} already plan to sell more than is held — this is over-committed."`
        : "";
      const unitsLeftColor = r.overCommitted ? "#ef4444" : "var(--text-primary)";
      return `<td style="color:${unitsLeftColor}; font-weight:600;"${overCommittedTitle}>${ppFmtNum(r.unitsLeft)}</td>`;
    }
    case "avgPurchasePriceOfUnitsLeft": {
      const avgPriceText = r.unitsLeft > PP_EPS ? `$${r.avgPurchasePriceOfUnitsLeft.toFixed(2)}` : "—";
      return `<td>${avgPriceText}</td>`;
    }
    case "saleRealizedDate":
      return r.saleRealizedDate
        ? `<td><span style="color:var(--emerald); font-weight:600;" title="This draft became a real sale row on the Lot Matching table above.">&#10003; ${escHtml(r.saleRealizedDate)}</span></td>`
        : `<td><button type="button" class="ss-confirm-btn tab-btn" data-row-id="${r.id}" style="padding:0.4rem 0.9rem; font-size:0.85rem;">Confirm Sale</button></td>`;
    default:
      return "<td></td>";
  }
}

function renderSalesStrategyRowHTML(r, idx, total){
  // v5.71: ↑/↓ reorder this one row, same idea (and row-ctrl-btn look) as the
  // Lot Matching table's per-ticker ↑/↓. v5.73: a REALIZED row now also gets
  // ↑/↓ and × (no Dup/Save — there's nothing left to plan or duplicate once a
  // row is a done, locked sale) instead of showing plain text with no
  // controls at all.
  const upDisabled = idx === 0 ? "disabled" : "";
  const downDisabled = idx === total - 1 ? "disabled" : "";

  const tickerCell = r.saleRealizedDate
    ? `<td>
        <div style="font-weight:600;">${escHtml(r.ticker)}</div>
        <div class="row-ctrl-controls">
          <button type="button" class="ss-move-btn row-ctrl-btn" data-row-id="${r.id}" data-dir="-1" ${upDisabled} title="Move this row up">&uarr;</button>
          <button type="button" class="ss-move-btn row-ctrl-btn" data-row-id="${r.id}" data-dir="1" ${downDisabled} title="Move this row down">&darr;</button>
          <button type="button" class="ss-remove-btn row-ctrl-btn row-ctrl-remove" data-row-id="${r.id}" data-ticker="${escAttr(r.ticker)}" data-realized="1" title="Remove this completed sale record from this table — the real sale on Past Purchases/Lot Matching is not affected">&times;</button>
        </div>
      </td>`
    : `<td>
        <div style="font-weight:600;">${escHtml(r.ticker)}</div>
        <div class="row-ctrl-controls">
          <button type="button" class="ss-move-btn row-ctrl-btn" data-row-id="${r.id}" data-dir="-1" ${upDisabled} title="Move this row up">&uarr;</button>
          <button type="button" class="ss-move-btn row-ctrl-btn" data-row-id="${r.id}" data-dir="1" ${downDisabled} title="Move this row down">&darr;</button>
          <button type="button" class="ss-save-btn row-ctrl-btn" data-row-id="${r.id}" title="Save this batch's Units to Sell/Selling Price. If any units of ${escAttr(r.ticker)} are still left over once every row is counted, a new blank row is added below to plan them too — so none get missed." style="width:auto; padding:0 0.5rem; font-size:0.7rem; color:#34d399;">Save</button>
          <button type="button" class="ss-dup-btn row-ctrl-btn" data-row-id="${r.id}" title="Duplicate this row below, same ticker — plan selling another batch at a different price" style="width:auto; padding:0 0.5rem; font-size:0.7rem;">Dup</button>
          <button type="button" class="ss-remove-btn row-ctrl-btn row-ctrl-remove" data-row-id="${r.id}" data-ticker="${escAttr(r.ticker)}" title="Remove this draft row — it was never a real sale">&times;</button>
        </div>
      </td>`;

  const { columns } = getSalesStrategyDisplayColumns();
  const cellsHtml = columns.map(c => renderSalesStrategyCellHTML(c.id, r)).join("");

  return `<tr>${tickerCell}${cellsHtml}</tr>`;
}

function renderSalesStrategyTable(){
  const container = document.getElementById("ssTableContent");
  if(!container) return; // section not present in this build/test harness

  const resolvedRows = buildSalesStrategyRowsResolved();
  lastSalesStrategyResolvedRows = resolvedRows;

  const { columns } = getSalesStrategyDisplayColumns();
  const colCount = 1 + columns.length;
  const bodyHtml = resolvedRows.length === 0
    ? `<tr><td colspan="${colCount}" style="color:var(--text-secondary); padding:1.25rem 1rem;">No draft sales yet — one is auto-added the moment you hold a ticker on the Past Purchases list above.</td></tr>`
    : resolvedRows.map((r, idx) => renderSalesStrategyRowHTML(r, idx, resolvedRows.length)).join("");

  container.innerHTML = `<div class="table-container"><table><thead><tr>${buildSalesStrategyHeaderRow()}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
  wireSalesStrategyEditing(container);
  wireSalesStrategyHeaderButtons(container.querySelector("thead"));
  renderSsHiddenColumnsNotice();
}

// Small modal (same self-built overlay pattern as
// showPastPurchasesImportConflictDialog) asking which date the sale actually
// happened on, defaulting to today. Resolves the chosen "YYYY-MM-DD" string, or
// null if cancelled (Escape or the Cancel button) — the caller treats null as
// "don't realize anything."
function showSaleRealizedConfirmDialog(resolvedRow){
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.72); display:flex; align-items:center; justify-content:center; padding:16px;";
    const panel = document.createElement("div");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.style.cssText = "background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:1.25rem; width:100%; max-width:420px; color:var(--text-primary);";
    const today = new Date().toISOString().slice(0, 10);
    panel.innerHTML = `
      <h3 style="margin:0 0 0.5rem; color:#facc15; font-size:1.1rem;">Confirm sale of ${escHtml(resolvedRow.ticker)}</h3>
      <div style="color:var(--text-secondary); font-size:0.9rem; line-height:1.5; margin-bottom:0.9rem;">
        This adds a real sale row to the Lot Matching table above: <strong>${ppFmtNum(resolvedRow.unitsToSell)}</strong> unit(s) of <strong>${escHtml(resolvedRow.ticker)}</strong> at <strong>$${Number(resolvedRow.sellingPrice).toFixed(2)}</strong>. Pick the date this sale actually happened.
      </div>
      <label style="display:flex; flex-direction:column; font-size:0.85rem; color:var(--text-secondary); gap:4px; margin-bottom:1rem;">Sale date
        <input type="date" id="ssConfirmDateInput" class="form-input" value="${today}">
      </label>
      <div style="display:flex; gap:0.6rem; justify-content:flex-end;">
        <button type="button" class="tab-btn" data-final="cancel">Cancel</button>
        <button type="button" data-final="confirm" style="padding:0.6rem 1.4rem;">Confirm Sale</button>
      </div>`;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    const dateInput = panel.querySelector("#ssConfirmDateInput");
    const finish = (value) => { document.removeEventListener("keydown", onKey); overlay.remove(); resolve(value); };
    const onKey = (e) => { if(e.key === "Escape") finish(null); };
    document.addEventListener("keydown", onKey);
    panel.querySelector('[data-final="cancel"]').addEventListener("click", () => finish(null));
    panel.querySelector('[data-final="confirm"]').addEventListener("click", () => finish(dateInput.value || today));
  });
}

function wireSalesStrategyEditing(container){
  if(!container) return;

  container.querySelectorAll(".ss-input").forEach(el => {
    el.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-row-id");
      const field = e.target.getAttribute("data-field");
      let value = parseFloat(e.target.value);
      if(isNaN(value)) value = 0;
      setSalesStrategyValue(id, field, value);
      renderSalesStrategyTable();
    });
    el.addEventListener("keydown", (e) => { if(e.key === "Enter"){ e.preventDefault(); el.blur(); } });
  });

  container.querySelectorAll(".ss-move-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      moveSalesStrategyRow(btn.getAttribute("data-row-id"), parseInt(btn.getAttribute("data-dir"), 10));
      renderSalesStrategyTable();
    });
  });

  container.querySelectorAll(".ss-save-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-row-id");
      const tr = btn.closest("tr");
      // Read the inputs' LIVE values directly, not the already-stored row --
      // if the user clicks Save right after typing (before the field's own
      // "change"/blur fires), this is what picks up that latest value.
      const unitsInput = tr ? tr.querySelector("input[data-field='unitsToSell']") : null;
      const priceInput = tr ? tr.querySelector("input[data-field='sellingPrice']") : null;
      const units = unitsInput ? parseFloat(unitsInput.value) : 0;
      const price = priceInput ? parseFloat(priceInput.value) : 0;
      saveSalesStrategyRowAndSplit(id, isNaN(units) ? 0 : units, isNaN(price) ? 0 : price);
      renderSalesStrategyTable();
    });
  });

  container.querySelectorAll(".ss-dup-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      duplicateSalesStrategyRow(btn.getAttribute("data-row-id"));
      renderSalesStrategyTable();
    });
  });

  container.querySelectorAll(".ss-remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const ticker = btn.getAttribute("data-ticker");
      // v5.73: a REALIZED row's × removes it from this display only — it
      // already created a real sale on Past Purchases/Lot Matching, unlike a
      // draft row's × (which never was a real sale), so the confirmation
      // wording has to say something different depending on which this is.
      const isRealized = btn.getAttribute("data-realized") === "1";
      const message = isRealized
        ? `Remove this completed "${ticker}" sale record from the Sales Strategy table? The real sale it created on Past Purchases/Lot Matching is NOT affected — this only removes it from this display.`
        : `Remove this draft "${ticker}" sale plan row? This only removes the plan — it was never a real sale.`;
      if(confirm(message)){
        removeSalesStrategyRow(btn.getAttribute("data-row-id"));
        renderSalesStrategyTable();
      }
    });
  });

  container.querySelectorAll(".ss-confirm-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-row-id");
      const resolvedRow = buildSalesStrategyRowsResolved().find(r => r.id === id);
      if(!resolvedRow) return;
      if(resolvedRow.unitsToSell <= 0){
        alert("Enter how many units to sell (greater than 0) before confirming the sale.");
        return;
      }
      const dateStr = await showSaleRealizedConfirmDialog(resolvedRow);
      if(!dateStr) return; // cancelled
      realizeSalesStrategyRow(id, dateStr);
      // Realizing a draft touches the REAL Past Purchases data (a new sale row),
      // so re-render from there — it cascades into Lot Matching, the footer
      // totals, Current Holding, and this table too (see the hook at the end of
      // renderPastPurchasesTable above).
      renderPastPurchasesTable();
    });
  });
}

// v5.73: the manual "Ticker [dropdown] + Add Row" UI (and the function that
// wired it, wireUpSalesStrategyAddRow) is gone — auto-populate
// (syncSalesStrategyFromHoldings, v5.70) and the ticker cell's own Save
// button (saveSalesStrategyRowAndSplit, v5.72) together mean a draft row for
// every held ticker is already there, and any remaining units always get
// their own follow-up row, with no manual "add a row" step needed anymore.
// addSalesStrategyRow(ticker) itself is KEPT — it's still used internally by
// the sync/import/duplicate functions above (and their tests).

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

// --- Export cell colors ---
// Word and PDF exports render as documents with a WHITE page background (unlike
// this app's dark theme), so these are print-legible equivalents of the live
// table's on-screen colors, not the exact same hex values — e.g. the light blue
// used for an unsold Book Value on screen (#7dd3fc) is nearly invisible on white
// paper, so its export counterpart is a darker, still-distinctly-lighter-than-
// accent-blue shade. Each key's MEANING matches the live table (green = positive,
// red = negative, grey = neutral/unconfirmed, accent blue = totals, light blue =
// still-held position) even where the exact hex differs for legibility.
const EXPORT_COLORS = {
  emerald: "#059669",
  red: "#dc2626",
  grey: "#64748b",
  blue: "#2563eb",
  lightBlue: "#0ea5e9",
  dustyPink: "#c98a9e",
  violet: "#7c3aed",
};

// --- On-demand CDN loading with retry + multi-host fallback, for the Excel export
// helper library ---
// index.html still loads this once at page-load time (so the common case has zero
// extra delay), but that's a single unretried attempt against a single CDN host —
// if it ever fails, the feature used to stay broken until a full page reload. This
// export function now re-attempts the load right at click time, AND tries multiple
// independent CDN hosts (jsdelivr, cdnjs, unpkg) in turn — since a network that
// blocks one of these (an ad-blocker rule, a corporate firewall, a country-level
// block on a specific CDN) often doesn't block the others, this recovers from that
// case too, not just a transient hiccup on the same host.
// (PDF export used to need a similar library — jsPDF + autotable — but some networks
// block ALL THREE CDN hosts at once, so it was switched to a dependency-free
// browser-print-dialog approach instead; see exportTableAsPdf below. Excel still
// needs a real library, since there's no browser-native way to produce a true .xlsx
// binary, so it keeps the CDN-retry approach.)
const EXPORT_LIB_URLS = {
  xlsx: [
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js",
  ],
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
// more script URLs (typically the same library from different CDN hosts) to try in
// order until checkFn passes. Stops as soon as it does, rather than loading every
// remaining host needlessly. Returns whether it's usable after trying.
async function ensureLibraryLoaded(checkFn, urls){
  if(checkFn()) return true;
  for(const url of urls){
    try{ await loadScriptOnce(url); }catch(e){ /* try the next host */ }
    if(checkFn()) return true;
  }
  return checkFn();
}

async function exportTableAsExcel(filename, sheetName, headers, rows){
  const ok = await ensureLibraryLoaded(() => typeof XLSX !== "undefined", EXPORT_LIB_URLS.xlsx);
  if(!ok){
    alert('Excel export needs its helper library, and it could not be loaded from any available source just now. Please check your internet connection (or any ad-blocker/firewall that might be blocking cdn.jsdelivr.net, cdnjs.cloudflare.com, or unpkg.com) and try again — or use "Export to Word" instead, which needs no internet connection.');
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
function exportTableAsWord(filename, title, headers, rows, colors){
  const escCell = (v) => {
    const s = (v === undefined || v === null) ? "" : String(v);
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  const headHtml = "<tr>" + headers.map(h => `<th style="background:#1e293b;color:#ffffff;padding:6px 10px;border:1px solid #334155;">${escCell(h)}</th>`).join("") + "</tr>";
  // colors (when passed) is a 2D array parallel to rows, giving an inline font color
  // for individual cells — the same cells that are colored on the live table (Sale
  // Profit, Missed Gain %, Book Value, Implied Upside, and the summary footer rows),
  // using the print-legible EXPORT_COLORS palette rather than the live dark-theme hex.
  const bodyHtml = rows.map((r, rIdx) => "<tr>" + r.map((c, cIdx) => {
    const color = colors && colors[rIdx] ? colors[rIdx][cIdx] : null;
    const colorStyle = color ? `color:${color};` : "";
    return `<td style="padding:6px 10px;border:1px solid #334155;${colorStyle}">${escCell(c)}</td>`;
  }).join("") + "</tr>").join("");
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

// Dependency-free: PDF export used to rely on jsPDF + autotable pulled from a CDN at
// click time. In practice, some networks (ad-blockers, corporate/country firewalls)
// block ALL of jsdelivr, cdnjs, AND unpkg at once, so no amount of CDN fallback fixes
// it for those users. This builds a print-friendly HTML table in a hidden iframe and
// invokes the browser's own native print dialog — the user picks "Save as PDF" as the
// destination. Zero network calls, zero external libraries — same reliability as the
// Text/Word exports, which is why those never had this problem.
function exportTableAsPdf(filename, title, headers, rows, colors){
  const escCell = (v) => {
    const s = (v === undefined || v === null) ? "" : String(v);
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  const headHtml = "<tr>" + headers.map(h => `<th>${escCell(h)}</th>`).join("") + "</tr>";
  // Same colors convention as exportTableAsWord above — an optional 2D array
  // parallel to rows, applied as an inline font color per cell.
  const bodyHtml = rows.map((r, rIdx) => "<tr>" + r.map((c, cIdx) => {
    const color = colors && colors[rIdx] ? colors[rIdx][cIdx] : null;
    const colorStyle = color ? ` style="color:${color};"` : "";
    return `<td${colorStyle}>${escCell(c)}</td>`;
  }).join("") + "</tr>").join("");
  const docTitle = escCell((filename || title || "export").replace(/\.pdf$/i, ""));
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${docTitle}</title>
<style>
  @page { size: landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Segoe UI, Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
  h2 { font-size: 16px; margin: 0 0 2px 0; }
  .meta { font-size: 10px; color: #6b7280; margin: 0 0 12px 0; }
  table { border-collapse: collapse; width: 100%; font-size: 9px; }
  th, td { border: 1px solid #94a3b8; padding: 4px 6px; text-align: left; }
  th { background: #1e293b; color: #ffffff; }
  tr:nth-child(even) td { background: #f1f5f9; }
</style>
</head>
<body>
  <h2>${escCell(title)}</h2>
  <p class="meta">Exported ${escCell(new Date().toLocaleString())}</p>
  <table><thead>${headHtml}</thead><tbody>${bodyHtml}</tbody></table>
</body></html>`;

  let iframe = document.getElementById("pdfPrintFrame");
  if(iframe) iframe.remove();
  iframe = document.createElement("iframe");
  iframe.id = "pdfPrintFrame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Call print() synchronously, in the SAME call stack as the click that triggered
  // this export — no setTimeout/async gap. This table's HTML has no external
  // resources (no images, fonts, or scripts to fetch), so doc.write()/doc.close()
  // already leaves it fully parsed and laid out by the time doc.close() returns —
  // nothing is gained by waiting. A delay here (even a few ms, via setTimeout or an
  // onload handler) happens in a separate task from the original click, so the
  // browser no longer treats the print() call as a direct result of the user's
  // gesture — that's what was causing Chrome's extra "This page is trying to
  // print — do you want to print this page?" confirmation before the real print
  // dialog. Calling it immediately keeps it tied to the click and skips that prompt.
  try{
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }catch(e){
    alert("Could not open the print dialog for PDF export. Please try again, or use \"Export to Word\" instead.");
  }
}

// Renders one main-table cell to a plain export value (mirrors renderCellHTML's
// formatting for computed/custom columns, but returns text/numbers instead of HTML).
function getMainTableExportValue(item, colDef){
  if(colDef.id === "stability") return item.stability;
  if(colDef.id === "calculatedUpside") return (item.calculatedUpside >= 0 ? "+" : "") + (item.calculatedUpside * 100).toFixed(1) + "%";
  if(colDef.id === "allocationWeight") return item.allocationWeight.toFixed(2) + "%";
  if(colDef.id === "cashRunway"){
    if(item.cashRunway >= 99999) return "N/A (needs Cash & Equivalents / Operating Expenses)";
    return item.cashRunway.toFixed(1);
  }
  if(colDef.isCustom){
    const val = item.customValues[colDef.id];
    const isDefault = item.customIsDefault && item.customIsDefault[colDef.id];
    if(colDef.computed && colDef.formula === "salesProfitPP"){
      if(isDefault) return "—";
      const num = Number(val) || 0;
      return (num >= 0 ? "+" : "-") + "$" + Math.abs(num).toFixed(2);
    }
    if(colDef.computed && colDef.formula === "unrealizedGainPP"){
      if(isDefault) return "—";
      const num = Number(val) || 0;
      return (num >= 0 ? "+" : "-") + "$" + Math.abs(num).toFixed(2);
    }
    if(colDef.computed && (colDef.formula === "bookValuePP" || colDef.formula === "currentMarketValuePP")){
      if(isDefault) return "—";
      return "$" + Math.abs(Number(val) || 0).toFixed(2);
    }
    if(colDef.computed) return Number(val).toFixed(1) + "%";
    return val;
  }
  return item[colDef.id];
}

// Companion to getMainTableExportValue: returns an EXPORT_COLORS value for a cell
// that's colored on the live table, or null for a cell that renders in the default
// text color. Mirrors renderCellHTML's color decisions exactly (Implied Upside,
// Realized Gain, Unrealized Gain, Missed Gain %, Book Value), just using the print-legible export
// palette instead of the live dark-theme hex values.
function getMainTableExportColor(item, colDef){
  if(colDef.id === "calculatedUpside") return item.calculatedUpside >= 0 ? EXPORT_COLORS.emerald : EXPORT_COLORS.red;
  if(colDef.id === "cashRunway") return (item.cashRunway < 99999 && item.cashRunway < 2) ? EXPORT_COLORS.red : null;
  if(colDef.id === "currentPrice"){
    return isAtOrBelowBuyPriceTarget(item.currentPrice, getCustomParams(), item.customValues) ? EXPORT_COLORS.emerald : null;
  }
  if(colDef.isCustom){
    const val = item.customValues[colDef.id];
    const isDefault = item.customIsDefault && item.customIsDefault[colDef.id];
    if(colDef.computed && colDef.formula === "salesProfitPP"){
      if(isDefault) return EXPORT_COLORS.grey;
      const num = Number(val) || 0;
      return num >= 0 ? EXPORT_COLORS.emerald : EXPORT_COLORS.red;
    }
    if(colDef.computed && colDef.formula === "unrealizedGainPP"){
      if(isDefault) return EXPORT_COLORS.grey;
      const num = Number(val) || 0;
      return num >= 0 ? EXPORT_COLORS.emerald : EXPORT_COLORS.dustyPink;
    }
    if(colDef.computed && colDef.formula === "missedGainPct"){
      const num = Number(val) || 0;
      if(isDefault || num === 0) return EXPORT_COLORS.grey;
      return num > 0 ? EXPORT_COLORS.emerald : EXPORT_COLORS.red;
    }
    if(colDef.computed && colDef.formula === "bookValuePP"){
      if(isDefault) return null;
      const allParamsForColor = getCustomParams();
      const sellParamForColor = allParamsForColor.find(p => !p.computed && String(p.label).trim().toLowerCase() === "selling price");
      const sellValForColor = sellParamForColor ? (Number(item.customValues[sellParamForColor.id]) || 0) : 0;
      return sellValForColor === 0 ? EXPORT_COLORS.lightBlue : null;
    }
    if(colDef.computed && colDef.formula === "currentMarketValuePP"){
      return isDefault ? null : EXPORT_COLORS.violet;
    }
  }
  return null;
}

function buildMainTableExportTable(){
  const columnOrder = getColumnOrder();
  const defsById = Object.fromEntries(getAllColumnDefs().map(d => [d.id, d]));
  const headers = ["Ticker", ...columnOrder.map(id => (defsById[id] ? defsById[id].label : id))];
  const rows = lastMainTableProcessedAssets.map(item => [
    item.ticker,
    ...columnOrder.map(id => defsById[id] ? getMainTableExportValue(item, defsById[id]) : "")
  ]);
  const colors = lastMainTableProcessedAssets.map(item => [
    null,
    ...columnOrder.map(id => defsById[id] ? getMainTableExportColor(item, defsById[id]) : null)
  ]);
  return { headers, rows, colors };
}

// Companion to the per-row value logic below: returns a colors row (parallel to a
// cells row, ticker column always null) for a Past Purchases row, mirroring
// renderPastPurchasesTable's row-loop color decisions with the export palette.
function getPastPurchasesExportRowColors(resolved, params){
  return [null, ...params.map(p => {
    if(p.computed && p.formula === "salesProfitPP"){
      const ready = resolved["_" + p.id + "_ready"];
      if(!ready) return EXPORT_COLORS.grey;
      const val = resolved[p.id] || 0;
      return val >= 0 ? EXPORT_COLORS.emerald : EXPORT_COLORS.red;
    }
    if(p.computed && p.formula === "unrealizedGainPP"){
      const ready = resolved["_" + p.id + "_ready"];
      if(!ready) return EXPORT_COLORS.grey;
      const val = resolved[p.id] || 0;
      return val >= 0 ? EXPORT_COLORS.emerald : EXPORT_COLORS.dustyPink;
    }
    if(p.computed && p.formula === "missedGainPct"){
      const ready = resolved["_" + p.id + "_ready"];
      const val = resolved[p.id] || 0;
      if(!ready || val === 0) return EXPORT_COLORS.grey;
      return val > 0 ? EXPORT_COLORS.emerald : EXPORT_COLORS.red;
    }
    if(p.computed && p.formula === "bookValuePP"){
      const ready = resolved["_" + p.id + "_ready"];
      if(!ready) return null;
      const li = resolved._ledger;
      return (li && li.heldUnits > PP_EPS) ? EXPORT_COLORS.lightBlue : null;
    }
    if(p.computed && p.formula === "currentMarketValuePP"){
      const ready = resolved["_" + p.id + "_ready"];
      return ready ? EXPORT_COLORS.violet : null;
    }
    if(!p.computed && String(p.label).trim().toLowerCase() === "current price"){
      return isAtOrBelowBuyPriceTarget(resolved[p.id], params, resolved) ? EXPORT_COLORS.emerald : null;
    }
    return null;
  })];
}

// Mirrors the tfoot logic in renderPastPurchasesTable() (monthly subtotals +
// grand total) so exports carry the same summary rows shown on screen.
function buildPastPurchasesExportTable(){
  const params = getPastPurchasesParams();
  // Body rows mirror exactly what's currently visible on screen (respecting the
  // "Current Holdings" filter, if it's on). v5.63: no more summary/total rows here —
  // this table no longer carries its own tfoot (see renderPastPurchasesTable); the
  // accurate totals are the Lot Matching (FIFO) table's own summary rows instead.
  const visibleRows = lastPastPurchasesVisibleRows || lastPastPurchasesOrderedRows || [];
  const headers = ["Ticker", ...params.map(p => p.label)];

  const rows = [];
  const colors = [];
  visibleRows.forEach(row => {
    const resolved = resolvePastPurchaseRowValues(row);
    const cells = params.map(p => {
      if(p.computed && p.formula === "salesProfitPP"){
        const ready = resolved["_" + p.id + "_ready"];
        if(!ready) return "—";
        const val = resolved[p.id] || 0;
        return (val >= 0 ? "+" : "-") + "$" + Math.abs(val).toFixed(2);
      }
      if(p.computed && p.formula === "unrealizedGainPP"){
        const ready = resolved["_" + p.id + "_ready"];
        if(!ready) return "—";
        const val = resolved[p.id] || 0;
        return (val >= 0 ? "+" : "-") + "$" + Math.abs(val).toFixed(2);
      }
      if(p.computed && (p.formula === "bookValuePP" || p.formula === "currentMarketValuePP")){
        const ready = resolved["_" + p.id + "_ready"];
        if(!ready) return "—";
        return "$" + Math.abs(resolved[p.id] || 0).toFixed(2);
      }
      if(p.computed){
        const ready = resolved["_" + p.id + "_ready"];
        if(ready === false) return "—";
        return Number(resolved[p.id] || 0).toFixed(1) + "%";
      }
      return resolved[p.id];
    });
    rows.push([row.asset, ...cells]);
    colors.push(getPastPurchasesExportRowColors(resolved, params));
  });

  return { headers, rows, colors };
}

// Excel and Text exports have no way to show real cell color the way Word/PDF do
// (colored via getMainTableExportColor/getPastPurchasesExportRowColors instead —
// Excel's export library can't write cell styles, and plain text has no color at
// all). So for those two formats only, the "hit your buy target" signal is carried
// as a plain "At Buy Target" Yes/No column appended onto a COPY of the export
// table instead — Word/PDF are untouched by these and keep just the color, since
// showing both there would be redundant. Main table export rows are a 1:1 map of
// lastMainTableProcessedAssets, so no per-row lookup is needed beyond that.
function withBuyTargetColumnMainTable(headers, rows){
  const params = getCustomParams();
  const newHeaders = [...headers, "At Buy Target"];
  const newRows = rows.map((r, idx) => {
    const item = lastMainTableProcessedAssets[idx];
    const hit = item ? isAtOrBelowBuyPriceTarget(item.currentPrice, params, item.customValues) : false;
    return [...r, hit ? "Yes" : "No"];
  });
  return { headers: newHeaders, rows: newRows };
}

// Same idea for Past Purchases, but its export rows include summary/footer rows
// AFTER the per-asset ones (Total current market and book value, Total Realized
// Gain to date, monthly breakdowns — see buildPastPurchasesExportTable above) — only the first
// visibleRows.length rows are real assets, so only those get a Yes/No; footer
// rows get a blank cell, matching how every other non-participating column in
// those rows is already left blank.
function withBuyTargetColumnPastPurchases(headers, rows){
  const params = getPastPurchasesParams();
  const visibleRows = lastPastPurchasesVisibleRows || lastPastPurchasesOrderedRows || [];
  const cpParam = params.find(p => !p.computed && String(p.label).trim().toLowerCase() === "current price");
  const newHeaders = [...headers, "At Buy Target"];
  const newRows = rows.map((r, idx) => {
    if(idx >= visibleRows.length || !cpParam) return [...r, ""]; // a footer/summary row, or no Current Price column to check
    const resolved = resolvePastPurchaseRowValues(visibleRows[idx]);
    const hit = isAtOrBelowBuyPriceTarget(resolved[cpParam.id], params, resolved);
    return [...r, hit ? "Yes" : "No"];
  });
  return { headers: newHeaders, rows: newRows };
}

// v5.71: Export to Excel/Text/Word/PDF for Sales Strategy, same idea as
// buildPastPurchasesExportTable above — reads from buildSalesStrategyRowsResolved
// (the exact same source renderSalesStrategyTable() itself renders from, respecting
// whatever column sort is currently active) and mirrors renderSalesStrategyRowHTML's
// own formatting/colors, just with the print-legible EXPORT_COLORS palette instead
// of the live dark-theme hex values.
// v5.73: follows whatever columns are currently visible/reordered (see
// getSalesStrategyDisplayColumns) rather than the full fixed
// SALES_STRATEGY_COLUMNS list directly, for the same "export what you see"
// consistency Past Purchases' own exports already have with its column order.
function buildSalesStrategyExportTable(){
  const resolvedRows = buildSalesStrategyRowsResolved();
  const { ticker, columns } = getSalesStrategyDisplayColumns();
  const headers = [ticker.label, ...columns.map(c => c.label)];
  const rows = [];
  const colors = [];
  resolvedRows.forEach(r => {
    const priceText = r.currentPrice === null ? "—" : `$${r.currentPrice.toFixed(2)}`;
    const avgPriceText = r.unitsLeft > PP_EPS ? `$${r.avgPurchasePriceOfUnitsLeft.toFixed(2)}` : "—";
    const saleText = r.saleRealizedDate ? `Confirmed ${r.saleRealizedDate}` : "Pending";
    const valueById = {
      currentPrice: priceText,
      unitsToSell: r.unitsToSell,
      sellingPrice: r.sellingPrice,
      totalPurchased: r.totalPurchased,
      totalSold: r.totalSold,
      unitsLeft: r.unitsLeft,
      avgPurchasePriceOfUnitsLeft: avgPriceText,
      saleRealizedDate: saleText,
    };
    const colorById = {
      unitsLeft: r.overCommitted ? EXPORT_COLORS.red : null,
      saleRealizedDate: r.saleRealizedDate ? EXPORT_COLORS.emerald : null,
    };
    rows.push([r.ticker, ...columns.map(c => valueById[c.id])]);
    colors.push([null, ...columns.map(c => colorById[c.id] || null)]);
  });
  return { headers, rows, colors };
}

// Sales Strategy's own "Sample Excel for Data Entry" / "Import Excel" (v5.71) —
// same round-trippable companion idea as buildSampleExcelForDataEntry_PastPurchases
// below, scoped to Sales Strategy's only two typed-in fields (Units to Sell,
// Selling Price): Current Price/Total Purchased/Total Sold/Units Left/Average
// Purchase Price of Units Left are all derived fresh on every render, nothing to
// fill in for those. Only not-yet-realized (still-draft, still-editable) rows are
// included — a realized row is locked and done, there's nothing left to edit.
function buildSampleExcelForDataEntry_SalesStrategy(){
  const headers = ["Ticker", "Units to Sell", "Selling Price"];
  const rows = getSalesStrategyRows().filter(r => !r.saleRealizedDate).map(r => [r.ticker, r.unitsToSell || "", r.sellingPrice || ""]);
  return { headers, rows };
}

// Reads that same shape back — matched by column HEADER text (case-insensitive),
// same convention as Past Purchases' Import Excel, so reordering columns in the
// spreadsheet is safe and any header it doesn't recognize is reported rather than
// silently dropped. Unlike Past Purchases' import, there's no "identical/conflict"
// choice to make: each imported line becomes its OWN new draft row (two rows for
// the same ticker are legitimately different batches, not a conflict), EXCEPT a
// line that exactly matches an already-planned draft row (same ticker, same Units
// to Sell, same Selling Price) is recognized as already-imported and skipped — so
// re-importing an unchanged file is a safe no-op instead of piling up duplicate
// batches every time.
function importSalesStrategyFromRows(rowsAoA){
  if(!rowsAoA || rowsAoA.length < 2) return { added: 0, identical: 0, unmatchedHeaders: [] };
  const header = rowsAoA[0].map(h => String(h || "").trim().toLowerCase());
  const tickerIdx = header.indexOf("ticker");
  const unitsIdx = header.indexOf("units to sell");
  const priceIdx = header.indexOf("selling price");
  const recognizedIdx = new Set([tickerIdx, unitsIdx, priceIdx].filter(i => i >= 0));
  const unmatchedHeaders = rowsAoA[0].filter((h, i) => !recognizedIdx.has(i) && String(h || "").trim() !== "");

  // Local mirror of every still-draft row, seeded from what's already there and
  // grown as lines are imported, so a duplicate line later in the SAME file is
  // caught too (not just duplicates of what was already on the table before import).
  const seen = getSalesStrategyRows().filter(r => !r.saleRealizedDate)
    .map(r => ({ ticker: r.ticker, unitsToSell: Number(r.unitsToSell) || 0, sellingPrice: Number(r.sellingPrice) || 0 }));

  let added = 0, identical = 0;
  if(tickerIdx >= 0){
    for(let i = 1; i < rowsAoA.length; i++){
      const raw = rowsAoA[i];
      const rawTicker = parseImportedCellValue(raw[tickerIdx]);
      if(!rawTicker) continue; // blank Ticker cell -- nothing to import on this line
      const ticker = String(rawTicker).trim().toUpperCase();
      const units = unitsIdx >= 0 ? (parseImportedCellValue(raw[unitsIdx], "number") || 0) : 0;
      const price = priceIdx >= 0 ? (parseImportedCellValue(raw[priceIdx], "number") || 0) : 0;

      const alreadyThere = seen.some(s => s.ticker === ticker && s.unitsToSell === units && s.sellingPrice === price);
      if(alreadyThere){ identical++; continue; }

      const id = addSalesStrategyRow(ticker);
      if(units) setSalesStrategyValue(id, "unitsToSell", units);
      if(price) setSalesStrategyValue(id, "sellingPrice", price);
      seen.push({ ticker, unitsToSell: units, sellingPrice: price });
      added++;
    }
  }
  return { added, identical, unmatchedHeaders };
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
    const built = buildMainTableExportTable();
    const { headers, rows } = withBuyTargetColumnMainTable(built.headers, built.rows);
    exportTableAsExcel(`${activeListName()}.xlsx`, getActiveList().name || "Portfolio List", headers, rows);
  });
  const textBtn = document.getElementById("exportTextBtn");
  if(textBtn) textBtn.addEventListener("click", () => {
    const built = buildMainTableExportTable();
    const { headers, rows } = withBuyTargetColumnMainTable(built.headers, built.rows);
    exportTableAsText(`${activeListName()}.txt`, headers, rows);
  });
  const wordBtn = document.getElementById("exportWordBtn");
  if(wordBtn) wordBtn.addEventListener("click", () => {
    const { headers, rows, colors } = buildMainTableExportTable();
    exportTableAsWord(`${activeListName()}.doc`, getActiveList().name || "Portfolio List", headers, rows, colors);
  });
  const pdfBtn = document.getElementById("exportPdfBtn");
  if(pdfBtn) pdfBtn.addEventListener("click", () => {
    const { headers, rows, colors } = buildMainTableExportTable();
    exportTableAsPdf(`${activeListName()}.pdf`, getActiveList().name || "Portfolio List", headers, rows, colors);
  });

  const ppExcelBtn = document.getElementById("ppExportExcelBtn");
  if(ppExcelBtn) ppExcelBtn.addEventListener("click", () => {
    const built = buildPastPurchasesExportTable();
    const { headers, rows } = withBuyTargetColumnPastPurchases(built.headers, built.rows);
    exportTableAsExcel("Past_Purchases.xlsx", "Past Purchases", headers, rows);
  });
  const ppTextBtn = document.getElementById("ppExportTextBtn");
  if(ppTextBtn) ppTextBtn.addEventListener("click", () => {
    const built = buildPastPurchasesExportTable();
    const { headers, rows } = withBuyTargetColumnPastPurchases(built.headers, built.rows);
    exportTableAsText("Past_Purchases.txt", headers, rows);
  });
  const ppWordBtn = document.getElementById("ppExportWordBtn");
  if(ppWordBtn) ppWordBtn.addEventListener("click", () => {
    const { headers, rows, colors } = buildPastPurchasesExportTable();
    exportTableAsWord("Past_Purchases.doc", "Past Purchases", headers, rows, colors);
  });
  const ppPdfBtn = document.getElementById("ppExportPdfBtn");
  if(ppPdfBtn) ppPdfBtn.addEventListener("click", () => {
    const { headers, rows, colors } = buildPastPurchasesExportTable();
    exportTableAsPdf("Past_Purchases.pdf", "Past Purchases", headers, rows, colors);
  });

  // --- Sales Strategy (v5.71) ---
  const ssExcelBtn = document.getElementById("ssExportExcelBtn");
  if(ssExcelBtn) ssExcelBtn.addEventListener("click", () => {
    const { headers, rows } = buildSalesStrategyExportTable();
    exportTableAsExcel("Sales_Strategy.xlsx", "Sales Strategy", headers, rows);
  });
  const ssTextBtn = document.getElementById("ssExportTextBtn");
  if(ssTextBtn) ssTextBtn.addEventListener("click", () => {
    const { headers, rows } = buildSalesStrategyExportTable();
    exportTableAsText("Sales_Strategy.txt", headers, rows);
  });
  const ssWordBtn = document.getElementById("ssExportWordBtn");
  if(ssWordBtn) ssWordBtn.addEventListener("click", () => {
    const { headers, rows, colors } = buildSalesStrategyExportTable();
    exportTableAsWord("Sales_Strategy.doc", "Sales Strategy", headers, rows, colors);
  });
  const ssPdfBtn = document.getElementById("ssExportPdfBtn");
  if(ssPdfBtn) ssPdfBtn.addEventListener("click", () => {
    const { headers, rows, colors } = buildSalesStrategyExportTable();
    exportTableAsPdf("Sales_Strategy.pdf", "Sales Strategy", headers, rows, colors);
  });
}

// --- "Sample Excel for Data Entry" / "Import Excel" ---
// A round-trippable companion to the plain Excel export above. The sample file
// lists every ticker/asset across ALL of a table's lists (not just the one
// currently open) so research can be done once and spread everywhere that ticker
// appears, together with every parameter that can actually be typed in — built-in
// and custom columns, but NOT the read-only computed ones (Implied Upside, Sale
// Profit, etc.), since there's nothing to "fill in" there and re-importing them
// would just be ignored anyway. "Import Excel" reads that same shape back —
// matched by column HEADER text, not position, so re-ordering or deleting columns
// in the spreadsheet is safe, and any header it doesn't recognize is reported
// rather than silently dropped — and writes every non-blank cell it finds into
// the CURRENTLY OPEN list, adding any ticker/asset that isn't in it yet. A blank
// cell is left alone (never wipes an existing value to 0/""), so a partially
// filled-in sheet is safe to re-import.

function getEditableMainColumnDefs(){
  // Same column set the main table itself renders (getAllColumnDefs), minus the
  // computed-only ones (Implied Upside, Optimized Weight Allocation, and any
  // computed custom param) — those are always derived, never typed in.
  return getAllColumnDefs().filter(d => !d.computed);
}
function getEditablePastPurchasesParams(){
  return getPastPurchasesParams().filter(p => !p.computed);
}

function buildSampleExcelForDataEntry_Portfolio(){
  const defs = getEditableMainColumnDefs();
  // Prefer the active list's current column order (for a familiar left-to-right
  // layout), then append anything editable that order left out (e.g. a hidden
  // built-in column, or one only used on a different list).
  const order = getColumnOrder().filter(id => defs.some(d => d.id === id));
  const orderedDefs = [...order.map(id => defs.find(d => d.id === id)), ...defs.filter(d => !order.includes(d.id))];
  const headers = ["Ticker", ...orderedDefs.map(d => d.label)];
  const tickers = getQuickPasteTickers(); // deduped + alphabetical, across every Portfolio List
  const overrides = getGlobalOverrides();
  const rows = tickers.map(ticker => {
    const builtin = getResolvedBuiltinAssetValues(ticker) || {};
    const ov = overrides[ticker] || {};
    return [ticker, ...orderedDefs.map(d => {
      if(d.isCustom) return ov[d.id] !== undefined ? ov[d.id] : "";
      return builtin[d.id] !== undefined ? builtin[d.id] : "";
    })];
  });
  return { headers, rows };
}

// v5.59: one spreadsheet line per row of the CURRENTLY OPEN list (purchase rows
// and sale rows alike, in the table's own order) — so re-importing an unchanged
// template is recognized as "already there" row by row and ignored.
function buildSampleExcelForDataEntry_PastPurchases(){
  const params = getEditablePastPurchasesParams();
  const headers = ["Asset", ...params.map(p => p.label)];
  const rows = getPastPurchasesRows().filter(r => r.asset).map(row => {
    const values = row.values || {};
    return [row.asset, ...params.map(p => values[p.id] !== undefined ? values[p.id] : "")];
  });
  return { headers, rows };
}

// Converts one imported cell into what setGlobalOverride/setPastPurchaseValue
// expect for that column's type: numbers stay numbers, dates become "YYYY-MM-DD"
// strings (matching every date input elsewhere in this app), everything else is a
// trimmed string. Returns undefined for a genuinely blank cell or an unparseable
// number, so the caller can skip it (leaving any existing value untouched) rather
// than overwriting good data with 0/"".
function parseImportedCellValue(raw, type){
  if(raw === undefined || raw === null) return undefined;
  if(typeof raw === "string" && raw.trim() === "") return undefined;
  if(type === "number"){
    const n = Number(raw);
    return isFinite(n) ? n : undefined;
  }
  if(type === "date"){
    // Formats using LOCAL date components (never toISOString, which converts to
    // UTC first and can shift the calendar day backward/forward across midnight
    // depending on the browser's timezone) so a purchase date typed as "Jan 15"
    // always comes back as "Jan 15", not "Jan 14".
    const toLocalYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if(raw instanceof Date && !isNaN(raw)) return toLocalYmd(raw);
    const s = String(raw).trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parsed = new Date(s);
    return isNaN(parsed) ? s : toLocalYmd(parsed);
  }
  return String(raw).trim();
}

// Reads the first sheet of an uploaded .xlsx/.xls File as an array-of-arrays
// (header row first), loading the same SheetJS library (with the same multi-CDN
// retry) the Excel EXPORT already depends on, since parsing needs the same
// XLSX global.
async function readWorkbookFirstSheetRows(file){
  const ok = await ensureLibraryLoaded(() => typeof XLSX !== "undefined", EXPORT_LIB_URLS.xlsx);
  if(!ok){
    throw new Error('Excel import needs its helper library, and it could not be loaded from any available source just now. Please check your internet connection (or any ad-blocker/firewall that might be blocking cdn.jsdelivr.net, cdnjs.cloudflare.com, or unpkg.com) and try again.');
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if(!sheetName) return [];
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false, defval: "" });
}

// Applies an imported array-of-arrays into the CURRENTLY OPEN Portfolio List.
// Column 0 is always "Ticker"; every other header is matched (via the same
// normalizeParamLabel used for the "+/- Parameter" duplicate-column guard, so
// aliasing like "FCF ($M)"/"Free Cash Flow" still lines up) against this table's
// editable columns. A ticker not yet in the open list is added to it first.
function importExcelIntoActivePortfolioList(rowsAoA){
  if(!rowsAoA || rowsAoA.length === 0) return { tickersAdded: 0, tickersUpdated: 0, valuesApplied: 0, unmatchedHeaders: [] };
  const [headerRow, ...dataRows] = rowsAoA;
  const editableDefs = getEditableMainColumnDefs();
  const colMap = [];
  const unmatchedHeaders = [];
  headerRow.forEach((h, idx) => {
    if(idx === 0){ colMap.push(null); return; } // "Ticker" column
    const norm = normalizeParamLabel(String(h));
    const match = editableDefs.find(d => normalizeParamLabel(d.label) === norm);
    colMap.push(match || null);
    if(!match && String(h).trim() !== "") unmatchedHeaders.push(String(h));
  });

  const existingTickers = new Set(getWorkingData().map(a => a.ticker));
  let tickersAdded = 0, tickersUpdated = 0, valuesApplied = 0;

  dataRows.forEach(rowArr => {
    const ticker = String(rowArr[0] || "").trim().toUpperCase();
    if(!ticker) return;

    if(existingTickers.has(ticker)){
      tickersUpdated++;
    } else {
      addAsset({ ticker }); // no name passed -> addAsset falls back to any existing override/base name, or the ticker itself
      existingTickers.add(ticker);
      tickersAdded++;
    }

    colMap.forEach((def, idx) => {
      if(!def) return;
      let value = parseImportedCellValue(rowArr[idx], def.type);
      if(value === undefined) return;
      if(def.options && typeof value === "string"){
        // e.g. Stability's dropdown options — accept any casing the user typed.
        const matchOpt = def.options.find(o => o.toLowerCase() === value.toLowerCase());
        if(matchOpt) value = matchOpt;
      }
      setGlobalOverride(ticker, def.id, value);
      valuesApplied++;
    });
  });

  return { tickersAdded, tickersUpdated, valuesApplied, unmatchedHeaders: [...new Set(unmatchedHeaders)] };
}

// Same idea for Past Purchases, applied into the currently open Past Purchases
// list. Column 0 is always "Asset". An asset symbol already present as a row in
// this list gets its FIRST matching row updated; one that isn't gets a brand new
// row added (via addPastPurchaseRow, same as the "+/- Asset" panel — including
// the same one-time pull of matching data from the Portfolio Lists table).
// --- Past Purchases Import Excel (v5.59) ---
// Every spreadsheet line becomes its own table row (purchase rows and sale rows can
// sit on separate lines for the same ticker — the lot-matching ledger pairs them
// up). Against the OPEN list:
//   1. Identical: same ticker, and every non-blank cell in the file equals that
//      row's value -> ignored (a blank cell means "not specified", never "erase").
//   2. Conflict: same ticker AND the same Date Purchased/Date Sale (whichever of
//      those columns the file has) as an existing row, but other values differ ->
//      the user chooses per row: keep existing / replace with imported / add as a
//      new row (with "set all" shortcuts), or cancels the whole import.
//   3. Anything else is new -> added, placed right after that ticker's existing
//      rows so a ticker's purchases and sales stay together.
// Each existing row can be matched by at most one file line.
function planPastPurchasesImport(rowsAoA){
  const plan = { records: [], identical: [], toAdd: [], conflicts: [], unmatchedHeaders: [] };
  if(!rowsAoA || rowsAoA.length === 0) return plan;
  const [headerRow, ...dataRows] = rowsAoA;
  const editableParams = getEditablePastPurchasesParams();
  const colMap = [];
  const unmatched = [];
  headerRow.forEach((h, idx) => {
    if(idx === 0){ colMap.push(null); return; } // "Asset" column
    const norm = normalizeParamLabel(String(h));
    const match = editableParams.find(p => normalizeParamLabel(p.label) === norm);
    colMap.push(match || null);
    if(!match && String(h).trim() !== "") unmatched.push(String(h));
  });
  plan.unmatchedHeaders = [...new Set(unmatched)];
  const mapped = [...new Set(colMap.filter(Boolean))];
  const dateKeyParams = mapped.filter(p => ["date purchased", "date sale"].includes(String(p.label).trim().toLowerCase()));

  dataRows.forEach((rowArr, i) => {
    const asset = String(rowArr[0] || "").trim().toUpperCase();
    if(!asset) return;
    const vals = {};
    colMap.forEach((param, idx) => {
      if(!param) return;
      const value = parseImportedCellValue(rowArr[idx], param.type);
      if(value === undefined) return;
      vals[param.id] = value;
    });
    plan.records.push({ asset, vals, fileRow: i + 2 }); // +2: 1-based, after the header row
  });

  const params = getPastPurchasesParams();
  const paramById = {};
  params.forEach(p => { paramById[p.id] = p; });
  const existing = getPastPurchasesRows();
  const existingVal = (row, p) => { const v = (row.values || {})[p.id]; return v !== undefined ? v : p.defaultValue; };
  const same = (p, a, b) => {
    if(p.type === "number") return Math.abs((Number(a) || 0) - (Number(b) || 0)) < 1e-9;
    return String(a === undefined || a === null ? "" : a).trim() === String(b === undefined || b === null ? "" : b).trim();
  };
  const assetOf = r => String(r.asset || "").trim().toUpperCase();
  const used = new Set();
  const pending = [];

  plan.records.forEach(rec => {
    const match = existing.find(r => !used.has(r.id) && assetOf(r) === rec.asset &&
      Object.keys(rec.vals).every(pid => same(paramById[pid], existingVal(r, paramById[pid]), rec.vals[pid])));
    if(match){ used.add(match.id); plan.identical.push(rec); }
    else pending.push(rec);
  });

  pending.forEach(rec => {
    let match = null;
    if(dateKeyParams.length){
      match = existing.find(r => !used.has(r.id) && assetOf(r) === rec.asset &&
        dateKeyParams.every(p => String(existingVal(r, p) || "") === String(rec.vals[p.id] !== undefined ? rec.vals[p.id] : "")));
    }
    if(match){
      used.add(match.id);
      const diffs = Object.keys(rec.vals)
        .filter(pid => !same(paramById[pid], existingVal(match, paramById[pid]), rec.vals[pid]))
        .map(pid => ({ label: paramById[pid].label, existing: existingVal(match, paramById[pid]), imported: rec.vals[pid] }));
      plan.conflicts.push({ rec, rowId: match.id, diffs });
    } else {
      plan.toAdd.push(rec);
    }
  });
  return plan;
}

// actions[i] is "keep" | "replace" | "add" for plan.conflicts[i].
function applyPastPurchasesImport(plan, actions){
  const result = { added: 0, identical: plan.identical.length, replaced: 0, kept: 0, valuesApplied: 0 };
  const rows = getPastPurchasesRows();
  const newRecs = plan.toAdd.slice();
  plan.conflicts.forEach((c, i) => {
    const action = (actions && actions[i]) || "keep";
    if(action === "replace"){
      const row = rows.find(r => r.id === c.rowId);
      if(!row) return;
      if(!row.values) row.values = {};
      Object.keys(c.rec.vals).forEach(pid => { row.values[pid] = c.rec.vals[pid]; result.valuesApplied++; });
      result.replaced++;
    } else if(action === "add"){
      newRecs.push(c.rec);
    } else {
      result.kept++;
    }
  });

  const addedRows = [];
  newRecs.sort((a, b) => a.fileRow - b.fileRow).forEach(rec => {
    const id = "pp_row_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
    const newRow = { id, asset: rec.asset, values: { ...rec.vals }, dateAdded: Date.now() };
    let insertAt = -1;
    for(let k = rows.length - 1; k >= 0; k--){
      if(String(rows[k].asset || "").trim().toUpperCase() === rec.asset){ insertAt = k + 1; break; }
    }
    if(insertAt === -1) rows.push(newRow);
    else rows.splice(insertAt, 0, newRow);
    addedRows.push({ id, asset: rec.asset, skipParamIds: Object.keys(rec.vals) });
    result.added++;
    result.valuesApplied += Object.keys(rec.vals).length;
  });
  savePastPurchasesRows(rows);
  // Fill any OTHER columns (e.g. Current Price) from Portfolio Lists, never touching
  // what the file supplied, and never putting purchase data onto a sale row.
  addedRows.forEach(a => pullMainTableDataIntoPastPurchases(a.id, a.asset, { skipParamIds: a.skipParamIds }));
  return result;
}

// Modal asking what to do with each conflicting line. Resolves to an array of
// actions (one per plan.conflicts entry), or null if the user cancels the import.
function showPastPurchasesImportConflictDialog(plan){
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.72); display:flex; align-items:center; justify-content:center; padding:16px;";
    const panel = document.createElement("div");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.style.cssText = "background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:1.25rem; width:100%; max-width:960px; max-height:85vh; overflow:auto; color:var(--text-primary);";
    const show = v => (v === undefined || v === null || v === "") ? "(blank)" : String(v);
    const cell = "padding:0.5rem 0.6rem; border-bottom:1px solid var(--border-color); position:static; background:transparent; vertical-align:top; line-height:1.4;";
    const smallBtn = "padding:0.4rem 0.9rem; font-size:0.85rem;";
    let html = `<h3 style="margin:0 0 0.5rem; color:#facc15; font-size:1.15rem;">Import: ${plan.conflicts.length} row(s) differ from what's already in "${escHtml(getActivePastPurchasesList().name)}"</h3>
      <div style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:0.75rem; line-height:1.5;">
        ${plan.toAdd.length} new row(s) will be added and ${plan.identical.length} identical row(s) will be ignored either way.
        Each row below has the same ticker and dates as an existing row, but some values differ. Choose what to do with each one:
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center; margin-bottom:0.75rem;">
        <span style="color:var(--text-secondary); font-size:0.85rem;">Set all to:</span>
        <button type="button" class="tab-btn" data-bulk="keep" style="${smallBtn}">Keep existing</button>
        <button type="button" class="tab-btn" data-bulk="replace" style="${smallBtn}">Replace with imported</button>
        <button type="button" class="tab-btn" data-bulk="add" style="${smallBtn}">Add as new row</button>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <thead><tr>
          <th style="${cell} text-align:left;">Ticker</th>
          <th style="${cell} text-align:left;">File row</th>
          <th style="${cell} text-align:left;">Differences (existing → imported)</th>
          <th style="${cell} text-align:left;">Action</th>
        </tr></thead><tbody>`;
    plan.conflicts.forEach((c, i) => {
      const diffHtml = c.diffs.map(d => `<div><strong>${escHtml(d.label)}:</strong> ${escHtml(show(d.existing))} → <span style="color:#facc15;">${escHtml(show(d.imported))}</span></div>`).join("");
      html += `<tr>
        <td style="${cell} font-weight:600;">${escHtml(c.rec.asset)}</td>
        <td style="${cell} color:var(--text-secondary);">#${c.rec.fileRow}</td>
        <td style="${cell}">${diffHtml}</td>
        <td style="${cell}"><select data-idx="${i}" style="padding:0.35rem 0.6rem; font-size:0.85rem;">
          <option value="keep">Keep existing</option>
          <option value="replace">Replace with imported</option>
          <option value="add">Add as new row</option>
        </select></td>
      </tr>`;
    });
    html += `</tbody></table>
      <div style="display:flex; gap:0.6rem; justify-content:flex-end; flex-wrap:wrap; margin-top:1rem;">
        <button type="button" class="tab-btn" data-final="cancel">Cancel import</button>
        <button type="button" data-final="apply" style="padding:0.6rem 1.4rem;">Apply import</button>
      </div>`;
    panel.innerHTML = html;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const selects = Array.from(panel.querySelectorAll("select[data-idx]"));
    panel.querySelectorAll("[data-bulk]").forEach(btn => {
      btn.addEventListener("click", () => { selects.forEach(sel => { sel.value = btn.getAttribute("data-bulk"); }); });
    });
    const finish = (value) => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(value);
    };
    const onKey = (e) => { if(e.key === "Escape") finish(null); };
    document.addEventListener("keydown", onKey);
    panel.querySelector('[data-final="cancel"]').addEventListener("click", () => finish(null));
    panel.querySelector('[data-final="apply"]').addEventListener("click", () => {
      finish(plan.conflicts.map((c, i) => selects[i].value));
    });
  });
}

function wireUpSampleAndImportExcelButtons(){
  // --- Portfolio Lists ---
  const sampleBtn = document.getElementById("sampleExcelBtn");
  const importBtn = document.getElementById("importExcelBtn");
  const importInput = document.getElementById("importExcelFileInput");
  const statusEl = document.getElementById("excelDataEntryStatus");

  if(sampleBtn){
    sampleBtn.addEventListener("click", () => {
      const { headers, rows } = buildSampleExcelForDataEntry_Portfolio();
      exportTableAsExcel("Sample_Data_Entry.xlsx", "Data Entry", headers, rows);
      if(statusEl){
        statusEl.textContent = rows.length === 0
          ? "No tickers yet — add at least one asset to a Portfolio List first."
          : `Downloaded a template covering ${rows.length} ticker(s) across every Portfolio List.`;
        statusEl.style.color = rows.length === 0 ? "var(--amber)" : "var(--emerald)";
      }
    });
  }

  if(importBtn && importInput){
    importBtn.addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", async () => {
      const file = importInput.files && importInput.files[0];
      importInput.value = ""; // allow re-selecting the exact same file later
      if(!file) return;
      if(statusEl){ statusEl.textContent = "Reading file…"; statusEl.style.color = "var(--text-secondary)"; }
      try{
        const rowsAoA = await readWorkbookFirstSheetRows(file);
        const result = importExcelIntoActivePortfolioList(rowsAoA);
        runMatrixOptimization();
        renderRemoveList();
        renderListSelector();
        if(statusEl){
          if(result.tickersAdded + result.tickersUpdated === 0){
            statusEl.textContent = "No rows with a Ticker were found in that file.";
            statusEl.style.color = "var(--amber)";
          } else {
            const unmatchedNote = result.unmatchedHeaders.length
              ? ` ${result.unmatchedHeaders.length} column(s) weren't recognized and were skipped: ${result.unmatchedHeaders.join(", ")}.`
              : "";
            statusEl.textContent = `Imported into "${getActiveList().name}": ${result.tickersAdded} new ticker(s), ${result.tickersUpdated} existing ticker(s) touched, ${result.valuesApplied} value(s) applied.${unmatchedNote}`;
            statusEl.style.color = "var(--emerald)";
          }
        }
      }catch(err){
        console.error("Portfolio Excel import failed:", err);
        if(statusEl){
          statusEl.textContent = err.message || "Could not read that file — make sure it's a .xlsx/.xls file exported from this tool (or matching its column headers).";
          statusEl.style.color = "#ef4444";
        }
      }
    });
  }

  // --- Past Purchases ---
  const ppSampleBtn = document.getElementById("ppSampleExcelBtn");
  const ppImportBtn = document.getElementById("ppImportExcelBtn");
  const ppImportInput = document.getElementById("ppImportExcelFileInput");
  const ppStatusEl = document.getElementById("ppExcelDataEntryStatus");

  if(ppSampleBtn){
    ppSampleBtn.addEventListener("click", () => {
      const { headers, rows } = buildSampleExcelForDataEntry_PastPurchases();
      exportTableAsExcel("Past_Purchases_Sample_Data_Entry.xlsx", "Data Entry", headers, rows);
      if(ppStatusEl){
        ppStatusEl.textContent = rows.length === 0
          ? "No rows yet on this list — add at least one asset first (or just add the header row's columns and fill in your own rows)."
          : `Downloaded a template with all ${rows.length} row(s) of "${getActivePastPurchasesList().name}".`;
        ppStatusEl.style.color = rows.length === 0 ? "var(--amber)" : "var(--emerald)";
      }
    });
  }

  if(ppImportBtn && ppImportInput){
    ppImportBtn.addEventListener("click", () => ppImportInput.click());
    ppImportInput.addEventListener("change", async () => {
      const file = ppImportInput.files && ppImportInput.files[0];
      ppImportInput.value = "";
      if(!file) return;
      if(ppStatusEl){ ppStatusEl.textContent = "Reading file…"; ppStatusEl.style.color = "var(--text-secondary)"; }
      try{
        const rowsAoA = await readWorkbookFirstSheetRows(file);
        const plan = planPastPurchasesImport(rowsAoA);
        if(plan.records.length === 0){
          if(ppStatusEl){ ppStatusEl.textContent = "No rows with an Asset were found in that file."; ppStatusEl.style.color = "var(--amber)"; }
          return;
        }
        let actions = [];
        if(plan.conflicts.length){
          if(ppStatusEl){ ppStatusEl.textContent = `Waiting for your choice on ${plan.conflicts.length} conflicting row(s)…`; ppStatusEl.style.color = "var(--text-secondary)"; }
          actions = await showPastPurchasesImportConflictDialog(plan);
          if(actions === null){
            if(ppStatusEl){ ppStatusEl.textContent = "Import cancelled — nothing was changed."; ppStatusEl.style.color = "var(--amber)"; }
            return;
          }
        }
        const result = applyPastPurchasesImport(plan, actions);
        renderPastPurchasesTickerList();
        renderPastPurchasesParamList();
        renderPastPurchasesTable();
        renderPastPurchasesColumnOrderList();
        renderPastPurchasesRowOrderList();
        renderPPListSelector();
        if(ppStatusEl){
          const unmatchedNote = plan.unmatchedHeaders.length
            ? ` ${plan.unmatchedHeaders.length} column(s) weren't recognized and were skipped: ${plan.unmatchedHeaders.join(", ")}.`
            : "";
          const conflictNote = plan.conflicts.length ? `, ${result.replaced} replaced, ${result.kept} kept as-is` : "";
          ppStatusEl.textContent = (result.added + result.replaced === 0)
            ? `Nothing new — all ${result.identical + result.kept} row(s) in the file are already in "${getActivePastPurchasesList().name}".${unmatchedNote}`
            : `Imported into "${getActivePastPurchasesList().name}": ${result.added} new row(s) added, ${result.identical} identical row(s) ignored${conflictNote}.${unmatchedNote}`;
          ppStatusEl.style.color = "var(--emerald)";
        }
      }catch(err){
        console.error("Past Purchases Excel import failed:", err);
        if(ppStatusEl){
          ppStatusEl.textContent = err.message || "Could not read that file — make sure it's a .xlsx/.xls file exported from this tool (or matching its column headers).";
          ppStatusEl.style.color = "#ef4444";
        }
      }
    });
  }

  // --- Sales Strategy (v5.71) ---
  const ssSampleBtn = document.getElementById("ssSampleExcelBtn");
  const ssImportBtn = document.getElementById("ssImportExcelBtn");
  const ssImportInput = document.getElementById("ssImportExcelFileInput");
  const ssExcelStatusEl = document.getElementById("ssExcelDataEntryStatus");

  if(ssSampleBtn){
    ssSampleBtn.addEventListener("click", () => {
      const { headers, rows } = buildSampleExcelForDataEntry_SalesStrategy();
      exportTableAsExcel("Sales_Strategy_Sample_Data_Entry.xlsx", "Data Entry", headers, rows);
      if(ssExcelStatusEl){
        ssExcelStatusEl.textContent = rows.length === 0
          ? "No draft rows yet — add at least one with \"+ Add Row\" first (or just fill in the header row's columns and your own rows)."
          : `Downloaded a template with all ${rows.length} draft row(s).`;
        ssExcelStatusEl.style.color = rows.length === 0 ? "var(--amber)" : "var(--emerald)";
      }
    });
  }

  if(ssImportBtn && ssImportInput){
    ssImportBtn.addEventListener("click", () => ssImportInput.click());
    ssImportInput.addEventListener("change", async () => {
      const file = ssImportInput.files && ssImportInput.files[0];
      ssImportInput.value = "";
      if(!file) return;
      if(ssExcelStatusEl){ ssExcelStatusEl.textContent = "Reading file…"; ssExcelStatusEl.style.color = "var(--text-secondary)"; }
      try{
        const rowsAoA = await readWorkbookFirstSheetRows(file);
        const result = importSalesStrategyFromRows(rowsAoA);
        if(result.added + result.identical === 0){
          if(ssExcelStatusEl){ ssExcelStatusEl.textContent = "No rows with a Ticker were found in that file."; ssExcelStatusEl.style.color = "var(--amber)"; }
          return;
        }
        renderPastPurchasesTable(); // re-renders Sales Strategy too (and re-syncs holdings)
        if(ssExcelStatusEl){
          const unmatchedNote = result.unmatchedHeaders.length
            ? ` ${result.unmatchedHeaders.length} column(s) weren't recognized and were skipped: ${result.unmatchedHeaders.join(", ")}.`
            : "";
          ssExcelStatusEl.textContent = result.added === 0
            ? `Nothing new — all ${result.identical} row(s) in the file are already planned.${unmatchedNote}`
            : `Imported ${result.added} new draft row(s), ${result.identical} already-planned row(s) ignored.${unmatchedNote}`;
          ssExcelStatusEl.style.color = "var(--emerald)";
        }
      }catch(err){
        console.error("Sales Strategy Excel import failed:", err);
        if(ssExcelStatusEl){
          ssExcelStatusEl.textContent = err.message || "Could not read that file — make sure it's a .xlsx/.xls file exported from this tool (or matching its column headers).";
          ssExcelStatusEl.style.color = "#ef4444";
        }
      }
    });
  }
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
    heading.textContent = `Portfolio viewing: ${activeName} (${count} assets)`;
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
    heading.textContent = `Past Purchases viewing: ${activeName} (${count} row${count === 1 ? "" : "s"})`;
  }

  // The active list must not appear as its own import source, so refresh
  // whenever which list is active might have changed.
  renderPastPurchasesImportSelect();
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
  if(colDef.id === 'cashRunway'){
    // Computed, read-only — see computeCashRunway(): Cash & Equivalents ÷ Annual
    // Operating Expenses, a "zero revenue" runway that no longer depends on
    // whether the company is profitable, so every company gets a real number
    // here as long as both inputs are on file. The 99999 sentinel now means
    // exactly one thing: one or both inputs are missing (or zero, this app's
    // existing convention for "not entered" everywhere else).
    const isMissingData = item.cashRunway >= 99999;
    const display = isMissingData ? 'N/A' : `${item.cashRunway.toFixed(1)} yr`;
    const color = isMissingData ? 'var(--text-secondary)' : (item.cashRunway < 1 ? '#ef4444' : (item.cashRunway < 2 ? 'var(--amber)' : 'inherit'));
    const title = isMissingData
      ? 'Cash & Equivalents ($M) and/or Operating Expenses ($M) aren\'t on file for this ticker yet, so a real number of years can\'t be computed. Fill in both to get one — "Fetch live data" tries this automatically via SEC EDGAR/Alpha Vantage.'
      : `Computed: Cash & Equivalents (${item.cashAndEquivalents}) ÷ Operating Expenses (${item.operatingExpenses}) = ${item.cashRunway.toFixed(2)} years of runway covering current spending alone, regardless of revenue.`;
    return `<td style="color:${color}; font-weight:600;" title="${escAttr(title)}">${display}</td>`;
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
    if(colDef.computed && colDef.formula === 'unrealizedGainPP'){
      const num = Number(val) || 0;
      const sign = num >= 0 ? '+' : '-';
      const color = isDefault ? 'var(--text-secondary)' : (num >= 0 ? 'var(--emerald)' : DUS_EXCLUDED_COLOR);
      const titleAttr = isDefault ? ` title="Add Units Purchased and Average Purchase Price columns, with no Selling Price entered yet, to compute this."` : '';
      return `<td style="color:${color}; font-weight:600;"${titleAttr}>${sign}$${Math.abs(num).toFixed(2)}</td>`;
    }
    if(colDef.computed && colDef.formula === 'missedGainPct'){
      const num = Number(val) || 0;
      // Per spec: negative = red, positive = green, exactly zero (or not yet
      // computable — no Selling Price entered) = grey.
      const color = (isDefault || num === 0) ? 'var(--text-secondary)' : (num > 0 ? 'var(--emerald)' : '#ef4444');
      const titleAttr = isDefault ? ` title="Add a Selling Price column with a non-zero value to compute this."` : '';
      return `<td style="color:${color}; font-weight:600;"${titleAttr}>${num.toFixed(1)}%</td>`;
    }
    if(colDef.computed && colDef.formula === 'bookValuePP'){
      const num = Number(val) || 0;
      const titleAttr = isDefault ? ` title="Add Units Purchased and Average Purchase Price columns to compute this."` : '';
      // Not yet sold (Selling Price is 0, or there's no Selling Price column at all)
      // gets a light-blue number, mirroring the same rule used on the Past Purchases
      // table's Book Value column.
      const allParamsForColor = getCustomParams();
      const sellParamForColor = allParamsForColor.find(p => !p.computed && String(p.label).trim().toLowerCase() === 'selling price');
      const sellValForColor = sellParamForColor ? (Number(item.customValues[sellParamForColor.id]) || 0) : 0;
      const colorStyle = (!isDefault && sellValForColor === 0) ? ' color:#7dd3fc;' : '';
      return `<td class="${isDefault ? 'cell-input-unconfirmed' : ''}" style="font-weight:600;${colorStyle}"${titleAttr}>$${Math.abs(num).toFixed(2)}</td>`;
    }
    if(colDef.computed && colDef.formula === 'currentMarketValuePP'){
      const num = Number(val) || 0;
      const titleAttr = isDefault ? ` title="Add Units Purchased and Average Purchase Price columns, with no Selling Price entered yet, to compute this."` : '';
      const colorStyle = isDefault ? '' : ' color:#a78bfa;';
      return `<td class="${isDefault ? 'cell-input-unconfirmed' : ''}" style="font-weight:600;${colorStyle}"${titleAttr}>$${Math.abs(num).toFixed(2)}</td>`;
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
  if(colDef.id === 'currentPrice'){
    // Emerald font when Current Price has fallen to or below a user-added "To
    // Buy Price" custom column's target for this ticker — a "hit your buy
    // target" signal. Styled on the input itself (not just the <td>) so the
    // number actually reads emerald.
    const val = item.currentPrice;
    const isAtTarget = isAtOrBelowBuyPriceTarget(val, getCustomParams(), item.customValues);
    const styleAttr = isAtTarget ? ' style="color:var(--emerald);"' : '';
    return `<td><input class="cell-input cell-input-num" data-ticker="${item.ticker}" data-field="currentPrice" data-resolved-value="${val}" type="number" step="0.01" value="${val}"${styleAttr}></td>`;
  }
  // Default: built-in numeric field (roa, pe, targetPrice, revenueGrowth, etc.)
  const val = item[colDef.id];
  return `<td><input class="cell-input cell-input-num" data-ticker="${item.ticker}" data-field="${colDef.id}" data-resolved-value="${val}" type="number" step="0.01" value="${val}"></td>`;
}

function renderTableHeader(){
  const thead = document.getElementById('resultsTableHead');
  if(!thead) return;
  const columnOrder = getColumnOrder();
  const allDefs = getAllColumnDefs();
  const defsById = Object.fromEntries(allDefs.map(d => [d.id, d]));

  // v5.62: Ticker gets a sort toggle too (no move/remove — it's the fixed anchor
  // column). getSortValue's generic `item[colId]` fallback already handles
  // colId === 'ticker', so no change was needed there.
  const tickerSorted = columnSortState && columnSortState.colId === 'ticker';
  const tickerSortIcon = tickerSorted ? (columnSortState.direction === 'asc' ? '▲' : '▼') : '⇅';
  let html = `<tr><th>
    <div>Ticker</div>
    <div class="col-header-controls">
      <button class="col-ctrl-btn ${tickerSorted ? 'col-ctrl-sort-active' : ''}" data-action="sort" data-id="ticker" title="Sort by ticker">${tickerSortIcon}</button>
    </div>
  </th>`;
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
    const live = getMergedLiveData(asset.ticker);

    // Precedence for every editable field: manual override > live fetch (Finnhub,
    // or Alpha Vantage filling in whatever Finnhub didn't have) > static default.
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
    const cashAndEquivalents = ov.cashAndEquivalents !== undefined ? ov.cashAndEquivalents : asset.cashAndEquivalents;
    const operatingExpenses = ov.operatingExpenses !== undefined ? ov.operatingExpenses : asset.operatingExpenses;
    const cashRunway = computeCashRunway(cashAndEquivalents, operatingExpenses);
    const beta = ov.beta !== undefined ? ov.beta : ((live && live.beta !== undefined) ? live.beta : asset.beta);

    const priceRelevantOverride = ov.currentPrice !== undefined || ov.pe !== undefined || ov.roa !== undefined;
    const isLive = !!(live && live.price !== undefined) && !priceRelevantOverride;
    const isEdited = priceRelevantOverride;
    // Only flagged when BOTH sources were tried and neither came back with a price —
    // if either Finnhub or Alpha Vantage succeeded, isLive above already covers it.
    const fetchFailed = (fetchFailedTickers.has(asset.ticker) || alphaVantageFetchFailedTickers.has(asset.ticker)) && !priceRelevantOverride && !isLive;

    // Guarded against currentPrice === 0 (a brand-new, not-yet-fetched asset, or
    // any other zero/blank price) — without this, division by zero would show
    // "NaN%"/"Infinity%" in the Implied Upside column instead of a clean 0%.
    let upsidePercentage = currentPrice !== 0 ? (targetPrice - currentPrice) / currentPrice : 0;
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
      } else if(p.computed && (p.formula === "actualUpsidePct" || p.formula === "salesProfitPP" || p.formula === "unrealizedGainPP" || p.formula === "currentMarketValuePP" || p.formula === "missedGainPct" || p.formula === "bookValuePP")){
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
      } else if(p.computed && p.formula === "unrealizedGainPP"){
        // Same formula and "ready" logic as the Past Purchases table's own
        // Unrealized Gain column (see resolvePastPurchaseRowValues): Units
        // Purchased × (Current Price − Average Purchase Price), only while
        // Selling Price is still 0 (not yet sold).
        const norm = s => String(s).trim().toLowerCase();
        const unitsParam = allCustomParams.find(cp => !cp.computed && norm(cp.label) === "units purchased");
        const avgParam = allCustomParams.find(cp => !cp.computed && (norm(cp.label) === "average purchase price ($)" || norm(cp.label) === "average purchase price"));
        const sellParam = allCustomParams.find(cp => !cp.computed && norm(cp.label) === "selling price");
        const units = unitsParam ? (Number(customValues[unitsParam.id]) || 0) : 0;
        const avg = avgParam ? (Number(customValues[avgParam.id]) || 0) : 0;
        const sell = sellParam ? (Number(customValues[sellParam.id]) || 0) : 0;
        const ready = !!(unitsParam && avgParam) && units !== 0 && avg !== 0 && sell === 0;
        customValues[p.id] = ready ? units * (currentPrice - avg) : 0;
        customIsDefault[p.id] = !ready;
      } else if(p.computed && p.formula === "currentMarketValuePP"){
        // Same idea as Unrealized Gain above, just Units Purchased × Current Price
        // instead of × the price change — what the position is worth right now,
        // only while Selling Price is still 0 (not yet sold).
        const norm = s => String(s).trim().toLowerCase();
        const unitsParam = allCustomParams.find(cp => !cp.computed && norm(cp.label) === "units purchased");
        const avgParam = allCustomParams.find(cp => !cp.computed && (norm(cp.label) === "average purchase price ($)" || norm(cp.label) === "average purchase price"));
        const sellParam = allCustomParams.find(cp => !cp.computed && norm(cp.label) === "selling price");
        const units = unitsParam ? (Number(customValues[unitsParam.id]) || 0) : 0;
        const avg = avgParam ? (Number(customValues[avgParam.id]) || 0) : 0;
        const sell = sellParam ? (Number(customValues[sellParam.id]) || 0) : 0;
        const ready = !!(unitsParam && avgParam) && units !== 0 && avg !== 0 && sell === 0;
        customValues[p.id] = ready ? units * currentPrice : 0;
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
      } else if(p.computed && p.formula === "bookValuePP"){
        // Units Purchased × Average Purchase Price — independent of Selling Price.
        const norm = s => String(s).trim().toLowerCase();
        const unitsParam = allCustomParams.find(cp => !cp.computed && norm(cp.label) === "units purchased");
        const avgParam = allCustomParams.find(cp => !cp.computed && (norm(cp.label) === "average purchase price ($)" || norm(cp.label) === "average purchase price"));
        const units = unitsParam ? (Number(customValues[unitsParam.id]) || 0) : 0;
        const avg = avgParam ? (Number(customValues[avgParam.id]) || 0) : 0;
        const ready = !!(unitsParam && avgParam) && units !== 0 && avg !== 0;
        customValues[p.id] = ready ? units * avg : 0;
        customIsDefault[p.id] = !ready;
      }
    });

    return { ticker: asset.ticker, name, currentPrice, pe, roa, targetPrice, stability, stabilityNotes,
      revenueGrowth, netMargin, pegRatio, debtToEquity, freeCashFlow, cashAndEquivalents, operatingExpenses, cashRunway, beta, customValues, customIsDefault,
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

  // "New User. Pending data..." banner: shown only while EVERY asset in the
  // currently displayed table still has a zero/blank Current Price — i.e.
  // nothing has been fetched, imported, pasted, or manually entered yet for
  // any of them. The moment any single asset gets a real (non-zero) price
  // from any source, this row stops appearing on its own, with no separate
  // flag to maintain — matching the user's own "does not appear when there
  // are numbers in the table" spec.
  const isPendingNewUserData = processedAssets.length > 0 && processedAssets.every(item => Number(item.currentPrice) === 0);
  if(isPendingNewUserData){
    const bannerColspan = getColumnOrder().length + 1; // +1 for the always-present Ticker column
    tbody.insertAdjacentHTML('beforeend', `<tr class="new-user-pending-row"><td colspan="${bannerColspan}" style="text-align:left; font-style:italic; color:var(--text-secondary); padding:0.75rem;">New User. Pending data when user activate live update.</td></tr>`);
  }

  processedAssets.forEach((item, rowIdx) => {
    const rowElement = document.createElement('tr');

    let badge;
    if(item.isEdited) badge = `<span style="color:#a78bfa; font-size:0.75rem; font-weight:600;">✎ edited</span> <button class="clear-override-btn" data-ticker="${item.ticker}" title="Clear manual price/P-E/ROA override and restore live/static data" style="background:none; border:none; color:var(--text-secondary); font-size:0.7rem; text-decoration:underline; cursor:pointer; padding:0;">↺ clear</button>`;
    else if(item.isLive) badge = `<span style="color:var(--emerald); font-size:0.75rem; font-weight:600;">● LIVE</span>`;
    else if(item.fetchFailed) badge = `<span style="color:#ef4444; font-size:0.75rem; font-weight:600;" title="The last live fetch attempt (Finnhub and/or Alpha Vantage) couldn't return data for this ticker">⚠ fetch failed</span>`;
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

  // Keep the Quick Paste Update prompt's ticker list current whenever the working
  // set of assets might have changed (add/remove/rename, switch list, etc.) — this
  // function already runs after all of those, so no extra event wiring is needed.
  if(typeof renderQuickPasteUpdatePrompt === "function") renderQuickPasteUpdatePrompt();
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
      if(typeof updateDusSelectAllLabel === "function") updateDusSelectAllLabel();
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
    deleteListBtn.addEventListener("click", async () => {
      const current = getActiveList();
      const confirmed = confirm(`Delete "${current.name}"? This cannot be undone.`);
      if(!confirmed) return;
      const statusEl = document.getElementById("listActionStatus");
      const verified = await verifyAccountPasswordForDestructiveAction(`deleting "${current.name}"`, statusEl);
      if(!verified) return;
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

  const alphaVantageApiKeyInput = document.getElementById("alphaVantageApiKeyInput");
  if(alphaVantageApiKeyInput) alphaVantageApiKeyInput.value = getSavedAlphaVantageKey();

  const saveAlphaVantageKeyBtn = document.getElementById("saveAlphaVantageKeyBtn");
  if(saveAlphaVantageKeyBtn){
    saveAlphaVantageKeyBtn.addEventListener("click", () => {
      const key = document.getElementById("alphaVantageApiKeyInput").value.trim();
      saveAlphaVantageKey(key);
      const statusEl = document.getElementById("alphaVantageKeyStatus");
      if(statusEl){
        statusEl.textContent = key ? "Key saved in this browser." : "Key cleared — Cash & Equivalents will only try SEC EDGAR, and Alpha Vantage's own \"Fetch live data\" button won't work.";
        statusEl.style.color = "var(--emerald)";
      }
    });
  }

  // Alpha Vantage's own "Fetch live data" button — a separate control, wired to a
  // separate function, with its own status element (#alphaVantageFetchStatus), so
  // it never cross-functions with Finnhub's "Fetch live data" button above.
  const fetchAlphaVantageLiveBtn = document.getElementById("fetchAlphaVantageLiveBtn");
  if(fetchAlphaVantageLiveBtn){
    fetchAlphaVantageLiveBtn.addEventListener("click", fetchAlphaVantageLiveDataForAllAssets);
  } else {
    console.warn("fetchAlphaVantageLiveBtn not found in the page — index.html may be out of date.");
  }
}catch(err){
  console.error("Failed to wire up live-data controls:", err);
}

try{
  wireUpQuickPasteUpdate();
}catch(err){
  console.error("Failed to wire up Quick Paste Update:", err);
}

try{
  wireUpDetailedUpdate();
}catch(err){
  console.error("Failed to wire up Detailed Update for Selected Assets:", err);
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

  // Manual remedy for an account that already ended up with another account's data —
  // e.g. from before the ensureLocalDataOwnedBy() guard existed. Wipes local storage,
  // reseeds the same clean defaults a brand-new visitor gets, and immediately pushes
  // that fresh snapshot to the cloud, overwriting whatever (possibly someone else's)
  // data was previously saved under this account.
  const resetAccountDataBtn = document.getElementById("resetAccountDataBtn");
  if(resetAccountDataBtn){
    resetAccountDataBtn.addEventListener("click", async () => {
      const syncStatusEl = document.getElementById("syncStatus");
      if(!confirm("Reset this account's data? This permanently replaces everything currently saved for this account — locally and in the cloud — with the default starting Sample List. This cannot be undone. Continue?")) return;

      const verified = await verifyAccountPasswordForDestructiveAction("the reset", syncStatusEl);
      if(!verified) return;

      clearAllLocalAppData();
      initializeNewUserDefaults();

      // Re-render everything from the freshly reseeded local data.
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

      if(syncStatusEl){ syncStatusEl.textContent = "Resetting and saving to the cloud…"; syncStatusEl.style.color = "var(--sub)"; }
      const result = await pushSnapshotToCloud();
      if(syncStatusEl){
        syncStatusEl.textContent = result.ok ? `Account reset and saved at ${new Date().toLocaleTimeString()}.` : `Reset locally, but saving to the cloud failed: ${result.reason}`;
        syncStatusEl.style.color = result.ok ? "var(--emerald)" : "var(--amber)";
      }
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
    ppDeleteListBtn.addEventListener("click", async () => {
      const current = getActivePastPurchasesList();
      const confirmed = confirm(`Delete "${current.name}"? This cannot be undone.`);
      if(!confirmed) return;
      const statusEl = document.getElementById("ppListActionStatus");
      const verified = await verifyAccountPasswordForDestructiveAction(`deleting "${current.name}"`, statusEl);
      if(!verified) return;
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

  const ppCostBasisSelect = document.getElementById("ppCostBasisSelect");
  if(ppCostBasisSelect){
    ppCostBasisSelect.value = getPpCostBasisMethod();
    ppCostBasisSelect.addEventListener("change", () => {
      setPpCostBasisMethod(ppCostBasisSelect.value);
      renderPastPurchasesTable();
    });
  }

  const ppCurrentHoldingsToggle = document.getElementById("ppCurrentHoldingsToggle");
  if(ppCurrentHoldingsToggle){
    ppCurrentHoldingsToggle.addEventListener("click", () => {
      setPpShowCurrentHoldingsOnly(!getPpShowCurrentHoldingsOnly());
      renderPastPurchasesTable();
    });
  }

  const ppImportListBtn = document.getElementById("ppImportListBtn");
  if(ppImportListBtn){
    ppImportListBtn.addEventListener("click", () => {
      const select = document.getElementById("ppImportListSelect");
      const statusEl = document.getElementById("ppImportStatus");
      const rawValue = select.value;
      if(!rawValue){
        statusEl.textContent = "No list available to import from.";
        statusEl.style.color = "var(--amber)";
        return;
      }
      const isPortfolioSource = rawValue.startsWith("portfolio:");
      const sourceId = rawValue.slice(rawValue.indexOf(":") + 1);
      const sourceName = isPortfolioSource
        ? (getAllLists()[sourceId] || {}).name
        : (getAllPastPurchasesLists()[sourceId] || {}).name;
      const result = isPortfolioSource
        ? importListIntoPastPurchases(sourceId)
        : importPastPurchasesListIntoActive(sourceId);
      renderPastPurchasesTickerList();
      renderPastPurchasesParamList();
      renderPastPurchasesTable();
      renderPastPurchasesColumnOrderList();
      renderPastPurchasesRowOrderList();
      renderPPListSelector();

      if(result.total === 0){
        statusEl.textContent = `"${sourceName}" has no ${isPortfolioSource ? "assets" : "rows"} to import.`;
        statusEl.style.color = "var(--text-secondary)";
      } else if(isPortfolioSource){
        const pulledNote = result.pulled > 0 ? ` Pulled in ${result.pulled} field value(s) already entered on your Portfolio Lists (e.g. Units Purchased, Average Purchase Price, Date Purchased).` : "";
        statusEl.textContent = `Added ${result.imported} new row(s) from "${sourceName}" — importing again later adds another fresh round of rows.${pulledNote}`;
        statusEl.style.color = "var(--emerald)";
      } else {
        statusEl.textContent = `Copied ${result.imported} row(s) from Past Purchases list "${sourceName}" — importing again later adds another fresh round of rows.`;
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
  // Realized Gain) and fundamentals fields that mirror the main table's fixed
  // columns (Current Price, ROA, P/E, Consensus Target Price, Rev Growth, Net Margin,
  // PEG, D/E, FCF, Cash Runway, Beta, Stability) — offered here since Past
  // Purchases has no fixed columns of its own to hold them.
  // Picking a plain preset autofills name/type/default; picking "Realized Gain"
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

try{
  wireUpSampleAndImportExcelButtons();
}catch(err){
  console.error("Failed to wire up Sample Excel / Import Excel buttons:", err);
}

try{
  renderSalesStrategyTable();
}catch(err){
  console.error("Failed to wire up the Sales Strategy table:", err);
}

try{
  applyUiViewMode();
  const viewDesktopBtn = document.getElementById("viewDesktopBtn");
  const viewMobileBtn = document.getElementById("viewMobileBtn");
  if(viewDesktopBtn) viewDesktopBtn.addEventListener("click", () => { setUiViewMode("desktop"); applyUiViewMode(); });
  if(viewMobileBtn) viewMobileBtn.addEventListener("click", () => { setUiViewMode("mobile"); applyUiViewMode(); });
}catch(err){
  console.error("Failed to wire up the Desktop/Mobile interface toggle:", err);
}

try{
  applyAllCollapsedSections();
}catch(err){
  console.error("Failed to apply collapsed section state:", err);
}

// Header quick-nav row (Fetch Live Data / Detailed Update for Selected Assets /
// Update Current Price and Consensus Target Price) -- each button always OPENS
// its section and scrolls to it (never toggles it closed), and turns yellow
// while that section is the one currently open (kept in sync by
// applyAllCollapsedSections() above via each entry's navBtn).
try{
  [
    ["navFetchLiveDataBtn", "fetchLiveDataSectionBody"],
    ["navDetailedUpdateBtn", "detailedUpdateSectionBody"],
    ["navQuickPriceUpdateBtn", "quickPriceUpdateSectionBody"],
  ].forEach(([btnId, sectionId]) => {
    const btn = document.getElementById(btnId);
    if(btn) btn.addEventListener("click", () => openAccordionSectionFromNav(sectionId));
  });
}catch(err){
  console.error("Failed to wire up the header quick-nav buttons:", err);
}

// --- New-user starting defaults ---
// A smaller starting Sample List and a specific default column layout. The old
// full-30-ticker Sample List is obsolete — this reduced ticker set is now THE
// one and only default "Sample List" anywhere in the app: it's what a
// brand-new visitor starts on (via initializeNewUserDefaults() below), and
// it's also what getActiveList()/updateActiveList()/deleteActiveList() fall
// back to if a Sample List ever needs to be freshly (re)created for an
// existing user (e.g. deleting a last remaining list). It is never used to
// overwrite a Sample List an existing user already has and has customized
// (their own removedTickers/includedCustomTickers are left exactly as-is) —
// only to seed one that doesn't exist yet.
// For the brand-new-visitor case specifically: detection is "portfolioLists"
// in localStorage not existing at all, exactly what marks a first-ever visit
// elsewhere in this file too (see getAllLists()'s own "if(!lists)" branch).
// initializeNewUserDefaults() runs once, synchronously, at script load —
// before the login/register flow's own pullSnapshotFromCloud()/
// pushSnapshotToCloud() can run (those only fire after the user submits the
// login/register form, which takes real user interaction, i.e. well after this
// point) — so a genuinely new account still starts from this smaller default,
// while an existing account's cloud data (pulled right after sign-in) correctly
// overwrites it, and nothing here ever touches an existing local user's data.
// NEW_USER_STARTING_TICKERS itself is declared much earlier in this file (see the
// v5.60 fix comment next to NON_SYNCED_LOCAL_KEYS) so it's available before the
// top-level "wire up ___" blocks that need it run.

// Shared by every spot that freshly creates a "Sample List": returns the
// removedTickers array that leaves exactly NEW_USER_STARTING_TICKERS visible
// out of the full marketData set.
function getDefaultSampleListRemovedTickers(){
  return marketData.map(a => a.ticker).filter(t => !NEW_USER_STARTING_TICKERS.includes(t));
}

// The 7 optional preset columns the requested starting layout calls for that
// aren't built-in columns — added here with fixed ids (rather than through
// addCustomParam(), whose ids include a timestamp) so the column order below
// can reference them by a stable, predictable id.
const NEW_USER_DEFAULT_CUSTOM_PARAMS = [
  { id: "custom_actual_upside_pct", label: "Actual Upside (%)", type: "number", defaultValue: 0, computed: true, formula: "actualUpsidePct" },
  { id: "custom_units_purchased", label: "Units Purchased", type: "number", defaultValue: 0 },
  { id: "custom_avg_purchase_price", label: "Average Purchase Price ($)", type: "number", defaultValue: 0 },
  { id: "custom_to_buy_price", label: "To Buy Price", type: "number", defaultValue: 0 },
  { id: "custom_dividend_yield_pct", label: "Dividend Yield (%)", type: "number", defaultValue: 0, finnhubField: ["dividendYieldIndicatedAnnual", "currentDividendYieldTTM"] },
  { id: "custom_market_cap_b", label: "Market Cap ($B)", type: "number", defaultValue: 0, finnhubField: ["marketCapitalization"], finnhubUnitDivisor: 1000 },
  { id: "custom_forward_pe", label: "Forward P/E", type: "number", defaultValue: 0, finnhubField: ["peForward", "forwardPE"] },
];

// Every BUILTIN_COLUMNS id used anywhere in runMatrixOptimization()'s scoring
// (upside via targetPrice/currentPrice, revenueGrowth, beta, stability, pe,
// netMargin, debtToEquity, freeCashFlow, pegRatio, roa, cashRunway) already has
// an explicit slot below — nothing scoring-relevant needed appending at the end.
// operatingExpenses (added alongside cashAndEquivalents as Cash Runway's other
// input — see computeCashRunway) sits right next to it, matching that pairing.
const NEW_USER_DEFAULT_COLUMN_ORDER = [
  "name", "allocationWeight", "calculatedUpside",
  "custom_actual_upside_pct", "custom_units_purchased", "custom_avg_purchase_price",
  "currentPrice", "targetPrice", "custom_to_buy_price",
  "stability", "roa", "pe", "custom_forward_pe", "revenueGrowth", "pegRatio", "debtToEquity",
  "freeCashFlow", "cashAndEquivalents", "operatingExpenses", "cashRunway", "beta", "netMargin",
  "custom_dividend_yield_pct", "custom_market_cap_b",
];

// Past Purchases (the "List 1" default list) starts with no columns at all
// otherwise — see the comment above PP_ONLY_PARAM_PRESETS. Requested starting
// layout, in order: Realized Gain, Unrealized Gain, Current Market Value, Book
// Value, Date Purchased, Units Purchased, Average Purchase Price ($), Selling
// Price, Date Sale, Units Sold, Current Price, Missed Gain % (Ticker/Asset
// itself is a fixed identity column, not a param). Fixed ids (rather than
// addPastPurchaseParam()'s timestamped ones), same reasoning as
// NEW_USER_DEFAULT_CUSTOM_PARAMS above.
// Date Purchased and Date Sale both default to blank — a newly-added ticker
// shouldn't silently claim today's date for either one; the user fills each
// in deliberately via the calendar picker when they actually know the date,
// even if the column happens to be hidden.
function getNewUserDefaultPastPurchasesParams(){
  return [
    { id: "pp_sale_profit", label: "Realized Gain", type: "number", defaultValue: 0, computed: true, formula: "salesProfitPP" },
    { id: "pp_unrealized_gain", label: "Unrealized Gain", type: "number", defaultValue: 0, computed: true, formula: "unrealizedGainPP" },
    { id: "pp_current_market_value", label: "Current Market Value", type: "number", defaultValue: 0, computed: true, formula: "currentMarketValuePP" },
    { id: "pp_book_value", label: "Book Value", type: "number", defaultValue: 0, computed: true, formula: "bookValuePP" },
    { id: "pp_date_purchased", label: "Date Purchased", type: "date", defaultValue: "" },
    { id: "pp_units_purchased", label: "Units Purchased", type: "number", defaultValue: 0 },
    { id: "pp_avg_purchase_price", label: "Average Purchase Price ($)", type: "number", defaultValue: 0 },
    { id: "pp_selling_price", label: "Selling Price", type: "number", defaultValue: 0 },
    { id: "pp_date_sale", label: "Date Sale", type: "date", defaultValue: "" },
    { id: "pp_units_sold", label: "Units Sold", type: "number", defaultValue: 0 },
    { id: "pp_current_price", label: "Current Price", type: "number", defaultValue: 0 },
    { id: "pp_missed_gain_pct", label: "Missed Gain %", type: "number", defaultValue: 0, computed: true, formula: "missedGainPct" },
  ];
}

// Seeds Past Purchases' starting columns the first time this app version ever
// sees an account whose pastPurchasesParams has genuinely never been set —
// checked directly against localStorage (not getPastPurchasesParams(), whose
// "|| []" fallback can't tell "never touched" apart from "explicitly emptied").
// This is DELIBERATELY a separate, independent gate from initializeNewUserDefaults()'s
// "portfolioLists === null" check, not folded into it: Past Purchases has its
// own lifecycle, so an account that has used Portfolio Lists for months but
// never once opened Past Purchases legitimately still has no pastPurchasesParams
// set at all — that account is not "a first-ever visit" (initializeNewUserDefaults()
// correctly leaves it alone), but it should still get these starting columns
// the first time this update reaches it. An account that deliberately removed
// every Past Purchases column, on the other hand, has pastPurchasesParams
// explicitly stored as "[]" (not absent) via removePastPurchaseParam(), so this
// correctly leaves that choice alone. Called from openDashboard(), after the
// cloud pull, so it sees the account's real, current state — same reasoning as
// migrateLegacyMarketTickersToCustomIfNeeded() right above it.
function seedPastPurchasesDefaultParamsIfNeeded(){
  try{
    if(localStorage.getItem("pastPurchasesParams") !== null) return false; // already has a value, even "[]" — leave it alone
    savePastPurchasesParams(getNewUserDefaultPastPurchasesParams());
    return true;
  }catch(e){ return false; }
}

function initializeNewUserDefaults(){
  try{
    if(localStorage.getItem("portfolioLists") !== null) return; // not a first-ever visit — leave everything alone
    localStorage.setItem("customParams", JSON.stringify(NEW_USER_DEFAULT_CUSTOM_PARAMS));
    localStorage.setItem("columnOrder", JSON.stringify(NEW_USER_DEFAULT_COLUMN_ORDER));
    const lists = {
      [DEFAULT_LIST_ID]: { name: "Sample List", useBaseData: true, includedCustomTickers: [], removedTickers: getDefaultSampleListRemovedTickers() }
    };
    localStorage.setItem("portfolioLists", JSON.stringify(lists));
    // A brand-new list is created directly from the already-trimmed marketData, so
    // there is nothing for migrateLegacyMarketTickersToCustomIfNeeded() to fix here —
    // set its flag now so that migration never runs against this fresh list (see its
    // own comment for why running it against a fresh list would be wrong).
    localStorage.setItem("legacyMarketTickersMigrated", "1");
    // Same reasoning: NEW_USER_DEFAULT_COLUMN_ORDER above already places Forward P/E
    // right after P/E Multiple, so reorderForwardPEIfNeeded() has nothing to fix here.
    localStorage.setItem("forwardPeReordered", "1");
    // Same reasoning again: a brand-new account's Past Purchases columns are seeded
    // fresh from getNewUserDefaultPastPurchasesParams() below, which already has the
    // "Realized Gain" label and the "Unrealized Gain" column in place — nothing for
    // either migration to fix here.
    localStorage.setItem("saleProfitRenamedToRealizedGain", "1");
    localStorage.setItem("unrealizedGainColumnAdded", "1");
    // Fresh defaults already include "Units Sold" too.
    localStorage.setItem("unitsSoldColumnAdded", "1");
    // ...and "Current Market Value", already placed right before Book Value.
    localStorage.setItem("currentMarketValueColumnAdded", "1");
    // Past Purchases' own starting columns are seeded separately, by
    // seedPastPurchasesDefaultParamsIfNeeded() (called from openDashboard) — see
    // its own comment for why that's a better gate than this function's
    // "portfolioLists === null" check.
  }catch(e){ /* localStorage unavailable — the app's own existing defaults still apply */ }
}
initializeNewUserDefaults();

// On page load, check if a session already exists (e.g. returning to the app
// in the same browser) and open the dashboard automatically if so. Otherwise
// the auth overlay (already visible by default) stays up until sign-in/sign-up.
checkExistingSession();

