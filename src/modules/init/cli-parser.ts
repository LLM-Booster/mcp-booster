/**
 * Interface para definir os argumentos do comando init
 */
export interface InitCommandArgs {
    /** IDE alvo (deve ser 'cursor') */
    ide: string;
    /** API key do usuário */
    apiKey: string;
    /** Se deve mostrar ajuda */
    help?: boolean;
}

/**
 * Interface para resultado do parsing
 */
export interface ParseResult {
    /** Sucesso no parsing */
    success: boolean;
    /** Argumentos parseados (se sucesso) */
    args?: InitCommandArgs;
    /** Mensagem de erro (se falha) */
    error?: string;
    /** Se deve mostrar ajuda */
    showHelp?: boolean;
}

/**
 * Faz o parsing dos argumentos da linha de comando
 * Formato esperado: mcp-booster init --ide cursor --api-key <api-key>
 */
export function parseCliArguments(argv: string[]): ParseResult {
    // Remove os primeiros dois argumentos (node e script path)
    const args = argv.slice(2);

    // Verifica se é comando init
    if (args.length === 0 || args[0] !== 'init') {
        return {
            success: false,
            error: 'Comando não reconhecido. Use "init" para instalar configuração MCP.',
            showHelp: true
        };
    }

    // Remove 'init' dos argumentos
    const initArgs = args.slice(1);

    // Verifica se é pedido de ajuda
    if (initArgs.includes('--help') || initArgs.includes('-h')) {
        return {
            success: true,
            showHelp: true
        };
    }

    // Parse dos argumentos
    const parsedArgs: Partial<InitCommandArgs> = {};

    for (let i = 0; i < initArgs.length; i++) {
        const arg = initArgs[i];

        switch (arg) {
            case '--ide':
                if (i + 1 >= initArgs.length) {
                    return {
                        success: false,
                        error: 'Argumento --ide requer um valor (ex: --ide cursor)'
                    };
                }
                parsedArgs.ide = initArgs[i + 1];
                i++; // Pula o próximo argumento (valor)
                break;

            case '--api-key':
                if (i + 1 >= initArgs.length) {
                    return {
                        success: false,
                        error: 'Argumento --api-key requer um valor'
                    };
                }
                parsedArgs.apiKey = initArgs[i + 1];
                i++; // Pula o próximo argumento (valor)
                break;

            default:
                return {
                    success: false,
                    error: `Argumento desconhecido: ${arg}`
                };
        }
    }

    // Validação dos argumentos obrigatórios
    if (!parsedArgs.ide) {
        return {
            success: false,
            error: 'Argumento --ide é obrigatório (ex: --ide cursor)'
        };
    }

    if (!parsedArgs.apiKey) {
        return {
            success: false,
            error: 'Argumento --api-key é obrigatório'
        };
    }

    // Validação do IDE
    if (parsedArgs.ide.toLowerCase() !== 'cursor') {
        return {
            success: false,
            error: `IDE '${parsedArgs.ide}' não é suportado. Apenas 'cursor' é suportado atualmente.`
        };
    }

    // Validação da API key
    if (parsedArgs.apiKey.trim().length === 0) {
        return {
            success: false,
            error: 'API key não pode estar vazia'
        };
    }

    return {
        success: true,
        args: parsedArgs as InitCommandArgs
    };
}

/**
 * Gera mensagem de ajuda para o comando init
 */
export function getHelpMessage(): string {
    return `
🚀 MCP-Booster - Instalador de Configuração MCP

USO:
  mcp-booster init --ide cursor --api-key <sua-api-key>

ARGUMENTOS OBRIGATÓRIOS:
  --ide <ide>        IDE alvo (atualmente suporta apenas 'cursor')
  --api-key <key>    Sua API key para o serviço MCP-Booster

ARGUMENTOS OPCIONAIS:
  --help, -h         Mostra esta mensagem de ajuda

EXEMPLO:
  # Instalação (servidor MCP global + cursor rules locais)
  mcp-booster init --ide cursor --api-key abc123def456

  # Mostrar ajuda
  mcp-booster init --help

SOBRE:
    Este comando instala automaticamente:
    - Configuração MCP do Booster GLOBALMENTE no Cursor IDE
    - Cursor Rules LOCALMENTE no projeto atual
    
    O servidor MCP é instalado globalmente para funcionar em todos os projetos,
    enquanto as cursor rules são criadas localmente para cada projeto.

  Sistemas suportados: Windows, macOS, Linux
`;
}

/**
 * Valida se uma string é uma API key válida (formato básico)
 */
export function isValidApiKey(apiKey: string): boolean {
    // Validação básica: não vazia, sem espaços, comprimento mínimo
    return apiKey.trim().length >= 8 && !apiKey.includes(' ');
}

/**
 * Sanitiza a API key removendo espaços e caracteres inválidos
 */
export function sanitizeApiKey(apiKey: string): string {
    return apiKey.trim().replace(/\s+/g, '');
} 