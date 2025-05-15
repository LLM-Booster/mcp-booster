/**
 * Formatadores de resposta para o CoConuT
 * Cada formatador implementa a saída em diferentes formatos (JSON, Markdown, etc)
 */

import { CoConuTResponse } from '../types';

/**
 * Interface para formatadores de resposta
 */
export interface IResponseFormatter {
    format(response: CoConuTResponse): { text: string, contentType?: string };
}

/**
 * Fábrica de formatadores
 */
export class FormatterFactory {
    /**
     * Cria um formatador baseado no tipo especificado
     * @param type Tipo de formatador (json, markdown, text)
     * @returns Uma instância do formatador solicitado
     */
    public static createFormatter(type: string): IResponseFormatter {
        switch (type.toLowerCase()) {
            case 'markdown':
                return new MarkdownFormatter();
            case 'text':
                return new TextFormatter();
            case 'json':
            default:
                return new JsonFormatter();
        }
    }
}

/**
 * Formatador JSON para respostas do CoConuT
 */
export class JsonFormatter implements IResponseFormatter {
    format(response: CoConuTResponse): { text: string, contentType?: string } {
        // Criar cópia segura da resposta
        const safeResponse = JSON.parse(JSON.stringify(response));

        // Remover campos nulos ou vazios
        return {
            text: JSON.stringify(safeResponse, null, 2),
            contentType: 'application/json'
        };
    }
}

/**
 * Formatador de Markdown para respostas do CoConuT
 */
export class MarkdownFormatter implements IResponseFormatter {
    format(response: CoConuTResponse): { text: string, contentType?: string } {
        // Simplificado após a refatoração
        const {
            thoughtNumber,
            totalThoughts,
            nextThoughtNeeded,
            analysis,
            error
        } = response;

        let markdown = `## CoConuT - Pensamento ${thoughtNumber}/${totalThoughts}\n\n`;

        if (error) {
            markdown += `### ❌ Erro\n\n${error}\n\n`;
            return { text: markdown, contentType: 'text/markdown' };
        }

        // Status da análise
        if (analysis) {
            markdown += `### Análise\n\n`;

            if (analysis.isOnRightTrack) {
                markdown += `✅ **Raciocínio no caminho correto**\n\n`;
            } else {
                markdown += `⚠️ **Possível desvio no raciocínio**\n\n`;
            }

            if (analysis.needsMoreUserInfo) {
                markdown += `🔍 **Mais informações necessárias**\n\n`;

                if (analysis.userInfoNeeded && analysis.userInfoNeeded.length > 0) {
                    markdown += `Informações necessárias:\n\n`;
                    analysis.userInfoNeeded.forEach(info => {
                        markdown += `- ${info}\n`;
                    });
                    markdown += `\n`;
                }
            }

            if (analysis.suggestions && analysis.suggestions.length > 0) {
                markdown += `💡 **Sugestões**:\n\n`;
                analysis.suggestions.forEach(suggestion => {
                    markdown += `- ${suggestion}\n`;
                });
                markdown += `\n`;
            }
        }

        // Status da cadeia
        if (nextThoughtNeeded) {
            markdown += `▶️ Aguardando próximo pensamento (${thoughtNumber + 1}/${totalThoughts})\n\n`;
        } else {
            markdown += `🏁 Cadeia de pensamento completa\n\n`;
        }

        return { text: markdown, contentType: 'text/markdown' };
    }
}

/**
 * Formatador de texto simples para respostas do CoConuT
 */
export class TextFormatter implements IResponseFormatter {
    format(response: CoConuTResponse): { text: string, contentType?: string } {
        // Simplificado após a refatoração
        const {
            thoughtNumber,
            totalThoughts,
            nextThoughtNeeded,
            analysis,
            error
        } = response;

        let text = `[CoConuT ${thoughtNumber}/${totalThoughts}]\n\n`;

        if (error) {
            text += `ERRO: ${error}\n\n`;
            return { text, contentType: 'text/plain' };
        }

        // Status da análise
        if (analysis) {
            if (analysis.isOnRightTrack) {
                text += `[OK] Raciocínio no caminho correto\n`;
            } else {
                text += `[ALERTA] Possível desvio no raciocínio\n`;
            }

            if (analysis.needsMoreUserInfo) {
                text += `[INFO] Mais informações necessárias\n`;

                if (analysis.userInfoNeeded && analysis.userInfoNeeded.length > 0) {
                    text += `\nInformações necessárias:\n`;
                    analysis.userInfoNeeded.forEach((info, index) => {
                        text += `${index + 1}. ${info}\n`;
                    });
                }
            }

            if (analysis.suggestions && analysis.suggestions.length > 0) {
                text += `\nSugestões:\n`;
                analysis.suggestions.forEach((suggestion, index) => {
                    text += `${index + 1}. ${suggestion}\n`;
                });
            }
        }

        // Status da cadeia
        if (nextThoughtNeeded) {
            text += `\nAguardando próximo pensamento (${thoughtNumber + 1}/${totalThoughts})\n`;
        } else {
            text += `\nCadeia de pensamento completa\n`;
        }

        return { text, contentType: 'text/plain' };
    }
} 