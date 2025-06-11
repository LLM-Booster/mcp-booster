#!/usr/bin/env node

/**
 * Script de inicialização do servidor MCP-Booster
 * Compatível com Windows, macOS e Linux
 */

const path = require('path');
const fs = require('fs');

// Função para normalizar paths cross-platform
function resolvePath(relativePath) {
    return path.resolve(__dirname, relativePath);
}

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