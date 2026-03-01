"use strict";
// Test usage-based calculator
// Run: npx ts-node test-usage.ts
Object.defineProperty(exports, "__esModule", { value: true });
const usage_calculator_1 = require("./src/estimators/usage-calculator");
console.log('\n☁️💰 Usage-Based Cost Calculator Test\n');
console.log('='.repeat(60));
// Example usage scenarios
const scenarios = [
    {
        name: '🔸 Small hobby project (10k requests/day)',
        usage: {
            requestsPerMonth: 300000, // 10k/day × 30
            bandwidthGbPerMonth: 5,
            computeHoursPerMonth: 0,
            storageGb: 1,
            databaseGb: 0.5,
        },
    },
    {
        name: '🔸 Medium SaaS (100k requests/day)',
        usage: {
            requestsPerMonth: 3000000, // 100k/day × 30
            bandwidthGbPerMonth: 50,
            computeHoursPerMonth: 730, // 24/7
            storageGb: 10,
            databaseGb: 5,
        },
    },
    {
        name: '🔸 24/7 Telegram Bot',
        usage: {
            requestsPerMonth: 10000, // Low requests
            bandwidthGbPerMonth: 1,
            computeHoursPerMonth: 730, // 24/7 always-on
            storageGb: 0,
            databaseGb: 0.1,
        },
    },
];
// Services to test
const servicesToTest = [
    'CloudFlare Workers',
    'Vercel',
    'Deno Deploy',
    'AWS Lambda',
    'Google Cloud Run',
    'Render Web Service',
    'Render Background Worker',
    'Railway',
    'Fly.io',
    'CloudFlare Containers',
];
for (const scenario of scenarios) {
    console.log(`\n\n${'═'.repeat(60)}`);
    console.log(scenario.name);
    console.log(`${'═'.repeat(60)}`);
    console.log(`\nUsage: ${scenario.usage.requestsPerMonth.toLocaleString()} requests/mo`);
    console.log(`       ${scenario.usage.bandwidthGbPerMonth} GB bandwidth`);
    console.log(`       ${scenario.usage.computeHoursPerMonth} compute hours`);
    console.log('\n' + '─'.repeat(60));
    console.log('SERVICE COMPARISON:');
    console.log('─'.repeat(60));
    const results = [];
    for (const serviceName of servicesToTest) {
        const calc = (0, usage_calculator_1.calculateUsageCost)(serviceName, scenario.usage);
        if (calc) {
            let note = '';
            if (calc.totalMonthly === 0) {
                note = '🎉 FREE';
            }
            else if (calc.warnings.length > 0) {
                note = '⚠️';
            }
            results.push({
                service: serviceName,
                cost: calc.totalMonthly,
                note,
            });
        }
    }
    // Sort by cost
    results.sort((a, b) => a.cost - b.cost);
    for (const r of results) {
        const costStr = r.cost === 0 ? 'FREE' : `$${r.cost.toFixed(2)}/mo`;
        console.log(`  ${r.service.padEnd(30)} ${costStr.padStart(12)} ${r.note}`);
    }
}
// Detailed breakdown for one example
console.log('\n\n' + '═'.repeat(60));
console.log('DETAILED BREAKDOWN EXAMPLE:');
console.log('═'.repeat(60));
const exampleUsage = {
    requestsPerMonth: 500000,
    bandwidthGbPerMonth: 20,
    computeHoursPerMonth: 0,
    storageGb: 5,
    databaseGb: 1,
};
console.log('\nUsage: 500k requests, 20GB bandwidth, 5GB storage, 1GB database\n');
for (const service of ['CloudFlare Workers', 'Vercel', 'AWS Lambda']) {
    const calc = (0, usage_calculator_1.calculateUsageCost)(service, exampleUsage);
    if (calc) {
        console.log((0, usage_calculator_1.formatCalculation)(calc));
    }
}
//# sourceMappingURL=test-usage.js.map