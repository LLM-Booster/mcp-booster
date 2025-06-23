import * as path from 'path';
import { parseCliArguments, getHelpMessage, sanitizeApiKey, ParseResult } from './cli-parser';
import { detectCursorPaths, isCursorInstalled, ensureCursorDirectories, getCursorSystemInfo, detectOS } from './os-detector';
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
 * Shows support information when errors occur
 */
function showSupportInfo(): void {
    console.log('');
    console.log('🆘 Precisa de ajuda?');
    console.log('   Nossa equipe de suporte está pronta para ajudar!');
    console.log('   📧 Entre em contato: https://llmbooster.com/suporte');
    console.log('   ⏰ Horário de atendimento: Segunda a Sexta, 9h às 18h');
    console.log('');
}

/**
 * Determines which systemPrompt file to use based on the operating system
 * Now always returns the base systemPrompt.md - Windows content will be added dynamically
 */
function getSystemPromptPath(): string {
    const fs = require('fs');
    const defaultPromptPath = path.join(__dirname, '../../../systemPrompt.md');

    if (process.env.DEBUG) {
        console.log(`🔍 [DEBUG] Using base system prompt: ${path.basename(defaultPromptPath)}`);
    }

    return defaultPromptPath;
}

/**
 * Gets the path to Windows auxiliary content file
 */
function getWindowsAuxPromptPath(): string {
    return path.join(__dirname, '../../../systemPrompt-AuxWindows.md');
}

/**
 * Shows system information for debugging
 */
function showSystemInfo(): void {
    const systemInfo = getCursorSystemInfo();
    const currentOS = detectOS();
    const systemPromptPath = getSystemPromptPath();

    console.log('\n🔍 System Information:');
    console.log(`   Platform: ${systemInfo.platform}`);
    console.log(`   Detected OS: ${currentOS}`);
    console.log(`   Architecture: ${systemInfo.arch}`);
    console.log(`   Node.js: ${systemInfo.nodeVersion}`);
    console.log(`   Cursor Installed: ${systemInfo.cursorInstalled ? '✅ Yes' : '❌ No'}`);
    console.log(`   Global MCP Path: ${systemInfo.paths.globalPath}`);
    console.log(`   Local Cursor Rules Path: ${systemInfo.paths.localPath}`);
    console.log(`   System Prompt: ${path.basename(systemPromptPath)}`);
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
            } else {
                showSupportInfo();
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
            // Use base systemPrompt and add Windows content if needed
            const systemPromptPath = getSystemPromptPath();
            const windowsAuxPromptPath = getWindowsAuxPromptPath();
            const cursorRulesConfig: CursorRulesConfig = {
                projectPath: process.cwd(),
                systemPromptPath: systemPromptPath,
                windowsAuxPromptPath: windowsAuxPromptPath
            };

            const cursorRulesResult: CursorRulesResult = await createCursorRules(cursorRulesConfig);

            if (installResult.success) {
                // Simplified success output
                console.log('✅ Installation completed!\n');

                console.log('📦 What was installed:');
                console.log('   • MCP-Booster Server (global)');
                if (cursorRulesResult.success) {
                    const currentOS = detectOS();
                    const promptFileName = path.basename(systemPromptPath);
                    console.log('   • Cursor Rules (current project)');
                    console.log(`     ↳ OS: ${currentOS} → Using: ${promptFileName}`);

                    // Mostrar detalhes do arquivo criado se disponível
                    if (cursorRulesResult.details && cursorRulesResult.details.fileSize) {
                        console.log(`     ↳ File: ${cursorRulesResult.filePath}`);
                        console.log(`     ↳ Size: ${cursorRulesResult.details.fileSize} bytes`);
                        console.log(`     ↳ Permissions: ${cursorRulesResult.details.permissions || 'Unknown'}`);
                    }
                } else {
                    console.log('   • Cursor Rules (failed - see details below)');
                    console.log('');
                    console.error('❌ Cursor Rules Creation Failed:');
                    console.error(`   Error: ${cursorRulesResult.error || 'Unknown error'}`);
                    console.error(`   Message: ${cursorRulesResult.message}`);

                    if (cursorRulesResult.filePath) {
                        console.error(`   Target Path: ${cursorRulesResult.filePath}`);
                    }

                    console.log('');

                    showSupportInfo();
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
                showSupportInfo();
                return {
                    success: false,
                    message: installResult.message,
                    error: installResult.error
                };
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Error during installation: ${errorMessage}`);
            showSupportInfo();

            return {
                success: false,
                message: 'Error during installation',
                error: errorMessage
            };
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Unexpected error: ${errorMessage}`);
        showSupportInfo();

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
        showSupportInfo();
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

    // Note: systemPrompt.md is now bundled with the package, not required in user's directory

    return {
        valid: issues.length === 0,
        issues
    };
} 