"use strict";
// Test AI-powered code analysis
// Run: npx ts-node test-ai-analyze.ts <project-path>
Object.defineProperty(exports, "__esModule", { value: true });
const code_analyzer_1 = require("./src/analyzers/code-analyzer");
const usage_calculator_1 = require("./src/estimators/usage-calculator");
async function main() {
    const projectPath = process.argv[2] || process.cwd();
    console.log('\n🤖 AI-Powered Code Analysis\n');
    console.log(`Scanning: ${projectPath}`);
    console.log('═'.repeat(60));
    // Analyze code
    const estimation = await (0, code_analyzer_1.analyzeCodeForUsage)(projectPath);
    // Print summary
    console.log('\n' + estimation.summary);
    // Print detected patterns
    if (estimation.cpuIntensiveOperations.length > 0) {
        console.log('\n🔥 CPU-Intensive Operations:');
        for (const op of estimation.cpuIntensiveOperations) {
            console.log(`   • ${op}`);
        }
    }
    if (estimation.memoryIntensiveOperations.length > 0) {
        console.log('\n💾 Memory-Intensive Operations:');
        for (const op of estimation.memoryIntensiveOperations) {
            console.log(`   • ${op}`);
        }
    }
    if (estimation.storageOperations.length > 0) {
        console.log('\n📦 Storage Operations:');
        for (const op of estimation.storageOperations) {
            console.log(`   • ${op}`);
        }
    }
    if (estimation.dbOperations.length > 0) {
        console.log('\n🗄️ Database Operations:');
        for (const op of estimation.dbOperations) {
            console.log(`   • ${op}`);
        }
    }
    if (estimation.requestsReasoning.length > 0) {
        console.log('\n📈 Request Estimation Reasoning:');
        for (const r of estimation.requestsReasoning) {
            console.log(`   • ${r}`);
        }
    }
    // Warnings
    if (estimation.warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        for (const w of estimation.warnings) {
            console.log(`   ${w}`);
        }
    }
    // Suggestions
    if (estimation.suggestions.length > 0) {
        console.log('\n💡 Suggestions:');
        for (const s of estimation.suggestions) {
            console.log(`   ${s}`);
        }
    }
    // Now calculate costs for different services
    console.log('\n\n' + '═'.repeat(60));
    console.log('💰 COST ESTIMATES (Based on AI Analysis)');
    console.log('═'.repeat(60));
    const usage = {
        requestsPerMonth: estimation.estimatedRequestsPerDay * 30,
        bandwidthGbPerMonth: estimation.estimatedBandwidthGbPerDay * 30,
        computeHoursPerMonth: estimation.isAlwaysOn ? 730 : 0,
        storageGb: estimation.estimatedStorageGb,
        databaseGb: estimation.estimatedDbSizeGb,
    };
    console.log(`\nUsage input for calculators:`);
    console.log(`   ${usage.requestsPerMonth.toLocaleString()} requests/month`);
    console.log(`   ${usage.bandwidthGbPerMonth.toFixed(1)} GB bandwidth/month`);
    console.log(`   ${usage.computeHoursPerMonth} compute hours/month`);
    console.log(`   ${usage.storageGb} GB storage`);
    console.log(`   ${usage.databaseGb} GB database`);
    // Service recommendations based on always-on vs serverless
    const serverlessServices = [
        'CloudFlare Workers',
        'Vercel',
        'Deno Deploy',
        'AWS Lambda',
        'Google Cloud Run',
    ];
    const alwaysOnServices = [
        'Railway',
        'Render Background Worker',
        'Fly.io',
        'CloudFlare Containers',
    ];
    const relevantServices = estimation.isAlwaysOn ? alwaysOnServices : serverlessServices;
    console.log(`\n${estimation.isAlwaysOn ? '🔄 Always-On' : '⚡ Serverless'} Services:\n`);
    const results = [];
    for (const serviceName of relevantServices) {
        const calc = (0, usage_calculator_1.calculateUsageCost)(serviceName, usage);
        if (calc) {
            results.push({
                service: serviceName,
                cost: calc.totalMonthly,
                warnings: calc.warnings,
            });
        }
    }
    // Sort by cost
    results.sort((a, b) => a.cost - b.cost);
    for (const r of results) {
        const costStr = r.cost === 0 ? 'FREE' : `$${r.cost.toFixed(2)}/mo`;
        const warning = r.warnings.length > 0 ? ' ⚠️' : '';
        console.log(`   ${r.service.padEnd(30)} ${costStr.padStart(12)}${warning}`);
    }
    // Recommendation
    console.log('\n' + '─'.repeat(60));
    console.log('🎯 RECOMMENDATION:');
    console.log('─'.repeat(60));
    if (results.length > 0) {
        const cheapest = results[0];
        if (cheapest.cost === 0) {
            console.log(`   ✅ Use ${cheapest.service} - it's FREE for your usage!`);
        }
        else {
            console.log(`   ✅ Cheapest option: ${cheapest.service} at $${cheapest.cost.toFixed(2)}/month`);
        }
    }
    console.log('\n');
}
main().catch(console.error);
//# sourceMappingURL=test-ai-analyze.js.map