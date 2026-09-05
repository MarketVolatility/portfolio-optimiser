const marketData = [
{ ticker: "NVDA", name: "NVIDIA Corp.", roa: 83.00, pe: 29.12, currentPrice: 230.36, targetPrice: 310.00, stability: "Ultra-High Stability. Competitors can mimic
silicon architecture, but reproducing the global CUDA software ecosystem, developer lock-in, and proprietary high-speed networking fabric is nearly impossible.", grow
th: "High Growth" },
{ ticker: "TSM", name: "TSMC", roa: 19.80, pe: 27.94, currentPrice: 175.00, targetPrice: 210.00, stability: "Ultra-High Stability. Structural global chip foundry
monopoly that every major tech giant depends on.", growth: "Dominant Moat" },
{ ticker: "META", name: "Meta Platforms", roa: 28.50, pe: 18.20, currentPrice: 520.00, targetPrice: 600.00, stability: "Ultra-High Stability. Unmatched global dig
ital ad network scaling with near-zero variable inventory costs.", growth: "Dominant Moat" },
{ ticker: "GOOGL", name: "Alphabet / Google", roa: 33.40, pe: 16.70, currentPrice: 338.46, targetPrice: 390.00, stability: "Ultra-High Stability. The immense digi
tal data flywheel and search system algorithms are impossible to copy.", growth: "Steady Growth" },
{ ticker: "WDC", name: "SanDisk / WDC", roa: 64.80, pe: 15.20, currentPrice: 467.46, targetPrice: 534.56, stability: "Medium Stability. Billions needed for fabric
ation plants, but products suffer from volatile oversupply cycles.", growth: "Highly Cyclical" },
{ ticker: "AAPL", name: "Apple Inc.", roa: 34.70, pe: 31.20, currentPrice: 220.00, targetPrice: 250.00, stability: "Ultra-High Stability. Immense barrier to entry
with a sticky 2-billion-device iOS ecosystem footprint.", growth: "Steady Growth" },
{ ticker: "MU", name: "Micron Technology", roa: 46.50, pe: 14.80, currentPrice: 1016.59, targetPrice: 1150.00, stability: "Medium Stability. Protected global memo
ry oligopoly status, though technology node shifts require heavy cap-ex.", growth: "Highly Cyclical" },
{ ticker: "PLTR", name: "Palantir Tech.", roa: 30.40, pe: 156.01, currentPrice: 42.50, targetPrice: 48.00, stability: "High Stability. Sticky architecture operati
ng as the core engine for Western defense and conglomerates.", growth: "High Growth" },
{ ticker: "MA", name: "Mastercard Inc.", roa: 29.30, pe: 32.40, currentPrice: 480.00, targetPrice: 540.00, stability: "Ultra-High Stability. Secure regulatory-app
roved transaction routing system built over half a century.", growth: "Steady Growth" },
{ ticker: "MELI", name: "MercadoLibre", roa: 11.10, pe: 54.15, currentPrice: 1420.00, targetPrice: 1600.00, stability: "High Stability. Undisputed market share le
ader across Latin American e-commerce and logistics networks.", growth: "High Growth" },
{ ticker: "ANET", name: "Arista Networks", roa: 18.20, pe: 44.20, currentPrice: 310.00, targetPrice: 350.00, stability: "High Stability. High-performance networki
ng switches optimized for extreme data cloud speeds and AI computing.", growth: "Sector Specialist" },
{ ticker: "ASML", name: "ASML Holding", roa: 16.90, pe: 52.32, currentPrice: 840.00, targetPrice: 940.00, stability: "Ultra-High Stability. Absolute global techno
logy monopoly as the sole commercial producer of EUV machinery.", growth: "Dominant Moat" },
{ ticker: "LLY", name: "Eli Lilly & Co.", roa: 12.20, pe: 19.20, currentPrice: 780.00, targetPrice: 870.00, stability: "High Stability. Long-term therapeutic depe
ndency pipelines covering global weight-loss and diabetes treatments.", growth: "Quality Compounder" },
{ ticker: "ELF", name: "E.l.f. Beauty", roa: 15.40, pe: 34.50, currentPrice: 120.00, targetPrice: 133.00, stability: "Medium Stability. High social media brand eq
uity, but operates in a sector with minimal barriers to entry.", growth: "Sector Specialist" },
{ ticker: "APH", name: "Amphenol Corp.", roa: 11.80, pe: 31.80, currentPrice: 68.00, targetPrice: 75.00, stability: "High Stability. Highly specialized sensor lay
outs deeply integrated into aerospace and data center connections.", growth: "Sector Specialist" },
{ ticker: "UBER", name: "Uber Tech.", roa: 7.20, pe: 32.10, currentPrice: 72.00, targetPrice: 79.00, stability: "High Stability. Powerful logistical network scale
advantages achieving a strong structural 19.2% ROIC recovery.", growth: "Quality Compounder" },
{ ticker: "WMT", name: "Walmart Inc.", roa: 6.90, pe: 25.93, currentPrice: 78.00, targetPrice: 85.00, stability: "Ultra-High Stability. Physical grocery logistics
scale advantage tied to expanding supply chain ad networks.", growth: "Sector Specialist" },
{ ticker: "PG", name: "Procter & Gamble", roa: 13.80, pe: 24.19, currentPrice: 168.00, targetPrice: 182.00, stability: "Ultra-High Stability. Decades of elite hou
sehold brand trust providing strong insulation during market corrections.", growth: "Quality Compounder" },
{ ticker: "XOM", name: "Exxon Mobil Corp.", roa: 11.40, pe: 20.52, currentPrice: 118.00, targetPrice: 127.00, stability: "Medium Stability. Capital-heavy assets t
ied to commodity waves, hedged via an active 3.33% dividend payout.", growth: "Quality Compounder" },
{ ticker: "AMZN", name: "Amazon.com Inc.", roa: 9.20, pe: 20.80, currentPrice: 185.00, targetPrice: 198.00, stability: "Ultra-High Stability. Infrastructure layer
mapping extensive shipping pipelines to high-margin AWS cloud spaces.", growth: "Dominant Moat" },
{ ticker: "JPM", name: "JPMorgan Chase", roa: 1.40, pe: 15.36, currentPrice: 215.00, targetPrice: 227.00, stability: "Ultra-High Stability. The absolute fortress
balance sheet of the Western system; heavy regulations block new peers.", growth: "Financial Value" },
{ ticker: "DELL", name: "Dell Technologies", roa: 6.80, pe: 30.40, currentPrice: 130.00, targetPrice: 137.00, stability: "High Stability. Elite tier vendor lock-i
n for enterprise AI scaling and corporate data server grids.", growth: "High Growth" },
{ ticker: "PANW", name: "Palo Alto Networks", roa: 2.85, pe: 56.54, currentPrice: 340.00, targetPrice: 355.00, stability: "Medium Stability. Strong corporate fire
wall footprint, but highly fragmented sector forces continuous tech buyouts.", growth: "High Growth Target" },
{ ticker: "MSCI", name: "MSCI Inc.", roa: 14.50, pe: 33.60, currentPrice: 560.00, targetPrice: 582.00, stability: "High Stability. Near-monopoly infrastructure fo
r high-margin financial indexes embedded globally across Wall Street.", growth: "Quality Compounder" },
{ ticker: "TSLA", name: "Tesla Inc.", roa: 8.50, pe: 328.98, currentPrice: 210.00, targetPrice: 215.00, stability: "High Stability. Extensive physical Supercharge
r network and proprietary automated driving data flywheels.", growth: "Speculative Growth" },
{ ticker: "AMD", name: "Advanced Micro", roa: 4.80, pe: 122.56, currentPrice: 145.00, targetPrice: 148.00, stability: "High Stability. Primary computing competito
r to Nvidia via expanding Instinct hardware and x86 models.", growth: "High Growth" },
{ ticker: "3968", name: "China Merchants Bank", roa: 39.55, pe: 5.80, currentPrice: 1.15, targetPrice: 1.25, stability: "Medium Stability. Elite commercial bankin
g network yielding immense short-term asset returns but prone to macro credit shifts.", growth: "High Growth Fin" }
];
