/**
 * Booster_Steps - Ferramenta para formatação de steps de tarefas usando template de card
 */

import { Logger } from './logger';
import {
    BoosterStepsParams,
    BoosterStepsResponse,
    TaskStep,
    SavedFileInfo
} from './types';
import * as fs from 'fs';
import * as path from 'path';
import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import open from 'open';

/**
 * Servidor web para edição interativa de steps
 */
class WebEditorServer {
    private app: Express;
    private server: Server | null = null;
    private readonly port = 5555;
    private logger: Logger;
    private steps: TaskStep[];
    private originalParams: BoosterStepsParams;
    private resolve: ((value: TaskStep[]) => void) | null = null;
    private closeTimer: NodeJS.Timeout | null = null;

    constructor(steps: TaskStep[], params: BoosterStepsParams) {
        this.app = express();
        this.logger = Logger.getInstance();
        this.steps = [...steps]; // Clone para evitar mutação
        this.originalParams = params;
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    }

    private setupRoutes(): void {
        // Rota principal - interface de edição
        this.app.get('/', (req: Request, res: Response) => {
            const html = this.generateEditHTML();
            res.send(html);
        });

        // Rota para processar atualizações
        this.app.post('/update', (req: Request, res: Response) => {
            try {
                this.logger.debug('Received update request', {
                    bodyExists: !!req.body,
                    stepsExists: !!(req.body && req.body.steps),
                    contentType: req.headers['content-type']
                });

                if (!req.body) {
                    throw new Error('Request body is empty - check Content-Type header');
                }

                const updatedSteps = this.processUpdates(req.body);
                this.steps = updatedSteps;

                // Agendar fechamento automático do servidor em 5 segundos
                this.scheduleServerClose(5000);

                const confirmationHtml = this.generateConfirmationHTML();
                res.send(confirmationHtml);
            } catch (error: any) {
                this.logger.error('Error processing updates', {
                    error: error.message,
                    body: req.body,
                    headers: req.headers
                });
                res.status(400).json({ error: error.message });
            }
        });

        // Rota para fechar servidor manualmente (simplificada)
        this.app.get('/close', (req: Request, res: Response) => {
            res.json({ message: 'Server closing...' });

            // Fechar servidor imediatamente
            setTimeout(() => {
                this.stopServer();
                if (this.resolve) {
                    this.resolve(this.steps);
                }
            }, 500);
        });
    }

    async startServer(): Promise<TaskStep[]> {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;

            this.server = this.app.listen(this.port, () => {
                this.logger.info(`Web editor server started on port ${this.port}`);
                this.openBrowser();
            });

            this.server.on('error', (error: any) => {
                this.logger.error('Server error', { error });
                reject(error);
            });
        });
    }

    private async openBrowser(): Promise<void> {
        try {
            await open(`http://localhost:${this.port}`);
            this.logger.info('Browser opened automatically');
        } catch (error: any) {
            this.logger.warn('Failed to open browser automatically', { error });
            this.logger.info(`Please open your browser and navigate to: http://localhost:${this.port}`);
        }
    }

    private scheduleServerClose(delayMs: number): void {
        // Limpar timer anterior se existir
        if (this.closeTimer) {
            clearTimeout(this.closeTimer);
        }

        this.logger.info(`Server close scheduled in ${delayMs}ms`);

        this.closeTimer = setTimeout(() => {
            this.logger.info('Auto-closing server after scheduled delay');
            this.stopServer();
            if (this.resolve) {
                this.resolve(this.steps);
            }
        }, delayMs);
    }

    private stopServer(): void {
        // Limpar timer se existir
        if (this.closeTimer) {
            clearTimeout(this.closeTimer);
            this.closeTimer = null;
        }

        if (this.server) {
            this.server.close(() => {
                this.logger.info('Web editor server stopped');
            });
            this.server = null;
        }
    }

    private processUpdates(body: any): TaskStep[] {
        if (!body.steps || !Array.isArray(body.steps)) {
            throw new Error('Invalid steps data received');
        }

        // Validar e processar cada step
        const updatedSteps: TaskStep[] = body.steps.map((stepData: any, index: number) => {
            // Validação básica dos campos obrigatórios para AI
            if (!stepData.id || !stepData.title || !stepData.technicalContext || !stepData.implementationGoal) {
                throw new Error(`Step ${index + 1}: Missing required fields (id, title, technicalContext, implementationGoal)`);
            }

            if (!stepData.complexity) {
                throw new Error(`Step ${index + 1}: Complexity is required`);
            }

            if (!stepData.targetFiles || !Array.isArray(stepData.targetFiles) || stepData.targetFiles.length === 0) {
                throw new Error(`Step ${index + 1}: Target files are required`);
            }

            if (!stepData.technicalRequirements || !Array.isArray(stepData.technicalRequirements) || stepData.technicalRequirements.length === 0) {
                throw new Error(`Step ${index + 1}: Technical requirements are required`);
            }

            if (!stepData.verificationSteps || !Array.isArray(stepData.verificationSteps) || stepData.verificationSteps.length === 0) {
                throw new Error(`Step ${index + 1}: Verification steps are required`);
            }

            // Construir step atualizado com nova estrutura AI-focada
            const updatedStep: TaskStep = {
                id: stepData.id.trim(),
                title: stepData.title.trim(),
                technicalContext: stepData.technicalContext.trim(),
                implementationGoal: stepData.implementationGoal.trim(),
                complexity: stepData.complexity,

                // Arrays obrigatórios
                targetFiles: stepData.targetFiles?.filter((file: string) => file.trim()) || [],
                referencePaths: stepData.referencePaths?.filter((path: string) => path.trim()) || [],
                codePatterns: stepData.codePatterns?.filter((pattern: string) => pattern.trim()) || [],
                technicalRequirements: stepData.technicalRequirements?.filter((req: string) => req.trim()) || [],
                shellCommands: stepData.shellCommands?.filter((cmd: string) => cmd.trim()) || [],
                installationSteps: stepData.installationSteps?.filter((step: string) => step.trim()) || [],
                verificationSteps: stepData.verificationSteps?.filter((step: string) => step.trim()) || [],
                codeDependencies: stepData.codeDependencies?.filter((dep: string) => dep.trim()) || [],
                serviceDependencies: stepData.serviceDependencies?.filter((dep: string) => dep.trim()) || [],

                // Campos editáveis pelo usuário (consolidado)
                userNotes: stepData.userNotes?.trim(),

                // Campos editáveis pela AI
                aiNotes: stepData.aiNotes?.trim(),

                // Metadados técnicos
                estimatedLines: stepData.estimatedLines ? parseInt(stepData.estimatedLines) : undefined,
                testingStrategy: stepData.testingStrategy?.trim(),
                rollbackPlan: stepData.rollbackPlan?.trim(),

                // Contexto adicional
                relatedIssues: stepData.relatedIssues?.filter((issue: string) => issue.trim()) || [],
                apiEndpoints: stepData.apiEndpoints?.filter((endpoint: string) => endpoint.trim()) || [],
                databaseChanges: stepData.databaseChanges?.filter((change: string) => change.trim()) || [],
                environmentVars: stepData.environmentVars?.filter((env: string) => env.trim()) || [],
                securityConsiderations: stepData.securityConsiderations?.filter((sec: string) => sec.trim()) || [],
                performanceConsiderations: stepData.performanceConsiderations?.filter((perf: string) => perf.trim()) || [],
                accessibilityNotes: stepData.accessibilityNotes?.filter((acc: string) => acc.trim()) || [],
                monitoringAndLogs: stepData.monitoringAndLogs?.filter((log: string) => log.trim()) || []
            };

            return updatedStep;
        });

        this.logger.info('Steps updated successfully', { totalSteps: updatedSteps.length });
        return updatedSteps;
    }

    private generateEditHTML(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 LLM Booster - Steps Editor - ${this.originalParams.title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Geist+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --background: #0B192B;
            --surface: #1F2A3D;
            --text-primary: #E0E6ED;
            --text-secondary: #8FA6BC;
            --accent-primary: #3A8FB7;
            --accent-secondary:rgb(215, 145, 75);
            --destructive: #dc3545;
            --border: rgba(255, 255, 255, 0.1);
            --success: #28a745;
        }
        
        body {
            font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, var(--background) 0%, #0a1521 100%);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: var(--surface);
            border-radius: 12px;
            overflow: hidden;
            margin-top: 20px;
            margin-bottom: 20px;
            border: 1px solid var(--border);
        }
        .header {
            background: var(--surface);
            color: var(--text-primary);
            padding: 32px;
            text-align: center;
            border-bottom: 1px solid var(--border);
        }
        .header h1 {
            margin: 0;
            font-size: 2rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .header p {
            margin: 12px 0 0 0;
            font-size: 1rem;
            font-weight: 400;
            color: var(--text-secondary);
        }
        .header-controls {
            margin-top: 16px;
            display: flex;
            gap: 8px;
            justify-content: center;
        }
        .control-btn {
            background: var(--background);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 400;
            transition: all 0.2s ease;
        }
        .control-btn:hover {
            color: var(--text-primary);
            border-color: var(--accent-primary);
        }
        .content {
            padding: 40px;
            background: var(--background);
        }
        .steps-info {
            background: var(--background);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 24px;
            text-align: center;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        .steps-info strong {
            color: var(--text-primary);
        }
        .step-card {
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 12px;
            background: var(--surface);
            overflow: hidden;
            transition: all 0.3s ease;
        }
        .step-card:hover {
            border-color: var(--text-secondary);
        }
        .step-header {
            background: var(--background);
            color: var(--text-primary);
            padding: 16px 20px;
            font-weight: 500;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
        }
        .step-card.expanded .step-header {
            border-bottom: 1px solid var(--border);
        }
        .step-header:hover {
            background: var(--surface);
        }
        .step-header h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .step-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        .step-arrow {
            font-size: 1rem;
            transition: transform 0.2s ease;
            color: var(--text-secondary);
        }
        .step-card.expanded .step-arrow {
            transform: rotate(180deg);
        }
        .step-body {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            background: var(--surface);
        }
        .step-card.expanded .step-body {
            max-height: none;
            padding: 24px;
        }
        .form-group {
            margin-bottom: 24px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .form-group input, .form-group textarea, .form-group select {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 0.9rem;
            box-sizing: border-box;
            background: var(--background);
            color: var(--text-primary);
            transition: all 0.2s ease;
            font-family: 'Geist Sans', sans-serif;
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
            outline: none;
            border-color: var(--accent-primary);
        }
        .form-group textarea {
            resize: vertical;
            min-height: 120px;
            line-height: 1.6;
        }
        .array-field {
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 16px;
            background: var(--background);
            margin-top: 8px;
        }
        .array-field h4 {
            margin: 0 0 12px 0;
            color: var(--text-primary);
            font-size: 0.85rem;
            font-weight: 500;
        }
        .array-item {
            display: flex;
            margin-bottom: 12px;
            align-items: center;
            gap: 12px;
        }
        .array-item input {
            flex: 1;
        }
        .array-item button {
            background: var(--destructive);
            color: var(--text-primary);
            border: none;
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        .array-item button:hover {
            background: #c82333;
        }
        .add-button {
            background: var(--accent-primary);
            color: var(--text-primary);
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 400;
            margin-top: 12px;
            transition: all 0.2s ease;
        }
        .add-button:hover {
            background: var(--accent-secondary);
        }
        .submit-button {
            background: var(--accent-primary);
            color: var(--text-primary);
            border: none;
            padding: 16px 32px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            width: 100%;
            margin-top: 32px;
            transition: all 0.2s ease;
        }
        .submit-button:hover {
            background: var(--accent-secondary);
        }
        .row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }
        @media (max-width: 768px) {
            .row {
                grid-template-columns: 1fr;
            }
        }
        .col {
            flex: 1;
        }
        .required {
            color: var(--accent-secondary);
            font-weight: 600;
        }
        .optional-section {
            background: var(--background);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 16px;
            margin-top: 16px;
        }
        .optional-section h3 {
            margin: 0 0 16px 0;
            color: var(--text-primary);
            font-size: 1rem;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 LLM Booster - Steps Editor</h1>
            <p>⚡ AI-structured development for developers - Edit your task breakdown and boost productivity</p>
            <div class="header-controls">
                <button type="button" class="control-btn" onclick="expandAllSteps()">📖 Expand All</button>
                <button type="button" class="control-btn" onclick="collapseAllSteps()">📄 Collapse All</button>
            </div>
        </div>
        <div class="content">
            <div class="steps-info">
                📋 <strong>${this.steps.length} steps</strong> loaded • Click step headers to expand/collapse • All steps are collapsed by default
            </div>
            <form id="stepsForm">
                ${this.steps.map((step, index) => this.generateStepFormHTML(step, index)).join('')}
                <button type="submit" class="submit-button">
                    🚀 Save Changes & Boost Productivity
                </button>
            </form>
        </div>
    </div>

    <script>
        function addArrayItem(containerId, fieldName) {
            const container = document.getElementById(containerId);
            const itemsContainer = container.querySelector('.array-items');
            const newItem = document.createElement('div');
            newItem.className = 'array-item';
            newItem.innerHTML = \`
                <input type="text" name="\${fieldName}" placeholder="Type here...">
                <button type="button" onclick="this.parentElement.remove()">Remove</button>
            \`;
            itemsContainer.appendChild(newItem);
        }

        function toggleStep(index) {
            const stepCard = document.querySelector(\`[data-step-index="\${index}"]\`);
            const isExpanded = stepCard.classList.contains('expanded');
            
            if (isExpanded) {
                stepCard.classList.remove('expanded');
            } else {
                // Opcional: fechar outros steps abertos (uncomment para comportamento de accordion exclusivo)
                // document.querySelectorAll('.step-card.expanded').forEach(card => {
                //     if (card !== stepCard) card.classList.remove('expanded');
                // });
                
                stepCard.classList.add('expanded');
            }
        }

        function expandAllSteps() {
            document.querySelectorAll('.step-card').forEach(card => {
                card.classList.add('expanded');
            });
        }

        function collapseAllSteps() {
            document.querySelectorAll('.step-card').forEach(card => {
                card.classList.remove('expanded');
            });
        }

        document.getElementById('stepsForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const steps = [];
            
            // Processar dados do formulário
            const stepIndices = new Set();
            for (let [key, value] of formData.entries()) {
                const match = key.match(/^step(\\d+)_(.+)$/);
                if (match) {
                    stepIndices.add(parseInt(match[1]));
                }
            }
            
            stepIndices.forEach(index => {
                const step = {
                    id: formData.get(\`step\${index}_id\`) || '',
                    title: formData.get(\`step\${index}_title\`) || '',
                    technicalContext: formData.get(\`step\${index}_technicalContext\`) || '',
                    implementationGoal: formData.get(\`step\${index}_implementationGoal\`) || '',
                    complexity: formData.get(\`step\${index}_complexity\`) || 'medium',
                    
                    // Arrays obrigatórios
                    targetFiles: formData.getAll(\`step\${index}_targetFiles\`).filter(v => v.trim()),
                    referencePaths: formData.getAll(\`step\${index}_referencePaths\`).filter(v => v.trim()),
                    codePatterns: formData.getAll(\`step\${index}_codePatterns\`).filter(v => v.trim()),
                    technicalRequirements: formData.getAll(\`step\${index}_technicalRequirements\`).filter(v => v.trim()),
                    shellCommands: formData.getAll(\`step\${index}_shellCommands\`).filter(v => v.trim()),
                    installationSteps: formData.getAll(\`step\${index}_installationSteps\`).filter(v => v.trim()),
                    verificationSteps: formData.getAll(\`step\${index}_verificationSteps\`).filter(v => v.trim()),
                    codeDependencies: formData.getAll(\`step\${index}_codeDependencies\`).filter(v => v.trim()),
                    serviceDependencies: formData.getAll(\`step\${index}_serviceDependencies\`).filter(v => v.trim()),

                    // Campos editáveis pelo usuário
                    userNotes: formData.get(\`step\${index}_userNotes\`) || '',
                    specialInstructions: formData.get(\`step\${index}_specialInstructions\`) || '',
                    projectSpecificContext: formData.get(\`step\${index}_projectSpecificContext\`) || '',
                    implementationPreferences: formData.get(\`step\${index}_implementationPreferences\`) || '',
                    warningsAndCaveats: formData.get(\`step\${index}_warningsAndCaveats\`) || '',
                    businessRationale: formData.get(\`step\${index}_businessRationale\`) || '',

                    // Metadados técnicos
                    estimatedLines: formData.get(\`step\${index}_estimatedLines\`) ? parseInt(formData.get(\`step\${index}_estimatedLines\`)) : undefined,
                    testingStrategy: formData.get(\`step\${index}_testingStrategy\`) || '',
                    rollbackPlan: formData.get(\`step\${index}_rollbackPlan\`) || '',

                    // Contexto adicional
                    relatedIssues: formData.getAll(\`step\${index}_relatedIssues\`).filter(v => v.trim()),
                    apiEndpoints: formData.getAll(\`step\${index}_apiEndpoints\`).filter(v => v.trim()),
                    databaseChanges: formData.getAll(\`step\${index}_databaseChanges\`).filter(v => v.trim()),
                    environmentVars: formData.getAll(\`step\${index}_environmentVars\`).filter(v => v.trim()),
                    securityConsiderations: formData.getAll(\`step\${index}_securityConsiderations\`).filter(v => v.trim()),
                    performanceConsiderations: formData.getAll(\`step\${index}_performanceConsiderations\`).filter(v => v.trim()),
                    accessibilityNotes: formData.getAll(\`step\${index}_accessibilityNotes\`).filter(v => v.trim()),
                    monitoringAndLogs: formData.getAll(\`step\${index}_monitoringAndLogs\`).filter(v => v.trim())
                };
                steps.push(step);
            });
            
            try {
                const response = await fetch('/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ steps })
                });
                
                if (response.ok) {
                    document.body.innerHTML = await response.text();
                } else {
                    const error = await response.json();
                    alert('Save error: ' + error.error);
                }
            } catch (error) {
                alert('Connection error: ' + error.message);
            }
        });
    </script>
</body>
</html>
        `;
    }

    private generateStepFormHTML(step: TaskStep, index: number): string {
        return `
            <div class="step-card" data-step-index="${index}">
                <div class="step-header" onclick="toggleStep(${index})">
                    <h3>🤖 Step ${index + 1}: ${step.title}</h3>
                    <div class="step-toggle">
                        <span>${step.complexity || 'medium'} complexity</span>
                        <span class="step-arrow">▼</span>
                    </div>
                </div>
                <div class="step-body">
                    <!-- === BASIC IDENTIFICATION === -->
                    <div class="ai-section">
                        <h3>🏷️ Basic Identification</h3>
                        <div class="row">
                            <div class="col">
                                <div class="form-group">
                                    <label>ID <span class="required">*</span></label>
                                    <input type="text" name="step${index}_id" value="${step.id}" required>
                                </div>
                            </div>
                            <div class="col">
                                <div class="form-group">
                                    <label>Complexity <span class="required">*</span></label>
                                    <select name="step${index}_complexity" required>
                                        <option value="low" ${step.complexity === 'low' ? 'selected' : ''}>Low - Simple tasks</option>
                                        <option value="medium" ${step.complexity === 'medium' ? 'selected' : ''}>Medium - Requires knowledge</option>
                                        <option value="high" ${step.complexity === 'high' ? 'selected' : ''}>High - Complex</option>
                                        <option value="expert" ${step.complexity === 'expert' ? 'selected' : ''}>Expert - Very advanced</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Technical Title <span class="required">*</span></label>
                            <input type="text" name="step${index}_title" value="${step.title}" required placeholder="ex: Implement JWT authentication in backend">
                        </div>
                    </div>

                    <!-- === AI INFORMATION === -->
                    <div class="ai-section">
                        <h3>🤖 AI Information</h3>
                        
                        <div class="form-group">
                            <label>Technical Context <span class="required">*</span></label>
                            <textarea name="step${index}_technicalContext" required placeholder="Describe the detailed technical context...">${step.technicalContext || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Implementation Goal <span class="required">*</span></label>
                            <textarea name="step${index}_implementationGoal" required placeholder="Specific implementation objective...">${step.implementationGoal || ''}</textarea>
                        </div>

                        ${this.generateArrayFieldHTML(`step${index}_targetFiles`, 'Target Files', step.targetFiles || [], true)}
                        ${this.generateArrayFieldHTML(`step${index}_referencePaths`, 'Reference Paths', step.referencePaths || [])}
                        ${this.generateArrayFieldHTML(`step${index}_codePatterns`, 'Code Patterns', step.codePatterns || [])}
                        ${this.generateArrayFieldHTML(`step${index}_technicalRequirements`, 'Technical Requirements', step.technicalRequirements || [], true)}
                        ${this.generateArrayFieldHTML(`step${index}_shellCommands`, 'Terminal Commands', step.shellCommands || [])}
                        ${this.generateArrayFieldHTML(`step${index}_installationSteps`, 'Installation Steps', step.installationSteps || [])}
                        ${this.generateArrayFieldHTML(`step${index}_verificationSteps`, 'Verification Steps', step.verificationSteps || [], true)}
                        ${this.generateArrayFieldHTML(`step${index}_codeDependencies`, 'Code Dependencies', step.codeDependencies || [])}
                        ${this.generateArrayFieldHTML(`step${index}_serviceDependencies`, 'Service Dependencies', step.serviceDependencies || [])}
                    </div>

                    <!-- === AI-EDITABLE INFORMATION === -->
                    <div class="ai-section">
                        <h3>🤖 AI Information</h3>
                        
                        <div class="form-group">
                            <label>AI Notes</label>
                            <textarea name="step${index}_aiNotes" placeholder="AI specific notes for this task...">${step.aiNotes || ''}</textarea>
                        </div>
                    </div>

                    <!-- === USER-EDITABLE INFORMATION === -->
                    <div class="user-section">
                        <h3>👤 User Information</h3>
                        
                        <div class="form-group">
                            <label><strong>⚠️ IMPORTANT: User Notes</strong></label>
                            <textarea name="step${index}_userNotes" placeholder="CONSOLIDATED USER NOTES: Include all your instructions, project context, implementation preferences, warnings, business rationale and any other relevant information for this task. This is the ONLY field for user input - make it comprehensive!" rows="8">${step.userNotes || ''}</textarea>
                            <small style="color: var(--text-secondary); margin-top: 4px; display: block;">
                                💡 This field consolidates all user input. Include: special instructions for AI, project-specific context, implementation preferences, warnings/caveats, business rationale, and any other relevant information.
                            </small>
                        </div>
                    </div>

                    <!-- === TECHNICAL METADATA === -->
                    <div class="technical-section">
                        <h3>⚙️ Technical Metadata</h3>
                        
                        <div class="row">
                            <div class="col">
                                <div class="form-group">
                                    <label>Estimated Lines of Code</label>
                                    <input type="number" name="step${index}_estimatedLines" value="${step.estimatedLines || ''}" placeholder="ex: 50">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Testing Strategy</label>
                            <textarea name="step${index}_testingStrategy" placeholder="How to test this implementation...">${step.testingStrategy || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Rollback Plan</label>
                            <textarea name="step${index}_rollbackPlan" placeholder="How to revert if needed...">${step.rollbackPlan || ''}</textarea>
                        </div>
                    </div>

                    <!-- === ADDITIONAL CONTEXT === -->
                    <div class="optional-section">
                        <h3>📋 Additional Context</h3>
                        ${this.generateArrayFieldHTML(`step${index}_relatedIssues`, 'Related Issues', step.relatedIssues || [])}
                        ${this.generateArrayFieldHTML(`step${index}_apiEndpoints`, 'API Endpoints', step.apiEndpoints || [])}
                        ${this.generateArrayFieldHTML(`step${index}_databaseChanges`, 'Database Changes', step.databaseChanges || [])}
                        ${this.generateArrayFieldHTML(`step${index}_environmentVars`, 'Environment Variables', step.environmentVars || [])}
                        ${this.generateArrayFieldHTML(`step${index}_securityConsiderations`, 'Security Considerations', step.securityConsiderations || [])}
                        ${this.generateArrayFieldHTML(`step${index}_performanceConsiderations`, 'Performance Considerations', step.performanceConsiderations || [])}
                        ${this.generateArrayFieldHTML(`step${index}_accessibilityNotes`, 'Accessibility Notes', step.accessibilityNotes || [])}
                        ${this.generateArrayFieldHTML(`step${index}_monitoringAndLogs`, 'Monitoring and Logs', step.monitoringAndLogs || [])}
                    </div>
                </div>
            </div>
        `;
    }

    private generateArrayFieldHTML(fieldName: string, label: string, items: string[], required: boolean = false): string {
        const containerId = `${fieldName}_container`;
        const requiredSpan = required ? '<span class="required">*</span>' : '';

        return `
            <div class="form-group">
                <div class="array-field" id="${containerId}">
                    <h4>${label} ${requiredSpan}</h4>
                    <div class="array-items">
                        ${items.map(item => `
                            <div class="array-item">
                                <input type="text" name="${fieldName}" value="${item}" placeholder="Type here...">
                                <button type="button" onclick="this.parentElement.remove()">Remove</button>
                            </div>
                        `).join('')}
                        ${items.length === 0 && required ? `
                            <div class="array-item">
                                <input type="text" name="${fieldName}" placeholder="Type here..." required>
                                <button type="button" onclick="this.parentElement.remove()">Remove</button>
                            </div>
                        ` : ''}
                    </div>
                    <button type="button" class="add-button" onclick="addArrayItem('${containerId}', '${fieldName}')">
                        ➕ Add Item
                    </button>
                </div>
            </div>
        `;
    }

    private generateConfirmationHTML(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 LLM Booster - Changes Saved</title>
    <link href="https://fonts.googleapis.com/css2?family=Geist+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --background: #0B192B;
            --surface: #1F2A3D;
            --text-primary: #E0E6ED;
            --text-secondary: #8FA6BC;
            --accent-primary: #3A8FB7;
            --success: #28a745;
            --border: rgba(255, 255, 255, 0.1);
        }
        
        body {
            font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, var(--background) 0%, #0a1521 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            max-width: 480px;
            width: 100%;
        }
        .success-icon {
            font-size: 3rem;
            margin-bottom: 20px;
        }
        h1 {
            color: var(--text-primary);
            margin-bottom: 12px;
            font-weight: 600;
            font-size: 1.5rem;
        }
        .steps-count {
            background: var(--background);
            border: 1px solid var(--border);
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            color: var(--text-primary);
            font-size: 1rem;
        }
        .close-info {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>Changes Saved Successfully</h1>
        <div class="steps-count">
            ${this.steps.length} task cards processed and saved
        </div>
        <div class="close-info">
            You can now close this page
        </div>
    </div>
</body>
</html>
        `;
    }


}

export class BoosterStepsService {
    private logger: Logger;

    constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Processa os steps fornecidos pelo modelo usando interface web para edição
     */
    async processTask(params: BoosterStepsParams): Promise<BoosterStepsResponse> {
        try {
            this.logger.info('Processing task cards with web editor', {
                taskDescription: params.taskDescription.substring(0, 100) + '...',
                totalSteps: params.steps.length
            });

            // Validar os steps fornecidos
            this.validateSteps(params.steps);

            // Iniciar servidor web para edição
            this.logger.info('Starting web editor server for step editing...');
            const webServer = new WebEditorServer(params.steps, params);

            // Aguardar modificações do usuário via interface web
            const editedSteps = await webServer.startServer();

            this.logger.info('Web editor completed, processing final steps', {
                originalSteps: params.steps.length,
                editedSteps: editedSteps.length
            });

            // Validar os steps editados
            this.validateSteps(editedSteps);

            // Gerar resumo
            const summaryParams = { ...params, steps: editedSteps };
            const summary = this.generateSummary(summaryParams);

            // Gerar recomendações
            const recommendations = this.generateRecommendations(editedSteps);

            // Identificar fatores de risco
            const riskFactors = this.identifyRiskFactors(editedSteps);

            // Criar resposta
            const response: BoosterStepsResponse = {
                taskTitle: this.extractTaskTitle(params.taskDescription),
                totalSteps: editedSteps.length,
                steps: editedSteps,
                summary,
                recommendations,
                riskFactors
            };

            // Salvar arquivo (projectPath é obrigatório)
            const savedFilePath = await this.saveStepCards(params.projectPath, params.title, response, params.taskDescription);
            response.savedFilePath = savedFilePath;

            this.logger.info('Task cards processing completed', {
                totalSteps: editedSteps.length,
                savedFilePath
            });

            return response;

        } catch (error: any) {
            this.logger.error('Error processing task cards', { error });
            throw new Error(`Failed to process task: ${error.message}`);
        }
    }

    /**
     * Valida os steps fornecidos pelo modelo
     */
    private validateSteps(steps: TaskStep[]): void {
        if (!steps || steps.length === 0) {
            throw new Error("At least one step must be provided");
        }

        steps.forEach((step, index) => {
            if (!step.id || !step.title || !step.technicalContext || !step.implementationGoal) {
                throw new Error(`Step ${index + 1}: Missing required fields (id, title, technicalContext, implementationGoal)`);
            }

            if (!step.complexity) {
                throw new Error(`Step ${index + 1}: Complexity is required`);
            }

            if (!step.targetFiles || step.targetFiles.length === 0) {
                throw new Error(`Step ${index + 1}: Target files are required`);
            }

            if (!step.technicalRequirements || step.technicalRequirements.length === 0) {
                throw new Error(`Step ${index + 1}: Technical requirements are required`);
            }

            if (!step.verificationSteps || step.verificationSteps.length === 0) {
                throw new Error(`Step ${index + 1}: Verification steps are required`);
            }
        });
    }



    /**
     * Gera um resumo do plano baseado nos steps fornecidos
     */
    private generateSummary(params: BoosterStepsParams): string {
        const taskTitle = this.extractTaskTitle(params.taskDescription);
        const totalSteps = params.steps.length;

        // Analisar complexidades dos steps
        const complexities = [...new Set(params.steps.map(s => s.complexity).filter(Boolean))];
        const targetFilesCount = params.steps.reduce((acc, step) => acc + step.targetFiles.length, 0);

        let summary = `Plano para "${taskTitle}" dividido em ${totalSteps} cards técnicos focados em AI.`;

        if (complexities.length > 0) {
            summary += ` Complexidades: ${complexities.join(', ')}.`;
        }

        summary += ` Total de ${targetFilesCount} arquivos alvo identificados.`;
        summary += ` Cada card contém especificações técnicas detalhadas, comandos, verificações e contexto específico para implementação por AI.`;

        return summary;
    }

    /**
     * Gera recomendações baseadas nos steps focados em AI
     */
    private generateRecommendations(steps: TaskStep[]): string[] {
        const recommendations: string[] = [];

        recommendations.push('Execute os cards seguindo a complexidade técnica definida');
        recommendations.push('Revise os requisitos técnicos antes de iniciar cada implementação');
        recommendations.push('Execute os passos de verificação para validar a implementação');

        // Recomendações baseadas em dependências de código
        const stepsWithCodeDeps = steps.filter(s => s.codeDependencies && s.codeDependencies.length > 0);
        if (stepsWithCodeDeps.length > 0) {
            recommendations.push('Verifique as dependências de código antes de iniciar a implementação');
        }

        // Recomendações baseadas em dependências de serviços
        const stepsWithServiceDeps = steps.filter(s => s.serviceDependencies && s.serviceDependencies.length > 0);
        if (stepsWithServiceDeps.length > 0) {
            recommendations.push('Confirme que os serviços dependentes estão disponíveis');
        }

        // Recomendações baseadas em comandos shell
        const stepsWithCommands = steps.filter(s => s.shellCommands && s.shellCommands.length > 0);
        if (stepsWithCommands.length > 0) {
            recommendations.push('Execute os comandos shell na ordem especificada');
        }

        // Recomendações baseadas em considerações de segurança
        const stepsWithSecurity = steps.filter(s => s.securityConsiderations && s.securityConsiderations.length > 0);
        if (stepsWithSecurity.length > 0) {
            recommendations.push('Revise as considerações de segurança antes da implementação');
        }

        // Recomendações baseadas em instruções especiais do usuário
        const stepsWithInstructions = steps.filter(s => s.userNotes && s.userNotes.trim() !== '');
        if (stepsWithInstructions.length > 0) {
            recommendations.push('Siga as instruções especiais fornecidas pelo usuário');
        }

        return recommendations;
    }

    /**
     * Identifica fatores de risco baseados nos steps focados em AI
     */
    private identifyRiskFactors(steps: TaskStep[]): string[] {
        const risks: string[] = [];

        // Risco por número de steps
        if (steps.length > 10) {
            risks.push('Grande número de cards pode aumentar a complexidade de implementação');
        }

        // Risco por complexidade técnica
        const expertSteps = steps.filter(s => s.complexity === 'expert').length;
        const highComplexitySteps = steps.filter(s => s.complexity === 'high' || s.complexity === 'expert').length;

        if (expertSteps > steps.length * 0.3) {
            risks.push('Muitos steps de complexidade expert podem requerer conhecimento especializado');
        }

        if (highComplexitySteps > steps.length * 0.7) {
            risks.push('Alta proporção de steps complexos pode aumentar o tempo de implementação');
        }

        // Risco por dependências de código
        const totalCodeDeps = steps.reduce((acc, step) =>
            acc + (step.codeDependencies ? step.codeDependencies.length : 0), 0);
        if (totalCodeDeps > steps.length * 2) {
            risks.push('Muitas dependências de código podem causar problemas de compatibilidade');
        }

        // Risco por dependências de serviços
        const totalServiceDeps = steps.reduce((acc, step) =>
            acc + (step.serviceDependencies ? step.serviceDependencies.length : 0), 0);
        if (totalServiceDeps > steps.length) {
            risks.push('Dependências de serviços externos podem causar bloqueios');
        }

        // Risco por comandos shell complexos
        const stepsWithManyCommands = steps.filter(s => s.shellCommands && s.shellCommands.length > 5);
        if (stepsWithManyCommands.length > 0) {
            risks.push('Steps with many shell commands may be prone to errors');
        }

        // Risco por falta de verificação
        const stepsWithoutVerification = steps.filter(s => !s.verificationSteps || s.verificationSteps.length === 0);
        if (stepsWithoutVerification.length > 0) {
            risks.push('Steps sem passos de verificação podem ter problemas não detectados');
        }

        // Risco por avisos do usuário
        const stepsWithWarnings = steps.filter(s => s.userNotes && s.userNotes.includes('warning') || s.userNotes && s.userNotes.includes('cuidado') || s.userNotes && s.userNotes.includes('atenção'));
        if (stepsWithWarnings.length > 0) {
            risks.push('Alguns steps possuem avisos especiais que requerem atenção');
        }

        return risks;
    }

    /**
     * Extrai um título da descrição da tarefa
     */
    private extractTaskTitle(description: string): string {
        // Pegar as primeiras palavras ou até o primeiro ponto
        const firstSentence = description.split('.')[0];
        if (firstSentence.length <= 60) {
            return firstSentence;
        }

        // Se muito longo, pegar as primeiras 60 caracteres
        return description.substring(0, 60) + '...';
    }

    /**
     * Sanitiza o título para criar um nome de arquivo seguro
     */
    private sanitizeFilename(title: string): string {
        // Remover caracteres não permitidos em nomes de arquivo
        let sanitized = title
            .replace(/[<>:"/\\|?*]/g, '') // Caracteres proibidos no Windows
            .replace(/[^\w\s-_().]/g, '') // Manter apenas caracteres alfanuméricos, espaços, hífens, underscore e parênteses
            .replace(/\s+/g, '-') // Substituir espaços por hífens
            .replace(/-+/g, '-') // Múltiplos hífens por um só
            .replace(/^-|-$/g, '') // Remover hífens do início e fim
            .toLowerCase(); // Converter para minúsculas

        // Limitar o tamanho do nome do arquivo
        if (sanitized.length > 50) {
            sanitized = sanitized.substring(0, 50);
        }

        // Se ficar vazio, usar um nome padrão
        if (!sanitized) {
            sanitized = 'task';
        }

        return sanitized;
    }

    /**
     * Salva os cards em arquivos markdown usando o template
     */
    private async saveStepCards(projectPath: string, title: string, response: BoosterStepsResponse, taskDescription: string): Promise<string> {
        try {
            // Criar diretório booster-data se não existir
            const boosterDataDir = path.join(projectPath, 'booster-data');
            if (!fs.existsSync(boosterDataDir)) {
                fs.mkdirSync(boosterDataDir, { recursive: true });
            }

            // Criar diretório tasks se não existir
            const tasksDir = path.join(boosterDataDir, 'tasks');
            if (!fs.existsSync(tasksDir)) {
                fs.mkdirSync(tasksDir, { recursive: true });
            }

            // Contar arquivos existentes para numeração incremental
            const existingFiles = fs.readdirSync(tasksDir).filter(file =>
                file.startsWith('task-') && file.endsWith('.md')
            );
            const nextNumber = existingFiles.length + 1;
            const taskNumber = nextNumber.toString().padStart(3, '0');

            // Sanitizar o título para nome de arquivo seguro
            const sanitizedTitle = this.sanitizeFilename(title);

            // Gerar nome do arquivo no formato task-001_[nome-sugerido]
            const fileName = `task-${taskNumber}_${sanitizedTitle}.md`;
            const filePath = path.join(tasksDir, fileName);

            // Gerar conteúdo do arquivo
            const content = this.generateMarkdownContent(response, title, taskDescription);

            // Salvar arquivo
            fs.writeFileSync(filePath, content, 'utf8');

            this.logger.info('Task cards saved', { filePath, taskNumber });
            return filePath;

        } catch (error: any) {
            this.logger.error('Error saving task cards', { error });
            throw new Error(`Failed to save task cards: ${error.message}`);
        }
    }

    /**
     * Gera conteúdo em markdown usando o template de card
     */
    private generateMarkdownContent(response: BoosterStepsResponse, title: string, taskDescription: string): string {
        let content = `# ${title}\n\n`;
        content += `${taskDescription}\n\n`;

        content += `**Total Cards:** ${response.totalSteps}\n`;

        content += `**Generated at:** ${new Date().toLocaleString('en-US')}\n\n`;

        content += `## Summary\n\n${response.summary}\n\n`;

        if (response.recommendations && response.recommendations.length > 0) {
            content += `## Recommendations\n\n`;
            response.recommendations.forEach(rec => {
                content += `- ${rec}\n`;
            });
            content += '\n';
        }

        if (response.riskFactors && response.riskFactors.length > 0) {
            content += `## Risk Factors\n\n`;
            response.riskFactors.forEach(risk => {
                content += `- ⚠️ ${risk}\n`;
            });
            content += '\n';
        }

        content += `---\n\n`;

        // Gerar cada card usando o template
        response.steps.forEach((step, index) => {
            content += this.generateCardTemplate(step);
            if (index < response.steps.length - 1) {
                content += '\n---\n\n';
            }
        });

        return content;
    }

    /**
     * Gera o template de card para um step individual - Otimizado para AIs
     */
    private generateCardTemplate(step: TaskStep): string {
        let card = `## 🤖 [${step.id}] ${step.title}\n\n`;
        card += `**Complexity:** ${step.complexity.toUpperCase()} | **Target Files:** ${step.targetFiles.length}\n\n`;
        card += `---\n\n`;

        // === TECHNICAL CONTEXT FOR AI ===
        card += `### 📋 Technical Context\n\n`;
        card += `${step.technicalContext}\n\n`;
        card += `---\n\n`;

        card += `### 🎯 Implementation Goal\n\n`;
        card += `${step.implementationGoal}\n\n`;
        card += `---\n\n`;

        // === TECHNICAL SPECIFICATIONS ===
        card += `### 📁 Target Files\n\n`;
        step.targetFiles.forEach(file => {
            card += `- \`${file}\`\n`;
        });
        card += `\n---\n\n`;

        if (step.referencePaths && step.referencePaths.length > 0) {
            card += `### 🔗 Reference Paths\n\n`;
            step.referencePaths.forEach(path => {
                card += `- \`${path}\`\n`;
            });
            card += `\n---\n\n`;
        }

        if (step.codePatterns && step.codePatterns.length > 0) {
            card += `### 📝 Code Patterns\n\n`;
            step.codePatterns.forEach(pattern => {
                card += `- ${pattern}\n`;
            });
            card += `\n---\n\n`;
        }

        // === TECHNICAL REQUIREMENTS ===
        card += `### ⚙️ Technical Requirements\n\n`;
        step.technicalRequirements.forEach(req => {
            card += `- ${req}\n`;
        });
        card += `\n---\n\n`;

        // === COMMANDS AND ACTIONS ===
        if (step.shellCommands && step.shellCommands.length > 0) {
            card += `### 💻 Terminal Commands\n\n`;
            card += `\`\`\`bash\n`;
            step.shellCommands.forEach(cmd => {
                card += `${cmd}\n`;
            });
            card += `\`\`\`\n\n---\n\n`;
        }

        if (step.installationSteps && step.installationSteps.length > 0) {
            card += `### 📦 Installation Steps\n\n`;
            step.installationSteps.forEach((step_install, index) => {
                card += `${index + 1}. ${step_install}\n`;
            });
            card += `\n---\n\n`;
        }

        // === VERIFICATION ===
        card += `### ✅ Verification Steps\n\n`;
        step.verificationSteps.forEach((verification, index) => {
            card += `${index + 1}. ${verification}\n`;
        });
        card += `\n---\n\n`;

        // === DEPENDENCIES ===
        if (step.codeDependencies && step.codeDependencies.length > 0) {
            card += `### 📚 Code Dependencies\n\n`;
            step.codeDependencies.forEach(dep => {
                card += `- \`${dep}\`\n`;
            });
            card += `\n---\n\n`;
        }

        if (step.serviceDependencies && step.serviceDependencies.length > 0) {
            card += `### 🌐 Service Dependencies\n\n`;
            step.serviceDependencies.forEach(service => {
                card += `- ${service}\n`;
            });
            card += `\n---\n\n`;
        }

        // === CRITICAL USER INFORMATION ===
        if (step.userNotes && step.userNotes.trim() !== '') {
            card += `### 🚨 CRITICAL - USER NOTES (READ CAREFULLY)\n\n`;
            card += `> **⚠️ IMPORTANT:** The following notes contain ALL user requirements, special instructions, context, preferences, warnings, and business rationale. Do NOT ignore any part of this information.\n\n`;
            card += `${step.userNotes}\n\n`;
            card += `---\n\n`;
        }

        // === AI INFORMATION ===
        if (step.aiNotes && step.aiNotes.trim() !== '') {
            card += `### 🤖 AI Notes\n\n`;
            card += `${step.aiNotes}\n\n`;
            card += `---\n\n`;
        }



        // === ADDITIONAL CONTEXT ===
        if (step.apiEndpoints && step.apiEndpoints.length > 0) {
            card += `### 🔌 API Endpoints\n\n`;
            step.apiEndpoints.forEach(endpoint => {
                card += `- \`${endpoint}\`\n`;
            });
            card += `\n---\n\n`;
        }

        if (step.databaseChanges && step.databaseChanges.length > 0) {
            card += `### 🗄️ Database Changes\n\n`;
            step.databaseChanges.forEach(change => {
                card += `- ${change}\n`;
            });
            card += `\n---\n\n`;
        }

        if (step.environmentVars && step.environmentVars.length > 0) {
            card += `### 🌍 Environment Variables\n\n`;
            step.environmentVars.forEach(env => {
                card += `- \`${env}\`\n`;
            });
            card += `\n---\n\n`;
        }

        if (step.securityConsiderations && step.securityConsiderations.length > 0) {
            card += `### 🔒 Security Considerations\n\n`;
            step.securityConsiderations.forEach(security => {
                card += `- ${security}\n`;
            });
            card += `\n---\n\n`;
        }

        if (step.performanceConsiderations && step.performanceConsiderations.length > 0) {
            card += `### ⚡ Performance Considerations\n\n`;
            step.performanceConsiderations.forEach(perf => {
                card += `- ${perf}\n`;
            });
            card += `\n---\n\n`;
        }

        if (step.accessibilityNotes && step.accessibilityNotes.length > 0) {
            card += `### ♿ Accessibility Notes\n\n`;
            step.accessibilityNotes.forEach(acc => {
                card += `- ${acc}\n`;
            });
            card += `\n---\n\n`;
        }

        if (step.monitoringAndLogs && step.monitoringAndLogs.length > 0) {
            card += `### 📊 Monitoring and Logs\n\n`;
            step.monitoringAndLogs.forEach(log => {
                card += `- ${log}\n`;
            });
            card += `\n---\n\n`;
        }

        if (step.relatedIssues && step.relatedIssues.length > 0) {
            card += `### 🔗 Related Issues\n\n`;
            step.relatedIssues.forEach(issue => {
                card += `- ${issue}\n`;
            });
            card += `\n---\n\n`;
        }

        // === TECHNICAL METADATA ===
        let metadata = '';
        metadata += `**Complexity:** ${step.complexity}\n`;
        if (step.estimatedLines) {
            metadata += `**Estimated Lines:** ~${step.estimatedLines}\n`;
        }
        if (step.testingStrategy && step.testingStrategy.trim() !== '') {
            metadata += `**Testing Strategy:** ${step.testingStrategy}\n`;
        }
        if (step.rollbackPlan && step.rollbackPlan.trim() !== '') {
            metadata += `**Rollback Plan:** ${step.rollbackPlan}\n`;
        }

        if (metadata) {
            card += `### 📊 Technical Metadata\n\n${metadata}\n---\n\n`;
        }

        // Final tip for AIs
        card += `> 🤖 **For AIs:** This card contains complete technical specifications. Use the technical context, target files, code patterns, and commands to implement the functionality. Follow the user's special instructions and execute the verification steps to validate the implementation.\n`;

        return card;
    }
} 