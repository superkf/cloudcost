import * as fs from 'fs';
import * as path from 'path';
import { analyzeAiUsage, AiUsagePattern } from './ai-analyzer';

export interface DetectedService {
  name: string;
  type: 'serverless' | 'container' | 'ai-api' | 'database' | 'storage';
  provider: string;
  confidence: 'high' | 'medium' | 'low';
  detectedIn: string[];
  details?: Record<string, any>;
}

export { AiUsagePattern };

// File patterns to scan
const SCAN_PATTERNS = [
  '**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx',
  '**/*.py', '**/*.toml', '**/*.json', '**/*.yaml', '**/*.yml',
  '**/wrangler.toml', '**/vercel.json', '**/netlify.toml',
  '**/fly.toml', '**/railway.json', '**/Dockerfile'
];

// Detection rules
const DETECTION_RULES: Array<{
  name: string;
  type: DetectedService['type'];
  provider: string;
  patterns: RegExp[];
  filePatterns?: string[];
}> = [
  // Serverless
  {
    name: 'CloudFlare Workers',
    type: 'serverless',
    provider: 'cloudflare',
    patterns: [/wrangler\.toml/, /from\s+['"]@cloudflare\/workers['"]/, /export\s+default\s*\{[\s\S]*fetch/],
    filePatterns: ['wrangler.toml']
  },
  {
    name: 'CloudFlare Containers',
    type: 'container',
    provider: 'cloudflare',
    patterns: [/\[containers\]/, /cloudflare\/container/]
  },
  {
    name: 'Vercel',
    type: 'serverless',
    provider: 'vercel',
    patterns: [/vercel\.json/, /@vercel\//, /VERCEL_/],
    filePatterns: ['vercel.json']
  },
  {
    name: 'Netlify Functions',
    type: 'serverless',
    provider: 'netlify',
    patterns: [/netlify\.toml/, /@netlify\/functions/],
    filePatterns: ['netlify.toml']
  },
  
  // Containers
  {
    name: 'Fly.io',
    type: 'container',
    provider: 'fly',
    patterns: [/fly\.toml/, /flyctl/],
    filePatterns: ['fly.toml']
  },
  {
    name: 'Railway',
    type: 'container',
    provider: 'railway',
    patterns: [/railway\.json/, /RAILWAY_/],
    filePatterns: ['railway.json', 'railway.toml']
  },
  
  // AI APIs
  {
    name: 'OpenAI API',
    type: 'ai-api',
    provider: 'openai',
    patterns: [/openai/, /OPENAI_API_KEY/, /gpt-4/, /gpt-3\.5/, /from\s+['"]openai['"]/]
  },
  {
    name: 'Anthropic Claude',
    type: 'ai-api',
    provider: 'anthropic',
    patterns: [/anthropic/, /ANTHROPIC_API_KEY/, /claude-3/, /claude-opus/, /claude-sonnet/, /from\s+['"]@anthropic-ai/]
  },
  {
    name: 'Google Gemini',
    type: 'ai-api',
    provider: 'google',
    patterns: [/gemini/, /GOOGLE_AI_KEY/, /generativelanguage\.googleapis/, /@google\/generative-ai/]
  },
  {
    name: 'DeepSeek',
    type: 'ai-api',
    provider: 'deepseek',
    patterns: [/deepseek/, /DEEPSEEK_API_KEY/]
  },
  
  // Databases
  {
    name: 'Supabase',
    type: 'database',
    provider: 'supabase',
    patterns: [/supabase/, /SUPABASE_URL/, /@supabase\/supabase-js/]
  },
  {
    name: 'PlanetScale',
    type: 'database',
    provider: 'planetscale',
    patterns: [/planetscale/, /PLANETSCALE_/, /@planetscale\/database/]
  },
  {
    name: 'Neon',
    type: 'database',
    provider: 'neon',
    patterns: [/neon\.tech/, /NEON_/, /@neondatabase/]
  },
  
  // Storage
  {
    name: 'CloudFlare R2',
    type: 'storage',
    provider: 'cloudflare',
    patterns: [/r2\.cloudflarestorage/, /\[\[r2_buckets\]\]/, /R2Bucket/]
  },
  {
    name: 'AWS S3',
    type: 'storage',
    provider: 'aws',
    patterns: [/s3\.amazonaws/, /AWS_S3/, /@aws-sdk\/client-s3/]
  }
];

export async function scanProject(projectPath: string): Promise<DetectedService[]> {
  const detected: Map<string, DetectedService> = new Map();
  
  // Get all relevant files
  const files = await getAllFiles(projectPath);
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(projectPath, file);
      
      for (const rule of DETECTION_RULES) {
        // Check file name patterns
        if (rule.filePatterns?.some(fp => file.includes(fp))) {
          addDetection(detected, rule, relativePath, 'high');
          continue;
        }
        
        // Check content patterns
        for (const pattern of rule.patterns) {
          if (pattern.test(content)) {
            addDetection(detected, rule, relativePath, 'medium');
            break;
          }
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  // Run detailed AI analysis
  const aiPatterns = await analyzeAiUsage(projectPath);
  
  // Enrich AI service detections with usage patterns
  for (const pattern of aiPatterns) {
    const key = `${pattern.provider}-${getAiServiceName(pattern.provider)}`;
    const existing = detected.get(key);
    
    if (existing) {
      existing.details = { ...existing.details, aiPattern: pattern };
      // Upgrade confidence if we detected specific model
      if (pattern.detectedPatterns.some(p => p.startsWith('Model:'))) {
        existing.confidence = 'high';
      }
    }
  }
  
  return Array.from(detected.values());
}

function getAiServiceName(provider: string): string {
  const names: Record<string, string> = {
    openai: 'OpenAI API',
    anthropic: 'Anthropic Claude',
    google: 'Google Gemini',
    deepseek: 'DeepSeek',
  };
  return names[provider] || provider;
}

function addDetection(
  detected: Map<string, DetectedService>,
  rule: typeof DETECTION_RULES[0],
  filePath: string,
  confidence: DetectedService['confidence']
) {
  const key = `${rule.provider}-${rule.name}`;
  
  if (detected.has(key)) {
    const existing = detected.get(key)!;
    existing.detectedIn.push(filePath);
    // Upgrade confidence if found in more places
    if (existing.confidence === 'low') existing.confidence = 'medium';
    if (confidence === 'high') existing.confidence = 'high';
  } else {
    detected.set(key, {
      name: rule.name,
      type: rule.type,
      provider: rule.provider,
      confidence,
      detectedIn: [filePath]
    });
  }
}

async function getAllFiles(dir: string, files: string[] = []): Promise<string[]> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip node_modules, .git, etc
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', '.next', '.vercel'].includes(entry.name)) {
        continue;
      }
      await getAllFiles(fullPath, files);
    } else {
      const ext = path.extname(entry.name);
      if (['.ts', '.js', '.tsx', '.jsx', '.py', '.toml', '.json', '.yaml', '.yml'].includes(ext)) {
        files.push(fullPath);
      }
      // Also include specific config files
      if (['wrangler.toml', 'vercel.json', 'netlify.toml', 'fly.toml', 'Dockerfile'].includes(entry.name)) {
        if (!files.includes(fullPath)) files.push(fullPath);
      }
    }
  }
  
  return files;
}
