# Cloud Service Pricing Reference (March 2026)

## 🚀 Serverless / Edge

### CloudFlare Workers
| Tier | Price | Requests | CPU Time |
|------|-------|----------|----------|
| Free | $0 | 100k/day | 10ms/request |
| Paid | $5/mo | 10M included | 30ms/request |
| Overage | - | $0.30/million | $0.02/million CPU-ms |

**Add-ons:**
- KV: 100k reads/day free, then $0.50/million
- R2: 10GB free, $0.015/GB/mo, **NO egress fees!**
- D1: 5GB free, $0.75/GB/mo
- Durable Objects: 1M requests free, $0.15/million

### Vercel
| Plan | Price | Bandwidth | Functions |
|------|-------|-----------|-----------|
| Hobby | $0 | 100GB | 100k invocations |
| Pro | $20/mo | 1TB | 1M invocations |
| Overage | - | $0.15/GB | $0.60/1000 |

**Edge Functions:** $0.65/million (cheaper than serverless)

### Netlify
| Plan | Price | Bandwidth | Functions |
|------|-------|-----------|-----------|
| Free | $0 | 100GB | 125k invocations |
| Pro | $19/mo | 1TB | 500k invocations |

### Deno Deploy
| Plan | Price | Requests | Bandwidth |
|------|-------|----------|-----------|
| Free | $0 | 100k/day | 100GB/mo |
| Pro | $20/mo | 5M/mo | 1TB/mo |

### AWS Lambda
| Tier | Requests | Compute |
|------|----------|---------|
| Free | 1M/mo | 400k GB-sec |
| Paid | $0.20/million | $0.0000166667/GB-sec |

### Google Cloud Run
| Tier | Requests | CPU | Memory |
|------|----------|-----|--------|
| Free | 2M/mo | 180k vCPU-sec | 360k GB-sec |
| Paid | $0.40/million | $0.000024/vCPU-sec | $0.0000025/GB-sec |

### Supabase Edge Functions
| Plan | Invocations |
|------|-------------|
| Free | 500k/mo |
| Pro ($25) | 2M/mo |

---

## 📦 Containers / PaaS

### CloudFlare Containers ⚠️ EXPENSIVE
| Resource | Price |
|----------|-------|
| vCPU | $0.031/hour |
| Memory | $0.004/GB-hour |
| Egress | $0.05/GB |

**730 hours/month = $22.63/vCPU + $2.92/GB RAM**

### Render
| Service | Free | Starter | Standard |
|---------|------|---------|----------|
| Web | ✅ (sleeps 15min) | $7/mo | $25/mo |
| Worker | ❌ NO FREE | $7/mo | $25/mo |
| Cron | ✅ | $1/mo | - |
| PostgreSQL | ✅ 1GB (90 days) | $7/mo | $20/mo |
| Redis | ✅ 25MB | $10/mo | - |

### Railway
| Plan | Price | Credit |
|------|-------|--------|
| Trial | $0 | 30 days |
| Hobby | $5/mo | $5 included |
| Pro | $20/mo | - |

**Usage:** $0.000463/vCPU-min, $0.000231/GB-min

### Fly.io ⚠️ NO FREE TIER (as of 2025)
| Resource | Price |
|----------|-------|
| Shared CPU | $0.0013/hour |
| Dedicated CPU | $0.0035/hour |
| Memory | $0.00269/GB-hour |
| Storage | $0.15/GB/mo |
| Egress | $0.02/GB (160GB free) |

### Heroku ⚠️ EXPENSIVE
| Dyno | Price |
|------|-------|
| Eco | $5/mo (sleeps) |
| Basic | $7/mo |
| Standard-1X | $25/mo |
| Standard-2X | $50/mo |

### Replit
| Plan | Price |
|------|-------|
| Free | Development only |
| Hacker | $7/mo |
| Pro | $20/mo |

**Deployments:** Static free, Reserved VM $7+/mo

### DigitalOcean App Platform
| Plan | Price | Resources |
|------|-------|-----------|
| Basic | $5/mo | 512MB, 1 vCPU |
| Professional | $12/mo | Dedicated |

---

## 🗄️ Databases

### Supabase (Postgres)
| Plan | Price | Storage | Bandwidth |
|------|-------|---------|-----------|
| Free | $0 | 500MB | 2GB |
| Pro | $25/mo | 8GB | 50GB |

### Neon (Serverless Postgres)
| Plan | Price | Storage | Compute |
|------|-------|---------|---------|
| Free | $0 | 512MB | 191 hours |
| Launch | $19/mo | 10GB | Unlimited |

### Turso (SQLite Edge)
| Plan | Price | Storage | Databases |
|------|-------|---------|-----------|
| Free | $0 | 9GB | 500 |
| Scaler | $29/mo | 24GB | Unlimited |

### PlanetScale ⚠️ NO FREE TIER
| Plan | Price | Storage |
|------|-------|---------|
| Scaler | $29/mo | 5GB |

### CloudFlare D1
| Tier | Storage | Reads | Writes |
|------|---------|-------|--------|
| Free | 5GB | 5B rows/mo | 100k rows/mo |
| Paid | $0.75/GB | $0.001/M | $1.00/M |

### Upstash Redis
| Tier | Commands | Storage |
|------|----------|---------|
| Free | 10k/day | 256MB |
| Pay-as-you-go | $0.2/million | $0.25/GB |

### Convex
| Plan | Price | Function Calls |
|------|-------|----------------|
| Free | $0 | 1M/mo |
| Pro | $25/mo | 5M/mo |

---

## 💾 Storage

### CloudFlare R2 (Best value!)
| Resource | Price |
|----------|-------|
| Storage | $0.015/GB/mo (10GB free) |
| Class A ops | $4.50/million |
| Class B ops | $0.36/million |
| Egress | **FREE!** |

### AWS S3
| Resource | Price |
|----------|-------|
| Storage | $0.023/GB/mo |
| GET | $0.0004/1000 |
| Egress | $0.09/GB |

---

## 🎯 Quick Cost Comparison (1 small app, 10k requests/day)

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| **Vercel** | $0 | Best for Next.js |
| **Deno Deploy** | $0 | Edge, very fast |
| **CloudFlare Workers** | $0-5 | Best for APIs |
| **Netlify** | $0 | Good for static + functions |
| **Railway** | $0-5 | $5 credit covers small apps |
| **Render (web)** | $0-7 | Free sleeps, $7 always-on |
| **Render (worker)** | $7+ | No free tier! |
| **Fly.io** | $3-10 | No free tier anymore |
| **Heroku** | $5-7 | Expensive, avoid |
| **CF Containers** | $20+ | Very expensive! |

---

## ⚠️ Common Gotchas

1. **Render Workers have NO free tier** - must pay $7/mo minimum
2. **Fly.io removed free tier** in 2025
3. **PlanetScale removed free tier** in 2024
4. **CloudFlare Containers are expensive** - $0.031/vCPU-hour adds up
5. **Heroku is overpriced** - use Railway/Render instead
6. **Free Postgres on Render expires** after 90 days
7. **Vercel bandwidth overage** is $0.15/GB - can surprise you

---

## 💡 Recommendations

**For Telegram Bots (24/7):**
- Railway ($5/mo with credit) ✅
- Render Worker ($7/mo)
- Fly.io (~$5/mo)

**For APIs/Websites:**
- Vercel (free) ✅
- CloudFlare Workers (free) ✅
- Deno Deploy (free) ✅

**For Databases:**
- Turso (9GB free!) ✅
- Neon (512MB free)
- Supabase (500MB free)

**For Storage:**
- CloudFlare R2 (no egress!) ✅
- Avoid S3 egress charges

---

*Last updated: March 2026*
