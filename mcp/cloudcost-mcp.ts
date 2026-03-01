#!/usr/bin/env node
/**
 * CloudCost MCP Server
 * Model Context Protocol tool for Claude Desktop / Claude Code
 * 
 * Installation:
 * 1. npm install -g cloudcost
 * 2. Add to claude_desktop_config.json:
 *    {
 *      "mcpServers": {
 *        "cloudcost": {
 *          "command": "node",
 *          "args": ["/path/to/cloudcost-mcp.js"]
 *        }
 *      }
 *    }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { analyzeCodeForUsage } from '../dist/analyzers/code-analyzer.js';
import { calculateUsageCost, ALL_PRICING } from '../dist/estimators/usage-calculator.js';
import { detectAllServices } from '../dist/detectors/all-services.js';
import { analyzeInfrastructure } from '../dist/detectors/infra-analyzer.js';

const server = new Server(
  {
    name: 'cloudcost',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'estimate_cloud_cost',
        description: 'Analyze a project and estimate cloud deployment costs. Scans code patterns, detects infrastructure configs, and recommends the cheapest hosting option.',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Absolute path to the project directory to analyze',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'compare_cloud_services',
        description: 'Compare costs across different cloud services for given usage parameters.',
        inputSchema: {
          type: 'object',
          properties: {
            requestsPerMonth: {
              type: 'number',
              description: 'Estimated requests per month',
            },
            bandwidthGbPerMonth: {
              type: 'number',
              description: 'Estimated bandwidth in GB per month',
            },
            computeHoursPerMonth: {
              type: 'number',
              description: 'Compute hours per month (730 for 24/7)',
            },
            storageGb: {
              type: 'number',
              description: 'Storage needed in GB',
            },
            alwaysOn: {
              type: 'boolean',
              description: 'Whether the service needs to run 24/7',
            },
          },
          required: ['requestsPerMonth'],
        },
      },
      {
        name: 'get_service_pricing',
        description: 'Get detailed pricing information for a specific cloud service.',
        inputSchema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Name of the cloud service (e.g., "CloudFlare Workers", "Vercel", "Railway")',
            },
          },
          required: ['serviceName'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'estimate_cloud_cost': {
      const projectPath = args?.projectPath as string;
      
      try {
        // Analyze code
        const estimation = await analyzeCodeForUsage(projectPath);
        
        // Detect infrastructure
        const infra = await analyzeInfrastructure(projectPath);
        const services = await detectAllServices(projectPath);
        
        // Calculate costs for relevant services
        const usage = {
          requestsPerMonth: estimation.estimatedRequestsPerDay * 30,
          bandwidthGbPerMonth: estimation.estimatedBandwidthGbPerDay * 30,
          computeHoursPerMonth: estimation.isAlwaysOn ? 730 : 0,
          storageGb: estimation.estimatedStorageGb,
          databaseGb: estimation.estimatedDbSizeGb,
        };
        
        const serviceOptions = estimation.isAlwaysOn
          ? ['Railway', 'Render Background Worker', 'Fly.io']
          : ['CloudFlare Workers', 'Vercel', 'Deno Deploy', 'AWS Lambda'];
        
        const costs = serviceOptions.map(serviceName => {
          const calc = calculateUsageCost(serviceName, usage);
          return {
            service: serviceName,
            monthlyCost: calc?.totalMonthly || 0,
            warnings: calc?.warnings || [],
          };
        }).sort((a, b) => a.monthlyCost - b.monthlyCost);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                summary: estimation.summary,
                isAlwaysOn: estimation.isAlwaysOn,
                estimatedUsage: {
                  requestsPerDay: estimation.estimatedRequestsPerDay,
                  cpuMsPerRequest: estimation.estimatedCpuMsPerRequest,
                  memoryMb: estimation.estimatedMemoryMb,
                  storageGb: estimation.estimatedStorageGb,
                  databaseGb: estimation.estimatedDbSizeGb,
                },
                detectedInfra: infra.map(i => i.service),
                detectedServices: services.map(s => s.name),
                costComparison: costs,
                recommendation: costs[0],
                warnings: estimation.warnings,
                suggestions: estimation.suggestions,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }

    case 'compare_cloud_services': {
      const usage = {
        requestsPerMonth: (args?.requestsPerMonth as number) || 10000,
        bandwidthGbPerMonth: (args?.bandwidthGbPerMonth as number) || 1,
        computeHoursPerMonth: (args?.alwaysOn as boolean) ? 730 : 0,
        storageGb: (args?.storageGb as number) || 0,
        databaseGb: 0,
      };
      
      const allServices = [
        'CloudFlare Workers', 'Vercel', 'Deno Deploy', 'AWS Lambda',
        'Railway', 'Render Background Worker', 'Fly.io',
      ];
      
      const costs = allServices.map(serviceName => {
        const calc = calculateUsageCost(serviceName, usage);
        return {
          service: serviceName,
          monthlyCost: calc?.totalMonthly || 0,
          breakdown: calc?.usage || [],
          warnings: calc?.warnings || [],
          freeNote: calc?.freeNote,
        };
      }).sort((a, b) => a.monthlyCost - b.monthlyCost);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              usage,
              comparison: costs,
              cheapest: costs[0],
            }, null, 2),
          },
        ],
      };
    }

    case 'get_service_pricing': {
      const serviceName = args?.serviceName as string;
      const service = ALL_PRICING.find(
        s => s.name.toLowerCase() === serviceName.toLowerCase()
      );
      
      if (!service) {
        return {
          content: [{
            type: 'text',
            text: `Service "${serviceName}" not found. Available: ${ALL_PRICING.map(s => s.name).join(', ')}`,
          }],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              name: service.name,
              provider: service.provider,
              freeTier: service.free,
              pricing: service.pricing,
              warnings: service.warnings,
            }, null, 2),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CloudCost MCP server running');
}

main().catch(console.error);
