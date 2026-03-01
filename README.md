# ☁️💰 CloudCost

**Know your cloud bill before you deploy.** AI-powered cost estimation for vibe coders.

![License](https://img.shields.io/badge/license-MIT-blue)
![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC)
![No API Key](https://img.shields.io/badge/API%20Key-Not%20Required-green)

> 🔒 **100% local** - No API keys, no accounts, no code sent to cloud. Just install and use.

## The Problem

You're vibe coding. AI writes the code. You deploy. 

Then the bill comes: **$160 in 10 days.** 

*"Wait, what?"*

## The Solution

CloudCost scans your project and tells you what you'll pay **before you deploy**.

```
💰 CloudCost Estimate
━━━━━━━━━━━━━━━━━━━━━━━━
Estimated Monthly Cost: $12 - $47

⚡ CloudFlare Workers     $0 - $5/mo
📦 CloudFlare Containers  $47 - $94/mo  ⚠️ EXPENSIVE
🤖 Anthropic Claude       $15 - $75/mo
🗄️ Supabase              $0 - $25/mo
```

## Supported Services (25+)

### Serverless / Edge
- CloudFlare Workers
- Vercel (Edge + Serverless)
- Netlify Functions
- Deno Deploy
- AWS Lambda
- Google Cloud Run
- Supabase Edge Functions

### Containers / PaaS
- CloudFlare Containers ⚠️
- Fly.io
- Railway
- Render
- Replit
- Heroku
- DigitalOcean App Platform

### Databases
- Supabase (Postgres)
- PlanetScale
- Neon
- Turso (SQLite Edge)
- CloudFlare D1

### Realtime / Backends
- Convex
- Upstash (Redis/Kafka/QStash)

### Storage
- CloudFlare R2
- AWS S3

## Installation

```bash
npm install -g cloudcost
```

## Usage

### CLI
```bash
cloudcost ./my-project
```

### With Claude Code / Cursor / AI Coding Assistants

Add this to your project's `AGENTS.md` or system prompt:

```markdown
## Cost Awareness
When writing code that uses cloud services (CloudFlare Workers/Containers, 
Vercel, R2, databases, etc.), run `cloudcost .` to estimate deployment costs
and warn the user before they deploy.
```

Now your AI assistant will automatically check costs when you're about to deploy!

**Example interaction:**
```
You: Deploy this to CloudFlare

Claude: Let me check the estimated costs first...
[runs: cloudcost .]

⚠️ Heads up! Based on your code:
- CloudFlare Containers: ~$25/month (always-on)
- R2 Storage: ~$0.15/month (10GB)

💡 Suggestion: Consider using Workers instead of Containers 
   for event-driven workloads - it's pay-per-request.

Want me to proceed with deployment?
```

### From Source
```bash
git clone https://github.com/superkf/cloudcost
cd cloudcost
npm install
npm run compile
```

## Usage

1. Open a project in VS Code
2. Press `Ctrl+Shift+P` → "CloudCost: Estimate Deployment Cost"
3. See your estimated costs

Or just look at the status bar - it auto-updates on save.

## Configuration

```json
{
  "cloudcost.autoScan": true,
  "cloudcost.showOnDeploy": true,
  "cloudcost.monthlyTrafficEstimate": 10000
}
```

## How It Works

1. **Detect** - Scans your code for cloud service imports, config files, and API keys
2. **Estimate** - Uses real pricing data + typical usage patterns
3. **Display** - Shows a breakdown with warnings and suggestions

## 🔒 Zero API Keys Required

- ✅ **No API keys needed** - works completely offline
- ✅ **No cloud dependencies** - all analysis runs locally  
- ✅ **No code sent anywhere** - your code stays on your machine
- ✅ **No accounts** - just install and use

100% open source. Privacy-first by design.

Want to add a service? Edit `src/estimators/pricing-data.ts` and submit a PR.

## Why?

Because usage-based pricing is **designed to be confusing**. Cloud providers want you to deploy first and worry later.

CloudCost flips the script: **know your costs before you commit**.

## Accuracy

⚠️ **Disclaimer**: These are estimates based on:
- Typical vibe coder usage patterns (10k requests/month, etc.)
- Public pricing data (which changes)
- Assumptions about your traffic

Actual costs can be higher or lower. Always check official pricing.

## Contributing

PRs welcome! Especially for:
- Adding new cloud services
- Updating pricing data
- Improving detection accuracy
- Better UI/UX

## License

MIT - do whatever you want.

---

Made with 🍴 by [Kathy Feng](https://github.com/superkf)

*Stop getting surprise cloud bills. Know before you deploy.*
