/**
 * MCP-Booster - Servidor MCP
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CoConuTService } from "./modules/coconut";
import {
  CoConuTParams,
  CoConuTParamsSchema,
  CoConuTStorageParams,
  CoConuTStorageParamsSchema,
  ThoughtEntry,
  EventType,
  EventData,
  ErrorResponse,
  ErrorCode
} from "./modules/types";
import { Logger } from "./modules/logger";
import {
  config,
  defaultConfig,
  updateConfig,
  getConfig,
  setApiKey,
  getApiKey,
  Config
} from "./config";
import { FormatterFactory } from "./modules/formatters";
import { z } from "zod";
import open from 'open';

// Instância do logger
let logger: any;

// Instância do servidor MCP
let server: McpServer | null = null;

// Instância do serviço CoConuT_Storage
let coconutService: CoConuTService | null = null;

// Estado global para as funções lambda
let coconutState: CoConuTState = {
  thoughtHistory: [],
  interactionCount: 0,
  branches: { 'main': [] },
  currentBranch: 'main',
  lastProblemStatus: '',
  lastSavedFiles: [],
  analysisCache: []
};

/**
 * Processa argumentos de linha de comando
 * @param useLogger Se deve usar o logger para exibir mensagens (se false, usa console)
 */
function processCommandLineArgs(useLogger = false) {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-key' && i + 1 < args.length) {
      const apiKey = args[i + 1];

      // Armazenar a chave sem validação
      setApiKey(apiKey);

      // Log apropriado dependendo se o logger já foi inicializado
      if (useLogger && logger) {
        logger.info('API Key configured via command line');
      } else {
        console.log('API Key configured via command line');
      }

      // Pular o próximo argumento, pois ele é o valor da chave
      i++;
    }
  }
}

// Definindo interfaces para as respostas dos endpoints
interface CoConuTResponse {
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  action?: string;
  inputType?: string;
  message?: string;
  options?: string[];
  error?: string;
  analysis: {
    isOnRightTrack: boolean;
    needsMoreUserInfo: boolean;
    suggestedTotalThoughts: number;
    userInfoNeeded?: string[];
    suggestions?: string[];
  };
}

interface CoConuTState {
  thoughtHistory: ThoughtEntry[];
  interactionCount: number;
  branches: Record<string, number[]>;
  currentBranch: string;
  lastProblemStatus: string;
  lastSavedFiles: {
    filePath: string;
    type: 'thought' | 'branch' | 'conclusion';
    timestamp: number;
  }[];
  analysisCache: Array<{
    result: any;
    timestamp: number;
    thoughtsHash: string;
  }>;
}

interface CoConuTLambdaResult {
  response: CoConuTResponse;
  state: CoConuTState;
}

interface AnalyserOutput {
  isOnRightTrack: boolean;
  needsMoreUserInfo: boolean;
  suggestedTotalThoughts: number;
  userInfoNeeded?: string[];
  suggestions?: string[];
  metadata?: Record<string, any>;
}

/**
 * Função para chamar o endpoint CoConuT
 */
async function callCoConuTEndpoint(params: CoConuTParams): Promise<CoConuTLambdaResult> {
  try {
    // Preparar o corpo da requisição
    const lambdaInput = {
      params,
      state: coconutState,
      config: config.coconut
    };

    // Preparar cabeçalhos
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Adicionar cabeçalho de autorização se a API key estiver configurada
    const apiKey = getApiKey();
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Fazer a chamada ao endpoint externo
    const response = await fetch('https://api.llmbooster.com/booster', {
      method: 'POST',
      headers,
      body: JSON.stringify(lambdaInput)
    });

    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      // Criar erro estruturado para falha na API
      const errorMessage = `Error calling CoConuT endpoint: ${response.status} ${response.statusText}`;
      const errorResponse: ErrorResponse = {
        code: ErrorCode.NETWORK_ERROR,
        message: errorMessage,
        details: `Status: ${response.status}, Text: ${response.statusText}`,
        suggestions: [
          'Check your internet connection',
          'Check if the server is online',
          'Verify if your API key is valid'
        ],
        context: {
          methodName: 'callCoConuTEndpoint'
        }
      };
      throw errorResponse;
    }

    // Analisar a resposta
    const result = await response.json();
    return result;
  } catch (error: any) {
    logger.error("Error calling CoConuT endpoint", { error });

    // Se já é um ErrorResponse, propagar
    if (error.code && error.message) {
      throw error;
    }

    // Caso contrário, criar um ErrorResponse
    const errorResponse: ErrorResponse = {
      code: ErrorCode.NETWORK_ERROR,
      message: error.message || 'Unknown error calling CoConuT endpoint',
      details: error.stack,
      suggestions: [
        'Check your internet connection',
        'Check if the server is online',
        'Verify if your API key is valid'
      ],
      context: {
        methodName: 'callCoConuTEndpoint'
      }
    };
    throw errorResponse;
  }
}

/**
 * Função para chamar o endpoint CoConuT_Analyser
 */
async function callCoConuTAnalyserEndpoint(thoughts: ThoughtEntry[], projectPath?: string, userQuery?: string): Promise<AnalyserOutput> {
  try {
    // Preparar o corpo da requisição
    const requestBody = {
      thoughts: thoughts.map(t => ({
        ...t,
        score: t.score || 0 // Garantir que score nunca é undefined
      })),
      projectPath,
      userQuery
    };

    // Preparar cabeçalhos
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Adicionar cabeçalho de autorização se a API key estiver configurada
    const apiKey = getApiKey();
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Fazer a chamada ao endpoint externo
    const response = await fetch('https://api.llmbooster.com/analyser', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      // Criar erro estruturado para falha na API
      const errorMessage = `Error calling CoConuT_Analyser endpoint: ${response.status} ${response.statusText}`;
      const errorResponse: ErrorResponse = {
        code: ErrorCode.NETWORK_ERROR,
        message: errorMessage,
        details: `Status: ${response.status}, Text: ${response.statusText}`,
        suggestions: [
          'Check your internet connection',
          'Check if the server is online',
          'Verify if your API key is valid'
        ],
        context: {
          methodName: 'callCoConuTAnalyserEndpoint'
        }
      };
      throw errorResponse;
    }

    // Analisar a resposta
    const result = await response.json();
    return result;
  } catch (error: any) {
    logger.error("Erro ao chamar endpoint CoConuT_Analyser", { error });

    // Se já é um ErrorResponse, propagar
    if (error.code && error.message) {
      throw error;
    }

    // Caso contrário, criar um ErrorResponse
    const errorResponse: ErrorResponse = {
      code: ErrorCode.NETWORK_ERROR,
      message: error.message || 'Erro desconhecido ao chamar endpoint CoConuT_Analyser',
      details: error.stack,
      suggestions: [
        'Verifique sua conexão com a internet',
        'Verifique se o servidor está online',
        'Verifique se a API key é válida'
      ],
      context: {
        methodName: 'callCoConuTAnalyserEndpoint'
      }
    };
    throw errorResponse;
  }
}

/**
 * Inicializa o logger
 */
function initializeLogger() {
  logger = Logger.getInstance({
    minLevel: Logger.getLevelFromName(config.logging.minLevel),
    enableConsole: config.logging.enableConsole,
    includeTimestamp: config.logging.includeTimestamp,
    logFilePath: config.logging.logFilePath
  });
}

/**
 * Configura o servidor MCP e as ferramentas CoConuT
 */
function setupServer() {
  // Criar e configurar o servidor MCP
  server = new McpServer({
    name: config.server.name,
    version: config.server.version
  });

  // Instanciar o serviço CoConuT_Storage
  coconutService = new CoConuTService({
    persistenceEnabled: true
    // Sem projectPath - o modelo deve fornecer em cada interação
  });

  // Log de configuração aplicada
  logger.info("Configuração do CoConuT:", {
    persistenceEnabled: true,
    transport: config.server.transport,
    protocolVersion: config.server.protocolVersion
  });

  // Log específico sobre o status do armazenamento
  logger.info("Armazenamento de pensamentos configurado com validação. O modelo DEVE fornecer um caminho válido em cada interação!");

  // Configurar ferramentas CoConuT, CoConuT_Storage e CoConuT_Analyser
  setupCoConuTTools();
}

/**
 * Configura as ferramentas CoConuT no servidor MCP
 */
function setupCoConuTTools() {
  if (!server || !coconutService) {
    throw new Error("Servidor MCP ou serviço CoConuT não inicializados");
  }

  const service = coconutService; // Criar referência não-null

  // Implementação da ferramenta CoConuT
  server.tool(
    "Booster",
    CoConuTParamsSchema.shape,
    async (params: CoConuTParams, extra) => {
      try {
        // Chamar o endpoint externo com os parâmetros e o estado
        const lambdaResult = await callCoConuTEndpoint(params);

        // Atualizar o estado global com o retornado pelo endpoint
        coconutState = lambdaResult.state;

        // Retornar resposta no formato esperado pelo MCP
        return {
          content: [{
            type: "text",
            text: JSON.stringify(lambdaResult.response, null, 2)
          }],
          _meta: {
            description: "Ferramenta de raciocínio contínuo em cadeia (Continuous Chain of Thought)",
            readOnly: true,
            category: "reasoning",
            descriptionShort: "Processa pensamentos em cadeia com ramificações e análise de qualidade",
            descriptionLong: "Permite modelos de linguagem raciocinar passo a passo, mantendo histórico de pensamentos e possibilitando ramificações. Suporta revisão de pensamentos anteriores, análise automática da qualidade do raciocínio, detecção de ciclos, e ajustes dinâmicos no número total de pensamentos. Retorna resultado em formato JSON com análise integrada.",
            schemaVersion: config.server.protocolVersion
          }
        };
      } catch (error: any) {
        logger.error("Error in CoConuT tool", { error });

        // Processar a estrutura de erro
        const errorObj = error.code && error.message
          ? error // Já é um ErrorResponse
          : {
            code: ErrorCode.EXECUTION_ERROR,
            message: error.message || 'Unknown error',
            details: error.stack,
            suggestions: ['Check the parameters and try again']
          };

        // Retornar erro em formato compatível e estruturado
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: JSON.stringify(errorObj),
              thoughtNumber: params.thoughtNumber,
              totalThoughts: params.totalThoughts,
              nextThoughtNeeded: false,
              analysis: {
                isOnRightTrack: false,
                needsMoreUserInfo: true,
                suggestedTotalThoughts: params.totalThoughts,
                userInfoNeeded: [errorObj.message],
                suggestions: errorObj.suggestions || ['Fix the error and try again']
              }
            }, null, 2)
          }]
        };
      }
    }
  );

  // Implementação da ferramenta CoConuT_Storage
  server.tool(
    "Booster_Storage",
    CoConuTStorageParamsSchema.shape,
    async (params: CoConuTStorageParams) => {
      try {
        // Validar os parâmetros obrigatórios
        if (!params.projectPath) {
          throw {
            code: ErrorCode.INVALID_INPUT,
            message: "The project path cannot be empty",
            suggestions: ["Provide a valid path for the project directory"],
            context: { paramName: "projectPath" }
          } as ErrorResponse;
        }
        if (!params.WhyChange) {
          throw {
            code: ErrorCode.INVALID_INPUT,
            message: "The reason for change cannot be empty",
            suggestions: ["Provide an explanation of why the change is necessary"],
            context: { paramName: "WhyChange" }
          } as ErrorResponse;
        }
        if (!params.WhatChange) {
          throw {
            code: ErrorCode.INVALID_INPUT,
            message: "The change description cannot be empty",
            suggestions: ["Provide a description of what was changed"],
            context: { paramName: "WhatChange" }
          } as ErrorResponse;
        }

        // Chamar o método saveWithStorage do serviço CoConuT com todos os parâmetros
        const savedFiles = await service.saveWithStorage(
          params.projectPath,
          params.WhyChange,
          params.WhatChange,
          {
            // Passar os parâmetros opcionais para enriquecer a conclusão
            category: params.category,
            subCategories: params.subCategories,
            tags: params.tags,
            impactLevel: params.impactLevel,
            affectedFiles: params.affectedFiles,
            codeSnippets: params.codeSnippets,
            relatedConclusions: params.relatedConclusions,
            ticketReference: params.ticketReference,
            businessContext: params.businessContext,
            alternativesConsidered: params.alternativesConsidered,
            testingPerformed: params.testingPerformed,
            technicalContext: params.technicalContext
          }
        );

        // Iniciar armazenamento de interações futuras se configurado
        if (config.coconut.persistenceEnabled) {
          coconutService?.setProjectPath(params.projectPath);
        }

        // Construir resultado da operação
        const result = {
          success: true,
          message: "Thoughts and conclusion saved successfully",
          savedFiles,
          timestamp: Date.now()
        };

        // Retornar resposta no formato esperado pelo MCP
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }],
          _meta: {
            description: "Ferramenta de armazenamento persistente para cadeias de pensamento do CoConuT",
            readOnly: false,
            isDestructive: true,
            category: "storage",
            descriptionShort: "Salva pensamentos, conclusões e histórico de interações em armazenamento persistente",
            descriptionLong: "Permite salvar a cadeia de pensamentos gerada em arquivos persistentes, criar conclusões estruturadas e enriquecidas e manter um histórico de interações. A ferramenta cria ou atualiza arquivos no sistema de arquivos com base no caminho fornecido, gera uma conclusão formatada com metadados, seções padronizadas, categorização e contextualização a partir dos parâmetros fornecidos, e configura o salvamento automático de futuras interações no arquivo conclusion.md. Fornece respostas detalhadas sobre os arquivos salvos, incluindo contagem, timestamps e caminhos. Inclui suporte para categorização, tags, níveis de impacto, snippets de código, referências cruzadas e outros metadados que otimizam o retrieval pelo modelo.",
            requiresUserAction: true,
            schemaVersion: config.server.protocolVersion
          }
        };
      } catch (error: any) {
        logger.error("Error in CoConuT_Storage tool", { error });

        // Processar a estrutura de erro
        const errorObj = error.code && error.message
          ? error // Já é um ErrorResponse
          : {
            code: ErrorCode.EXECUTION_ERROR,
            message: error.message || 'Unknown error',
            details: error.stack,
            suggestions: ['Check the parameters and try again']
          };

        // Retornar erro em formato compatível
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorObj
            }, null, 2)
          }]
        };
      }
    }
  );

  // Esquema Zod para parâmetros do CoConuT_Analyser
  const CoConuTAnalyserParamsSchema = z.object({
    thoughts: z.array(z.any()).describe("Array containing the thoughts to be analyzed"),
    projectPath: z.string().optional().describe("Project path for additional context"),
    userQuery: z.string().optional().describe("Original user query to check alignment")
  });

  // Interface para parâmetros do CoConuT_Analyser
  interface CoConuTAnalyserParams {
    thoughts: ThoughtEntry[];
    projectPath?: string;
    userQuery?: string;
  }

  // Implementação da ferramenta CoConuT_Analyser
  server.tool(
    "Booster_Analyser",
    CoConuTAnalyserParamsSchema.shape,
    async (params: CoConuTAnalyserParams) => {
      try {
        // Validar parâmetros
        if (!params.thoughts || params.thoughts.length === 0) {
          throw {
            code: ErrorCode.INVALID_INPUT,
            message: "At least one thought must be provided for analysis",
            suggestions: ["Provide a non-empty array of thoughts"],
            context: { paramName: "thoughts" }
          } as ErrorResponse;
        }

        // Chamar o endpoint externo
        const result = await callCoConuTAnalyserEndpoint(
          params.thoughts,
          params.projectPath,
          params.userQuery
        );

        // Retornar resposta no formato esperado pelo MCP
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }],
          _meta: {
            description: "Ferramenta de análise para cadeias de pensamento do CoConuT",
            readOnly: true,
            category: "analysis",
            descriptionShort: "Analisa a qualidade de uma cadeia de pensamentos",
            descriptionLong: "Permite avaliar a qualidade de uma cadeia de pensamentos, verificando se o raciocínio está no caminho certo, se mais informações são necessárias do usuário, e sugerindo um número total de pensamentos adequado para o problema. Fornece sugestões para aprimoramento do raciocínio e identificação de desvios no caminho do raciocínio. Recebe um array de pensamentos (opcionalmente com um caminho de projeto e uma consulta do usuário) e retorna uma análise detalhada em formato JSON.",
            schemaVersion: config.server.protocolVersion
          }
        };
      } catch (error: any) {
        logger.error("Error in CoConuT_Analyser tool", { error });

        // Processar a estrutura de erro
        const errorObj = error.code && error.message
          ? error // Já é um ErrorResponse
          : {
            code: ErrorCode.EXECUTION_ERROR,
            message: error.message || 'Erro desconhecido',
            details: error.stack,
            suggestions: ['Verifique os parâmetros e tente novamente']
          };

        // Retornar erro em formato compatível e estruturado
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: errorObj,
              isOnRightTrack: false,
              needsMoreUserInfo: true,
              suggestedTotalThoughts: 5,
              userInfoNeeded: [errorObj.message],
              suggestions: errorObj.suggestions || ["Corrija o erro e tente novamente"]
            }, null, 2)
          }]
        };
      }
    }
  );
}

/**
 * Trata sinais do sistema para encerramento adequado
 */
function setupSignalHandlers() {
  process.on('SIGINT', () => {
    logger.info('SIGINT recebido, encerrando servidor...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM recebido, encerrando servidor...');
    process.exit(0);
  });
}

/**
 * Interface para opções de inicialização do servidor
 */
export interface ServerOptions {
  apiKey?: string;
  config?: Partial<Config>;
}

/**
 * Abre o site llmbooster.com no navegador padrão
 * @param reason Motivo pelo qual o redirecionamento está sendo feito
 * @param useLogger Se deve usar o logger para exibir mensagens (se false, usa console)
 */
async function openLLMBoosterWebsite(reason: string, useLogger = true): Promise<void> {
  const apiKey = getApiKey();
  const url = apiKey
    ? `https://llmbooster.com/error/api-key?key=${apiKey}`
    : 'https://llmbooster.com/error/api-key';

  // Verificar se o redirecionamento automático está habilitado
  if (!config.api.autoRedirectOnError) {
    const message = `Por favor, visite ${url} para ${reason}`;

    if (useLogger && logger) {
      logger.warn(message);
    } else {
      console.warn(`\n⚠️  ${message}\n`);
    }
    return;
  }

  try {
    const message = `Redirecionando para ${url} para ${reason}`;

    if (useLogger && logger) {
      logger.info(message);
    } else {
      console.log(`\n\n⚠️  ${message}...\n`);
    }

    // Abrir o URL no navegador padrão
    await open(url);
  } catch (error) {
    const errorMessage = `Não foi possível abrir o navegador automaticamente. Por favor, visite ${url} para ${reason}`;

    if (useLogger && logger) {
      logger.error(errorMessage);
    } else {
      console.error(`\n❌  ${errorMessage}\n`);
    }
  }
}

/**
 * Verifica se a API key é válida fazendo uma chamada para o endpoint de verificação
 * @param useLogger Se deve usar o logger para exibir mensagens (se false, usa console)
 * @returns Promise<boolean> True se a API key for válida, False caso contrário
 */
async function verifyApiKey(useLogger = true): Promise<boolean> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return false;
  }

  try {
    // Preparar cabeçalhos com a API key
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`
    };

    // Fazer a chamada ao endpoint de verificação
    const response = await fetch('https://api.llmbooster.com', {
      method: 'POST',
      headers
    });

    // Verificar se a resposta foi bem-sucedida (código 2xx)
    return response.ok;
  } catch (error) {
    // Em caso de erro na chamada (problema de rede, etc.), retornar false
    if (useLogger && logger) {
      logger.error('Erro ao verificar API key', { error });
    } else {
      console.error('Erro ao verificar API key:', error);
    }
    return false;
  }
}

/**
 * Inicializa o servidor MCP com as configurações fornecidas
 * @param options Opções de inicialização
 */
export async function initializeServer(options: ServerOptions = {}): Promise<void> {
  try {
    // Processar argumentos de linha de comando antes da inicialização do logger
    // Passamos false para indicar que deve usar console.log em vez de logger
    processCommandLineArgs(false);

    // Verificar se a variável de ambiente para desativar redirecionamento automático está definida
    if (process.env.MCP_COCONUT_NO_REDIRECT === 'true') {
      updateConfig({
        api: {
          autoRedirectOnError: false
        }
      });
    }

    // Atualizar configurações com as opções fornecidas
    if (options.config) {
      updateConfig(options.config);
    }

    // Configurar API key se fornecida nas opções
    if (options.apiKey) {
      setApiKey(options.apiKey);
    }

    // Verificar se a API key foi configurada via variável de ambiente
    const envApiKey = process.env.MCP_COCONUT_API_KEY;
    if (envApiKey && !getApiKey()) {
      setApiKey(envApiKey);
      console.log('API Key configurada via variável de ambiente');
    }

    // Inicializar o logger
    initializeLogger();

    // Se a API key não foi configurada, exibir aviso e redirecionar para o site
    if (!getApiKey()) {
      logger.error("API Key não configurada. Para usar API key, configure-a via opções, variável de ambiente ou linha de comando.");
      await openLLMBoosterWebsite('obter uma API key válida', true);
    } else {
      logger.info("API Key configurada.");

      // Verificar se a API key é válida
      logger.info("Verificando validade da API key...");
      const isValid = await verifyApiKey();

      if (isValid) {
        logger.info("API Key verificada com sucesso!");
      } else {
        logger.error("API Key inválida ou erro na verificação. As chamadas à API podem falhar.");
        // Redirecionar para o site llmbooster.com em caso de API key inválida
        await openLLMBoosterWebsite('resolver problemas com sua API key atual', true);
      }
    }

    // Configurar o servidor e as ferramentas
    setupServer();

    // Configurar handlers de sinais
    setupSignalHandlers();

    // Conectar o servidor ao transporte
    if (server) {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      logger.info('Servidor MCP iniciado com sucesso');
    } else {
      throw new Error("Falha ao inicializar o servidor MCP");
    }
  } catch (error: any) {
    if (logger) {
      logger.error('Erro ao iniciar servidor MCP', { error });
    } else {
      console.error('Erro ao iniciar servidor MCP:', error);
    }
    process.exit(1);
  }
}

// Se o módulo for executado diretamente (não importado), iniciar o servidor
if (require.main === module) {
  initializeServer();
}

// Exportar funções e tipos úteis para quem importar este módulo
export {
  updateConfig,
  getConfig,
  setApiKey,
  getApiKey,
  Config
}; 