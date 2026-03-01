# ☁️💰 CloudCost

**Estimate your cloud costs before you deploy.** Built for vibe coders who ship first and ask questions later.

![License](https://img.shields.io/badge/license-MIT-blue)
![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC)

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

## Supported Services

### Serverless
- CloudFlare Workers
- Vercel
- Netlify Functions

### Containers
- CloudFlare Containers
- Fly.io
- Railway

### AI APIs
- OpenAI (GPT-4, GPT-4o)
- Anthropic Claude
- Google Gemini
- DeepSeek

### Databases
- Supabase
- PlanetScale
- Neon

### Storage
- CloudFlare R2
- AWS S3

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "CloudCost"
4. Install

### From Source
```bash
git clone https://github.com/superkf/cloudcost
cd cloudcost
npm install
npm run compile
# Then press F5 to test in VS Code
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

## BYOK (Bring Your Own Knowledge)

This is open source. No tracking. No accounts. No API keys needed.

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
