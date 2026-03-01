import { ServiceDetection } from '../detectors/all-services';

export interface ServiceCostEstimate {
  service: string;
  provider: string;
  monthlyLow: number;
  monthlyMid: number;
  monthlyHigh: number;
  breakdown: PriceLineItem[];
  warnings: string[];
  suggestions: string[];
  freeUntil?: string;
}

export interface PriceLineItem {
  item: string;
  quantity: string;
  unitPrice: string;
  monthly: number;
  note?: string;
}

// ==================== ALL PRICING DATA ====================

const PRICING = {
  // REPLIT
  replit: {
    free: { egress: 10, storage: 10, compute: 'shared' },
    hacker: { price: 7, egress: 50, storage: 50 },
    pro: { price: 20, egress: 100, storage: 100 },
    deployments: {
      static: 0,
      reserved: { perMonth: 7 },         // Reserved VM
      autoscale: { perMillion: 0.30 },   // Per request
    },
  },
  
  // RENDER
  render: {
    free: { sleepAfter: 15, bandwidth: 100 },
    individual: {
      webService: { perHour: 0.0076 },   // 512MB, 0.5 CPU
      worker: { perHour: 0.0076 },
      cron: { perJob: 0.0000083 },       // Per second
    },
    plans: {
      starter: 7,                         // 512MB
      standard: 25,                       // 2GB
      pro: 85,                           // 4GB
    },
    postgres: {
      free: { storage: 1 },              // 1GB, 90 day retention
      starter: { price: 7, storage: 1 },
      standard: { price: 20, storage: 10 },
    },
    redis: {
      free: { memory: 25 },              // 25MB
      starter: { price: 10, memory: 100 },
    },
  },
  
  // DENO DEPLOY
  deno: {
    free: {
      requests: 100000,                   // 100k/day
      bandwidthGb: 100,
      kvReads: 450000,                   // /day
      kvWrites: 45000,                   // /day
    },
    pro: {
      price: 20,
      requests: 5000000,                  // 5M/month
      perMillionRequests: 2,
      bandwidthGb: 1000,
      perGbBandwidth: 0.30,
    },
  },
  
  // DIGITALOCEAN APP PLATFORM
  digitalocean: {
    basic: {
      perMonth: 5,                        // 512MB, 1 vCPU
      buildMinutes: 100,
    },
    professional: {
      perMonth: 12,                       // 512MB, dedicated
    },
    database: {
      starter: 15,                        // 1GB
      basic: 30,                          // 2GB
    },
  },
  
  // GOOGLE CLOUD RUN
  gcp: {
    free: {
      requests: 2000000,                  // 2M/month
      cpuSeconds: 180000,                 // 50 vCPU-hours
      memoryGbSeconds: 360000,            // 100 GB-hours
      bandwidth: 1,                       // 1GB
    },
    pricing: {
      perVCpuSecond: 0.000024,
      perGbSecond: 0.0000025,
      perMillion: 0.40,
      perGbEgress: 0.12,
    },
  },
  
  // AWS LAMBDA
  aws: {
    free: {
      requests: 1000000,                  // 1M/month
      gbSeconds: 400000,                  // 400k GB-seconds
    },
    pricing: {
      perMillion: 0.20,
      perGbSecond: 0.0000166667,
      provisionedPerHour: 0.000004646,   // Per GB-hour
    },
  },
  
  // HEROKU
  heroku: {
    eco: { price: 5, sleepAfter: 30 },
    basic: { price: 7, noSleep: true },
    standard1x: { price: 25, memory: 512 },
    standard2x: { price: 50, memory: 1024 },
    postgres: {
      mini: 5,
      basic: 9,
      standard: 50,
    },
    redis: {
      mini: 3,
      premium: 15,
    },
  },
  
  // SUPABASE
  supabase: {
    free: {
      dbSize: 500,                        // 500MB
      bandwidth: 2,                       // 2GB
      edgeFunctions: 500000,              // 500k invocations
      storage: 1,                         // 1GB
    },
    pro: {
      price: 25,
      dbSize: 8192,                       // 8GB
      bandwidth: 50,                      // 50GB
      edgeFunctions: 2000000,
      perAdditionalGb: 0.125,
    },
  },
  
  // UPSTASH
  upstash: {
    redis: {
      free: { commandsPerDay: 10000, storage: 256 },
      payg: { perCommand: 0.0000002, perGb: 0.25 },
    },
    kafka: {
      free: { messagesPerDay: 10000 },
      payg: { perMessage: 0.00006 },
    },
    qstash: {
      free: { messagesPerDay: 500 },
      payg: { perMessage: 0.001 },
    },
  },
  
  // TURSO
  turso: {
    free: {
      storage: 9,                         // 9GB total
      databases: 500,
      locations: 3,
      rowsRead: 1000000000,               // 1B
      rowsWritten: 25000000,              // 25M
    },
    scaler: {
      price: 29,
      storage: 24,
      locations: 6,
    },
  },
  
  // CONVEX
  convex: {
    free: {
      functionCalls: 1000000,             // 1M/month
      storage: 1,                         // 1GB
      bandwidth: 1,                       // 1GB
    },
    pro: {
      price: 25,
      functionCalls: 5000000,
      storage: 10,
      bandwidth: 10,
    },
  },
  
  // PLANETSCALE
  planetscale: {
    scaler: {
      price: 29,
      storage: 5,
      rowReads: 1000000000,               // 1B
      rowWrites: 10000000,                // 10M
    },
    perGbStorage: 2.50,
  },
  
  // NEON
  neon: {
    free: {
      storage: 0.5,                       // 512MB
      computeHours: 191,                  // ~5 hours/day
      branches: 10,
    },
    launch: {
      price: 19,
      storage: 10,
      computeHours: 'unlimited',
    },
    perGbStorage: 0.125,
    perComputeHour: 0.016,
  },
};

// ==================== CALCULATORS ====================

export function calculateServiceCost(service: ServiceDetection): ServiceCostEstimate {
  switch (service.provider) {
    case 'replit': return calculateReplitCost(service);
    case 'render': return calculateRenderCost(service);
    case 'deno': return calculateDenoCost(service);
    case 'digitalocean': return calculateDigitalOceanCost(service);
    case 'gcp': return calculateCloudRunCost(service);
    case 'aws': return calculateLambdaCost(service);
    case 'heroku': return calculateHerokuCost(service);
    case 'supabase': return calculateSupabaseCost(service);
    case 'upstash': return calculateUpstashCost(service);
    case 'turso': return calculateTursoCost(service);
    case 'convex': return calculateConvexCost(service);
    case 'planetscale': return calculatePlanetScaleCost(service);
    case 'neon': return calculateNeonCost(service);
    default:
      return {
        service: service.name,
        provider: service.provider,
        monthlyLow: 0,
        monthlyMid: 0,
        monthlyHigh: 0,
        breakdown: [],
        warnings: [`Unknown pricing for ${service.provider}`],
        suggestions: service.suggestions,
      };
  }
}

function calculateReplitCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.replit;
  const breakdown: PriceLineItem[] = [];
  
  const isStatic = service.configDetails.deploymentTarget === 'static';
  
  if (isStatic) {
    return {
      service: 'Replit',
      provider: 'replit',
      monthlyLow: 0,
      monthlyMid: 0,
      monthlyHigh: 0,
      breakdown: [{ item: 'Static Deployment', quantity: 'Free', unitPrice: '$0', monthly: 0 }],
      warnings: [],
      suggestions: ['🎉 Static sites are FREE!'],
      freeUntil: 'Always free for static sites',
    };
  }
  
  breakdown.push({
    item: 'Reserved VM',
    quantity: '1 instance',
    unitPrice: '$7/month minimum',
    monthly: 7,
    note: 'Always-on VM',
  });
  
  return {
    service: 'Replit',
    provider: 'replit',
    monthlyLow: 0,
    monthlyMid: 7,
    monthlyHigh: 20,
    breakdown,
    warnings: service.warnings,
    suggestions: service.suggestions,
    freeUntil: 'Free for development, $7+ for always-on',
  };
}

function calculateRenderCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.render;
  const breakdown: PriceLineItem[] = [];
  let total = 0;
  
  const serviceCount = service.configDetails.serviceCount || 1;
  
  // Web service
  if (service.configDetails.hasWebService || serviceCount > 0) {
    breakdown.push({
      item: 'Web Service (Starter)',
      quantity: `${serviceCount} service(s)`,
      unitPrice: '$7/month each',
      monthly: 7 * serviceCount,
    });
    total += 7 * serviceCount;
  }
  
  // Worker
  if (service.configDetails.hasWorker) {
    breakdown.push({
      item: 'Background Worker',
      quantity: '24/7',
      unitPrice: '$7/month',
      monthly: 7,
    });
    total += 7;
  }
  
  // Postgres
  if (service.configDetails.hasPostgres) {
    breakdown.push({
      item: 'PostgreSQL',
      quantity: 'Starter',
      unitPrice: '$7/month',
      monthly: 7,
      note: '1GB storage',
    });
    total += 7;
  }
  
  // Redis
  if (service.configDetails.hasRedis) {
    breakdown.push({
      item: 'Redis',
      quantity: 'Starter',
      unitPrice: '$10/month',
      monthly: 10,
    });
    total += 10;
  }
  
  return {
    service: 'Render',
    provider: 'render',
    monthlyLow: 0,
    monthlyMid: total,
    monthlyHigh: total * 2,
    breakdown,
    warnings: service.warnings,
    suggestions: ['Free tier: sleeps after 15 min', ...service.suggestions],
    freeUntil: 'Free tier available (spins down)',
  };
}

function calculateDenoCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.deno;
  
  return {
    service: 'Deno Deploy',
    provider: 'deno',
    monthlyLow: 0,
    monthlyMid: 0,
    monthlyHigh: 20,
    breakdown: [
      {
        item: 'Free Tier',
        quantity: '100k requests/day',
        unitPrice: '$0',
        monthly: 0,
        note: '3M requests/month FREE',
      }
    ],
    warnings: [],
    suggestions: ['🎉 Very generous free tier!', 'Pro: $20/month for 5M+ requests', ...service.suggestions],
    freeUntil: '100k requests/day',
  };
}

function calculateDigitalOceanCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.digitalocean;
  const serviceCount = service.configDetails.serviceCount || 1;
  
  const isPro = service.configDetails.instanceSize?.includes('professional');
  const pricePerService = isPro ? 12 : 5;
  const total = pricePerService * serviceCount;
  
  return {
    service: 'DigitalOcean App Platform',
    provider: 'digitalocean',
    monthlyLow: total,
    monthlyMid: total,
    monthlyHigh: total * 2,
    breakdown: [{
      item: isPro ? 'Professional' : 'Basic',
      quantity: `${serviceCount} service(s)`,
      unitPrice: `$${pricePerService}/month each`,
      monthly: total,
    }],
    warnings: service.warnings,
    suggestions: service.suggestions,
  };
}

function calculateCloudRunCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.gcp;
  const breakdown: PriceLineItem[] = [];
  
  // Assume 50k requests/month, 500ms avg
  const requests = 50000;
  const avgDurationSec = 0.5;
  const memoryGb = 0.5;
  
  const cpuCost = (requests * avgDurationSec) * p.pricing.perVCpuSecond;
  const memoryCost = (requests * avgDurationSec * memoryGb) * p.pricing.perGbSecond;
  const requestCost = (requests / 1000000) * p.pricing.perMillion;
  
  const total = cpuCost + memoryCost + requestCost;
  
  // Check if under free tier
  if (requests < p.free.requests) {
    return {
      service: 'Google Cloud Run',
      provider: 'gcp',
      monthlyLow: 0,
      monthlyMid: 0,
      monthlyHigh: total,
      breakdown: [{
        item: 'Free Tier',
        quantity: '2M requests/month',
        unitPrice: '$0',
        monthly: 0,
      }],
      warnings: service.warnings,
      suggestions: ['🎉 Likely FREE under free tier!', ...service.suggestions],
      freeUntil: '2M requests/month',
    };
  }
  
  breakdown.push({ item: 'CPU', quantity: `${requests} req × ${avgDurationSec}s`, unitPrice: '$0.000024/vCPU-sec', monthly: cpuCost });
  breakdown.push({ item: 'Memory', quantity: `${memoryGb}GB`, unitPrice: '$0.0000025/GB-sec', monthly: memoryCost });
  
  return {
    service: 'Google Cloud Run',
    provider: 'gcp',
    monthlyLow: 0,
    monthlyMid: total,
    monthlyHigh: total * 3,
    breakdown,
    warnings: service.warnings,
    suggestions: service.suggestions,
  };
}

function calculateLambdaCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.aws;
  const funcCount = service.configDetails.functionCount || 1;
  const memory = service.configDetails.memory || 128;
  
  // Assume 50k invocations/month, 500ms avg
  const invocations = 50000;
  const avgDurationMs = 500;
  const gbSeconds = (invocations * avgDurationMs / 1000) * (memory / 1024);
  
  const requestCost = Math.max(0, (invocations - p.free.requests) / 1000000) * p.pricing.perMillion;
  const computeCost = Math.max(0, gbSeconds - p.free.gbSeconds) * p.pricing.perGbSecond;
  
  const total = requestCost + computeCost;
  
  if (total < 1) {
    return {
      service: 'AWS Lambda',
      provider: 'aws',
      monthlyLow: 0,
      monthlyMid: 0,
      monthlyHigh: 5,
      breakdown: [{
        item: 'Free Tier',
        quantity: '1M requests + 400k GB-sec',
        unitPrice: '$0',
        monthly: 0,
      }],
      warnings: service.warnings,
      suggestions: ['🎉 Likely FREE under free tier!', ...service.suggestions],
      freeUntil: '1M requests/month',
    };
  }
  
  return {
    service: 'AWS Lambda',
    provider: 'aws',
    monthlyLow: 0,
    monthlyMid: total,
    monthlyHigh: total * 3,
    breakdown: [
      { item: 'Requests', quantity: `${invocations}`, unitPrice: '$0.20/million', monthly: requestCost },
      { item: 'Compute', quantity: `${gbSeconds.toFixed(0)} GB-sec`, unitPrice: '$0.0000167/GB-sec', monthly: computeCost },
    ],
    warnings: service.warnings,
    suggestions: service.suggestions,
  };
}

function calculateHerokuCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.heroku;
  const breakdown: PriceLineItem[] = [];
  let total = 0;
  
  // Web dyno
  breakdown.push({
    item: 'Web Dyno (Basic)',
    quantity: '1 dyno',
    unitPrice: '$7/month',
    monthly: 7,
    note: 'No sleep',
  });
  total += 7;
  
  // Worker
  if (service.configDetails.hasWorker) {
    breakdown.push({
      item: 'Worker Dyno',
      quantity: '1 dyno',
      unitPrice: '$7/month',
      monthly: 7,
    });
    total += 7;
  }
  
  return {
    service: 'Heroku',
    provider: 'heroku',
    monthlyLow: 5,
    monthlyMid: total,
    monthlyHigh: 50,
    breakdown,
    warnings: ['⚠️ Heroku is expensive vs alternatives', ...service.warnings],
    suggestions: ['Consider Railway ($5 free) or Render', ...service.suggestions],
  };
}

function calculateSupabaseCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.supabase;
  const breakdown: PriceLineItem[] = [];
  
  const hasEdge = service.configDetails.hasEdgeFunctions;
  const edgeCount = service.configDetails.edgeFunctionCount || 0;
  
  breakdown.push({
    item: 'Free Tier',
    quantity: '500MB DB, 2GB bandwidth',
    unitPrice: '$0',
    monthly: 0,
  });
  
  if (hasEdge) {
    breakdown.push({
      item: 'Edge Functions',
      quantity: `${edgeCount} functions, 500k invocations`,
      unitPrice: 'Included in free tier',
      monthly: 0,
    });
  }
  
  return {
    service: 'Supabase',
    provider: 'supabase',
    monthlyLow: 0,
    monthlyMid: 0,
    monthlyHigh: 25,
    breakdown,
    warnings: [],
    suggestions: ['🎉 Generous free tier!', 'Pro: $25/month for 8GB DB', ...service.suggestions],
    freeUntil: '500MB database',
  };
}

function calculateUpstashCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.upstash;
  const breakdown: PriceLineItem[] = [];
  
  if (service.configDetails.hasRedis) {
    breakdown.push({
      item: 'Redis',
      quantity: '10k commands/day FREE',
      unitPrice: '$0.0000002/command after',
      monthly: 0,
    });
  }
  
  if (service.configDetails.hasQStash) {
    breakdown.push({
      item: 'QStash',
      quantity: '500 messages/day FREE',
      unitPrice: '$0.001/message after',
      monthly: 0,
    });
  }
  
  return {
    service: 'Upstash',
    provider: 'upstash',
    monthlyLow: 0,
    monthlyMid: 0,
    monthlyHigh: 10,
    breakdown,
    warnings: [],
    suggestions: ['🎉 Pay-per-request = very cheap for low traffic', ...service.suggestions],
    freeUntil: '10k Redis commands/day',
  };
}

function calculateTursoCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.turso;
  
  return {
    service: 'Turso',
    provider: 'turso',
    monthlyLow: 0,
    monthlyMid: 0,
    monthlyHigh: 29,
    breakdown: [{
      item: 'Free Tier',
      quantity: '9GB storage, 500 databases',
      unitPrice: '$0',
      monthly: 0,
    }],
    warnings: [],
    suggestions: ['🎉 Extremely generous free tier!', 'SQLite at the edge', ...service.suggestions],
    freeUntil: '9GB storage + 1B row reads',
  };
}

function calculateConvexCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.convex;
  
  return {
    service: 'Convex',
    provider: 'convex',
    monthlyLow: 0,
    monthlyMid: 0,
    monthlyHigh: 25,
    breakdown: [{
      item: 'Free Tier',
      quantity: '1M function calls/month',
      unitPrice: '$0',
      monthly: 0,
    }],
    warnings: [],
    suggestions: ['🎉 1M calls/month FREE!', 'Real-time sync included', ...service.suggestions],
    freeUntil: '1M function calls/month',
  };
}

function calculatePlanetScaleCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.planetscale;
  
  return {
    service: 'PlanetScale',
    provider: 'planetscale',
    monthlyLow: 29,
    monthlyMid: 29,
    monthlyHigh: 50,
    breakdown: [{
      item: 'Scaler Plan',
      quantity: '5GB, 1B reads',
      unitPrice: '$29/month',
      monthly: 29,
    }],
    warnings: ['⚠️ No free tier anymore!', ...service.warnings],
    suggestions: ['Consider Turso/Neon for free options', ...service.suggestions],
  };
}

function calculateNeonCost(service: ServiceDetection): ServiceCostEstimate {
  const p = PRICING.neon;
  
  return {
    service: 'Neon',
    provider: 'neon',
    monthlyLow: 0,
    monthlyMid: 0,
    monthlyHigh: 19,
    breakdown: [{
      item: 'Free Tier',
      quantity: '512MB storage, 191 compute hours',
      unitPrice: '$0',
      monthly: 0,
    }],
    warnings: [],
    suggestions: ['🎉 Serverless Postgres - scales to zero!', 'Launch: $19/month', ...service.suggestions],
    freeUntil: '512MB + 191 compute hours',
  };
}
