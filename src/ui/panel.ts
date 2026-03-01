import * as vscode from 'vscode';
import { DetectedService } from '../detectors';
import { CostEstimate } from '../estimators/calculator';

export function showCostPanel(
  context: vscode.ExtensionContext,
  services: DetectedService[],
  estimates: CostEstimate[]
) {
  const panel = vscode.window.createWebviewPanel(
    'cloudcost',
    '💰 CloudCost Estimate',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = generateHtml(services, estimates);
}

function generateHtml(services: DetectedService[], estimates: CostEstimate[]): string {
  const totalLow = estimates.reduce((sum, e) => sum + e.monthlyLow, 0);
  const totalHigh = estimates.reduce((sum, e) => sum + e.monthlyHigh, 0);

  const serviceCards = estimates.map(estimate => `
    <div class="card ${estimate.service.type}">
      <div class="card-header">
        <span class="service-icon">${getServiceIcon(estimate.service.type)}</span>
        <span class="service-name">${estimate.service.name}</span>
        <span class="confidence ${estimate.service.confidence}">${estimate.service.confidence}</span>
      </div>
      
      <div class="cost-range">
        <span class="cost-low">$${estimate.monthlyLow.toFixed(2)}</span>
        <span class="cost-separator">-</span>
        <span class="cost-high">$${estimate.monthlyHigh.toFixed(2)}</span>
        <span class="cost-period">/month</span>
      </div>
      
      ${estimate.breakdown.length > 0 ? `
        <div class="breakdown">
          <table>
            <tr><th>Item</th><th>Quantity</th><th>Cost</th></tr>
            ${estimate.breakdown.map(b => `
              <tr>
                <td>${b.item}</td>
                <td>${b.quantity}</td>
                <td>$${b.subtotal.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : ''}
      
      ${estimate.warnings.map(w => `<div class="warning">⚠️ ${w}</div>`).join('')}
      ${estimate.suggestions.map(s => `<div class="suggestion">💡 ${s}</div>`).join('')}
      
      <div class="detected-in">
        Found in: ${estimate.service.detectedIn.slice(0, 3).join(', ')}
        ${estimate.service.detectedIn.length > 3 ? ` +${estimate.service.detectedIn.length - 3} more` : ''}
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          color: #e0e0e0;
          background: #1e1e1e;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .total-cost {
          font-size: 32px;
          font-weight: bold;
          color: #4ec9b0;
        }
        
        .total-label {
          color: #888;
          font-size: 14px;
        }
        
        .card {
          background: #2d2d2d;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          border-left: 4px solid #666;
        }
        
        .card.serverless { border-left-color: #4ec9b0; }
        .card.container { border-left-color: #f14c4c; }
        .card.ai-api { border-left-color: #dcdcaa; }
        .card.database { border-left-color: #569cd6; }
        .card.storage { border-left-color: #c586c0; }
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        
        .service-icon { font-size: 20px; }
        .service-name { font-weight: 600; font-size: 16px; }
        
        .confidence {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          margin-left: auto;
        }
        .confidence.high { background: #4ec9b0; color: #000; }
        .confidence.medium { background: #dcdcaa; color: #000; }
        .confidence.low { background: #666; }
        
        .cost-range {
          font-size: 24px;
          margin: 12px 0;
        }
        .cost-low { color: #4ec9b0; }
        .cost-high { color: #f14c4c; }
        .cost-separator { color: #666; margin: 0 8px; }
        .cost-period { color: #888; font-size: 14px; }
        
        .breakdown {
          background: #252525;
          border-radius: 6px;
          padding: 12px;
          margin: 12px 0;
        }
        
        .breakdown table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        .breakdown th {
          text-align: left;
          color: #888;
          padding: 4px 8px;
          border-bottom: 1px solid #333;
        }
        
        .breakdown td {
          padding: 6px 8px;
        }
        
        .warning {
          background: #4a3000;
          color: #ffc107;
          padding: 8px 12px;
          border-radius: 4px;
          margin: 8px 0;
          font-size: 13px;
        }
        
        .suggestion {
          background: #1a3a1a;
          color: #4ec9b0;
          padding: 8px 12px;
          border-radius: 4px;
          margin: 8px 0;
          font-size: 13px;
        }
        
        .detected-in {
          color: #666;
          font-size: 12px;
          margin-top: 12px;
        }
        
        .footer {
          text-align: center;
          color: #666;
          font-size: 12px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #333;
        }
        
        .disclaimer {
          background: #2a2a2a;
          padding: 12px;
          border-radius: 6px;
          margin-top: 20px;
          font-size: 12px;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="total-label">Estimated Monthly Cost</div>
        <div class="total-cost">$${totalLow.toFixed(2)} - $${totalHigh.toFixed(2)}</div>
        <div class="total-label">${services.length} service${services.length > 1 ? 's' : ''} detected</div>
      </div>
      
      ${serviceCards}
      
      <div class="disclaimer">
        ⚠️ <strong>Disclaimer:</strong> These are estimates based on typical usage patterns. 
        Actual costs depend on your traffic, usage patterns, and specific configurations.
        Always check the official pricing pages before deploying.
      </div>
      
      <div class="footer">
        CloudCost v0.1.0 | Open Source | BYOK
      </div>
    </body>
    </html>
  `;
}

function getServiceIcon(type: DetectedService['type']): string {
  switch (type) {
    case 'serverless': return '⚡';
    case 'container': return '📦';
    case 'ai-api': return '🤖';
    case 'database': return '🗄️';
    case 'storage': return '💾';
    default: return '☁️';
  }
}
