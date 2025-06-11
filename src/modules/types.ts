/**
 * Tipos para o serviço CoConuT_Storage
 * Apenas tipos essenciais para operações de armazenamento de conclusões
 */

import { z } from 'zod';

/**
 * Informações sobre um arquivo salvo
 */
export interface SavedFileInfo {
    filePath: string;
    type: string;
    timestamp: number;
}

/**
 * Informações sobre um pensamento
 */
export interface ThoughtEntry {
    thought: string;
    thoughtNumber: number;
    branchId: string;
    timestamp: number;
    score?: number;
    metadata?: Record<string, any>;
}

/**
 * Configurações para o CoConuT
 */
export interface CoConuTConfig {
    persistenceEnabled: boolean;
    projectPath?: string;
    reflectionInterval: number;
    cycleDetectionThreshold: number;
    similarityAlgorithm: string;
    maxBranches: number;
    maxHistorySize: number;
    autoAnalyze: boolean;
}

/**
 * Configurações padrão
 */
export const DEFAULT_CONFIG: CoConuTConfig = {
    persistenceEnabled: true,
    projectPath: undefined,
    reflectionInterval: 5,
    cycleDetectionThreshold: 0.8,
    similarityAlgorithm: 'levenshtein',
    maxBranches: 10,
    maxHistorySize: 100,
    autoAnalyze: true
};

/**
 * Parâmetros para a ferramenta CoConuT
 */
export interface CoConuTParams {
    thought: string;
    thoughtNumber: number;
    totalThoughts: number;
    nextThoughtNeeded: boolean;

    // Parâmetros opcionais
    isRevision?: boolean;
    revisesThought?: number;
    branchFromThought?: number;
    branchId?: string;
    needsMoreThoughts?: boolean;
    score: number;
    inputType?: string;
    problemStatus: string;
    options?: string[];
    numberArray?: number[];
    Call_Booster_Analyser: boolean;
    Call_Booster_Steps: boolean;
}

/**
 * Resposta da ferramenta CoConuT
 */
export interface CoConuTResponse {
    thoughtNumber: number;
    totalThoughts: number;
    nextThoughtNeeded: boolean;

    // Recomendação para usar Booster_Steps (opcional)
    stepsRecommended?: boolean;

    // Análise (opcional)
    analysis?: {
        isOnRightTrack: boolean;
        needsMoreUserInfo: boolean;
        suggestedTotalThoughts: number;
        userInfoNeeded?: string[];
        suggestions?: string[];
    };

    // Erros (opcional)
    error?: string;
}

/**
 * Esquema Zod para validação de parâmetros do CoConuT
 */
export const CoConuTParamsSchema = z.object({
    thought: z.string().describe("The current thought text in the reasoning process"),
    thoughtNumber: z.number().positive().describe("Sequential number of this thought in the chain"),
    totalThoughts: z.number().min(3).describe("Total estimated number of thoughts to solve the problem (minimum of 3 required)"),
    nextThoughtNeeded: z.boolean().describe("Indicates if a next thought is needed (true) or if the chain is complete (false)"),
    isRevision: z.boolean().optional().describe("Indicates if this thought revises a previous thought"),
    revisesThought: z.number().positive().optional().describe("Number of the thought being revised"),
    branchFromThought: z.number().positive().optional().describe("Number of the thought from which this branch starts"),
    branchId: z.string().optional().describe("Unique identifier of the current branch"),
    needsMoreThoughts: z.boolean().optional().describe("Indicates if the problem needs more thoughts than initially estimated"),
    score: z.number().min(0).max(10).describe("Score or confidence associated with this thought (0-10)"),
    inputType: z.string().optional().describe("Type of input expected from the user"),
    problemStatus: z.string().describe("Description of the current status of problem solving"),
    options: z.array(z.string()).optional().describe("List of options for the user to choose from"),
    numberArray: z.array(z.number()).optional().describe("Array of numbers provided as input"),
    Call_Booster_Analyser: z.boolean().describe("Indicates if the Booster_Analyser should be called"),
    Call_Booster_Steps: z.boolean().describe("Indicates if the Booster_Steps should be called")
});

/**
 * Enumeração de tipos de entrada
 */
export enum InputType {
    TEXT = 'text',
    NUMBER_ARRAY = 'number_array',
    OPTIONS = 'options',
    BOOLEAN = 'boolean'
}

/**
 * Parâmetros para a ferramenta CoConuT_Storage
 */
export interface CoConuTStorageParams {
    projectPath: string;    // Caminho para o projeto onde os arquivos serão salvos
    WhyChange: string;      // Motivo da modificação (por que foi necessário) 
    WhatChange: string;     // Descrição da modificação (o que foi modificado)

    // Parâmetros opcionais de categorização
    category?: string;                    // Categoria principal 
    subCategories?: string[];             // Subcategorias para classificação mais específica
    tags?: string[];                      // Tags para busca e classificação
    impactLevel?: string;                 // Nível de impacto da alteração: "low", "medium", "high"

    // Parâmetros opcionais de contexto
    affectedFiles?: string[];                // Arquivos afetados pela alteração
    codeSnippets?: Array<{                   // Snippets de código com antes/depois
        before: string,
        after: string,
        file: string
    }>;
    relatedConclusions?: string[];           // IDs de conclusões relacionadas
    ticketReference?: string;                // Referência a um ticket/issue
    businessContext?: string;                // Contexto de negócio
    technicalContext?: string;               // Contexto técnico adicional
    alternativesConsidered?: string[];       // Alternativas consideradas e rejeitadas
    testingPerformed?: string;               // Descrição de testes realizados
}

/**
 * Esquema Zod para validação de parâmetros do CoConuT_Storage
 */
export const CoConuTStorageParamsSchema = z.object({
    projectPath: z.string().describe("Absolute path to the project directory where files will be saved. This path will be used to create the necessary directory structure for storing thought chains, conclusions, and interaction history."),
    WhyChange: z.string().describe("Explains why the change was necessary or what motivated the action. This text will be included in the conclusion file and helps provide context for future reference."),
    WhatChange: z.string().describe("Describes what was modified or implemented in this action. This text will be included in the conclusion file and provides a clear summary of the changes made."),

    // Categorização
    category: z.string().optional().describe("Main category of the change according to conventional commit types. Each category has its own emoji."),
    subCategories: z.array(z.string()).optional().describe("Subcategories for more specific classification (UI, performance, security, etc.)."),
    tags: z.array(z.string()).optional().describe("Tags for improved search and classification of changes."),
    impactLevel: z.enum(["low", "medium", "high"]).optional().describe("Level of impact this change has on the system."),

    // Contexto
    affectedFiles: z.array(z.string()).optional().describe("List of files affected by this change for better context."),
    codeSnippets: z.array(z.object({
        before: z.string(),
        after: z.string(),
        file: z.string()
    })).optional().describe("Relevant code snippets showing the changes made."),
    relatedConclusions: z.array(z.string()).optional().describe("IDs of related conclusions to establish connections between changes."),
    ticketReference: z.string().optional().describe("Reference to a ticket/issue in a tracking system (JIRA, GitHub Issues)."),
    businessContext: z.string().optional().describe("Business context explaining the value or strategic motivation for the change."),
    technicalContext: z.string().optional().describe("Additional technical context about the architecture or components affected."),
    alternativesConsidered: z.array(z.string()).optional().describe("Alternatives that were considered and reasons they were rejected."),
    testingPerformed: z.string().optional().describe("Description of tests performed to validate the change.")
});

/**
 * Enumeração de tipos de eventos
 */
export enum EventType {
    THOUGHT_ADDED = 'thought_added',
    THOUGHT_REVISED = 'thought_revised',
    CYCLE_DETECTED = 'cycle_detected',
    ANALYSIS_PERFORMED = 'analysis_performed',
    BRANCH_CREATED = 'branch_created',
    BRANCH_SWITCHED = 'branch_switched'
}

/**
 * Interface para dados de evento
 */
export interface EventData {
    type: EventType;
    timestamp: number;
    data: any;
}

/**
 * Interface para listeners de eventos
 */
export interface EventListener {
    handleEvent(event: EventData): void;
}

/**
 * Interface para respostas de erro estruturadas
 * 
 * Permite fornecer informações detalhadas sobre erros para melhor processamento pela LLM
 */
export interface ErrorResponse {
    code: string;            // Código do erro (ex: "VALIDATION_ERROR", "EXECUTION_ERROR")
    message: string;         // Mensagem principal do erro
    details?: string;        // Detalhes técnicos adicionais 
    suggestions?: string[];  // Sugestões para resolver o problema
    context?: {              // Contexto em que o erro ocorreu
        paramName?: string;    // Nome do parâmetro com problema
        methodName?: string;   // Nome do método com problema
        input?: any;           // Entrada que causou o erro (redatada se necessário)
    };
}

/**
 * Códigos de erro comuns para padronização
 */
export enum ErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    EXECUTION_ERROR = 'EXECUTION_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
    METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
    INVALID_INPUT = 'INVALID_INPUT',
    INVALID_STATE = 'INVALID_STATE',
    INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Parâmetros para a ferramenta Booster_Steps
 */
export interface BoosterStepsParams {
    title: string;                 // Título da tarefa para nome do arquivo
    taskDescription: string;        // Descrição geral da tarefa/projeto
    projectPath: string;           // Caminho do projeto para salvar os cards (OBRIGATÓRIO)
    steps: TaskStep[];             // Array de steps detalhados fornecidos pelo modelo
}

/**
 * Estrutura de um passo individual (Card Template) - Otimizado para processamento por AIs
 */
export interface TaskStep {
    // === IDENTIFICAÇÃO E BÁSICOS ===
    id: string;                    // ID único do card (ex: "TASK-001")
    title: string;                 // Título técnico da tarefa

    // === INFORMAÇÕES PARA AI ===
    // Contexto técnico e objetivo
    technicalContext: string;      // Contexto técnico detalhado para o AI entender o problema
    implementationGoal: string;    // Objetivo específico de implementação

    // Especificações técnicas
    targetFiles: string[];         // Arquivos que devem ser modificados/criados
    referencePaths: string[];      // Caminhos de arquivos/diretórios para referência
    codePatterns: string[];        // Padrões de código específicos a seguir
    technicalRequirements: string[]; // Requisitos técnicos específicos

    // Comandos e ações
    shellCommands: string[];       // Comandos de terminal necessários
    installationSteps: string[];   // Passos de instalação/configuração
    verificationSteps: string[];   // Como verificar se foi implementado corretamente

    // Dependências técnicas
    codeDependencies: string[];    // Dependências de código/bibliotecas
    serviceDependencies: string[]; // Dependências de serviços/APIs

    // === INFORMAÇÕES EDITÁVEIS PELO USUÁRIO ===
    userNotes?: string;            // IMPORTANTE: Notas completas do usuário - incluindo instruções especiais, contexto do projeto, preferências de implementação, avisos, justificativas de negócio e qualquer informação relevante do usuário

    // === INFORMAÇÕES EDITÁVEIS PELA AI ===
    aiNotes?: string;              // Notas específicas da AI para esta tarefa

    // === METADADOS TÉCNICOS ===
    complexity: 'low' | 'medium' | 'high' | 'expert'; // Complexidade técnica
    estimatedLines?: number;       // Linhas de código estimadas
    testingStrategy?: string;      // Estratégia de testes recomendada
    rollbackPlan?: string;         // Plano de rollback se necessário

    // === CAMPOS OPCIONAIS PARA CONTEXTO ADICIONAL ===
    relatedIssues?: string[];      // Issues relacionadas
    apiEndpoints?: string[];       // Endpoints de API envolvidos
    databaseChanges?: string[];    // Mudanças no banco de dados
    environmentVars?: string[];    // Variáveis de ambiente necessárias
    securityConsiderations?: string[]; // Considerações de segurança
    performanceConsiderations?: string[]; // Considerações de performance
    accessibilityNotes?: string[]; // Notas sobre acessibilidade
    monitoringAndLogs?: string[];  // Monitoring e logs necessários
}

/**
 * Resposta da ferramenta Booster_Steps
 */
export interface BoosterStepsResponse {
    taskTitle: string;             // Título da tarefa original
    totalSteps: number;            // Número total de passos
    steps: TaskStep[];             // Lista de passos
    summary: string;               // Resumo do plano
    recommendations?: string[];    // Recomendações adicionais
    riskFactors?: string[];        // Fatores de risco identificados
    savedFilePath?: string;        // Caminho do arquivo salvo (se aplicável)
}

/**
 * Esquema Zod para validação de um TaskStep - Otimizado para AIs
 */
export const TaskStepSchema = z.object({
    // === IDENTIFICAÇÃO E BÁSICOS ===
    id: z.string().describe("Unique ID for the card (e.g., 'TASK-001')"),
    title: z.string().describe("Technical title of the task"),

    // === INFORMAÇÕES PARA AI (OBRIGATÓRIAS) ===
    technicalContext: z.string().describe("Detailed technical context for AI to understand the problem"),
    implementationGoal: z.string().describe("Specific implementation objective"),

    // Especificações técnicas
    targetFiles: z.array(z.string()).describe("Files that should be modified/created"),
    referencePaths: z.array(z.string()).describe("Paths to files/directories for reference"),
    codePatterns: z.array(z.string()).describe("Specific code patterns to follow"),
    technicalRequirements: z.array(z.string()).describe("Specific technical requirements"),

    // Comandos e ações
    shellCommands: z.array(z.string()).describe("Required terminal commands"),
    installationSteps: z.array(z.string()).describe("Installation/configuration steps"),
    verificationSteps: z.array(z.string()).describe("How to verify correct implementation"),

    // Dependências técnicas
    codeDependencies: z.array(z.string()).describe("Code/library dependencies"),
    serviceDependencies: z.array(z.string()).describe("Service/API dependencies"),

    // === METADADOS TÉCNICOS (OBRIGATÓRIOS) ===
    complexity: z.enum(['low', 'medium', 'high', 'expert']).describe("Technical complexity level"),

    // === INFORMAÇÕES EDITÁVEIS PELO USUÁRIO (OPCIONAIS) ===
    userNotes: z.string().optional().describe("IMPORTANT: Complete user notes including special instructions, project context, implementation preferences, warnings, business rationale and any relevant user information"),

    // === INFORMAÇÕES EDITÁVEIS PELA AI (OPCIONAIS) ===
    aiNotes: z.string().optional().describe("AI specific notes for this task"),

    // === METADADOS TÉCNICOS OPCIONAIS ===
    estimatedLines: z.number().optional().describe("Estimated lines of code"),
    testingStrategy: z.string().optional().describe("Recommended testing strategy"),
    rollbackPlan: z.string().optional().describe("Rollback plan if needed"),

    // === CAMPOS OPCIONAIS PARA CONTEXTO ADICIONAL ===
    relatedIssues: z.array(z.string()).optional().describe("Related issues"),
    apiEndpoints: z.array(z.string()).optional().describe("API endpoints involved"),
    databaseChanges: z.array(z.string()).optional().describe("Database changes"),
    environmentVars: z.array(z.string()).optional().describe("Required environment variables"),
    securityConsiderations: z.array(z.string()).optional().describe("Security considerations"),
    performanceConsiderations: z.array(z.string()).optional().describe("Performance considerations"),
    accessibilityNotes: z.array(z.string()).optional().describe("Accessibility notes"),
    monitoringAndLogs: z.array(z.string()).optional().describe("Required monitoring and logs")
});

/**
 * Esquema Zod para validação de parâmetros do Booster_Steps
 */
export const BoosterStepsParamsSchema = z.object({
    title: z.string().min(3).max(100).describe("Title of the task for the filename. Should be descriptive and filesystem-safe."),
    taskDescription: z.string().min(10).describe("General description of the task/project that will be broken down into detailed cards."),
    projectPath: z.string().min(1).describe("Path to the project directory where the step cards will be saved. This parameter is required."),
    steps: z.array(TaskStepSchema).min(1).describe("Array of detailed step cards provided by the model. Each step should follow the card template structure.")
}); 