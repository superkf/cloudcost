import * as fs from 'fs';
import * as path from 'path';

export interface ServiceDetection {
  name: string;
  provider: string;
  type: 'serverless' | 'container' | 'database' | 'storage' | 'realtime' | 'edge';
  configFile?: string;
  configDetails: Record<string, any>;
  warnings: string[];
  suggestions: string[];
}

// ==================== REPLIT ====================
export function detectReplit(projectPath: string): ServiceDetection | null {
  const replitPath = path.join(projectPath, '.replit');
  const replitNixPath = path.join(projectPath, 'replit.nix');
  
  if (!fs.existsSync(replitPath) && !fs.existsSync(replitNixPath)) {
    return null;
  }
  
  const configDetails: Record<string, any> = {};
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (fs.existsSync(replitPath)) {
    const content = fs.readFileSync(replitPath, 'utf-8');
    
    // Detect deployment type
    if (/deploymentTarget\s*=\s*["']cloudrun["']/i.test(content)) {
      configDetails.deploymentTarget = 'cloudrun';
      warnings.push('Cloud Run deployment = always-on billing');
    }
    
    if (/deploymentTarget\s*=\s*["']static["']/i.test(content)) {
      configDetails.deploymentTarget = 'static';
      suggestions.push('Static deployment = very cheap!');
    }
    
    // Check for Replit DB
    if (/REPLIT_DB/.test(content)) {
      configDetails.hasReplitDB = true;
    }
  }
  
  suggestions.push('Replit: Free tier generous, Reserved VMs start at $7/month');
  
  return {
    name: 'Replit',
    provider: 'replit',
    type: 'container',
    configFile: '.replit',
    configDetails,
    warnings,
    suggestions,
  };
}

// ==================== RENDER ====================
export function detectRender(projectPath: string): ServiceDetection | null {
  const renderPath = path.join(projectPath, 'render.yaml');
  
  // Also check for render in package.json scripts
  const pkgPath = path.join(projectPath, 'package.json');
  let hasRenderScript = false;
  
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      hasRenderScript = JSON.stringify(pkg.scripts || {}).includes('render');
    } catch (e) {}
  }
  
  if (!fs.existsSync(renderPath) && !hasRenderScript) {
    return null;
  }
  
  const configDetails: Record<string, any> = {};
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (fs.existsSync(renderPath)) {
    const content = fs.readFileSync(renderPath, 'utf-8');
    
    // Count services
    const serviceMatches = content.match(/- type:/g);
    configDetails.serviceCount = serviceMatches?.length || 1;
    
    // Detect service types
    if (/type:\s*web/i.test(content)) {
      configDetails.hasWebService = true;
    }
    if (/type:\s*worker/i.test(content)) {
      configDetails.hasWorker = true;
      warnings.push('Background workers run 24/7');
    }
    if (/type:\s*cron/i.test(content)) {
      configDetails.hasCron = true;
    }
    if (/type:\s*postgres/i.test(content)) {
      configDetails.hasPostgres = true;
    }
    if (/type:\s*redis/i.test(content)) {
      configDetails.hasRedis = true;
    }
    
    // Check plan
    if (/plan:\s*free/i.test(content)) {
      suggestions.push('Free plan: spins down after 15 min inactivity');
    }
  }
  
  return {
    name: 'Render',
    provider: 'render',
    type: 'container',
    configFile: 'render.yaml',
    configDetails,
    warnings,
    suggestions,
  };
}

// ==================== DENO DEPLOY ====================
export function detectDenoDeploy(projectPath: string): ServiceDetection | null {
  const denoJsonPath = path.join(projectPath, 'deno.json');
  const denoJsoncPath = path.join(projectPath, 'deno.jsonc');
  
  // Check for Deno imports in source files
  let hasDenoImports = false;
  const srcFiles = getSourceFiles(projectPath);
  
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (/from\s+["']https:\/\/deno\.land/.test(content) ||
          /import.*["']jsr:/.test(content) ||
          /Deno\.(serve|env|readFile)/.test(content)) {
        hasDenoImports = true;
        break;
      }
    } catch (e) {}
  }
  
  if (!fs.existsSync(denoJsonPath) && !fs.existsSync(denoJsoncPath) && !hasDenoImports) {
    return null;
  }
  
  const suggestions = [
    'Deno Deploy: 100k requests/day FREE',
    'No cold starts, global edge deployment',
  ];
  
  return {
    name: 'Deno Deploy',
    provider: 'deno',
    type: 'edge',
    configFile: fs.existsSync(denoJsonPath) ? 'deno.json' : 'deno.jsonc',
    configDetails: { hasDenoImports },
    warnings: [],
    suggestions,
  };
}

// ==================== DIGITALOCEAN APP PLATFORM ====================
export function detectDigitalOcean(projectPath: string): ServiceDetection | null {
  const doPath = path.join(projectPath, '.do', 'app.yaml');
  const doAltPath = path.join(projectPath, 'app.yaml');
  
  const configPath = fs.existsSync(doPath) ? doPath : 
                     fs.existsSync(doAltPath) ? doAltPath : null;
  
  if (!configPath) {
    return null;
  }
  
  const content = fs.readFileSync(configPath, 'utf-8');
  const configDetails: Record<string, any> = {};
  const warnings: string[] = [];
  
  // Detect instance size
  const sizeMatch = content.match(/instance_size_slug:\s*(\S+)/);
  if (sizeMatch) {
    configDetails.instanceSize = sizeMatch[1];
    if (sizeMatch[1].includes('professional')) {
      warnings.push('Professional tier = higher costs');
    }
  }
  
  // Count services
  const serviceMatches = content.match(/- name:/g);
  configDetails.serviceCount = serviceMatches?.length || 1;
  
  return {
    name: 'DigitalOcean App Platform',
    provider: 'digitalocean',
    type: 'container',
    configFile: configPath,
    configDetails,
    warnings,
    suggestions: ['Basic tier: $5/month, Professional: $12/month+'],
  };
}

// ==================== GOOGLE CLOUD RUN ====================
export function detectCloudRun(projectPath: string): ServiceDetection | null {
  const cloudRunPath = path.join(projectPath, 'cloudbuild.yaml');
  const serviceYamlPath = path.join(projectPath, 'service.yaml');
  
  // Check for gcloud in scripts or Dockerfile
  let hasCloudRunRef = false;
  const dockerPath = path.join(projectPath, 'Dockerfile');
  const pkgPath = path.join(projectPath, 'package.json');
  
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      hasCloudRunRef = JSON.stringify(pkg.scripts || {}).includes('gcloud run');
    } catch (e) {}
  }
  
  if (!fs.existsSync(cloudRunPath) && !fs.existsSync(serviceYamlPath) && !hasCloudRunRef) {
    return null;
  }
  
  const configDetails: Record<string, any> = {};
  const warnings: string[] = [];
  
  if (fs.existsSync(serviceYamlPath)) {
    const content = fs.readFileSync(serviceYamlPath, 'utf-8');
    
    // Check min instances
    const minMatch = content.match(/minScale:\s*["']?(\d+)/);
    if (minMatch && parseInt(minMatch[1]) > 0) {
      configDetails.minInstances = parseInt(minMatch[1]);
      warnings.push(`${configDetails.minInstances} min instances = always-on costs`);
    }
    
    // Check memory
    const memMatch = content.match(/memory:\s*["']?(\d+)(Mi|Gi)/);
    if (memMatch) {
      configDetails.memory = memMatch[1] + memMatch[2];
    }
  }
  
  return {
    name: 'Google Cloud Run',
    provider: 'gcp',
    type: 'container',
    configFile: fs.existsSync(serviceYamlPath) ? 'service.yaml' : 'cloudbuild.yaml',
    configDetails,
    warnings,
    suggestions: [
      'Cloud Run: 2M requests/month FREE',
      'Scale to zero = pay only when used',
    ],
  };
}

// ==================== AWS LAMBDA ====================
export function detectAWSLambda(projectPath: string): ServiceDetection | null {
  const samPath = path.join(projectPath, 'template.yaml');
  const samAltPath = path.join(projectPath, 'template.yml');
  const serverlessPath = path.join(projectPath, 'serverless.yml');
  const serverlessAltPath = path.join(projectPath, 'serverless.yaml');
  const cdkPath = path.join(projectPath, 'cdk.json');
  
  const configPath = [samPath, samAltPath, serverlessPath, serverlessAltPath, cdkPath]
    .find(p => fs.existsSync(p));
  
  if (!configPath) {
    // Check for AWS SDK usage
    const srcFiles = getSourceFiles(projectPath);
    let hasAwsSdk = false;
    
    for (const file of srcFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        if (/@aws-sdk|aws-lambda|AWS\.Lambda/.test(content)) {
          hasAwsSdk = true;
          break;
        }
      } catch (e) {}
    }
    
    if (!hasAwsSdk) return null;
  }
  
  const configDetails: Record<string, any> = {};
  const warnings: string[] = [];
  
  if (configPath && (configPath.includes('serverless') || configPath.includes('template'))) {
    const content = fs.readFileSync(configPath, 'utf-8');
    
    // Count functions
    const funcMatches = content.match(/handler:/g);
    configDetails.functionCount = funcMatches?.length || 1;
    
    // Check memory
    const memMatch = content.match(/memorySize:\s*(\d+)/);
    if (memMatch) {
      configDetails.memory = parseInt(memMatch[1]);
    }
    
    // Check for provisioned concurrency
    if (/provisionedConcurrency/i.test(content)) {
      warnings.push('Provisioned concurrency = always-on costs!');
      configDetails.hasProvisionedConcurrency = true;
    }
  }
  
  return {
    name: 'AWS Lambda',
    provider: 'aws',
    type: 'serverless',
    configFile: configPath || undefined,
    configDetails,
    warnings,
    suggestions: [
      'Lambda: 1M requests/month FREE',
      '400,000 GB-seconds FREE tier',
    ],
  };
}

// ==================== HEROKU ====================
export function detectHeroku(projectPath: string): ServiceDetection | null {
  const procfilePath = path.join(projectPath, 'Procfile');
  const appJsonPath = path.join(projectPath, 'app.json');
  
  if (!fs.existsSync(procfilePath) && !fs.existsSync(appJsonPath)) {
    return null;
  }
  
  const configDetails: Record<string, any> = {};
  const warnings: string[] = [];
  
  if (fs.existsSync(procfilePath)) {
    const content = fs.readFileSync(procfilePath, 'utf-8');
    
    // Count process types
    const processes = content.split('\n').filter(l => l.includes(':'));
    configDetails.processCount = processes.length;
    
    if (content.includes('worker:')) {
      configDetails.hasWorker = true;
      warnings.push('Workers run 24/7 on Heroku');
    }
  }
  
  warnings.push('⚠️ Heroku is expensive! Consider Railway/Render');
  
  return {
    name: 'Heroku',
    provider: 'heroku',
    type: 'container',
    configFile: 'Procfile',
    configDetails,
    warnings,
    suggestions: [
      'Eco dynos: $5/month (sleeps after 30 min)',
      'Basic dynos: $7/month (no sleep)',
    ],
  };
}

// ==================== SUPABASE ====================
export function detectSupabase(projectPath: string): ServiceDetection | null {
  const srcFiles = getSourceFiles(projectPath);
  let hasSupabase = false;
  let hasEdgeFunctions = false;
  
  // Check for supabase folder
  const supabasePath = path.join(projectPath, 'supabase');
  if (fs.existsSync(supabasePath)) {
    hasSupabase = true;
    
    const functionsPath = path.join(supabasePath, 'functions');
    if (fs.existsSync(functionsPath)) {
      hasEdgeFunctions = true;
    }
  }
  
  // Check source files
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (/@supabase\/supabase-js|createClient.*supabase/.test(content)) {
        hasSupabase = true;
      }
    } catch (e) {}
  }
  
  if (!hasSupabase) return null;
  
  const configDetails: Record<string, any> = { hasEdgeFunctions };
  
  // Count edge functions
  if (hasEdgeFunctions) {
    const functionsPath = path.join(projectPath, 'supabase', 'functions');
    try {
      const functions = fs.readdirSync(functionsPath, { withFileTypes: true })
        .filter(d => d.isDirectory()).length;
      configDetails.edgeFunctionCount = functions;
    } catch (e) {}
  }
  
  return {
    name: 'Supabase',
    provider: 'supabase',
    type: 'database',
    configFile: 'supabase/',
    configDetails,
    warnings: [],
    suggestions: [
      'Free tier: 500MB DB, 2GB bandwidth',
      'Edge Functions: 500k invocations/month FREE',
      'Pro: $25/month',
    ],
  };
}

// ==================== UPSTASH ====================
export function detectUpstash(projectPath: string): ServiceDetection | null {
  const srcFiles = getSourceFiles(projectPath);
  let hasUpstash = false;
  let hasRedis = false;
  let hasKafka = false;
  let hasQStash = false;
  
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (/@upstash\/redis/.test(content)) {
        hasUpstash = true;
        hasRedis = true;
      }
      if (/@upstash\/kafka/.test(content)) {
        hasUpstash = true;
        hasKafka = true;
      }
      if (/@upstash\/qstash/.test(content)) {
        hasUpstash = true;
        hasQStash = true;
      }
      if (/UPSTASH_REDIS_REST_URL/.test(content)) {
        hasUpstash = true;
        hasRedis = true;
      }
    } catch (e) {}
  }
  
  if (!hasUpstash) return null;
  
  return {
    name: 'Upstash',
    provider: 'upstash',
    type: 'database',
    configDetails: { hasRedis, hasKafka, hasQStash },
    warnings: [],
    suggestions: [
      'Redis: 10k commands/day FREE',
      'Pay-per-request pricing',
      'QStash: 500 messages/day FREE',
    ],
  };
}

// ==================== TURSO ====================
export function detectTurso(projectPath: string): ServiceDetection | null {
  const srcFiles = getSourceFiles(projectPath);
  let hasTurso = false;
  
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (/@libsql\/client|turso|TURSO_/.test(content)) {
        hasTurso = true;
        break;
      }
    } catch (e) {}
  }
  
  if (!hasTurso) return null;
  
  return {
    name: 'Turso',
    provider: 'turso',
    type: 'database',
    configDetails: {},
    warnings: [],
    suggestions: [
      'Free tier: 9GB storage, 500 databases',
      'SQLite at the edge - very fast',
      'Scaler: $29/month',
    ],
  };
}

// ==================== CONVEX ====================
export function detectConvex(projectPath: string): ServiceDetection | null {
  const convexPath = path.join(projectPath, 'convex');
  const srcFiles = getSourceFiles(projectPath);
  let hasConvex = false;
  
  if (fs.existsSync(convexPath)) {
    hasConvex = true;
  }
  
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (/from\s+["']convex/.test(content) || /useQuery|useMutation.*convex/.test(content)) {
        hasConvex = true;
        break;
      }
    } catch (e) {}
  }
  
  if (!hasConvex) return null;
  
  // Count functions
  let functionCount = 0;
  if (fs.existsSync(convexPath)) {
    try {
      const files = fs.readdirSync(convexPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
      functionCount = files.length;
    } catch (e) {}
  }
  
  return {
    name: 'Convex',
    provider: 'convex',
    type: 'realtime',
    configFile: 'convex/',
    configDetails: { functionCount },
    warnings: [],
    suggestions: [
      'Free tier: 1M function calls/month',
      'Real-time sync + serverless functions',
      'Pro: $25/month',
    ],
  };
}

// ==================== PLANETSCALE ====================
export function detectPlanetScale(projectPath: string): ServiceDetection | null {
  const srcFiles = getSourceFiles(projectPath);
  let hasPlanetScale = false;
  
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (/@planetscale|DATABASE_URL.*pscale|planetscale/.test(content)) {
        hasPlanetScale = true;
        break;
      }
    } catch (e) {}
  }
  
  if (!hasPlanetScale) return null;
  
  return {
    name: 'PlanetScale',
    provider: 'planetscale',
    type: 'database',
    configDetails: {},
    warnings: ['PlanetScale removed free tier in 2024'],
    suggestions: [
      'Scaler: $29/month (5GB, 1B row reads)',
      'Consider Turso/Neon for free tier',
    ],
  };
}

// ==================== NEON ====================
export function detectNeon(projectPath: string): ServiceDetection | null {
  const srcFiles = getSourceFiles(projectPath);
  let hasNeon = false;
  
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (/@neondatabase|neon\.tech|NEON_/.test(content)) {
        hasNeon = true;
        break;
      }
    } catch (e) {}
  }
  
  if (!hasNeon) return null;
  
  return {
    name: 'Neon',
    provider: 'neon',
    type: 'database',
    configDetails: {},
    warnings: [],
    suggestions: [
      'Free tier: 0.5GB storage, 191 compute hours',
      'Serverless Postgres - scales to zero',
      'Launch: $19/month',
    ],
  };
}

// ==================== HELPER ====================
function getSourceFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build', '.next', '.vercel'].includes(entry.name)) continue;
        files.push(...getSourceFiles(fullPath));
      } else {
        const ext = path.extname(entry.name);
        if (['.ts', '.js', '.tsx', '.jsx', '.py', '.env'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (e) {}
  return files;
}

// ==================== MAIN DETECTOR ====================
export async function detectAllServices(projectPath: string): Promise<ServiceDetection[]> {
  const detectors = [
    detectReplit,
    detectRender,
    detectDenoDeploy,
    detectDigitalOcean,
    detectCloudRun,
    detectAWSLambda,
    detectHeroku,
    detectSupabase,
    detectUpstash,
    detectTurso,
    detectConvex,
    detectPlanetScale,
    detectNeon,
  ];
  
  const results: ServiceDetection[] = [];
  
  for (const detector of detectors) {
    const result = detector(projectPath);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}
