// Quick test script - run with: npx ts-node test-scan.ts <project-path>

import { scanProject } from './src/detectors';
import { analyzeInfrastructure } from './src/detectors/infra-analyzer';
import { detectAllServices } from './src/detectors/all-services';
import { estimateCosts } from './src/estimators/calculator';
import { calculateInfraCost } from './src/estimators/infra-calculator';
import { calculateServiceCost } from './src/estimators/all-pricing';

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  
  console.log(`\n☁️💰 CloudCost Scanner\n`);
  console.log(`Scanning: ${projectPath}\n`);
  console.log('='.repeat(60));
  
  // 1. Basic service detection
  console.log('\n📍 Detected Services:\n');
  const services = await scanProject(projectPath);
  
  if (services.length === 0) {
    console.log('  No cloud services detected.');
  } else {
    for (const s of services) {
      console.log(`  • ${s.name} (${s.provider}) - ${s.confidence} confidence`);
      console.log(`    Found in: ${s.detectedIn.slice(0, 2).join(', ')}`);
    }
  }
  
  // 2. Infrastructure analysis
  console.log('\n\n🔧 Infrastructure Analysis:\n');
  const infra = await analyzeInfrastructure(projectPath);
  
  if (infra.length === 0) {
    console.log('  No infrastructure config detected.');
  } else {
    for (const i of infra) {
      console.log(`  • ${i.service}`);
      console.log(`    Config: ${i.configFile || 'N/A'}`);
      console.log(`    Always-on: ${i.isAlwaysOn ? '⚠️ YES' : 'No (serverless)'}`);
      
      // Calculate cost with breakdown
      const cost = calculateInfraCost(i);
      console.log(`    💰 Estimated: $${cost.monthlyLow.toFixed(2)} - $${cost.monthlyHigh.toFixed(2)}/month`);
      
      // Show calculation breakdown
      if (cost.breakdown.length > 0) {
        console.log(`\n    📊 Calculation Breakdown:`);
        for (const line of cost.breakdown) {
          console.log(`       ${line.item}`);
          console.log(`         ${line.quantity} × ${line.unitPrice} = $${line.monthly.toFixed(2)}`);
          if (line.note) console.log(`         💡 ${line.note}`);
        }
      }
      
      // Show warnings
      if (cost.warnings.length > 0) {
        console.log(`\n    ⚠️ Warnings:`);
        for (const w of cost.warnings) {
          console.log(`       ${w}`);
        }
      }
      
      // Show suggestions
      if (cost.suggestions.length > 0) {
        console.log(`\n    💡 Suggestions:`);
        for (const s of cost.suggestions) {
          console.log(`       ${s}`);
        }
      }
      console.log('');
    }
  }
  
  // 3. Additional services (Replit, Render, etc.)
  console.log('\n\n🌐 Additional Services:\n');
  const allServices = await detectAllServices(projectPath);
  
  if (allServices.length === 0) {
    console.log('  No additional services detected.');
  } else {
    for (const s of allServices) {
      const cost = calculateServiceCost(s);
      console.log(`  • ${s.name}`);
      console.log(`    💰 $${cost.monthlyLow.toFixed(2)} - $${cost.monthlyHigh.toFixed(2)}/month`);
      
      // Show calculation breakdown
      if (cost.breakdown.length > 0) {
        console.log(`\n    📊 Calculation Breakdown:`);
        for (const line of cost.breakdown) {
          console.log(`       ${line.item}`);
          console.log(`         ${line.quantity} × ${line.unitPrice} = $${line.monthly.toFixed(2)}`);
          if (line.note) console.log(`         💡 ${line.note}`);
        }
      }
      
      if (cost.freeUntil) {
        console.log(`\n    🎉 Free until: ${cost.freeUntil}`);
      }
      
      if (cost.warnings.length > 0) {
        console.log(`\n    ⚠️ Warnings:`);
        for (const w of cost.warnings) {
          console.log(`       ${w}`);
        }
      }
      
      if (cost.suggestions.length > 0) {
        console.log(`\n    💡 Suggestions:`);
        for (const s of cost.suggestions) {
          if (s) console.log(`       ${s}`);
        }
      }
      console.log('');
    }
  }
  
  // 4. Total estimate
  console.log('\n\n' + '='.repeat(60));
  console.log('💵 TOTAL ESTIMATE:\n');
  
  let totalLow = 0;
  let totalHigh = 0;
  
  for (const i of infra) {
    const cost = calculateInfraCost(i);
    totalLow += cost.monthlyLow;
    totalHigh += cost.monthlyHigh;
  }
  
  for (const s of allServices) {
    const cost = calculateServiceCost(s);
    totalLow += cost.monthlyLow;
    totalHigh += cost.monthlyHigh;
  }
  
  console.log(`  Monthly: $${totalLow.toFixed(2)} - $${totalHigh.toFixed(2)}`);
  console.log(`  Yearly:  $${(totalLow * 12).toFixed(2)} - $${(totalHigh * 12).toFixed(2)}`);
  
  if (totalLow === 0 && totalHigh < 10) {
    console.log('\n  🎉 Likely FREE or very cheap!');
  } else if (totalHigh > 100) {
    console.log('\n  ⚠️ Consider optimizing - this could get expensive!');
  }
  
  console.log('\n');
}

main().catch(console.error);
