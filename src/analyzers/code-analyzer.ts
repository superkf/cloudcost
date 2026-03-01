/**
 * AI-Powered Code Analyzer
 * Scans code to automatically estimate resource usage
 */

import * as fs from 'fs';
import * as path from 'path';

export interface UsageEstimation {
  // Traffic
  estimatedRequestsPerDay: number;
  requestsConfidence: 'high' | 'medium' | 'low';
  requestsReasoning: string[];
  
  // Compute
  estimatedCpuMsPerRequest: number;
  cpuIntensiveOperations: string[];
  isAlwaysOn: boolean;  // 24/7 container vs serverless
  
  // Memory
  estimatedMemoryMb: number;
  memoryIntensiveOperations: string[];
  
  // Storage
  estimatedStorageGb: number;
  storageOperations: string[];
  
  // Database
  estimatedDbSizeGb: number;
  estimatedDbQueriesPerDay: number;
  dbOperations: string[];
  
  // Bandwidth
  estimatedBandwidthGbPerDay: number;
  bandwidthOperations: string[];
  
  // AI API (if detected)
  aiApiCalls?: {
    provider: string;
    model: string;
    estimatedCallsPerDay: number;
    estimatedTokensPerCall: number;
  }[];
  
  // Summary
  summary: string;
  warnings: string[];
  suggestions: string[];
}

// ==================== PATTERN DETECTORS ====================

interface PatternMatch {
  pattern: string;
  impact: 'low' | 'medium' | 'high';
  category: 'cpu' | 'memory' | 'storage' | 'bandwidth' | 'database' | 'requests';
  description: string;
  multiplier?: number;
}

const CODE_PATTERNS: { regex: RegExp; match: PatternMatch }[] = [
  // ========== REQUEST VOLUME INDICATORS ==========
  {
    regex: /app\.(get|post|put|delete|patch)\s*\(/gi,
    match: { pattern: 'HTTP endpoint', impact: 'medium', category: 'requests', description: 'API endpoint detected', multiplier: 100 }
  },
  {
    regex: /router\.(get|post|put|delete)/gi,
    match: { pattern: 'Router endpoint', impact: 'medium', category: 'requests', description: 'Router endpoint detected', multiplier: 100 }
  },
  {
    regex: /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE)/gi,
    match: { pattern: 'Next.js API route', impact: 'medium', category: 'requests', description: 'Next.js API route', multiplier: 200 }
  },
  {
    regex: /addEventListener\s*\(\s*['"]fetch['"]/gi,
    match: { pattern: 'Worker fetch handler', impact: 'medium', category: 'requests', description: 'CF Worker handler', multiplier: 500 }
  },
  {
    regex: /cron|schedule|setInterval|setTimeout.*\d{4,}/gi,
    match: { pattern: 'Scheduled task', impact: 'medium', category: 'requests', description: 'Scheduled/cron job', multiplier: 50 }
  },
  {
    regex: /webhook|callback.*url/gi,
    match: { pattern: 'Webhook', impact: 'medium', category: 'requests', description: 'Webhook endpoint', multiplier: 100 }
  },
  
  // ========== CPU INTENSIVE ==========
  {
    regex: /bcrypt|argon2|scrypt|pbkdf2/gi,
    match: { pattern: 'Password hashing', impact: 'high', category: 'cpu', description: 'Password hashing (CPU intensive)' }
  },
  {
    regex: /crypto\.(createHash|createCipher|createSign|randomBytes)/gi,
    match: { pattern: 'Crypto operations', impact: 'high', category: 'cpu', description: 'Cryptographic operations' }
  },
  {
    regex: /sharp|jimp|canvas|imagemagick|gm\(/gi,
    match: { pattern: 'Image processing', impact: 'high', category: 'cpu', description: 'Image processing (very CPU intensive)' }
  },
  {
    regex: /ffmpeg|fluent-ffmpeg|video/gi,
    match: { pattern: 'Video processing', impact: 'high', category: 'cpu', description: 'Video processing (extreme CPU)' }
  },
  {
    regex: /pdf|puppeteer|playwright.*pdf/gi,
    match: { pattern: 'PDF generation', impact: 'high', category: 'cpu', description: 'PDF generation' }
  },
  {
    regex: /JSON\.(parse|stringify).*\d{5,}|large.*json/gi,
    match: { pattern: 'Large JSON', impact: 'medium', category: 'cpu', description: 'Large JSON parsing' }
  },
  {
    regex: /\.map\(|\.filter\(|\.reduce\(|forEach/gi,
    match: { pattern: 'Array operations', impact: 'low', category: 'cpu', description: 'Array iteration' }
  },
  {
    regex: /regex|RegExp.*\{.*\d+,/gi,
    match: { pattern: 'Complex regex', impact: 'medium', category: 'cpu', description: 'Complex regex (potential ReDoS)' }
  },
  
  // ========== MEMORY INTENSIVE ==========
  {
    regex: /Buffer\.(alloc|from)|new\s+ArrayBuffer/gi,
    match: { pattern: 'Buffer allocation', impact: 'medium', category: 'memory', description: 'Buffer allocation' }
  },
  {
    regex: /stream|createReadStream|pipe\(/gi,
    match: { pattern: 'Streaming', impact: 'medium', category: 'memory', description: 'Stream processing' }
  },
  {
    regex: /cache|Map\(\)|new\s+Set\(\)|WeakMap/gi,
    match: { pattern: 'In-memory cache', impact: 'medium', category: 'memory', description: 'In-memory caching' }
  },
  {
    regex: /\.readFile|fs\.read(?!Stream)/gi,
    match: { pattern: 'File read to memory', impact: 'medium', category: 'memory', description: 'Loading files to memory' }
  },
  
  // ========== STORAGE ==========
  {
    regex: /uploadFile|putObject|upload.*s3|r2\.put|writeFile/gi,
    match: { pattern: 'File upload', impact: 'high', category: 'storage', description: 'File upload/storage' }
  },
  {
    regex: /multer|formidable|busboy/gi,
    match: { pattern: 'File upload middleware', impact: 'high', category: 'storage', description: 'File upload handling' }
  },
  {
    regex: /\.blob\(|Blob\(/gi,
    match: { pattern: 'Blob handling', impact: 'medium', category: 'storage', description: 'Blob data handling' }
  },
  
  // ========== BANDWIDTH ==========
  {
    regex: /fetch\(|axios|http\.request|got\(/gi,
    match: { pattern: 'External HTTP', impact: 'medium', category: 'bandwidth', description: 'External HTTP requests' }
  },
  {
    regex: /getObject|download|getSignedUrl/gi,
    match: { pattern: 'File download', impact: 'high', category: 'bandwidth', description: 'File download/egress' }
  },
  {
    regex: /res\.(send|json|download)|Response\(/gi,
    match: { pattern: 'Response sending', impact: 'low', category: 'bandwidth', description: 'HTTP response' }
  },
  {
    regex: /websocket|socket\.io|ws\(/gi,
    match: { pattern: 'WebSocket', impact: 'high', category: 'bandwidth', description: 'WebSocket (persistent connection)' }
  },
  
  // ========== DATABASE ==========
  {
    regex: /SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE/gi,
    match: { pattern: 'SQL query', impact: 'medium', category: 'database', description: 'SQL query' }
  },
  {
    regex: /prisma|drizzle|sequelize|typeorm|knex/gi,
    match: { pattern: 'ORM', impact: 'medium', category: 'database', description: 'ORM usage' }
  },
  {
    regex: /mongodb|mongoose|\.find\(|\.insertOne/gi,
    match: { pattern: 'MongoDB', impact: 'medium', category: 'database', description: 'MongoDB operations' }
  },
  {
    regex: /redis|\.get\(|\.set\(|\.hget|\.lpush/gi,
    match: { pattern: 'Redis', impact: 'low', category: 'database', description: 'Redis operations' }
  },
  {
    regex: /supabase|\.from\(.*\)\.(select|insert|update)/gi,
    match: { pattern: 'Supabase', impact: 'medium', category: 'database', description: 'Supabase database' }
  },
  
  // ========== AI API ==========
  {
    regex: /openai|gpt-4|gpt-3|chat\.completions/gi,
    match: { pattern: 'OpenAI', impact: 'high', category: 'cpu', description: 'OpenAI API calls' }
  },
  {
    regex: /anthropic|claude|messages\.create/gi,
    match: { pattern: 'Anthropic', impact: 'high', category: 'cpu', description: 'Anthropic API calls' }
  },
  {
    regex: /gemini|generativelanguage/gi,
    match: { pattern: 'Gemini', impact: 'high', category: 'cpu', description: 'Google Gemini API' }
  },
  {
    regex: /deepseek/gi,
    match: { pattern: 'DeepSeek', impact: 'medium', category: 'cpu', description: 'DeepSeek API (cheap)' }
  },
  {
    regex: /embedding|vector|similarity/gi,
    match: { pattern: 'Embeddings', impact: 'medium', category: 'cpu', description: 'Vector embeddings' }
  },
];

// ==================== ANALYZER ====================

export async function analyzeCodeForUsage(projectPath: string): Promise<UsageEstimation> {
  const files = getAllCodeFiles(projectPath);
  
  const matches: Map<string, { count: number; files: string[]; match: PatternMatch }> = new Map();
  
  // Scan all files
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(projectPath, file);
      
      for (const { regex, match } of CODE_PATTERNS) {
        const found = content.match(regex);
        if (found) {
          const key = match.pattern;
          if (!matches.has(key)) {
            matches.set(key, { count: 0, files: [], match });
          }
          const entry = matches.get(key)!;
          entry.count += found.length;
          if (!entry.files.includes(relativePath)) {
            entry.files.push(relativePath);
          }
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  // Analyze results
  return calculateEstimation(matches, projectPath);
}

function calculateEstimation(
  matches: Map<string, { count: number; files: string[]; match: PatternMatch }>,
  projectPath: string
): UsageEstimation {
  const result: UsageEstimation = {
    estimatedRequestsPerDay: 0,
    requestsConfidence: 'low',
    requestsReasoning: [],
    estimatedCpuMsPerRequest: 10,  // Base 10ms
    cpuIntensiveOperations: [],
    isAlwaysOn: false,
    estimatedMemoryMb: 128,  // Base 128MB
    memoryIntensiveOperations: [],
    estimatedStorageGb: 0,
    storageOperations: [],
    estimatedDbSizeGb: 0,
    estimatedDbQueriesPerDay: 0,
    dbOperations: [],
    estimatedBandwidthGbPerDay: 0.01,  // Base 10MB
    bandwidthOperations: [],
    summary: '',
    warnings: [],
    suggestions: [],
  };
  
  // Count endpoints for request estimation
  let endpointCount = 0;
  
  for (const [pattern, data] of matches) {
    const { count, files, match } = data;
    
    switch (match.category) {
      case 'requests':
        endpointCount += count;
        const requestsPerEndpoint = match.multiplier || 100;
        result.requestsReasoning.push(`${count}× ${pattern} → ~${count * requestsPerEndpoint} req/day`);
        result.estimatedRequestsPerDay += count * requestsPerEndpoint;
        break;
        
      case 'cpu':
        result.cpuIntensiveOperations.push(`${pattern} (${count}× in ${files.length} files)`);
        if (match.impact === 'high') {
          result.estimatedCpuMsPerRequest += 50;
        } else if (match.impact === 'medium') {
          result.estimatedCpuMsPerRequest += 20;
        }
        break;
        
      case 'memory':
        result.memoryIntensiveOperations.push(`${pattern} (${count}×)`);
        if (match.impact === 'high') {
          result.estimatedMemoryMb += 256;
        } else if (match.impact === 'medium') {
          result.estimatedMemoryMb += 64;
        }
        break;
        
      case 'storage':
        result.storageOperations.push(`${pattern} (${count}×)`);
        if (match.impact === 'high') {
          result.estimatedStorageGb += 5;
        } else if (match.impact === 'medium') {
          result.estimatedStorageGb += 1;
        }
        break;
        
      case 'bandwidth':
        result.bandwidthOperations.push(`${pattern} (${count}×)`);
        if (match.impact === 'high') {
          result.estimatedBandwidthGbPerDay += 0.5;
        } else if (match.impact === 'medium') {
          result.estimatedBandwidthGbPerDay += 0.1;
        }
        break;
        
      case 'database':
        result.dbOperations.push(`${pattern} (${count}×)`);
        result.estimatedDbQueriesPerDay += count * 100;  // Estimate 100 queries per operation per day
        if (count > 10) {
          result.estimatedDbSizeGb += 0.5;
        }
        break;
    }
  }
  
  // Set request confidence based on endpoint detection
  if (endpointCount > 5) {
    result.requestsConfidence = 'high';
  } else if (endpointCount > 0) {
    result.requestsConfidence = 'medium';
  }
  
  // Default minimum requests
  if (result.estimatedRequestsPerDay === 0) {
    result.estimatedRequestsPerDay = 100;  // Minimum assumption
    result.requestsReasoning.push('No endpoints detected, assuming minimal traffic');
  }
  
  // Detect always-on pattern
  const hasWorkerConfig = checkForAlwaysOnConfig(projectPath);
  const hasLongRunning = matches.has('WebSocket') || 
                         matches.has('Scheduled task') ||
                         checkForBotPattern(projectPath);
  
  if (hasWorkerConfig || hasLongRunning) {
    result.isAlwaysOn = true;
    result.warnings.push('⚠️ Detected always-on pattern - will need 24/7 compute');
  }
  
  // Generate summary
  result.summary = generateSummary(result);
  
  // Generate suggestions
  if (result.estimatedCpuMsPerRequest > 100) {
    result.suggestions.push('💡 High CPU usage detected - consider caching or background processing');
  }
  if (result.estimatedStorageGb > 10) {
    result.suggestions.push('💡 High storage usage - use CloudFlare R2 (no egress fees)');
  }
  if (result.isAlwaysOn) {
    result.suggestions.push('💡 For 24/7 workloads: Railway ($5 credit) > Render Worker ($7)');
  }
  
  return result;
}

function generateSummary(est: UsageEstimation): string {
  const lines: string[] = [];
  
  lines.push(`📊 Estimated Usage:`);
  lines.push(`   Requests: ~${est.estimatedRequestsPerDay.toLocaleString()}/day (${est.requestsConfidence} confidence)`);
  lines.push(`   CPU: ~${est.estimatedCpuMsPerRequest}ms per request`);
  lines.push(`   Memory: ~${est.estimatedMemoryMb}MB`);
  
  if (est.estimatedStorageGb > 0) {
    lines.push(`   Storage: ~${est.estimatedStorageGb}GB`);
  }
  if (est.estimatedDbSizeGb > 0) {
    lines.push(`   Database: ~${est.estimatedDbSizeGb}GB, ~${est.estimatedDbQueriesPerDay} queries/day`);
  }
  if (est.isAlwaysOn) {
    lines.push(`   ⚠️ 24/7 Always-On Required`);
  }
  
  return lines.join('\n');
}

function checkForAlwaysOnConfig(projectPath: string): boolean {
  const alwaysOnFiles = [
    'Procfile',           // Heroku worker
    'render.yaml',        // Render worker
    'fly.toml',           // Fly.io
    'railway.json',       // Railway
  ];
  
  for (const file of alwaysOnFiles) {
    const filePath = path.join(projectPath, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (/worker|background|always/i.test(content)) {
          return true;
        }
      } catch (e) {}
    }
  }
  
  return false;
}

function checkForBotPattern(projectPath: string): boolean {
  const files = getAllCodeFiles(projectPath);
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (/telegram|discord.*bot|slack.*bot|bot\.run|polling|long.?poll/i.test(content)) {
        return true;
      }
    } catch (e) {}
  }
  
  return false;
}

function getAllCodeFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv'].includes(entry.name)) continue;
        files.push(...getAllCodeFiles(fullPath));
      } else {
        const ext = path.extname(entry.name);
        if (['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (e) {}
  return files;
}
