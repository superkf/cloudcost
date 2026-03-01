import * as fs from 'fs';
import * as path from 'path';

export interface InfraUsagePattern {
  service: string;
  provider: string;
  
  // Compute patterns
  isAlwaysOn: boolean;              // Container vs serverless
  estimatedCpuMs: number;           // CPU time per request
  estimatedMemoryMb: number;        // Memory usage
  
  // Traffic patterns
  estimatedRequestsPerDay: number;
  estimatedBandwidthGbPerDay: number;
  
  // Storage patterns
  estimatedStorageGb: number;
  hasDatabase: boolean;
  hasCaching: boolean;
  
  // Detected config
  configFile?: string;
  configDetails: Record<string, any>;
  
  // Warnings
  warnings: string[];
  suggestions: string[];
}

// Analyze wrangler.toml for CloudFlare
export function analyzeWranglerConfig(projectPath: string): InfraUsagePattern | null {
  const wranglerPath = path.join(projectPath, 'wrangler.toml');
  
  if (!fs.existsSync(wranglerPath)) {
    return null;
  }
  
  const content = fs.readFileSync(wranglerPath, 'utf-8');
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const configDetails: Record<string, any> = {};
  
  // Check for Containers (EXPENSIVE!)
  const hasContainers = /\[containers\]/.test(content);
  if (hasContainers) {
    warnings.push('⚠️ CloudFlare Containers detected - runs 24/7, costs add up fast!');
    suggestions.push('💡 Consider Workers for event-driven workloads (pay per request)');
    
    // Parse container config
    const cpuMatch = content.match(/cpu\s*=\s*(\d+)/);
    const memoryMatch = content.match(/memory\s*=\s*["']?(\d+)(MB|GB)?["']?/i);
    
    configDetails.containerCpu = cpuMatch ? parseInt(cpuMatch[1]) : 1;
    configDetails.containerMemoryMb = memoryMatch 
      ? parseInt(memoryMatch[1]) * (memoryMatch[2]?.toUpperCase() === 'GB' ? 1024 : 1)
      : 256;
    
    return {
      service: 'CloudFlare Containers',
      provider: 'cloudflare',
      isAlwaysOn: true,
      estimatedCpuMs: 730 * 60 * 60 * 1000, // 730 hours/month in ms
      estimatedMemoryMb: configDetails.containerMemoryMb,
      estimatedRequestsPerDay: 0, // N/A for containers
      estimatedBandwidthGbPerDay: 1,
      estimatedStorageGb: 0,
      hasDatabase: false,
      hasCaching: false,
      configFile: 'wrangler.toml',
      configDetails,
      warnings,
      suggestions,
    };
  }
  
  // Workers analysis
  const hasKV = /\[\[kv_namespaces\]\]/.test(content);
  const hasR2 = /\[\[r2_buckets\]\]/.test(content);
  const hasD1 = /\[\[d1_databases\]\]/.test(content);
  const hasDurableObjects = /\[durable_objects\]/.test(content);
  const hasQueues = /\[\[queues\]\]/.test(content);
  
  if (hasKV) {
    configDetails.hasKV = true;
    suggestions.push('KV: First 100k reads/day free, then $0.50/million');
  }
  
  if (hasR2) {
    configDetails.hasR2 = true;
    suggestions.push('R2: $0.015/GB/month, NO egress fees (great!)');
  }
  
  if (hasD1) {
    configDetails.hasD1 = true;
    suggestions.push('D1: 5GB free, then $0.75/GB/month');
  }
  
  if (hasDurableObjects) {
    configDetails.hasDurableObjects = true;
    warnings.push('⚠️ Durable Objects can get expensive with many instances');
  }
  
  if (hasQueues) {
    configDetails.hasQueues = true;
    suggestions.push('Queues: $0.40 per million messages');
  }
  
  // Estimate CPU time from code complexity
  let estimatedCpuMs = 5; // Default 5ms per request
  
  // Check for CPU-intensive patterns
  const srcFiles = getAllSourceFiles(projectPath);
  for (const file of srcFiles) {
    try {
      const src = fs.readFileSync(file, 'utf-8');
      
      // JSON parsing (moderate CPU)
      if (/JSON\.(parse|stringify)/.test(src)) {
        estimatedCpuMs = Math.max(estimatedCpuMs, 10);
      }
      
      // Crypto operations (high CPU)
      if (/crypto|bcrypt|hash|encrypt/i.test(src)) {
        estimatedCpuMs = Math.max(estimatedCpuMs, 50);
        warnings.push('Crypto operations detected - higher CPU usage');
      }
      
      // Image processing (very high CPU)
      if (/sharp|jimp|canvas|image.*resize/i.test(src)) {
        estimatedCpuMs = Math.max(estimatedCpuMs, 200);
        warnings.push('Image processing detected - consider offloading');
      }
      
      // AI/ML calls (high CPU + time)
      if (/openai|anthropic|gemini|fetch.*api.*ai/i.test(src)) {
        estimatedCpuMs = Math.max(estimatedCpuMs, 100);
      }
      
    } catch (e) {}
  }
  
  return {
    service: 'CloudFlare Workers',
    provider: 'cloudflare',
    isAlwaysOn: false,
    estimatedCpuMs,
    estimatedMemoryMb: 128, // Workers have 128MB limit
    estimatedRequestsPerDay: 1000, // Default estimate
    estimatedBandwidthGbPerDay: 0.1,
    estimatedStorageGb: hasR2 ? 10 : 0,
    hasDatabase: hasD1,
    hasCaching: hasKV,
    configFile: 'wrangler.toml',
    configDetails,
    warnings,
    suggestions,
  };
}

// Analyze vercel.json
export function analyzeVercelConfig(projectPath: string): InfraUsagePattern | null {
  const vercelPath = path.join(projectPath, 'vercel.json');
  const nextConfigPath = path.join(projectPath, 'next.config.js');
  const nextConfigMjsPath = path.join(projectPath, 'next.config.mjs');
  
  const hasVercel = fs.existsSync(vercelPath);
  const hasNext = fs.existsSync(nextConfigPath) || fs.existsSync(nextConfigMjsPath);
  
  if (!hasVercel && !hasNext) {
    return null;
  }
  
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const configDetails: Record<string, any> = {};
  
  // Check for Edge functions vs Serverless
  let isEdge = false;
  let functionCount = 0;
  
  const apiDir = path.join(projectPath, 'pages', 'api');
  const appApiDir = path.join(projectPath, 'app', 'api');
  
  if (fs.existsSync(apiDir)) {
    functionCount = countFiles(apiDir);
    configDetails.apiRoutes = functionCount;
  }
  
  if (fs.existsSync(appApiDir)) {
    const appFunctions = countFiles(appApiDir);
    functionCount += appFunctions;
    configDetails.appRoutes = appFunctions;
  }
  
  // Check for edge runtime
  const srcFiles = getAllSourceFiles(projectPath);
  for (const file of srcFiles) {
    try {
      const src = fs.readFileSync(file, 'utf-8');
      if (/runtime.*=.*['"]edge['"]/.test(src)) {
        isEdge = true;
        configDetails.hasEdge = true;
      }
    } catch (e) {}
  }
  
  // Estimate bandwidth from build output
  let estimatedBandwidth = 0.5; // 500MB/day default
  
  const outDir = path.join(projectPath, '.next');
  if (fs.existsSync(outDir)) {
    try {
      const stats = getDirectorySize(outDir);
      // Rough estimate: build size * 100 page views/day
      estimatedBandwidth = (stats / 1024 / 1024 / 1024) * 100;
    } catch (e) {}
  }
  
  if (hasNext) {
    suggestions.push('Next.js detected - ISR/SSG can reduce function invocations');
  }
  
  if (functionCount > 20) {
    warnings.push(`${functionCount} API routes - function invocations add up`);
  }
  
  if (isEdge) {
    suggestions.push('Edge Functions are cheaper than Serverless Functions');
  }
  
  return {
    service: 'Vercel',
    provider: 'vercel',
    isAlwaysOn: false,
    estimatedCpuMs: isEdge ? 5 : 50,
    estimatedMemoryMb: isEdge ? 128 : 1024,
    estimatedRequestsPerDay: 1000,
    estimatedBandwidthGbPerDay: estimatedBandwidth,
    estimatedStorageGb: 0,
    hasDatabase: false,
    hasCaching: true, // Vercel Edge Cache
    configFile: hasVercel ? 'vercel.json' : 'next.config.js',
    configDetails,
    warnings,
    suggestions,
  };
}

// Analyze fly.toml
export function analyzeFlyConfig(projectPath: string): InfraUsagePattern | null {
  const flyPath = path.join(projectPath, 'fly.toml');
  
  if (!fs.existsSync(flyPath)) {
    return null;
  }
  
  const content = fs.readFileSync(flyPath, 'utf-8');
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const configDetails: Record<string, any> = {};
  
  // Parse VM size
  const vmSizeMatch = content.match(/size\s*=\s*["']?([\w-]+)["']?/);
  const vmSize = vmSizeMatch ? vmSizeMatch[1] : 'shared-cpu-1x';
  configDetails.vmSize = vmSize;
  
  // Parse memory
  const memoryMatch = content.match(/memory\s*=\s*["']?(\d+)["']?/);
  const memoryMb = memoryMatch ? parseInt(memoryMatch[1]) : 256;
  configDetails.memoryMb = memoryMb;
  
  // Parse min/max machines
  const minMatch = content.match(/min_machines_running\s*=\s*(\d+)/);
  const maxMatch = content.match(/max_machines\s*=\s*(\d+)/);
  
  const minMachines = minMatch ? parseInt(minMatch[1]) : 1;
  const maxMachines = maxMatch ? parseInt(maxMatch[1]) : 1;
  
  configDetails.minMachines = minMachines;
  configDetails.maxMachines = maxMachines;
  
  if (minMachines > 1) {
    warnings.push(`⚠️ ${minMachines} machines always running = ${minMachines}x base cost`);
  }
  
  // Check for auto-stop
  const hasAutoStop = /auto_stop_machines\s*=\s*true/.test(content);
  if (!hasAutoStop) {
    warnings.push('⚠️ auto_stop_machines not enabled - machines run 24/7');
    suggestions.push('💡 Enable auto_stop_machines = true to save costs');
  }
  
  // Check for Postgres
  const hasPostgres = /\[mounts\]/.test(content) || content.includes('postgres');
  if (hasPostgres) {
    configDetails.hasPostgres = true;
    suggestions.push('Fly Postgres: Consider Neon/Supabase for lower costs');
  }
  
  return {
    service: 'Fly.io',
    provider: 'fly',
    isAlwaysOn: !hasAutoStop,
    estimatedCpuMs: 730 * 60 * 60 * 1000 * minMachines,
    estimatedMemoryMb: memoryMb,
    estimatedRequestsPerDay: 1000,
    estimatedBandwidthGbPerDay: 1,
    estimatedStorageGb: 1,
    hasDatabase: hasPostgres,
    hasCaching: false,
    configFile: 'fly.toml',
    configDetails,
    warnings,
    suggestions,
  };
}

// Analyze Dockerfile for Railway
export function analyzeDockerConfig(projectPath: string): InfraUsagePattern | null {
  const dockerPath = path.join(projectPath, 'Dockerfile');
  const railwayPath = path.join(projectPath, 'railway.json');
  const railwayTomlPath = path.join(projectPath, 'railway.toml');
  
  const hasDocker = fs.existsSync(dockerPath);
  const hasRailway = fs.existsSync(railwayPath) || fs.existsSync(railwayTomlPath);
  
  if (!hasDocker && !hasRailway) {
    return null;
  }
  
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const configDetails: Record<string, any> = {};
  
  if (hasDocker) {
    const content = fs.readFileSync(dockerPath, 'utf-8');
    
    // Check base image
    const fromMatch = content.match(/FROM\s+(\S+)/i);
    if (fromMatch) {
      configDetails.baseImage = fromMatch[1];
      
      // Large base images = more memory
      if (/ubuntu|debian|python.*full/i.test(fromMatch[1])) {
        warnings.push('Large base image - consider alpine variants');
      }
    }
    
    // Check for exposed ports
    const exposeMatch = content.match(/EXPOSE\s+(\d+)/g);
    if (exposeMatch) {
      configDetails.exposedPorts = exposeMatch.length;
    }
  }
  
  warnings.push('⚠️ Containers run 24/7 - consider serverless for event-driven workloads');
  suggestions.push('Railway: $5 free credit/month, then usage-based');
  
  return {
    service: hasRailway ? 'Railway' : 'Docker Container',
    provider: hasRailway ? 'railway' : 'docker',
    isAlwaysOn: true,
    estimatedCpuMs: 730 * 60 * 60 * 1000, // Full month
    estimatedMemoryMb: 512,
    estimatedRequestsPerDay: 1000,
    estimatedBandwidthGbPerDay: 1,
    estimatedStorageGb: 1,
    hasDatabase: false,
    hasCaching: false,
    configFile: hasDocker ? 'Dockerfile' : 'railway.json',
    configDetails,
    warnings,
    suggestions,
  };
}

// Analyze all infra
export async function analyzeInfrastructure(projectPath: string): Promise<InfraUsagePattern[]> {
  const patterns: InfraUsagePattern[] = [];
  
  const wrangler = analyzeWranglerConfig(projectPath);
  if (wrangler) patterns.push(wrangler);
  
  const vercel = analyzeVercelConfig(projectPath);
  if (vercel) patterns.push(vercel);
  
  const fly = analyzeFlyConfig(projectPath);
  if (fly) patterns.push(fly);
  
  const docker = analyzeDockerConfig(projectPath);
  if (docker) patterns.push(docker);
  
  return patterns;
}

// Helper functions
function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) continue;
        files.push(...getAllSourceFiles(fullPath));
      } else {
        const ext = path.extname(entry.name);
        if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (e) {}
  
  return files;
}

function countFiles(dir: string): number {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countFiles(path.join(dir, entry.name));
      } else {
        count++;
      }
    }
  } catch (e) {}
  return count;
}

function getDirectorySize(dir: string): number {
  let size = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    }
  } catch (e) {}
  return size;
}
