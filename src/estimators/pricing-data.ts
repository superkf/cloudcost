// Pricing data for cloud services (as of March 2026)
// All prices in USD

export const PRICING_DATA: Record<string, Record<string, any>> = {
  cloudflare: {
    'CloudFlare Workers': {
      freeRequests: 100000,           // 100k free requests/day
      perRequest: 0.0000005,          // $0.50 per million
      perCpuSecond: 0.00001,          // CPU time
      freeTier: true,
      paidPlan: 5,                    // $5/month for Workers Paid
    },
    'CloudFlare Containers': {
      perCpuHour: 0.031,              // $0.031/vCPU-hour
      perGbHour: 0.004,               // $0.004/GB-hour
      freeTier: false,
      warning: 'Containers are expensive for always-on workloads!'
    },
    'CloudFlare R2': {
      perGbMonth: 0.015,              // $0.015/GB/month
      perClassAOp: 0.0000045,         // $4.50 per million
      perClassBOp: 0.00000036,        // $0.36 per million
      freeStorage: 10,                // 10 GB free
      freeEgress: true,               // No egress fees!
    }
  },
  
  vercel: {
    'Vercel': {
      freeTier: true,
      hobbyPlan: 0,                   // Free
      proPlan: 20,                    // $20/month
      perGbBandwidth: 0.15,           // $0.15/GB after free
      freeBandwidth: 100,             // 100 GB free on Pro
      freeRequests: 1000000,          // 1M free function invocations
    }
  },
  
  netlify: {
    'Netlify Functions': {
      freeTier: true,
      freeRequests: 125000,           // 125k free/month
      perRequest: 0.00002,            // $0.02 per 1000
      proPlan: 19,                    // $19/month
    }
  },
  
  fly: {
    'Fly.io': {
      perCpuHour: 0.0063,             // Shared CPU
      perGbHour: 0.00269,             // Memory
      freeAllowance: 3,               // 3 shared-cpu-1x VMs free
      warning: 'Free tier is generous but limited'
    }
  },
  
  railway: {
    'Railway': {
      perCpuHour: 0.000463,           // vCPU
      perGbHour: 0.000231,            // Memory
      freeTier: true,
      freeCredit: 5,                  // $5 free/month
    }
  },
  
  openai: {
    'OpenAI API': {
      // GPT-4o (latest)
      inputPerMillion: 2.50,          // $2.50 per 1M input tokens
      outputPerMillion: 10.00,        // $10 per 1M output tokens
      // GPT-4o-mini
      miniInputPerMillion: 0.15,
      miniOutputPerMillion: 0.60,
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
    }
  },
  
  anthropic: {
    'Anthropic Claude': {
      // Claude 3.5 Sonnet
      inputPerMillion: 3.00,          // $3 per 1M input tokens
      outputPerMillion: 15.00,        // $15 per 1M output tokens
      // Claude 3 Haiku
      haikuInputPerMillion: 0.25,
      haikuOutputPerMillion: 1.25,
      // Claude 3 Opus
      opusInputPerMillion: 15.00,
      opusOutputPerMillion: 75.00,
      models: ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus']
    }
  },
  
  google: {
    'Google Gemini': {
      // Gemini 1.5 Pro
      inputPerMillion: 1.25,          
      outputPerMillion: 5.00,
      // Gemini 1.5 Flash
      flashInputPerMillion: 0.075,
      flashOutputPerMillion: 0.30,
      freeTier: true,
      freeRequests: 60,               // 60 RPM free
    }
  },
  
  deepseek: {
    'DeepSeek': {
      inputPerMillion: 0.14,          // Super cheap!
      outputPerMillion: 0.28,
      note: 'One of the cheapest AI APIs'
    }
  },
  
  supabase: {
    'Supabase': {
      freeTier: true,
      freeStorage: 0.5,               // 500 MB
      freeBandwidth: 2,               // 2 GB
      proPlan: 25,                    // $25/month
      perGbMonth: 0.125,              // Storage overage
    }
  },
  
  planetscale: {
    'PlanetScale': {
      freeTier: true,
      freeStorage: 5,                 // 5 GB
      freeReads: 1000000000,          // 1B row reads
      scalerProPlan: 29,              // $29/month
      perGbMonth: 2.50,
    }
  },
  
  neon: {
    'Neon': {
      freeTier: true,
      freeStorage: 0.5,               // 512 MB
      freeCompute: 191,               // 191 compute hours
      proPlan: 19,                    // $19/month
    }
  },
  
  aws: {
    'AWS S3': {
      perGbMonth: 0.023,              // Standard storage
      perRequest: 0.0000004,          // GET requests
      perGbEgress: 0.09,              // Data transfer out
    }
  }
};
