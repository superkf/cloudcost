import * as vscode from 'vscode';
import { scanProject, DetectedService } from './detectors';
import { estimateCosts, CostEstimate } from './estimators/calculator';
import { showCostPanel } from './ui/panel';

export function activate(context: vscode.ExtensionContext) {
  console.log('CloudCost is now active!');

  // Command: Manual scan
  const scanCommand = vscode.commands.registerCommand('cloudcost.scan', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "CloudCost: Scanning project...",
      cancellable: false
    }, async () => {
      const services = await scanProject(workspaceFolder.uri.fsPath);
      if (services.length === 0) {
        vscode.window.showInformationMessage('No cloud services detected in this project');
        return;
      }
      
      const estimates = estimateCosts(services);
      showCostPanel(context, services, estimates);
    });
  });

  // Command: Estimate costs
  const estimateCommand = vscode.commands.registerCommand('cloudcost.estimate', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const services = await scanProject(workspaceFolder.uri.fsPath);
    const estimates = estimateCosts(services);
    showCostPanel(context, services, estimates);
  });

  // Auto-scan on save (if enabled)
  const config = vscode.workspace.getConfiguration('cloudcost');
  if (config.get('autoScan')) {
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
      // Only scan relevant files
      const relevantExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.toml', '.json', '.yaml', '.yml'];
      if (!relevantExtensions.some(ext => document.fileName.endsWith(ext))) {
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return;

      const services = await scanProject(workspaceFolder.uri.fsPath);
      if (services.length > 0) {
        // Update status bar
        updateStatusBar(services);
      }
    });
    context.subscriptions.push(saveListener);
  }

  context.subscriptions.push(scanCommand, estimateCommand);

  // Status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'cloudcost.estimate';
  statusBarItem.text = '$(cloud) CloudCost';
  statusBarItem.tooltip = 'Click to estimate cloud costs';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

function updateStatusBar(services: DetectedService[]) {
  // Could update status bar with quick cost preview
}

export function deactivate() {}
