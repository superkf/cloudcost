import { DetectedService } from '../detectors';
import { AiUsagePattern } from '../detectors/ai-analyzer';
import { PRICING_DATA } from './pricing-data';
import { calculateAiMonthlyCost, getAiPricing } from './ai-pricing';

export interface CostEstimate {
  service: DetectedService;
  monthlyLow: number;
  monthlyHigh: number;
  currency: 'USD';
  breakdown: CostBreakdownItem[];
  warnings: string[];
  suggestions: string[];
}

export interface CostBreakdownItem {
  item: string;
  quantity: string;
  unitPrice: string;
  subtotal: number;
}

// Default usage assumptions for vibe coders
const DEFAULT_USAGE = {
  monthlyRequests: 10000,      // 10k requests/month
  avgResponseSize: 50,          // 50 KB average
  cpuTimePerRequest: 10,        // 10ms CPU time
  aiTokensPerDay: 50000,        // 50k tokens/day
  dbStorageGb: 1,               // 1 GB storage
  dbQueriesPerDay: 1000,        // 1k queries/day
};

export function estimateCosts(services: DetectedService[]): CostEstimate[] {
  return services.map(service => estimateServiceCost(service));
}

function estimateServiceCost(service: DetectedService): CostEstimate {
  const pricing = PRICING_DATA[service.provider]?.[service.name];
  
  if (!pricing) {
    return {
      service,
      monthlyLow: 0,
      monthlyHigh: 0,
      currency: 'USD',
      breakdown: [],
      warnings: [`No pricing data available for ${service.name}`],
      suggestions: []
    };
  }

  const breakdown: CostBreakdownItem[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  let monthlyLow = 0;
  let monthlyHigh = 0;

  // Calculate based on service type
  switch (service.type) {
    case 'serverless':
      const result = calculateServerlessCost(service, pricing);
      monthlyLow = result.low;
      monthlyHigh = result.high;
      breakdown.push(...result.breakdown);
      warnings.push(...result.warnings);
      suggestions.push(...result.suggestions);
      break;
      
    case 'container':
      const containerResult = calculateContainerCost(service, pricing);
      monthlyLow = containerResult.low;
      monthlyHigh = containerResult.high;
      breakdown.push(...containerResult.breakdown);
      warnings.push(...containerResult.warnings);
      suggestions.push(...containerResult.suggestions);
      break;
      
    case 'ai-api':
      const aiResult = calculateAiApiCost(service, pricing);
      monthlyLow = aiResult.low;
      monthlyHigh = aiResult.high;
      breakdown.push(...aiResult.breakdown);
      warnings.push(...aiResult.warnings);
      break;
      
    case 'database':
      const dbResult = calculateDatabaseCost(service, pricing);
      monthlyLow = dbResult.low;
      monthlyHigh = dbResult.high;
      breakdown.push(...dbResult.breakdown);
      break;
      
    case 'storage':
      const storageResult = calculateStorageCost(service, pricing);
      monthlyLow = storageResult.low;
      monthlyHigh = storageResult.high;
      breakdown.push(...storageResult.breakdown);
      break;
  }

  return {
    service,
    monthlyLow: Math.round(monthlyLow * 100) / 100,
    monthlyHigh: Math.round(monthlyHigh * 100) / 100,
    currency: 'USD',
    breakdown,
    warnings,
    suggestions
  };
}

function calculateServerlessCost(service: DetectedService, pricing: any) {
  const breakdown: CostBreakdownItem[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  const requests = DEFAULT_USAGE.monthlyRequests;
  const freeRequests = pricing.freeRequests || 0;
  const billableRequests = Math.max(0, requests - freeRequests);
  
  const requestCost = billableRequests * (pricing.perRequest || 0);
  const cpuCost = (requests * DEFAULT_USAGE.cpuTimePerRequest / 1000) * (pricing.perCpuSecond || 0);
  
  breakdown.push({
    item: 'Requests',
    quantity: `${requests.toLocaleString()} / month`,
    unitPrice: `$${pricing.perRequest || 0} per request`,
    subtotal: requestCost
  });
  
  if (pricing.perCpuSecond) {
    breakdown.push({
      item: 'CPU Time',
      quantity: `${(requests * DEFAULT_USAGE.cpuTimePerRequest / 1000).toFixed(1)} seconds`,
      unitPrice: `$${pricing.perCpuSecond} per second`,
      subtotal: cpuCost
    });
  }
  
  const low = requestCost + cpuCost;
  const high = low * 3; // Assume 3x for traffic spikes
  
  if (pricing.freeRequests) {
    suggestions.push(`Free tier includes ${pricing.freeRequests.toLocaleString()} requests/month`);
  }
  
  return { low, high, breakdown, warnings, suggestions };
}

function calculateContainerCost(service: DetectedService, pricing: any) {
  const breakdown: CostBreakdownItem[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Containers run 24/7
  const hoursPerMonth = 730;
  const cpuCost = hoursPerMonth * (pricing.perCpuHour || 0);
  const memoryCost = hoursPerMonth * (pricing.perGbHour || 0);
  
  breakdown.push({
    item: 'CPU (1 vCPU)',
    quantity: `${hoursPerMonth} hours`,
    unitPrice: `$${pricing.perCpuHour || 0}/hour`,
    subtotal: cpuCost
  });
  
  breakdown.push({
    item: 'Memory (1 GB)',
    quantity: `${hoursPerMonth} hours`,
    unitPrice: `$${pricing.perGbHour || 0}/hour`,
    subtotal: memoryCost
  });
  
  const baseCost = cpuCost + memoryCost;
  
  warnings.push('⚠️ Containers run 24/7 - costs add up fast!');
  suggestions.push('💡 Consider using Workers instead for event-driven workloads');
  
  return { 
    low: baseCost, 
    high: baseCost * 2, // Could scale up
    breakdown, 
    warnings, 
    suggestions 
  };
}

function calculateAiApiCost(service: DetectedService, pricing: any) {
  const breakdown: CostBreakdownItem[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Use detected AI usage patterns if available
  const aiPattern = service.details?.aiPattern as AiUsagePattern | undefined;
  
  const model = aiPattern?.model || getDefaultModel(service.provider);
  const callsPerDay = aiPattern?.estimatedCallsPerDay || 100;
  const avgInputTokens = aiPattern?.avgInputTokens || 500;
  const avgOutputTokens = aiPattern?.avgOutputTokens || 1000;
  
  const costCalc = calculateAiMonthlyCost(
    service.provider,
    model,
    callsPerDay,
    avgInputTokens,
    avgOutputTokens
  );
  
  const aiPricing = getAiPricing(service.provider, model);
  
  breakdown.push({
    item: `Model: ${model}`,
    quantity: `${callsPerDay} calls/day`,
    unitPrice: `$${aiPricing.inputPer1M}/$${aiPricing.outputPer1M} per 1M`,
    subtotal: costCalc.mid
  });
  
  breakdown.push({
    item: 'Input Tokens',
    quantity: `${(callsPerDay * 30 * avgInputTokens / 1000).toFixed(0)}K/month`,
    unitPrice: `$${aiPricing.inputPer1M}/1M`,
    subtotal: (callsPerDay * 30 * avgInputTokens / 1_000_000) * aiPricing.inputPer1M
  });
  
  breakdown.push({
    item: 'Output Tokens',
    quantity: `${(callsPerDay * 30 * avgOutputTokens / 1000).toFixed(0)}K/month`,
    unitPrice: `$${aiPricing.outputPer1M}/1M`,
    subtotal: (callsPerDay * 30 * avgOutputTokens / 1_000_000) * aiPricing.outputPer1M
  });
  
  // Add warnings based on model
  if (aiPattern?.modelTier === 'expensive') {
    warnings.push(`⚠️ Using expensive model (${model})!`);
    suggestions.push(getCheaperAlternative(service.provider, model));
  }
  
  if (aiPattern?.hasVision) {
    warnings.push('Vision API detected - image inputs cost extra');
  }
  
  if (callsPerDay > 500) {
    warnings.push('High API call frequency detected');
  }
  
  // Detected patterns
  if (aiPattern?.detectedPatterns.length) {
    suggestions.push(`Detected: ${aiPattern.detectedPatterns.slice(0, 3).join(', ')}`);
  }
  
  return { 
    low: costCalc.low, 
    high: costCalc.high, 
    breakdown, 
    warnings, 
    suggestions 
  };
}

function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet',
    google: 'gemini-1.5-flash',
    deepseek: 'deepseek-chat',
  };
  return defaults[provider] || 'unknown';
}

function getCheaperAlternative(provider: string, model: string): string {
  const alternatives: Record<string, Record<string, string>> = {
    openai: {
      'gpt-4': '💡 Use gpt-4o instead (10x cheaper)',
      'gpt-4-turbo': '💡 Use gpt-4o instead (4x cheaper)',
      'o1': '💡 Use o3-mini for simpler reasoning tasks',
    },
    anthropic: {
      'claude-3-opus': '💡 Use claude-sonnet-4 (5x cheaper)',
      'claude-opus-4': '💡 Use claude-sonnet-4 for most tasks',
    },
    google: {
      'gemini-1.5-pro': '💡 Use gemini-2.0-flash (10x cheaper)',
    },
  };
  
  return alternatives[provider]?.[model] || '💡 Consider a smaller model for cost savings';
}

function calculateDatabaseCost(service: DetectedService, pricing: any) {
  const breakdown: CostBreakdownItem[] = [];
  
  const storageCost = DEFAULT_USAGE.dbStorageGb * (pricing.perGbMonth || 0);
  
  breakdown.push({
    item: 'Storage',
    quantity: `${DEFAULT_USAGE.dbStorageGb} GB`,
    unitPrice: `$${pricing.perGbMonth || 0}/GB/month`,
    subtotal: storageCost
  });
  
  const low = pricing.basePlan || storageCost;
  const high = pricing.proPlan || low * 3;
  
  return { low, high, breakdown, warnings: [], suggestions: [] };
}

function calculateStorageCost(service: DetectedService, pricing: any) {
  const breakdown: CostBreakdownItem[] = [];
  
  const storageGb = 10; // Assume 10 GB
  const storageCost = storageGb * (pricing.perGbMonth || 0);
  
  breakdown.push({
    item: 'Storage',
    quantity: `${storageGb} GB`,
    unitPrice: `$${pricing.perGbMonth || 0}/GB/month`,
    subtotal: storageCost
  });
  
  return { low: storageCost, high: storageCost * 2, breakdown, warnings: [], suggestions: [] };
}
