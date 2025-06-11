/**
 * MCP-Booster - Servidor MCP
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CoConuTService } from "./modules/coconut";
import { BoosterStepsService } from "./modules/booster-steps";
import {
  CoConuTParams,
  CoConuTParamsSchema,
  CoConuTStorageParams,
  CoConuTStorageParamsSchema,
  BoosterStepsParams,
  BoosterStepsParamsSchema,
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

// Instância do serviço Booster_Steps
let boosterStepsService: BoosterStepsService | null = null;

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
 * Tipos de erro de verificação LLMBooster
 */
enum VerificationErrorType {
  NONE = 'none',
  API_KEY = 'api_key',
  VERSION = 'version',
  NETWORK = 'network',
  UNKNOWN = 'unknown'
}

/**
 * Resultado da verificação LLMBooster
 */
interface VerificationResult {
  success: boolean;
  errorType: VerificationErrorType;
  statusCode?: number;
  message?: string;
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
      // Criar mensagem de erro simples
      const errorMessage = `Network error: Unable to reach server (${response.status})`;
      throw new Error(errorMessage);
    }

    // Analisar a resposta
    const result = await response.json() as any;

    // Se a resposta contém um erro simples, propagar
    if (result.error) {
      throw new Error(result.error);
    }

    return result as CoConuTLambdaResult;
  } catch (error: any) {
    logger.error("Error calling CoConuT endpoint", { error });

    // Criar mensagem de erro simples
    let simpleMessage = error.message;
    if (!simpleMessage || simpleMessage.includes('fetch')) {
      simpleMessage = 'Network error. Please check your connection and try again.';
    }

    throw new Error(simpleMessage);
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
      // Criar mensagem de erro simples
      const errorMessage = `Network error: Unable to reach analyser server (${response.status})`;
      throw new Error(errorMessage);
    }

    // Analisar a resposta
    const result = await response.json() as any;

    // Se a resposta contém um erro simples, propagar
    if (result.error) {
      throw new Error(result.error);
    }

    return result as AnalyserOutput;
  } catch (error: any) {
    logger.error("Error calling CoConuT_Analyser endpoint", { error });

    // Criar mensagem de erro simples
    let simpleMessage = error.message;
    if (!simpleMessage || simpleMessage.includes('fetch')) {
      simpleMessage = 'Network error. Please check your connection and try again.';
    }

    throw new Error(simpleMessage);
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

  // Inicializar o serviço Booster_Steps
  boosterStepsService = new BoosterStepsService();

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

        // Criar mensagem de erro simples
        const simpleErrorMessage = error.message || 'An error occurred while processing your request.';

        // Retornar erro em formato compatível e simples
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: simpleErrorMessage,
              thoughtNumber: params.thoughtNumber,
              totalThoughts: params.totalThoughts,
              nextThoughtNeeded: false,
              analysis: {
                isOnRightTrack: false,
                needsMoreUserInfo: true,
                suggestedTotalThoughts: params.totalThoughts,
                userInfoNeeded: [simpleErrorMessage],
                suggestions: ['Fix the error and try again']
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
          throw new Error("The project path cannot be empty");
        }
        if (!params.WhyChange) {
          throw new Error("The reason for change cannot be empty");
        }
        if (!params.WhatChange) {
          throw new Error("The change description cannot be empty");
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

        // Criar mensagem de erro simples
        const simpleErrorMessage = error.message || 'An error occurred while saving data.';

        // Retornar erro em formato compatível
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: simpleErrorMessage
            }, null, 2)
          }]
        };
      }
    }
  );

  // Esquema Zod para validação de estrutura de ThoughtEntry
  const ThoughtEntrySchema = z.object({
    thought: z.string().describe("The current thought text in the reasoning process"),
    thoughtNumber: z.number().positive().describe("Sequential number of this thought in the chain"),
    branchId: z.string().describe("Unique identifier of the current branch"),
    timestamp: z.number().positive().describe("Unix timestamp when the thought was created"),
    score: z.number().min(0).max(10).optional().describe("Score or confidence associated with this thought (0-10)"),
    metadata: z.record(z.any()).optional().describe("Additional metadata associated with this thought")
  });

  // Esquema Zod para parâmetros do Booster_Analyser
  const BoosterAnalyserParamsSchema = z.object({
    thoughts: z.array(ThoughtEntrySchema).min(1).describe("Array of thoughts to analyze. Each thought must contain text, number, branchId, timestamp, and optionally score and metadata."),
    projectPath: z.string().optional().describe("Project path for additional context"),
    userQuery: z.string().describe("Original user query to check alignment - required for proper analysis")
  });

  // Interface para parâmetros do Booster_Analyser
  interface BoosterAnalyserParams {
    thoughts: ThoughtEntry[]; // Array tipado de ThoughtEntry
    projectPath?: string;
    userQuery: string; // Agora obrigatório
  }

  // Implementação da ferramenta Booster_Analyser
  server.tool(
    "Booster_Analyser",
    BoosterAnalyserParamsSchema.shape,
    async (params: BoosterAnalyserParams) => {
      // Função helper para retornar erro diretamente
      const returnError = (errorMessage: string) => {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: errorMessage,
              isOnRightTrack: false,
              needsMoreUserInfo: true,
              suggestedTotalThoughts: 5,
              userInfoNeeded: [errorMessage],
              suggestions: ['Fix the error and try again'],
              metadata: {
                errorTimestamp: new Date().toISOString()
              }
            }, null, 2)
          }]
        };
      };

      // Validação manual para parâmetros obrigatórios

      // Verificar se userQuery existe (agora obrigatório)
      if (!params.userQuery || typeof params.userQuery !== 'string' || params.userQuery.trim() === '') {
        return returnError("The 'userQuery' parameter is required and must be a non-empty string");
      }

      // As validações detalhadas do array thoughts agora são feitas pelo schema Zod
      // Se chegou até aqui, significa que thoughts está válido conforme ThoughtEntrySchema

      try {

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
            description: "Ferramenta de análise para cadeias de pensamentos do Booster",
            readOnly: true,
            category: "analysis",
            descriptionShort: "Analisa a qualidade de uma cadeia de pensamentos",
            descriptionLong: "Permite avaliar a qualidade de uma cadeia de pensamentos, verificando se o raciocínio está no caminho certo, se mais informações são necessárias do usuário, e sugerindo um número total de pensamentos adequado para o problema. Fornece sugestões para aprimoramento do raciocínio e identificação de desvios no caminho do raciocínio. Recebe um array de pensamentos (opcionalmente com um caminho de projeto e uma consulta do usuário) e retorna uma análise detalhada em formato JSON.",
            schemaVersion: config.server.protocolVersion
          }
        };
      } catch (error: any) {
        logger.error("Error in Booster_Analyser tool", { error });

        // Criar mensagem de erro simples
        const simpleErrorMessage = error.message || 'An error occurred while analyzing thoughts.';

        // Retornar erro em formato simples e compatível
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: simpleErrorMessage,
              isOnRightTrack: false,
              needsMoreUserInfo: true,
              suggestedTotalThoughts: 5,
              userInfoNeeded: [simpleErrorMessage],
              suggestions: ['Fix the error and try again'],
              metadata: {
                errorTimestamp: new Date().toISOString()
              }
            }, null, 2)
          }]
        };
      }
    }
  );

  // Implementação da ferramenta Booster_Steps
  server.tool(
    "Booster_Steps",
    BoosterStepsParamsSchema.shape,
    async (params: BoosterStepsParams) => {
      try {
        // Validar se o serviço foi inicializado
        if (!boosterStepsService) {
          throw new Error("Booster_Steps service not initialized");
        }

        // Validar parâmetros obrigatórios
        if (!params.title || params.title.trim().length < 3) {
          throw new Error("Task title must be at least 3 characters long");
        }

        if (!params.taskDescription || params.taskDescription.trim().length < 10) {
          throw new Error("Task description must be at least 10 characters long");
        }

        if (!params.projectPath || params.projectPath.trim().length < 1) {
          throw new Error("Project path is required and cannot be empty");
        }

        if (!params.steps || params.steps.length === 0) {
          throw new Error("At least one step must be provided");
        }

        // Processar a tarefa
        const result = await boosterStepsService.processTask(params);

        // Retornar resposta no formato esperado pelo MCP
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }],
          _meta: {
            description: "Ferramenta para decomposição de tarefas em passos menores e gerenciáveis",
            readOnly: false,
            category: "planning",
            descriptionShort: "Decompõe tarefas complexas em passos menores, organizados e priorizados",
            descriptionLong: "Permite que modelos de linguagem decomponham tarefas complexas em uma série de passos menores, mais gerenciáveis e organizados. A ferramenta analisa a descrição da tarefa, identifica o tipo (desenvolvimento, pesquisa, design, teste, deployment), considera a complexidade e gera um plano estruturado com passos sequenciais, dependências, estimativas de tempo, prioridades e recomendações. Opcionalmente salva o plano em arquivo markdown para referência futura. Inclui análise de fatores de risco e sugestões para otimizar a execução.",
            requiresUserAction: params.projectPath ? true : false,
            schemaVersion: config.server.protocolVersion
          }
        };
      } catch (error: any) {
        logger.error("Error in Booster_Steps tool", { error });

        // Criar mensagem de erro simples
        const simpleErrorMessage = error.message || 'An error occurred while processing the task decomposition.';

        // Retornar erro em formato compatível
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: simpleErrorMessage,
              taskTitle: params.taskDescription ? params.taskDescription.substring(0, 50) + '...' : 'Unknown Task',
              totalSteps: 0,
              steps: [],
              summary: `Error processing task: ${simpleErrorMessage}`,
              recommendations: ['Fix the error and try again'],
              riskFactors: ['Task processing failed']
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
 * Abre o changelog do LLMBooster no navegador padrão
 * @param useLogger Se deve usar o logger para exibir mensagens (se false, usa console)
 */
async function openLLMBoosterChangelog(useLogger = true): Promise<void> {
  const url = 'https://llmbooster.com/changelog?update=true';

  // Verificar se o redirecionamento automático está habilitado
  if (!config.api.autoRedirectOnError) {
    const message = `Por favor, visite ${url} para ver as atualizações disponíveis`;

    if (useLogger && logger) {
      logger.warn(message);
    } else {
      console.warn(`\n⚠️  ${message}\n`);
    }
    return;
  }

  try {
    const message = `Redirecionando para ${url} para ver as atualizações disponíveis`;

    if (useLogger && logger) {
      logger.info(message);
    } else {
      console.log(`\n\n📢  ${message}...\n`);
    }

    // Abrir o URL no navegador padrão
    await open(url);
  } catch (error) {
    const errorMessage = `Não foi possível abrir o navegador automaticamente. Por favor, visite ${url} para ver as atualizações disponíveis`;

    if (useLogger && logger) {
      logger.error(errorMessage);
    } else {
      console.error(`\n❌  ${errorMessage}\n`);
    }
  }
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
 * Verifica se a API key é válida e se há novas versões disponíveis fazendo uma chamada para o endpoint de verificação
 * @param useLogger Se deve usar o logger para exibir mensagens (se false, usa console)
 * @returns Promise<VerificationResult> Resultado da verificação com tipo de erro específico
 */
async function verifyLLMBooster(useLogger = true): Promise<VerificationResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      success: false,
      errorType: VerificationErrorType.API_KEY,
      message: 'API key não configurada'
    };
  }

  try {
    // Preparar cabeçalhos com a API key e Content-Type
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Preparar o body com a versão atual do servidor
    const body = JSON.stringify({
      version: config.server.version
    });

    // Fazer a chamada ao endpoint de verificação
    const response = await fetch('https://api.llmbooster.com', {
      method: 'POST',
      headers,
      body
    });

    // Analisar resposta baseada no código de status
    if (response.ok) {
      // Sucesso
      return {
        success: true,
        errorType: VerificationErrorType.NONE,
        statusCode: response.status
      };
    } else if (response.status === 401 || response.status === 403) {
      // Erro de API key inválida
      return {
        success: false,
        errorType: VerificationErrorType.API_KEY,
        statusCode: response.status,
        message: 'API key inválida ou sem permissões'
      };
    } else if (response.status === 426) {
      // Versão desatualizada (Upgrade Required)
      return {
        success: false,
        errorType: VerificationErrorType.VERSION,
        statusCode: response.status,
        message: 'Versão do servidor desatualizada'
      };
    } else {
      // Outro tipo de erro
      return {
        success: false,
        errorType: VerificationErrorType.UNKNOWN,
        statusCode: response.status,
        message: `Erro HTTP ${response.status}`
      };
    }
  } catch (error) {
    // Em caso de erro na chamada (problema de rede, etc.)
    if (useLogger && logger) {
      logger.error('Erro ao verificar LLMBooster', { error });
    } else {
      console.error('Erro ao verificar LLMBooster:', error);
    }

    return {
      success: false,
      errorType: VerificationErrorType.NETWORK,
      message: 'Erro de rede ou conexão'
    };
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
      const verificationResult = await verifyLLMBooster();

      if (verificationResult.success) {
        logger.info("API Key verificada com sucesso!");
      } else {
        // Tratar diferentes tipos de erro
        switch (verificationResult.errorType) {
          case VerificationErrorType.API_KEY:
            logger.error(`Erro de API key: ${verificationResult.message}. As chamadas à API podem falhar.`);
            await openLLMBoosterWebsite('resolver problemas com sua API key atual', true);
            break;

          case VerificationErrorType.VERSION:
            logger.warn(`Nova versão disponível: ${verificationResult.message}. Considere atualizar para a versão mais recente.`);
            await openLLMBoosterChangelog(true);
            break;

          case VerificationErrorType.NETWORK:
            logger.error(`Erro de rede: ${verificationResult.message}. Verifique sua conexão com a internet.`);
            break;

          default:
            logger.error(`Erro na verificação: ${verificationResult.message}. As chamadas à API podem falhar.`);
            await openLLMBoosterWebsite('resolver problemas com o serviço', true);
            break;
        }
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