import * as fs from 'fs';
import * as path from 'path';

export interface AiUsagePattern {
  provider: 'openai' | 'anthropic' | 'google' | 'deepseek';
  model: string;
  modelTier: 'cheap' | 'standard' | 'expensive';
  estimatedCallsPerDay: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  hasStreaming: boolean;
  hasVision: boolean;
  confidence: 'high' | 'medium' | 'low';
  detectedPatterns: string[];
}

// Model pricing tiers
const MODEL_TIERS: Record<string, { tier: 'cheap' | 'standard' | 'expensive', avgInput: number, avgOutput: number }> = {
  // OpenAI
  'gpt-4o': { tier: 'standard', avgInput: 500, avgOutput: 1000 },
  'gpt-4o-mini': { tier: 'cheap', avgInput: 500, avgOutput: 1000 },
  'gpt-4-turbo': { tier: 'expensive', avgInput: 500, avgOutput: 1000 },
  'gpt-4': { tier: 'expensive', avgInput: 500, avgOutput: 1000 },
  'gpt-3.5-turbo': { tier: 'cheap', avgInput: 500, avgOutput: 500 },
  'o1': { tier: 'expensive', avgInput: 1000, avgOutput: 2000 },
  'o1-mini': { tier: 'standard', avgInput: 1000, avgOutput: 2000 },
  
  // Anthropic
  'claude-3-5-sonnet': { tier: 'standard', avgInput: 800, avgOutput: 1500 },
  'claude-3-sonnet': { tier: 'standard', avgInput: 800, avgOutput: 1500 },
  'claude-3-haiku': { tier: 'cheap', avgInput: 500, avgOutput: 800 },
  'claude-3-opus': { tier: 'expensive', avgInput: 1000, avgOutput: 2000 },
  'claude-opus-4': { tier: 'expensive', avgInput: 1000, avgOutput: 2000 },
  'claude-sonnet-4': { tier: 'standard', avgInput: 800, avgOutput: 1500 },
  
  // Google
  'gemini-1.5-pro': { tier: 'standard', avgInput: 800, avgOutput: 1500 },
  'gemini-1.5-flash': { tier: 'cheap', avgInput: 500, avgOutput: 800 },
  'gemini-2.0-flash': { tier: 'cheap', avgInput: 500, avgOutput: 800 },
  
  // DeepSeek
  'deepseek-chat': { tier: 'cheap', avgInput: 500, avgOutput: 1000 },
  'deepseek-coder': { tier: 'cheap', avgInput: 800, avgOutput: 1500 },
};

// Patterns that indicate usage frequency
const USAGE_PATTERNS = {
  highFrequency: [
    /while\s*\(true\)/,                    // Infinite loops with AI
    /setInterval.*(?:openai|anthropic|gemini)/i,
    /cron|schedule|job/i,                  // Scheduled tasks
    /stream.*chunk/i,                      // Streaming (often more calls)
    /retry|retries/i,                      // Retry logic = more calls
  ],
  mediumFrequency: [
    /api.*route|endpoint/i,                // API endpoint
    /req.*res|request.*response/i,         // HTTP handlers
    /onClick|onSubmit|onChange/i,          // UI event handlers
  ],
  lowFrequency: [
    /test|spec|mock/i,                     // Test files
    /example|demo|sample/i,                // Demo code
  ],
  
  // Token-intensive patterns
  longContext: [
    /system.*prompt.*`[\s\S]{500,}/,       // Long system prompts
    /\.pdf|\.doc|document/i,               // Document processing
    /embedding|vector|rag/i,               // RAG = lots of context
    /history|conversation|memory/i,        // Chat history = growing context
  ],
  
  // Vision = more expensive
  vision: [
    /image.*url|imageUrl/i,
    /vision|image.*content/i,
    /base64.*image|data:image/i,
    /\.png|\.jpg|\.jpeg|\.webp/,
  ],
};

export async function analyzeAiUsage(projectPath: string): Promise<AiUsagePattern[]> {
  const patterns: AiUsagePattern[] = [];
  const files = await getCodeFiles(projectPath);
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(projectPath, file);
      
      // Skip test files for frequency estimation
      const isTestFile = /test|spec|mock|example|demo/.test(relativePath);
      
      // Detect OpenAI
      if (/openai|OPENAI_API_KEY/i.test(content)) {
        const pattern = analyzeOpenAI(content, isTestFile);
        if (pattern) patterns.push(pattern);
      }
      
      // Detect Anthropic
      if (/anthropic|ANTHROPIC_API_KEY|claude/i.test(content)) {
        const pattern = analyzeAnthropic(content, isTestFile);
        if (pattern) patterns.push(pattern);
      }
      
      // Detect Google
      if (/gemini|GOOGLE_AI_KEY|generativelanguage/i.test(content)) {
        const pattern = analyzeGoogle(content, isTestFile);
        if (pattern) patterns.push(pattern);
      }
      
      // Detect DeepSeek
      if (/deepseek|DEEPSEEK_API_KEY/i.test(content)) {
        const pattern = analyzeDeepSeek(content, isTestFile);
        if (pattern) patterns.push(pattern);
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  // Merge duplicates
  return mergePatterns(patterns);
}

function analyzeOpenAI(content: string, isTestFile: boolean): AiUsagePattern | null {
  const detected: string[] = [];
  
  // Detect model
  let model = 'gpt-4o'; // Default
  const modelMatch = content.match(/model['":\s]+['"]?(gpt-[\w.-]+|o1[\w-]*)/i);
  if (modelMatch) {
    model = modelMatch[1].toLowerCase();
    detected.push(`Model: ${model}`);
  }
  
  const modelInfo = MODEL_TIERS[model] || MODEL_TIERS['gpt-4o'];
  
  // Estimate frequency
  let callsPerDay = isTestFile ? 10 : 100;
  
  for (const pattern of USAGE_PATTERNS.highFrequency) {
    if (pattern.test(content)) {
      callsPerDay = 1000;
      detected.push('High frequency pattern detected');
      break;
    }
  }
  
  for (const pattern of USAGE_PATTERNS.lowFrequency) {
    if (pattern.test(content)) {
      callsPerDay = 10;
      detected.push('Low frequency (test/demo)');
      break;
    }
  }
  
  // Check for long context
  let avgInput = modelInfo.avgInput;
  for (const pattern of USAGE_PATTERNS.longContext) {
    if (pattern.test(content)) {
      avgInput *= 3;
      detected.push('Long context pattern');
      break;
    }
  }
  
  // Check for vision
  const hasVision = USAGE_PATTERNS.vision.some(p => p.test(content));
  if (hasVision) detected.push('Vision detected');
  
  // Check for streaming
  const hasStreaming = /stream.*true|\.stream\(/i.test(content);
  if (hasStreaming) detected.push('Streaming enabled');
  
  return {
    provider: 'openai',
    model,
    modelTier: modelInfo.tier,
    estimatedCallsPerDay: callsPerDay,
    avgInputTokens: avgInput,
    avgOutputTokens: modelInfo.avgOutput,
    hasStreaming,
    hasVision,
    confidence: detected.length > 2 ? 'high' : 'medium',
    detectedPatterns: detected,
  };
}

function analyzeAnthropic(content: string, isTestFile: boolean): AiUsagePattern | null {
  const detected: string[] = [];
  
  // Detect model
  let model = 'claude-3-5-sonnet';
  const modelMatch = content.match(/model['":\s]+['"]?(claude-[\w.-]+)/i);
  if (modelMatch) {
    model = modelMatch[1].toLowerCase();
    detected.push(`Model: ${model}`);
  }
  
  const modelInfo = MODEL_TIERS[model] || MODEL_TIERS['claude-3-5-sonnet'];
  
  let callsPerDay = isTestFile ? 10 : 100;
  
  for (const pattern of USAGE_PATTERNS.highFrequency) {
    if (pattern.test(content)) {
      callsPerDay = 1000;
      detected.push('High frequency pattern');
      break;
    }
  }
  
  let avgInput = modelInfo.avgInput;
  for (const pattern of USAGE_PATTERNS.longContext) {
    if (pattern.test(content)) {
      avgInput *= 3;
      detected.push('Long context pattern');
      break;
    }
  }
  
  const hasVision = USAGE_PATTERNS.vision.some(p => p.test(content));
  const hasStreaming = /stream.*true|\.stream\(/i.test(content);
  
  return {
    provider: 'anthropic',
    model,
    modelTier: modelInfo.tier,
    estimatedCallsPerDay: callsPerDay,
    avgInputTokens: avgInput,
    avgOutputTokens: modelInfo.avgOutput,
    hasStreaming,
    hasVision,
    confidence: detected.length > 2 ? 'high' : 'medium',
    detectedPatterns: detected,
  };
}

function analyzeGoogle(content: string, isTestFile: boolean): AiUsagePattern | null {
  const detected: string[] = [];
  
  let model = 'gemini-1.5-flash';
  const modelMatch = content.match(/model['":\s]+['"]?(gemini-[\w.-]+)/i);
  if (modelMatch) {
    model = modelMatch[1].toLowerCase();
    detected.push(`Model: ${model}`);
  }
  
  const modelInfo = MODEL_TIERS[model] || MODEL_TIERS['gemini-1.5-flash'];
  let callsPerDay = isTestFile ? 10 : 100;
  
  return {
    provider: 'google',
    model,
    modelTier: modelInfo.tier,
    estimatedCallsPerDay: callsPerDay,
    avgInputTokens: modelInfo.avgInput,
    avgOutputTokens: modelInfo.avgOutput,
    hasStreaming: /stream/i.test(content),
    hasVision: USAGE_PATTERNS.vision.some(p => p.test(content)),
    confidence: 'medium',
    detectedPatterns: detected,
  };
}

function analyzeDeepSeek(content: string, isTestFile: boolean): AiUsagePattern | null {
  return {
    provider: 'deepseek',
    model: 'deepseek-chat',
    modelTier: 'cheap',
    estimatedCallsPerDay: isTestFile ? 10 : 100,
    avgInputTokens: 500,
    avgOutputTokens: 1000,
    hasStreaming: /stream/i.test(content),
    hasVision: false,
    confidence: 'medium',
    detectedPatterns: ['DeepSeek detected'],
  };
}

function mergePatterns(patterns: AiUsagePattern[]): AiUsagePattern[] {
  const merged = new Map<string, AiUsagePattern>();
  
  for (const p of patterns) {
    const key = `${p.provider}-${p.model}`;
    if (merged.has(key)) {
      const existing = merged.get(key)!;
      existing.estimatedCallsPerDay = Math.max(existing.estimatedCallsPerDay, p.estimatedCallsPerDay);
      existing.detectedPatterns.push(...p.detectedPatterns);
    } else {
      merged.set(key, p);
    }
  }
  
  return Array.from(merged.values());
}

async function getCodeFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
      files.push(...await getCodeFiles(fullPath));
    } else {
      const ext = path.extname(entry.name);
      if (['.ts', '.js', '.tsx', '.jsx', '.py'].includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}
