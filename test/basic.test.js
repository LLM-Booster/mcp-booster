#!/usr/bin/env node

/**
 * Testes básicos de compatibilidade multi-plataforma
 * para o pacote MCP-Booster
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Cores para output no terminal
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

// Testes
const tests = [];

// Test 1: Verificar estrutura do projeto
tests.push({
    name: 'Estrutura do projeto',
    fn: () => {
        const requiredFiles = [
            'package.json',
            'bin/server.js',
            'dist/index.js',
            'dist/index.d.ts'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Arquivo obrigatório não encontrado: ${file}`);
            }
        }

        return 'Todos os arquivos obrigatórios estão presentes';
    }
});

// Test 2: Verificar permissões do executável
tests.push({
    name: 'Permissões do executável',
    fn: () => {
        const binFile = 'bin/server.js';
        const stats = fs.statSync(binFile);
        const isExecutable = !!(stats.mode & parseInt('111', 8));

        if (!isExecutable && process.platform !== 'win32') {
            throw new Error('Arquivo bin/server.js não tem permissões de execução');
        }

        return 'Permissões do executável estão corretas';
    }
});

// Test 3: Verificar package.json
tests.push({
    name: 'Configuração package.json',
    fn: () => {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

        const required = ['name', 'version', 'bin', 'main', 'preferredGlobal'];
        for (const field of required) {
            if (!pkg[field]) {
                throw new Error(`Campo obrigatório ausente no package.json: ${field}`);
            }
        }

        if (!pkg.engines || !pkg.engines.node) {
            throw new Error('Campo engines.node ausente no package.json');
        }

        if (!pkg.preferredGlobal) {
            throw new Error('Campo preferredGlobal deve ser true');
        }

        return 'Configuração do package.json está correta';
    }
});

// Test 4: Verificar Node.js version
tests.push({
    name: 'Versão do Node.js',
    fn: () => {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

        if (majorVersion < 18) {
            throw new Error(`Node.js ${nodeVersion} não suportado. Mínimo: v18.0.0`);
        }

        return `Node.js ${nodeVersion} é compatível`;
    }
});

// Test 5: Verificar importação do módulo principal
tests.push({
    name: 'Importação do módulo principal',
    fn: () => {
        const mainFile = path.resolve('dist/index.js');

        try {
            const mainModule = require(mainFile);

            if (typeof mainModule.initializeServer !== 'function') {
                throw new Error('Função initializeServer não encontrada');
            }

            return 'Módulo principal pode ser importado corretamente';
        } catch (error) {
            throw new Error(`Erro ao importar módulo principal: ${error.message}`);
        }
    }
});

// Test 6: Verificar paths cross-platform
tests.push({
    name: 'Paths cross-platform',
    fn: () => {
        const binContent = fs.readFileSync('bin/server.js', 'utf8');

        if (!binContent.includes('path.resolve')) {
            throw new Error('bin/server.js não usa path.resolve para compatibilidade');
        }

        if (!binContent.includes('#!/usr/bin/env node')) {
            throw new Error('Shebang incorreto em bin/server.js');
        }

        return 'Paths são tratados de forma cross-platform';
    }
});

// Test 7: Verificar dependências
tests.push({
    name: 'Dependências',
    fn: () => {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Verificar se não há dependências problemáticas conhecidas
        const problematicDeps = ['node-gyp', 'fsevents'];
        for (const dep of problematicDeps) {
            if (deps[dep]) {
                logWarning(`Dependência potencialmente problemática encontrada: ${dep}`);
            }
        }

        return 'Dependências verificadas';
    }
});

// Test 8: Teste de empacotamento
tests.push({
    name: 'Empacotamento NPM',
    fn: () => {
        try {
            // Executar npm pack --dry-run
            const output = execSync('npm pack --dry-run', { encoding: 'utf8' });

            if (!output.includes('mcp-booster@')) {
                throw new Error('Empacotamento falhou');
            }

            return 'Empacotamento funciona corretamente';
        } catch (error) {
            throw new Error(`Erro no empacotamento: ${error.message}`);
        }
    }
});

// Executar testes
async function runTests() {
    logInfo('Iniciando testes de compatibilidade multi-plataforma...');
    logInfo(`Sistema: ${process.platform} ${process.arch}`);
    logInfo(`Node.js: ${process.version}`);
    logInfo(`NPM: ${execSync('npm --version', { encoding: 'utf8' }).trim()}`);
    console.log('');

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const result = await test.fn();
            logSuccess(`${test.name}: ${result}`);
            passed++;
        } catch (error) {
            logError(`${test.name}: ${error.message}`);
            failed++;
        }
    }

    console.log('');
    logInfo(`Resumo: ${passed} passaram, ${failed} falharam`);

    if (failed > 0) {
        logError('Alguns testes falharam. Verifique os problemas acima.');
        process.exit(1);
    } else {
        logSuccess('Todos os testes passaram! O pacote está pronto para distribuição.');
        process.exit(0);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    runTests().catch(error => {
        logError(`Erro fatal: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runTests }; 