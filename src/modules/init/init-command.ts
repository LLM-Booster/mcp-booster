import * as path from 'path';
import { parseCliArguments, getHelpMessage, sanitizeApiKey, ParseResult } from './cli-parser';
import { detectCursorPaths, isCursorInstalled, ensureCursorDirectories, getCursorSystemInfo } from './os-detector';
import { installMcpBoosterConfig, ConfigResult } from './mcp-config';
import { createCursorRules, type CursorRulesConfig, type CursorRulesResult } from './cursor-rules';

/**
 * Interface for init command execution result
 */
export interface InitResult {
    success: boolean;
    message: string;
    details?: {
        platform: string;
        mcpConfigPath: string;
        cursorInstalled: boolean;
        cursorRulesPath?: string;
    };
    error?: string;
}

/**
 * Shows system information for debugging
 */
function showSystemInfo(): void {
    const systemInfo = getCursorSystemInfo();

    console.log('\n🔍 System Information:');
    console.log(`   Platform: ${systemInfo.platform}`);
    console.log(`   Architecture: ${systemInfo.arch}`);
    console.log(`   Node.js: ${systemInfo.nodeVersion}`);
    console.log(`   Cursor Installed: ${systemInfo.cursorInstalled ? '✅ Yes' : '❌ No'}`);
    console.log(`   Global MCP Path: ${systemInfo.paths.globalPath}`);
    console.log(`   Local Cursor Rules Path: ${systemInfo.paths.localPath}`);
}

/**
 * Main init command function
 */
export async function executeInitCommand(argv: string[]): Promise<InitResult> {
    console.log('🚀 MCP-Booster - Installation\n');

    try {
        // Parse arguments
        const parseResult: ParseResult = parseCliArguments(argv);

        // Check if help should be shown
        if (parseResult.showHelp) {
            console.log(getHelpMessage());
            return {
                success: true,
                message: 'Help displayed successfully'
            };
        }

        // Check for parsing errors
        if (!parseResult.success || !parseResult.args) {
            console.error(`❌ ${parseResult.error}`);
            if (parseResult.showHelp) {
                console.log(getHelpMessage());
            }
            return {
                success: false,
                message: parseResult.error || 'Error parsing arguments',
                error: parseResult.error
            };
        }

        const { ide, apiKey } = parseResult.args;
        const sanitizedApiKey = sanitizeApiKey(apiKey);

        // System detection
        const systemInfo = getCursorSystemInfo();

        // Show system information if needed
        if (process.env.DEBUG) {
            showSystemInfo();
        }

        // Cursor verification (silent)
        if (!systemInfo.cursorInstalled && process.env.DEBUG) {
            console.warn('⚠️  Cursor not detected, but continuing...');
        }

        // Always use global configuration for MCP
        const mcpConfigPath = systemInfo.paths.globalPath;

        try {
            // Ensure global directory exists
            ensureCursorDirectories(true);

            // MCP configuration installation
            const installResult: ConfigResult = installMcpBoosterConfig(mcpConfigPath, sanitizedApiKey);

            // Local Cursor Rules creation
            const systemPromptPath = path.join(process.cwd(), 'systemPrompt.md');
            const cursorRulesConfig: CursorRulesConfig = {
                projectPath: process.cwd(),
                systemPromptPath: systemPromptPath
            };

            const cursorRulesResult: CursorRulesResult = await createCursorRules(cursorRulesConfig);

            if (installResult.success) {
                // Simplified success output
                console.log('✅ Installation completed!\n');

                console.log('📦 What was installed:');
                console.log('   • MCP-Booster Server (global)');
                if (cursorRulesResult.success) {
                    console.log('   • Cursor Rules (current project)');
                } else {
                    console.log('   • Cursor Rules (failed - check systemPrompt.md)');
                }

                console.log('\n🔄 Next step:');
                console.log('   Use Cursor IDE in Agent mode');

                return {
                    success: true,
                    message: 'Installation completed successfully',
                    details: {
                        platform: systemInfo.platform,
                        mcpConfigPath: installResult.configPath || mcpConfigPath,
                        cursorInstalled: systemInfo.cursorInstalled,
                        cursorRulesPath: cursorRulesResult.filePath
                    }
                };

            } else {
                console.error(`❌ Installation failed: ${installResult.message}`);
                return {
                    success: false,
                    message: installResult.message,
                    error: installResult.error
                };
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Error during installation: ${errorMessage}`);

            return {
                success: false,
                message: 'Error during installation',
                error: errorMessage
            };
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Unexpected error: ${errorMessage}`);

        return {
            success: false,
            message: 'Unexpected error during execution',
            error: errorMessage
        };
    }
}

/**
 * Convenience function to execute init command with error handling
 */
export async function runInitCommand(argv: string[]): Promise<void> {
    try {
        const result = await executeInitCommand(argv);

        if (!result.success) {
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Fatal error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

/**
 * Validates if system requirements are met
 */
export function validateSystemRequirements(): {
    valid: boolean;
    issues: string[];
} {
    const issues: string[] = [];

    // Check Node.js
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 16) {
        issues.push(`Node.js version ${nodeVersion} is too old. Requires Node.js 16 or higher.`);
    }

    // Check if in a project directory
    const hasPackageJson = require('fs').existsSync(path.join(process.cwd(), 'package.json'));
    const hasSystemPrompt = require('fs').existsSync(path.join(process.cwd(), 'systemPrompt.md'));

    if (!hasSystemPrompt) {
        issues.push('systemPrompt.md file not found in current directory.');
    }

    return {
        valid: issues.length === 0,
        issues
    };
} 