/**
 * Universal Usage-Based Cost Calculator
 * 
 * Core principle:
 * ACTUAL_COST = max(0, ESTIMATED_USAGE - FREE_TIER) × UNIT_PRICE
 */

export interface UsageEstimate {
  requestsPerMonth: number;
  bandwidthGbPerMonth: number;
  computeHoursPerMonth: number;
  storageGb: number;
  databaseGb: number;
  // AI specific
  aiCallsPerMonth?: number;
  aiTokensPerMonth?: number;
}

export interface ServicePricing {
  name: string;
  provider: string;
  
  // Free tier limits
  free: {
    requestsPerMonth?: number;
    bandwidthGb?: number;
    computeHours?: number;
    storageGb?: number;
    databaseGb?: number;
    note?: string;
  };
  
  // Per-unit pricing (after free tier)
  pricing: {
    perMillionRequests?: number;
    perGbBandwidth?: number;
    perComputeHour?: number;
    perGbStorage?: number;
    perGbDatabase?: number;
    basePlan?: number;  // Fixed monthly fee if required
    forceBasePlan?: boolean;  // Always charge base plan (no free tier)
    creditIncluded?: number;  // Credit included in base plan (e.g., Railway $5)
  };
  
  // Warnings
  warnings?: string[];
}

// ==================== ALL SERVICE PRICING ====================

export const ALL_PRICING: ServicePricing[] = [
  // ========== SERVERLESS ==========
  {
    name: 'CloudFlare Workers',
    provider: 'cloudflare',
    free: {
      requestsPerMonth: 3000000,  // 100k/day × 30
      note: '100k requests/day, 10ms CPU per request',
    },
    pricing: {
      basePlan: 5,               // Workers Paid required for overage
      perMillionRequests: 0.30,
      // CPU time is complex - simplified to per-request
    },
  },
  {
    name: 'Vercel',
    provider: 'vercel',
    free: {
      bandwidthGb: 100,
      requestsPerMonth: 100000,  // Function invocations
      note: 'Hobby plan: 100GB bandwidth, 100k function invocations',
    },
    pricing: {
      basePlan: 20,              // Pro plan required for overage
      perGbBandwidth: 0.15,
      perMillionRequests: 0.60,  // $0.60 per 1000 = $600/million (expensive!)
    },
    warnings: ['Function overage is expensive: $0.60/1000 invocations'],
  },
  {
    name: 'Netlify',
    provider: 'netlify',
    free: {
      bandwidthGb: 100,
      requestsPerMonth: 125000,
      note: '100GB bandwidth, 125k function invocations',
    },
    pricing: {
      basePlan: 19,
      perGbBandwidth: 0.20,
      perMillionRequests: 25,    // $25 per million
    },
  },
  {
    name: 'Deno Deploy',
    provider: 'deno',
    free: {
      requestsPerMonth: 3000000,  // 100k/day × 30
      bandwidthGb: 100,
      note: '100k requests/day, 100GB bandwidth - very generous!',
    },
    pricing: {
      basePlan: 20,
      perMillionRequests: 2,
      perGbBandwidth: 0.30,
    },
  },
  {
    name: 'AWS Lambda',
    provider: 'aws',
    free: {
      requestsPerMonth: 1000000,
      computeHours: 111.11,      // 400k GB-seconds = ~111 GB-hours
      note: '1M requests/month, 400k GB-seconds FREE forever',
    },
    pricing: {
      perMillionRequests: 0.20,
      perComputeHour: 0.06,      // $0.0000166667/GB-sec × 3600 = $0.06/GB-hour
    },
  },
  {
    name: 'Google Cloud Run',
    provider: 'gcp',
    free: {
      requestsPerMonth: 2000000,
      computeHours: 50,          // 180k vCPU-seconds
      bandwidthGb: 1,
      note: '2M requests/month, 50 vCPU-hours, 1GB egress',
    },
    pricing: {
      perMillionRequests: 0.40,
      perComputeHour: 0.0864,    // $0.000024/vCPU-sec × 3600
      perGbBandwidth: 0.12,
    },
  },
  {
    name: 'Supabase Edge Functions',
    provider: 'supabase',
    free: {
      requestsPerMonth: 500000,
      note: '500k invocations/month on free plan',
    },
    pricing: {
      basePlan: 25,              // Pro plan required
      perMillionRequests: 2,     // Estimate
    },
  },
  
  // ========== CONTAINERS / PaaS ==========
  {
    name: 'CloudFlare Containers',
    provider: 'cloudflare',
    free: {
      note: '⚠️ NO FREE TIER! Always-on billing.',
    },
    pricing: {
      perComputeHour: 0.031,     // Per vCPU-hour
      perGbStorage: 0.004 * 730, // Per GB-hour × 730 hours
      perGbBandwidth: 0.05,
    },
    warnings: [
      '⚠️ NO FREE TIER - runs 24/7!',
      '💸 1 vCPU for 1 month = $22.63',
      '💡 Consider Workers instead (pay per request)',
    ],
  },
  {
    name: 'Render Web Service',
    provider: 'render',
    free: {
      computeHours: 750,         // 750 hours/month free (sleeps after 15min)
      note: 'Free tier sleeps after 15 min inactivity',
    },
    pricing: {
      basePlan: 7,               // Starter: always-on
      perComputeHour: 0.0076,    // If pay-as-you-go
    },
  },
  {
    name: 'Render Background Worker',
    provider: 'render',
    free: {
      note: '⚠️ NO FREE TIER for workers!',
    },
    pricing: {
      basePlan: 7,               // ALWAYS required, no free tier
      forceBasePlan: true,       // Always charge base plan
    },
    warnings: ['⚠️ Workers have NO free tier - minimum $7/month'],
  },
  {
    name: 'Railway',
    provider: 'railway',
    free: {
      computeHours: 180,         // ~$5 credit covers ~180 hours of shared CPU
      note: '$5/month subscription includes $5 credit - small apps are FREE',
    },
    pricing: {
      basePlan: 5,               // $5/month subscription
      perComputeHour: 0.0278,    // ~$0.000463/vCPU-min × 60 = $0.0278/hour
      creditIncluded: 5,         // $5 credit included
    },
  },
  {
    name: 'Fly.io',
    provider: 'fly',
    free: {
      bandwidthGb: 160,
      note: '⚠️ NO FREE COMPUTE since 2025! Only 160GB egress free.',
    },
    pricing: {
      perComputeHour: 0.0013,    // Shared CPU
      perGbStorage: 0.15,
      perGbBandwidth: 0.02,
    },
    warnings: ['⚠️ Fly.io removed free tier in 2025'],
  },
  {
    name: 'Heroku',
    provider: 'heroku',
    free: {
      note: '⚠️ NO FREE TIER since 2022!',
    },
    pricing: {
      basePlan: 5,               // Eco dyno (sleeps)
    },
    warnings: ['⚠️ Heroku is expensive - consider Railway/Render'],
  },
  {
    name: 'DigitalOcean App Platform',
    provider: 'digitalocean',
    free: {
      note: 'Static sites only',
    },
    pricing: {
      basePlan: 5,               // Basic plan
    },
  },
  {
    name: 'Replit',
    provider: 'replit',
    free: {
      note: 'Development only - deployments require payment',
    },
    pricing: {
      basePlan: 7,               // Reserved VM
    },
  },
  
  // ========== DATABASES ==========
  {
    name: 'Supabase (Postgres)',
    provider: 'supabase',
    free: {
      databaseGb: 0.5,
      bandwidthGb: 2,
      note: '500MB database, 2GB bandwidth',
    },
    pricing: {
      basePlan: 25,
      perGbDatabase: 0.125,
    },
  },
  {
    name: 'Neon (Serverless Postgres)',
    provider: 'neon',
    free: {
      databaseGb: 0.5,
      computeHours: 191,
      note: '512MB storage, 191 compute hours (~6h/day)',
    },
    pricing: {
      basePlan: 19,
      perGbDatabase: 0.125,
      perComputeHour: 0.016,
    },
  },
  {
    name: 'Turso (SQLite Edge)',
    provider: 'turso',
    free: {
      databaseGb: 9,
      note: '9GB total storage, 500 databases - VERY generous!',
    },
    pricing: {
      basePlan: 29,
    },
  },
  {
    name: 'PlanetScale',
    provider: 'planetscale',
    free: {
      note: '⚠️ NO FREE TIER since 2024!',
    },
    pricing: {
      basePlan: 29,
      perGbDatabase: 2.50,
    },
    warnings: ['⚠️ PlanetScale removed free tier in 2024'],
  },
  {
    name: 'CloudFlare D1',
    provider: 'cloudflare',
    free: {
      databaseGb: 5,
      note: '5GB storage, 5B row reads/month',
    },
    pricing: {
      perGbDatabase: 0.75,
    },
  },
  {
    name: 'Upstash Redis',
    provider: 'upstash',
    free: {
      requestsPerMonth: 300000,  // 10k/day × 30
      storageGb: 0.256,
      note: '10k commands/day, 256MB storage',
    },
    pricing: {
      perMillionRequests: 0.2,
      perGbStorage: 0.25,
    },
  },
  {
    name: 'Convex',
    provider: 'convex',
    free: {
      requestsPerMonth: 1000000,
      storageGb: 1,
      bandwidthGb: 1,
      note: '1M function calls, 1GB storage',
    },
    pricing: {
      basePlan: 25,
    },
  },
  
  // ========== STORAGE ==========
  {
    name: 'CloudFlare R2',
    provider: 'cloudflare',
    free: {
      storageGb: 10,
      note: '10GB storage, NO egress fees!',
    },
    pricing: {
      perGbStorage: 0.015,
      // Note: egress is FREE
    },
  },
  {
    name: 'AWS S3',
    provider: 'aws',
    free: {
      storageGb: 5,              // 12 months only
      note: '5GB free for 12 months only',
    },
    pricing: {
      perGbStorage: 0.023,
      perGbBandwidth: 0.09,      // Egress is expensive!
    },
    warnings: ['⚠️ S3 egress is $0.09/GB - use R2 instead!'],
  },
];

// ==================== CALCULATOR ====================

export interface CostCalculation {
  service: string;
  provider: string;
  
  usage: {
    item: string;
    estimated: number;
    free: number;
    billable: number;
    unitPrice: string;
    cost: number;
  }[];
  
  basePlan: number;
  usageCost: number;
  totalMonthly: number;
  
  freeNote?: string;
  warnings: string[];
}

export function calculateUsageCost(
  serviceName: string,
  usage: UsageEstimate
): CostCalculation | null {
  const service = ALL_PRICING.find(s => s.name === serviceName);
  if (!service) return null;
  
  const usageItems: CostCalculation['usage'] = [];
  let usageCost = 0;
  
  // Requests
  if (usage.requestsPerMonth > 0 && service.pricing.perMillionRequests) {
    const free = service.free.requestsPerMonth || 0;
    const billable = Math.max(0, usage.requestsPerMonth - free);
    const cost = (billable / 1000000) * service.pricing.perMillionRequests;
    
    usageItems.push({
      item: 'Requests',
      estimated: usage.requestsPerMonth,
      free,
      billable,
      unitPrice: `$${service.pricing.perMillionRequests}/million`,
      cost,
    });
    usageCost += cost;
  }
  
  // Bandwidth
  if (usage.bandwidthGbPerMonth > 0 && service.pricing.perGbBandwidth) {
    const free = service.free.bandwidthGb || 0;
    const billable = Math.max(0, usage.bandwidthGbPerMonth - free);
    const cost = billable * service.pricing.perGbBandwidth;
    
    usageItems.push({
      item: 'Bandwidth',
      estimated: usage.bandwidthGbPerMonth,
      free,
      billable,
      unitPrice: `$${service.pricing.perGbBandwidth}/GB`,
      cost,
    });
    usageCost += cost;
  }
  
  // Compute hours
  if (usage.computeHoursPerMonth > 0 && service.pricing.perComputeHour) {
    const free = service.free.computeHours || 0;
    const billable = Math.max(0, usage.computeHoursPerMonth - free);
    const cost = billable * service.pricing.perComputeHour;
    
    usageItems.push({
      item: 'Compute',
      estimated: usage.computeHoursPerMonth,
      free,
      billable,
      unitPrice: `$${service.pricing.perComputeHour}/hour`,
      cost,
    });
    usageCost += cost;
  }
  
  // Storage
  if (usage.storageGb > 0 && service.pricing.perGbStorage) {
    const free = service.free.storageGb || 0;
    const billable = Math.max(0, usage.storageGb - free);
    const cost = billable * service.pricing.perGbStorage;
    
    usageItems.push({
      item: 'Storage',
      estimated: usage.storageGb,
      free,
      billable,
      unitPrice: `$${service.pricing.perGbStorage}/GB/mo`,
      cost,
    });
    usageCost += cost;
  }
  
  // Database
  if (usage.databaseGb > 0 && service.pricing.perGbDatabase) {
    const free = service.free.databaseGb || 0;
    const billable = Math.max(0, usage.databaseGb - free);
    const cost = billable * service.pricing.perGbDatabase;
    
    usageItems.push({
      item: 'Database',
      estimated: usage.databaseGb,
      free,
      billable,
      unitPrice: `$${service.pricing.perGbDatabase}/GB/mo`,
      cost,
    });
    usageCost += cost;
  }
  
  // Base plan (required if over free tier, or forced)
  const basePlan = (service.pricing.forceBasePlan || usageCost > 0) 
    ? (service.pricing.basePlan || 0) 
    : 0;
  
  return {
    service: service.name,
    provider: service.provider,
    usage: usageItems,
    basePlan,
    usageCost,
    totalMonthly: basePlan + usageCost,
    freeNote: service.free.note,
    warnings: service.warnings || [],
  };
}

// Helper: Format calculation for display
export function formatCalculation(calc: CostCalculation): string {
  let output = `\n📊 ${calc.service}\n`;
  output += `${'─'.repeat(50)}\n`;
  
  if (calc.freeNote) {
    output += `🎁 Free tier: ${calc.freeNote}\n\n`;
  }
  
  for (const item of calc.usage) {
    output += `${item.item}:\n`;
    output += `  Estimated: ${item.estimated.toLocaleString()}\n`;
    output += `  Free tier: ${item.free.toLocaleString()}\n`;
    output += `  Billable:  ${item.billable.toLocaleString()}\n`;
    output += `  Rate:      ${item.unitPrice}\n`;
    output += `  Cost:      $${item.cost.toFixed(2)}\n\n`;
  }
  
  if (calc.basePlan > 0) {
    output += `Base plan: $${calc.basePlan}/mo\n`;
  }
  
  output += `${'─'.repeat(50)}\n`;
  output += `TOTAL: $${calc.totalMonthly.toFixed(2)}/month\n`;
  
  if (calc.warnings.length > 0) {
    output += `\n⚠️ ${calc.warnings.join('\n⚠️ ')}\n`;
  }
  
  return output;
}
