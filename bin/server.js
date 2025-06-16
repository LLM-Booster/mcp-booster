#!/usr/bin/env node

/**
 * Script de inicialização do MCP-Booster
 * Suporta tanto o servidor MCP quanto o comando de instalação
 * Compatível com Windows, macOS e Linux
 */

const path = require('path');
const fs = require('fs');

// Função para normalizar paths cross-platform
function resolvePath(relativePath) {
    return path.resolve(__dirname, relativePath);
}

// Função para mostrar ajuda geral
function showGeneralHelp() {
    console.log(`
🚀 MCP-Booster - Servidor MCP com CoConuT (Continuous Chain of Thought)

COMANDOS DISPONÍVEIS:

  mcp-booster                    Inicia o servidor MCP (modo padrão)
  mcp-booster init [opções]      Instala configuração MCP no Cursor IDE
  mcp-booster --help             Mostra esta ajuda

EXEMPLOS:

  # Iniciar servidor MCP
  mcp-booster

  # Instalar no Cursor IDE
  mcp-booster init --ide cursor --api-key sua-api-key

  # Ajuda específica do comando init
  mcp-booster init --help

Para mais informações sobre um comando específico, use --help após o comando.
`);
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

// Se primeiro argumento é 'init', executar comando de instalação
if (args.length > 0 && args[0] === 'init') {
    // Verificar se o módulo de init existe
    const initModulePath = resolvePath('../dist/modules/init/init-command.js');

    if (!fs.existsSync(initModulePath)) {
        console.error('❌ Erro: Módulo de instalação não encontrado.');
        console.error('📍 Esperado em:', initModulePath);
        console.error('💡 Execute "npm run build" no diretório do projeto para compilar.');
        process.exit(1);
    }

    try {
        // Importar e executar comando init
        const { runInitCommand } = require(initModulePath);

        if (typeof runInitCommand !== 'function') {
            console.error('❌ Erro: Função runInitCommand não encontrada.');
            process.exit(1);
        }

        // Executar comando init
        runInitCommand(process.argv);

    } catch (error) {
        console.error('❌ Erro ao executar comando init:');
        console.error('📝 Detalhes:', error.message);

        if (error.code === 'MODULE_NOT_FOUND') {
            console.error('💡 Solução: Execute "npm run build" para compilar os módulos.');
        }

        process.exit(1);
    }

} else if (args.length > 0 && (args[0] === '--help' || args[0] === '-h')) {
    // Mostrar ajuda geral
    showGeneralHelp();

} else {
    // Modo padrão: iniciar servidor MCP

    // Verificar se o arquivo principal existe
    const mainFile = resolvePath('../dist/index.js');
    if (!fs.existsSync(mainFile)) {
        console.error('❌ Erro: Arquivo principal não encontrado.');
        console.error('📍 Esperado em:', mainFile);
        console.error('💡 Execute "npm run build" no diretório do projeto para compilar.');
        process.exit(1);
    }

    try {
        // Importar e inicializar o servidor
        const { initializeServer } = require(mainFile);

        // Verificar se a função está disponível
        if (typeof initializeServer !== 'function') {
            console.error('❌ Erro: Função initializeServer não encontrada no módulo principal.');
            process.exit(1);
        }

        // Inicializar o servidor com configurações padrão
        initializeServer();

    } catch (error) {
        console.error('❌ Erro ao inicializar o servidor MCP-Booster:');
        console.error('📝 Detalhes:', error.message);

        // Mensagens específicas por tipo de erro
        if (error.code === 'MODULE_NOT_FOUND') {
            console.error('💡 Solução: Verifique se todas as dependências estão instaladas.');
            console.error('   Execute: npm install');
        } else if (error.code === 'ENOENT') {
            console.error('💡 Solução: Verifique se o arquivo existe e as permissões estão corretas.');
        }

        process.exit(1);
    }
} 