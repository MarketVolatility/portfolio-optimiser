document.getElementById('optimizeBtn').addEventListener('click', runMatrixOptimization);
function runMatrixOptimization() {
const mandate = document.getElementById('riskProfile').value;
const tbody = document.querySelector('#resultsTable tbody');
tbody.innerHTML = '';
let processedAssets = marketData.map(asset => {
let upsidePercentage = (asset.targetPrice - asset.currentPrice) / asset.currentPrice;
let attributionScore = 0;
if (mandate === 'tactical') {
attributionScore = upsidePercentage * 100;
} else if (mandate === 'conservative') {
if (asset.stability.startsWith("Ultra-High")) attributionScore += 60;
if (asset.stability.startsWith("High Stability")) attributionScore += 35;
attributionScore += (120 / (asset.pe + 1));
if (asset.growth.includes("Cyclical")) attributionScore -= 20;
} else if (mandate === 'balanced') {
attributionScore += asset.roa * 1.2;
attributionScore += upsidePercentage * 80;
} else if (mandate === 'aggressive') {
attributionScore += upsidePercentage * 180;
attributionScore += asset.roa * 0.8;
if (asset.growth.includes("High") || asset.growth.includes("Moat")) attributionScore += 25;
}
return { ...asset, finalScore: Math.max(0.1, attributionScore), calculatedUpside: upsidePercentage };
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
rowElement.innerHTML =
`
<td><span class="ticker-txt">${item.ticker}</span></td>
<td><strong>${item.name}</strong></td>
<td>${item.roa.toFixed(2)}%</td>
<td>${item.pe.toFixed(2)}×</td>
<td>$${item.currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
<td>$${item.targetPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
<td style="color: ${item.calculatedUpside >= 0 ? 'var(--emerald)' : '#ef4444'}; font-weight: 600;">
+${(item.calculatedUpside * 100).toFixed(1)}%
</td>
<td class="moat-cell"><span style="font-size: 0.88rem; color: var(--text-secondary);">${item.stability}</span></td>
<td><span class="allocation-badge">${item.allocationWeight.toFixed(2)}%</span></td>
`;
tbody.appendChild(rowElement);
});
}
// Default execution initialization
runMatrixOptimization();
