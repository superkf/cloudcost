# CloudCost MCP Server for Claude

Use CloudCost directly in Claude Desktop or Claude Code!

## Installation

### Option 1: From npm (recommended)
```bash
npm install -g cloudcost
```

### Option 2: From source
```bash
git clone https://github.com/superkf/cloudcost
cd cloudcost
npm install
npm run compile
```

## Setup for Claude Desktop

1. Find your Claude config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add CloudCost as an MCP server:

```json
{
  "mcpServers": {
    "cloudcost": {
      "command": "node",
      "args": ["C:/path/to/cloudcost/dist/mcp/cloudcost-mcp.js"]
    }
  }
}
```

3. Restart Claude Desktop

## Available Tools

### 1. `estimate_cloud_cost`
Analyze a project and get cost estimates.

**Example prompt:**
> "Use cloudcost to analyze my project at D:\myapp and tell me how much it will cost to deploy"

### 2. `compare_cloud_services`
Compare costs across different providers.

**Example prompt:**
> "Compare cloud costs for 100k requests/month with 10GB bandwidth"

### 3. `get_service_pricing`
Get detailed pricing for a specific service.

**Example prompt:**
> "What's the pricing for CloudFlare Workers?"

## Example Usage in Claude

```
You: Analyze the cost to deploy my project at /Users/me/myapp

Claude: [Uses estimate_cloud_cost tool]

Based on the analysis:
- Your app has ~5,000 requests/day
- It's a serverless API (not 24/7)
- Detected: Vercel config, Supabase database

Cost comparison:
1. Deno Deploy: FREE ✅
2. CloudFlare Workers: FREE
3. Vercel: $0 (under free tier)

Recommendation: Use Deno Deploy - completely free for your usage!
```

## Supported Services

- **Serverless**: CloudFlare Workers, Vercel, Deno Deploy, AWS Lambda, GCP Cloud Run
- **Containers**: Railway, Render, Fly.io, CloudFlare Containers
- **Databases**: Supabase, Neon, Turso, PlanetScale, Upstash
- **Storage**: CloudFlare R2, AWS S3

## Privacy

- ✅ All analysis runs locally
- ✅ No code sent to any server
- ✅ No API keys required
