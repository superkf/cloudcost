// Detailed AI API pricing (as of March 2026)
// All prices per 1 million tokens in USD

export interface AiModelPricing {
  inputPer1M: number;
  outputPer1M: number;
  cachePer1M?: number;      // Cached input discount
  visionPer1M?: number;     // Image input pricing
  note?: string;
}

export const AI_PRICING: Record<string, Record<string, AiModelPricing>> = {
  openai: {
    // GPT-4o series
    'gpt-4o': {
      inputPer1M: 2.50,
      outputPer1M: 10.00,
      cachePer1M: 1.25,
      visionPer1M: 2.50,
    },
    'gpt-4o-mini': {
      inputPer1M: 0.15,
      outputPer1M: 0.60,
      cachePer1M: 0.075,
      note: 'Best value for most use cases',
    },
    'gpt-4o-audio': {
      inputPer1M: 2.50,
      outputPer1M: 10.00,
    },
    
    // GPT-4 Turbo
    'gpt-4-turbo': {
      inputPer1M: 10.00,
      outputPer1M: 30.00,
      visionPer1M: 10.00,
      note: 'Expensive! Consider gpt-4o instead',
    },
    'gpt-4': {
      inputPer1M: 30.00,
      outputPer1M: 60.00,
      note: 'Very expensive! Use gpt-4o instead',
    },
    
    // GPT-3.5
    'gpt-3.5-turbo': {
      inputPer1M: 0.50,
      outputPer1M: 1.50,
      note: 'Consider gpt-4o-mini instead',
    },
    
    // Reasoning models
    'o1': {
      inputPer1M: 15.00,
      outputPer1M: 60.00,
      cachePer1M: 7.50,
      note: 'Reasoning model - expensive but powerful',
    },
    'o1-mini': {
      inputPer1M: 3.00,
      outputPer1M: 12.00,
      cachePer1M: 1.50,
    },
    'o3-mini': {
      inputPer1M: 1.10,
      outputPer1M: 4.40,
      note: 'New reasoning model - good value',
    },
    
    // Embeddings
    'text-embedding-3-small': {
      inputPer1M: 0.02,
      outputPer1M: 0,
    },
    'text-embedding-3-large': {
      inputPer1M: 0.13,
      outputPer1M: 0,
    },
  },
  
  anthropic: {
    // Claude 4 series
    'claude-opus-4': {
      inputPer1M: 15.00,
      outputPer1M: 75.00,
      cachePer1M: 1.875,
      note: 'Most capable but expensive',
    },
    'claude-sonnet-4': {
      inputPer1M: 3.00,
      outputPer1M: 15.00,
      cachePer1M: 0.375,
      note: 'Best balance of cost/capability',
    },
    
    // Claude 3.5 series
    'claude-3-5-sonnet': {
      inputPer1M: 3.00,
      outputPer1M: 15.00,
      cachePer1M: 0.375,
    },
    'claude-3-5-haiku': {
      inputPer1M: 0.80,
      outputPer1M: 4.00,
      cachePer1M: 0.10,
      note: 'Fast and cheap',
    },
    
    // Claude 3 series
    'claude-3-opus': {
      inputPer1M: 15.00,
      outputPer1M: 75.00,
      note: 'Use claude-opus-4 instead',
    },
    'claude-3-sonnet': {
      inputPer1M: 3.00,
      outputPer1M: 15.00,
    },
    'claude-3-haiku': {
      inputPer1M: 0.25,
      outputPer1M: 1.25,
      note: 'Cheapest Claude option',
    },
  },
  
  google: {
    // Gemini 2.0
    'gemini-2.0-flash': {
      inputPer1M: 0.10,
      outputPer1M: 0.40,
      note: 'Excellent value',
    },
    'gemini-2.0-flash-lite': {
      inputPer1M: 0.075,
      outputPer1M: 0.30,
      note: 'Cheapest Gemini',
    },
    
    // Gemini 1.5
    'gemini-1.5-pro': {
      inputPer1M: 1.25,
      outputPer1M: 5.00,
    },
    'gemini-1.5-flash': {
      inputPer1M: 0.075,
      outputPer1M: 0.30,
    },
    'gemini-1.5-flash-8b': {
      inputPer1M: 0.0375,
      outputPer1M: 0.15,
      note: 'Ultra cheap for simple tasks',
    },
  },
  
  deepseek: {
    'deepseek-chat': {
      inputPer1M: 0.14,
      outputPer1M: 0.28,
      cachePer1M: 0.014,
      note: 'Extremely cheap - great for experimentation',
    },
    'deepseek-coder': {
      inputPer1M: 0.14,
      outputPer1M: 0.28,
    },
    'deepseek-reasoner': {
      inputPer1M: 0.55,
      outputPer1M: 2.19,
      note: 'Reasoning model - still very cheap',
    },
  },
};

export function getAiPricing(provider: string, model: string): AiModelPricing {
  const providerPricing = AI_PRICING[provider.toLowerCase()];
  if (!providerPricing) {
    return { inputPer1M: 1.00, outputPer1M: 2.00, note: 'Unknown provider - using estimate' };
  }
  
  // Try exact match
  if (providerPricing[model]) {
    return providerPricing[model];
  }
  
  // Try partial match
  for (const [key, pricing] of Object.entries(providerPricing)) {
    if (model.includes(key) || key.includes(model)) {
      return pricing;
    }
  }
  
  // Default by provider
  const defaults: Record<string, AiModelPricing> = {
    openai: { inputPer1M: 2.50, outputPer1M: 10.00 },
    anthropic: { inputPer1M: 3.00, outputPer1M: 15.00 },
    google: { inputPer1M: 0.50, outputPer1M: 2.00 },
    deepseek: { inputPer1M: 0.14, outputPer1M: 0.28 },
  };
  
  return defaults[provider.toLowerCase()] || { inputPer1M: 1.00, outputPer1M: 2.00 };
}

// Calculate monthly cost
export function calculateAiMonthlyCost(
  provider: string,
  model: string,
  callsPerDay: number,
  avgInputTokens: number,
  avgOutputTokens: number
): { low: number; mid: number; high: number; breakdown: string } {
  const pricing = getAiPricing(provider, model);
  
  const callsPerMonth = callsPerDay * 30;
  const inputTokensPerMonth = callsPerMonth * avgInputTokens;
  const outputTokensPerMonth = callsPerMonth * avgOutputTokens;
  
  const inputCost = (inputTokensPerMonth / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokensPerMonth / 1_000_000) * pricing.outputPer1M;
  
  const mid = inputCost + outputCost;
  
  const breakdown = `
${callsPerDay} calls/day × 30 days = ${callsPerMonth.toLocaleString()} calls/month
Input: ${(inputTokensPerMonth / 1000).toFixed(0)}K tokens × $${pricing.inputPer1M}/1M = $${inputCost.toFixed(2)}
Output: ${(outputTokensPerMonth / 1000).toFixed(0)}K tokens × $${pricing.outputPer1M}/1M = $${outputCost.toFixed(2)}
${pricing.note ? `💡 ${pricing.note}` : ''}`.trim();

  return {
    low: mid * 0.3,   // Low traffic scenario
    mid,
    high: mid * 3,    // High traffic / retry scenario
    breakdown,
  };
}
