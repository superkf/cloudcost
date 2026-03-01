import { InfraUsagePattern } from '../detectors/infra-analyzer';

export interface InfraCostEstimate {
  service: string;
  provider: string;
  monthlyLow: number;
  monthlyMid: number;
  monthlyHigh: number;
  breakdown: CostLineItem[];
  warnings: string[];
  suggestions: string[];
  configDetails: Record<string, any>;
}

export interface CostLineItem {
  item: string;
  quantity: string;
  unitPrice: string;
  monthly: number;
  note?: string;
}

// CloudFlare Pricing (as of March 2026)
const CLOUDFLARE_PRICING = {
  workers: {
    free: {
      requests: 100000,        // 100k requests/day
      cpuTime: 10,             // 10ms CPU time
    },
    paid: {
      basePlan: 5,             // $5/month for Workers Paid
      perMillionRequests: 0.30,
      perMillionCpuMs: 0.02,   // $0.02 per million CPU milliseconds
    },
  },
  containers: {
    perVCpuHour: 0.031,        // $0.031 per vCPU-hour
    perGbHour: 0.004,          // $0.004 per GB-hour
    perGbEgress: 0.05,         // $0.05 per GB outbound
    diskPerGbMonth: 0.20,      // $0.20 per GB-month
  },
  kv: {
    freeReads: 100000,         // 100k reads/day free
    freeWrites: 1000,          // 1k writes/day free
    perMillionReads: 0.50,
    perMillionWrites: 5.00,
    perGbStored: 0.50,
  },
  r2: {
    perGbMonth: 0.015,
    freeStorage: 10,           // 10GB free
    classAPerMillion: 4.50,    // PUT, POST, LIST
    classBPerMillion: 0.36,    // GET, HEAD
    egressFree: true,          // No egress fees!
  },
  d1: {
    freeStorage: 5,            // 5GB free
    freeReads: 5000000000,     // 5B rows/month
    freeWrites: 100000,        // 100k rows/month
    perGbMonth: 0.75,
    perMillionReads: 0.001,
    perMillionWrites: 1.00,
  },
  durableObjects: {
    freeRequests: 1000000,     // 1M requests/month
    perMillionRequests: 0.15,
    perGbHour: 0.0002,         // Storage duration
  },
  queues: {
    perMillionMessages: 0.40,
    perGbData: 0.40,
  },
};

// Vercel Pricing
const VERCEL_PRICING = {
  hobby: {
    free: true,
    bandwidth: 100,            // 100GB
    functionInvocations: 100000,
    buildMinutes: 6000,
  },
  pro: {
    basePlan: 20,              // $20/month
    bandwidth: 1000,           // 1TB included
    perGbBandwidth: 0.15,
    functionInvocations: 1000000,
    perThousandInvocations: 0.60,
    perGbMinuteFunction: 0.000024,
  },
  edge: {
    perMillionInvocations: 0.65,
    cpuIncluded: 50,           // 50ms free per invocation
  },
};

// Fly.io Pricing
const FLY_PRICING = {
  sharedCpu1x: {
    perHour: 0.0013,           // Shared CPU
    memoryPerGbHour: 0.00269,
  },
  dedicated1x: {
    perHour: 0.0035,
    memoryPerGbHour: 0.00539,
  },
  freeAllowance: {
    vms: 3,                    // 3 shared-cpu-1x VMs
    memory: 256,               // 256MB each
  },
  storage: {
    perGbMonth: 0.15,
  },
  bandwidth: {
    freeGb: 160,               // 160GB outbound free
    perGb: 0.02,
  },
};

// Railway Pricing
const RAILWAY_PRICING = {
  hobby: {
    freeCredit: 5,             // $5/month free
    perVCpuMinute: 0.000463,
    perGbRamMinute: 0.000231,
  },
  pro: {
    baseSeat: 20,              // $20/seat/month
    perVCpuMinute: 0.000463,
    perGbRamMinute: 0.000231,
  },
  network: {
    perGbEgress: 0.10,
  },
};

export function calculateInfraCost(pattern: InfraUsagePattern): InfraCostEstimate {
  switch (pattern.provider) {
    case 'cloudflare':
      return pattern.service.includes('Container') 
        ? calculateCloudflareContainerCost(pattern)
        : calculateCloudflareWorkersCost(pattern);
    case 'vercel':
      return calculateVercelCost(pattern);
    case 'fly':
      return calculateFlyCost(pattern);
    case 'railway':
    case 'docker':
      return calculateRailwayCost(pattern);
    default:
      return {
        service: pattern.service,
        provider: pattern.provider,
        monthlyLow: 0,
        monthlyMid: 0,
        monthlyHigh: 0,
        breakdown: [],
        warnings: [`Unknown provider: ${pattern.provider}`],
        suggestions: [],
        configDetails: pattern.configDetails,
      };
  }
}

function calculateCloudflareWorkersCost(pattern: InfraUsagePattern): InfraCostEstimate {
  const breakdown: CostLineItem[] = [];
  const p = CLOUDFLARE_PRICING;
  
  const requestsPerMonth = pattern.estimatedRequestsPerDay * 30;
  const cpuMsPerMonth = requestsPerMonth * pattern.estimatedCpuMs;
  
  // Free tier check
  const freeRequestsPerMonth = p.workers.free.requests * 30;
  const billableRequests = Math.max(0, requestsPerMonth - freeRequestsPerMonth);
  
  // Base plan
  let basePlanCost = 0;
  if (billableRequests > 0 || pattern.configDetails.hasKV || pattern.configDetails.hasR2) {
    basePlanCost = p.workers.paid.basePlan;
    breakdown.push({
      item: 'Workers Paid Plan',
      quantity: '1 month',
      unitPrice: '$5/month',
      monthly: basePlanCost,
    });
  }
  
  // Request costs
  const requestCost = (billableRequests / 1_000_000) * p.workers.paid.perMillionRequests;
  if (billableRequests > 0) {
    breakdown.push({
      item: 'Requests',
      quantity: `${(requestsPerMonth / 1000).toFixed(0)}K/month (${(freeRequestsPerMonth / 1000).toFixed(0)}K free)`,
      unitPrice: '$0.30/million',
      monthly: requestCost,
      note: `${(billableRequests / 1000).toFixed(0)}K billable`,
    });
  }
  
  // CPU costs
  const cpuCost = (cpuMsPerMonth / 1_000_000) * p.workers.paid.perMillionCpuMs;
  breakdown.push({
    item: 'CPU Time',
    quantity: `${pattern.estimatedCpuMs}ms × ${requestsPerMonth.toLocaleString()} requests`,
    unitPrice: '$0.02/million ms',
    monthly: cpuCost,
  });
  
  // KV costs
  if (pattern.configDetails.hasKV) {
    const kvReads = requestsPerMonth * 2; // Assume 2 reads per request
    const kvCost = Math.max(0, (kvReads - p.kv.freeReads * 30) / 1_000_000) * p.kv.perMillionReads;
    breakdown.push({
      item: 'KV Storage Reads',
      quantity: `${(kvReads / 1000).toFixed(0)}K/month`,
      unitPrice: '$0.50/million (100k/day free)',
      monthly: kvCost,
    });
  }
  
  // R2 costs
  if (pattern.configDetails.hasR2 && pattern.estimatedStorageGb > 0) {
    const r2Storage = Math.max(0, pattern.estimatedStorageGb - p.r2.freeStorage);
    const r2Cost = r2Storage * p.r2.perGbMonth;
    breakdown.push({
      item: 'R2 Storage',
      quantity: `${pattern.estimatedStorageGb}GB (10GB free)`,
      unitPrice: '$0.015/GB/month',
      monthly: r2Cost,
      note: 'No egress fees! 🎉',
    });
  }
  
  // D1 costs
  if (pattern.configDetails.hasD1) {
    breakdown.push({
      item: 'D1 Database',
      quantity: '5GB free',
      unitPrice: '$0.75/GB after free',
      monthly: 0,
      note: 'Likely free for small apps',
    });
  }
  
  const total = basePlanCost + requestCost + cpuCost;
  
  return {
    service: 'CloudFlare Workers',
    provider: 'cloudflare',
    monthlyLow: total * 0.5,
    monthlyMid: total,
    monthlyHigh: total * 3,
    breakdown,
    warnings: pattern.warnings,
    suggestions: [
      ...pattern.suggestions,
      total < 5 ? '🎉 Likely FREE on free tier!' : '',
    ].filter(Boolean),
    configDetails: pattern.configDetails,
  };
}

function calculateCloudflareContainerCost(pattern: InfraUsagePattern): InfraCostEstimate {
  const breakdown: CostLineItem[] = [];
  const p = CLOUDFLARE_PRICING.containers;
  
  const hoursPerMonth = 730; // Always on
  const vcpus = pattern.configDetails.containerCpu || 1;
  const memoryGb = (pattern.configDetails.containerMemoryMb || 256) / 1024;
  
  // CPU cost
  const cpuCost = hoursPerMonth * vcpus * p.perVCpuHour;
  breakdown.push({
    item: 'vCPU',
    quantity: `${vcpus} vCPU × ${hoursPerMonth} hours`,
    unitPrice: `$${p.perVCpuHour}/vCPU-hour`,
    monthly: cpuCost,
  });
  
  // Memory cost
  const memoryCost = hoursPerMonth * memoryGb * p.perGbHour;
  breakdown.push({
    item: 'Memory',
    quantity: `${memoryGb.toFixed(2)}GB × ${hoursPerMonth} hours`,
    unitPrice: `$${p.perGbHour}/GB-hour`,
    monthly: memoryCost,
  });
  
  // Bandwidth cost
  const bandwidthGb = pattern.estimatedBandwidthGbPerDay * 30;
  const bandwidthCost = bandwidthGb * p.perGbEgress;
  breakdown.push({
    item: 'Egress',
    quantity: `${bandwidthGb.toFixed(0)}GB/month`,
    unitPrice: `$${p.perGbEgress}/GB`,
    monthly: bandwidthCost,
  });
  
  const total = cpuCost + memoryCost + bandwidthCost;
  
  return {
    service: 'CloudFlare Containers',
    provider: 'cloudflare',
    monthlyLow: total,
    monthlyMid: total,
    monthlyHigh: total * 1.5,
    breakdown,
    warnings: [
      '⚠️ CONTAINERS RUN 24/7 - This is expensive!',
      `💸 You experienced this: ~$160 in 10 days`,
      ...pattern.warnings,
    ],
    suggestions: [
      '💡 Switch to Workers for event-driven workloads',
      '💡 Workers: pay per request, not per hour',
      ...pattern.suggestions,
    ],
    configDetails: pattern.configDetails,
  };
}

function calculateVercelCost(pattern: InfraUsagePattern): InfraCostEstimate {
  const breakdown: CostLineItem[] = [];
  const p = VERCEL_PRICING;
  
  const requestsPerMonth = pattern.estimatedRequestsPerDay * 30;
  const bandwidthGbMonth = pattern.estimatedBandwidthGbPerDay * 30;
  
  // Check if Pro is needed
  const needsPro = bandwidthGbMonth > p.hobby.bandwidth || 
                   requestsPerMonth > p.hobby.functionInvocations;
  
  if (!needsPro) {
    breakdown.push({
      item: 'Hobby Plan',
      quantity: 'Free tier',
      unitPrice: '$0',
      monthly: 0,
      note: '100GB bandwidth, 100k functions free',
    });
    
    return {
      service: 'Vercel',
      provider: 'vercel',
      monthlyLow: 0,
      monthlyMid: 0,
      monthlyHigh: 0,
      breakdown,
      warnings: [],
      suggestions: ['🎉 Likely FREE on Hobby tier!', ...pattern.suggestions],
      configDetails: pattern.configDetails,
    };
  }
  
  // Pro plan
  breakdown.push({
    item: 'Pro Plan',
    quantity: '1 seat',
    unitPrice: '$20/month',
    monthly: p.pro.basePlan,
  });
  
  // Bandwidth overage
  const bandwidthOverage = Math.max(0, bandwidthGbMonth - p.pro.bandwidth);
  if (bandwidthOverage > 0) {
    const bandwidthCost = bandwidthOverage * p.pro.perGbBandwidth;
    breakdown.push({
      item: 'Bandwidth Overage',
      quantity: `${bandwidthOverage.toFixed(0)}GB over 1TB`,
      unitPrice: '$0.15/GB',
      monthly: bandwidthCost,
    });
  }
  
  // Function invocations
  const functionOverage = Math.max(0, requestsPerMonth - p.pro.functionInvocations);
  if (functionOverage > 0) {
    const functionCost = (functionOverage / 1000) * p.pro.perThousandInvocations;
    breakdown.push({
      item: 'Function Invocations',
      quantity: `${(functionOverage / 1000).toFixed(0)}K over 1M`,
      unitPrice: '$0.60/1000',
      monthly: functionCost,
    });
  }
  
  const total = breakdown.reduce((sum, item) => sum + item.monthly, 0);
  
  return {
    service: 'Vercel',
    provider: 'vercel',
    monthlyLow: p.pro.basePlan,
    monthlyMid: total,
    monthlyHigh: total * 2,
    breakdown,
    warnings: pattern.warnings,
    suggestions: [
      pattern.configDetails.hasEdge ? '✅ Edge Functions = cheaper than Serverless' : '',
      ...pattern.suggestions,
    ].filter(Boolean),
    configDetails: pattern.configDetails,
  };
}

function calculateFlyCost(pattern: InfraUsagePattern): InfraCostEstimate {
  const breakdown: CostLineItem[] = [];
  const p = FLY_PRICING;
  
  const hoursPerMonth = pattern.isAlwaysOn ? 730 : 200; // Assume 200 hours if auto-stop
  const machines = pattern.configDetails.minMachines || 1;
  const memoryMb = pattern.configDetails.memoryMb || 256;
  
  // Check free tier
  const isFreeTier = machines <= p.freeAllowance.vms && memoryMb <= p.freeAllowance.memory;
  
  if (isFreeTier && !pattern.isAlwaysOn) {
    breakdown.push({
      item: 'Free Tier',
      quantity: `${machines} shared-cpu-1x VMs`,
      unitPrice: 'Free (3 VMs included)',
      monthly: 0,
    });
    
    return {
      service: 'Fly.io',
      provider: 'fly',
      monthlyLow: 0,
      monthlyMid: 0,
      monthlyHigh: 5,
      breakdown,
      warnings: pattern.warnings,
      suggestions: ['🎉 Likely FREE on free tier!', ...pattern.suggestions],
      configDetails: pattern.configDetails,
    };
  }
  
  // Compute cost
  const cpuCost = hoursPerMonth * machines * p.sharedCpu1x.perHour;
  breakdown.push({
    item: 'Compute',
    quantity: `${machines} VM × ${hoursPerMonth} hours`,
    unitPrice: `$${p.sharedCpu1x.perHour}/hour`,
    monthly: cpuCost,
  });
  
  // Memory cost
  const memoryGb = memoryMb / 1024;
  const memoryCost = hoursPerMonth * machines * memoryGb * p.sharedCpu1x.memoryPerGbHour;
  breakdown.push({
    item: 'Memory',
    quantity: `${memoryMb}MB × ${machines} VMs`,
    unitPrice: `$${p.sharedCpu1x.memoryPerGbHour}/GB-hour`,
    monthly: memoryCost,
  });
  
  const total = cpuCost + memoryCost;
  
  return {
    service: 'Fly.io',
    provider: 'fly',
    monthlyLow: total * 0.5,
    monthlyMid: total,
    monthlyHigh: total * 2,
    breakdown,
    warnings: pattern.warnings,
    suggestions: pattern.suggestions,
    configDetails: pattern.configDetails,
  };
}

function calculateRailwayCost(pattern: InfraUsagePattern): InfraCostEstimate {
  const breakdown: CostLineItem[] = [];
  const p = RAILWAY_PRICING;
  
  const hoursPerMonth = 730; // Containers always on
  const vcpus = 0.5; // Assume 0.5 vCPU
  const memoryGb = (pattern.estimatedMemoryMb || 512) / 1024;
  
  // Compute cost
  const minutesPerMonth = hoursPerMonth * 60;
  const cpuCost = minutesPerMonth * vcpus * p.hobby.perVCpuMinute;
  const memoryCost = minutesPerMonth * memoryGb * p.hobby.perGbRamMinute;
  
  breakdown.push({
    item: 'Compute',
    quantity: `${vcpus} vCPU × ${hoursPerMonth} hours`,
    unitPrice: `$${(p.hobby.perVCpuMinute * 60).toFixed(4)}/hour`,
    monthly: cpuCost,
  });
  
  breakdown.push({
    item: 'Memory',
    quantity: `${memoryGb.toFixed(1)}GB × ${hoursPerMonth} hours`,
    unitPrice: `$${(p.hobby.perGbRamMinute * 60).toFixed(4)}/hour`,
    monthly: memoryCost,
  });
  
  const total = cpuCost + memoryCost;
  const afterFreeCredit = Math.max(0, total - p.hobby.freeCredit);
  
  breakdown.push({
    item: 'Free Credit',
    quantity: '$5/month',
    unitPrice: 'Included',
    monthly: -Math.min(total, p.hobby.freeCredit),
    note: 'Applied automatically',
  });
  
  return {
    service: pattern.service,
    provider: pattern.provider,
    monthlyLow: afterFreeCredit,
    monthlyMid: afterFreeCredit,
    monthlyHigh: afterFreeCredit * 1.5,
    breakdown,
    warnings: pattern.warnings,
    suggestions: [
      total <= p.hobby.freeCredit ? '🎉 Likely FREE with $5 credit!' : '',
      ...pattern.suggestions,
    ].filter(Boolean),
    configDetails: pattern.configDetails,
  };
}
