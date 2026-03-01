#!/usr/bin/env node
/**
 * CloudCost CLI
 * Usage: cloudcost [project-path]
 */

import { analyzeCodeForUsage } from './analyzers/code-analyzer';
import { calculateUsageCost, ALL_PRICING } from './estimators/usage-calculator';
import { scanProject } from './detectors';
import { analyzeInfrastructure } from './detectors/infra-analyzer';
import { detectAllServices } from './detectors/all-services';
import { calculateInfraCost } from './estimators/infra-calculator';
import { calculateServiceCost } from './estimators/all-pricing';
import * as path from 'path';

const VERSION = '0.1.0';

async function main() {
  const args = process.argv.slice(2);
  
  // Handle flags
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`cloudcost v${VERSION}`);
    process.exit(0);
  }
  
  const projectPath = args[0] || process.cwd();
  const absolutePath = path.resolve(projectPath);
  
  console.log(`
☁️💰 CloudCost v${VERSION}
AI-Powered Cloud Cost Estimator
${'═'.repeat(50)}
`);
  
  console.log(`📁 Scanning: ${absolutePath}\n`);
  
  // Step 1: AI Code Analysis
  console.log('🤖 Analyzing code patterns...\n');
  const estimation = await analyzeCodeForUsage(absolutePath);
  
  console.log(estimation.summary);
  
  if (estimation.cpuIntensiveOperations.length > 0) {
    console.log('\n🔥 CPU-Intensive:');
    for (const op of estimation.cpuIntensiveOperations.slice(0, 5)) {
      console.log(`   • ${op}`);
    }
  }
  
  if (estimation.dbOperations.length > 0) {
    console.log('\n🗄️ Database:');
    for (const op of estimation.dbOperations.slice(0, 3)) {
      console.log(`   • ${op}`);
    }
  }
  
  // Step 2: Detect infrastructure configs
  console.log('\n\n🔧 Detecting infrastructure...\n');
  
  const infra = await analyzeInfrastructure(absolutePath);
  const services = await detectAllServices(absolutePath);
  
  if (infra.length === 0 && services.length === 0) {
    console.log('   No infrastructure config files detected.');
    console.log('   (No wrangler.toml, vercel.json, render.yaml, etc.)');
  } else {
    for (const i of infra) {
      console.log(`   📦 ${i.service} (${i.configFile})`);
    }
    for (const s of services) {
      console.log(`   📦 ${s.name}`);
    }
  }
  
  // Step 3: Calculate costs
  console.log(`\n\n${'═'.repeat(50)}`);
  console.log('💰 COST ESTIMATES');
  console.log('═'.repeat(50));
  
  const usage = {
    requestsPerMonth: estimation.estimatedRequestsPerDay * 30,
    bandwidthGbPerMonth: estimation.estimatedBandwidthGbPerDay * 30,
    computeHoursPerMonth: estimation.isAlwaysOn ? 730 : 0,
    storageGb: estimation.estimatedStorageGb,
    databaseGb: estimation.estimatedDbSizeGb,
  };
  
  // Recommend services based on pattern
  const serverless = ['CloudFlare Workers', 'Vercel', 'Deno Deploy', 'AWS Lambda'];
  const alwaysOn = ['Railway', 'Render Background Worker', 'Fly.io'];
  
  const relevantServices = estimation.isAlwaysOn ? alwaysOn : serverless;
  
  console.log(`\n${estimation.isAlwaysOn ? '🔄 Always-On' : '⚡ Serverless'} Options:\n`);
  
  const results: { name: string; cost: number; warning: boolean }[] = [];
  
  for (const serviceName of relevantServices) {
    const calc = calculateUsageCost(serviceName, usage);
    if (calc) {
      results.push({
        name: serviceName,
        cost: calc.totalMonthly,
        warning: calc.warnings.length > 0,
      });
    }
  }
  
  results.sort((a, b) => a.cost - b.cost);
  
  for (const r of results) {
    const cost = r.cost === 0 ? 'FREE' : `$${r.cost.toFixed(2)}/mo`;
    const flag = r.warning ? ' ⚠️' : '';
    const best = results.indexOf(r) === 0 ? ' ✅' : '';
    console.log(`   ${r.name.padEnd(28)} ${cost.padStart(12)}${flag}${best}`);
  }
  
  // Warnings & suggestions
  if (estimation.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    for (const w of estimation.warnings) {
      console.log(`   ${w}`);
    }
  }
  
  if (estimation.suggestions.length > 0) {
    console.log('\n💡 Suggestions:');
    for (const s of estimation.suggestions) {
      console.log(`   ${s}`);
    }
  }
  
  // Final recommendation
  console.log(`\n${'─'.repeat(50)}`);
  if (results.length > 0) {
    const best = results[0];
    if (best.cost === 0) {
      console.log(`🎯 Recommendation: ${best.name} - FREE for your usage!`);
    } else {
      console.log(`🎯 Recommendation: ${best.name} - $${best.cost.toFixed(2)}/month`);
    }
  }
  
  console.log(`\n📖 Full pricing reference: https://github.com/superkf/cloudcost`);
  console.log('\n');
}

function printHelp() {
  console.log(`
☁️💰 CloudCost - AI-Powered Cloud Cost Estimator

Usage:
  cloudcost [project-path]      Analyze project and estimate costs
  cloudcost --help              Show this help message
  cloudcost --version           Show version

Examples:
  cloudcost                     Analyze current directory
  cloudcost ./my-project        Analyze specific project
  cloudcost ~/code/my-app       Analyze with absolute path

Supported Services:
  Serverless: CloudFlare Workers, Vercel, Deno Deploy, AWS Lambda, GCP Cloud Run
  Containers: Render, Railway, Fly.io, CloudFlare Containers, Heroku
  Databases:  Supabase, Neon, Turso, PlanetScale, Upstash
  Storage:    CloudFlare R2, AWS S3

More info: https://github.com/superkf/cloudcost
`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
