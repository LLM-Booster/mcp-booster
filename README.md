# MCP-CoConuT (Continuous Chain of Thought)
[![smithery badge](https://smithery.ai/badge/@LLM-Booster/mcp-coconut)](https://smithery.ai/server/@LLM-Booster/mcp-coconut)

Servidor MCP para integração do Continuous Chain of Thought (CoConuT) com o Cursor IDE, permitindo raciocínio em cadeia com análise de qualidade.

## Visão Geral

O MCP-CoConuT é um servidor que implementa o Model Context Protocol (MCP) para expor funcionalidades de raciocínio em cadeia para modelos de linguagem. Ele permite que modelos de linguagem:

- Mantenham uma cadeia contínua de pensamentos
- Analisem a qualidade do raciocínio
- Detectem ciclos em pensamentos
- Criem ramificações para explorar diferentes abordagens
- Armazenem conclusões e histórico de interações

## Novidades na Versão Atual

- Suporte às especificações MCP 2025-03-26
- Código simplificado e otimizado para facilitar manutenção
- Disponível como pacote NPM
- Suporte para configuração de API key via programação, linha de comando ou variável de ambiente

## Recursos Principais

- **Pensamento Contínuo em Cadeia**: Implementação do CoConuT (Continuous Chain of Thought) para resolução estruturada de problemas
- **Detecção de Ciclos**: Algoritmos avançados para detectar raciocínio cíclico usando diferentes métricas de similaridade (Levenshtein, Jaccard, Cosine)
- **Gerenciamento de Ramificações**: Possibilidade de explorar diferentes linhas de pensamento com ramificações, comparações e mesclagem
- **Reflexão Automática**: Sistema de reflexão periódica para avaliar o progresso na resolução do problema
- **Análise de Pensamentos**: Análise automatizada da cadeia de pensamentos para verificar se o raciocínio está no caminho correto
- **Registro de Conclusões**: Sistema para documentar conclusões e mudanças realizadas de forma estruturada
- **Persistência Integrada**: Todos os dados são automaticamente persistidos para facilitar análise posterior
- **Múltiplos Formatos de Resposta**: Suporte para diferentes formatos (JSON, Markdown, HTML)
- **Arquitetura Modular**: Sistema baseado em componentes com injeção de dependências
- **Documentação Integrada**: Descrições detalhadas dos parâmetros de entrada incluídas na resposta
- **Internacionalização**: Suporte a mensagens em múltiplos idiomas 
- **Sistema de Templates**: Templates flexíveis para personalização das conclusões

## Requisitos

- Node.js 18 ou superior
- NPM

## Instalação

### Installing via Smithery

To install mcp-booster for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@LLM-Booster/mcp-coconut):

```bash
npx -y @smithery/cli install @LLM-Booster/mcp-coconut --client claude
```

### Instalação global (para uso via linha de comando)

```bash
# Instalar globalmente
npm install -g mcp-coconut
```

### Instalação para uso em projeto

```bash
# Adicionar como dependência
npm install mcp-coconut
```

### Instalação via repositório (desenvolvimento)

```bash
# Clonar o repositório
git clone https://github.com/MarceloAssis123/MCP-CoConuT.git
cd MCP-CoConuT

# Instalar dependências
npm install
```

## Uso

### Como servidor MCP (linha de comando)

O servidor MCP-CoConuT funciona exclusivamente no modo stdio, ideal para integração com IDEs como o Cursor.

```bash
# Iniciar o servidor (se instalado globalmente)
mcp-coconut --api-key <sua_chave_de_api>

# Ou se instalado localmente
npx mcp-coconut --api-key <sua_chave_de_api>

# Usando o código fonte
npm run dev -- --api-key <sua_chave_de_api>
npm start -- --api-key <sua_chave_de_api>
```

### Como biblioteca (uso programático)

```typescript
// Importar o módulo
import { initializeServer, setApiKey } from 'mcp-coconut';

// Método 1: Configurar API key e depois inicializar o servidor
setApiKey('sua_chave_de_api');
initializeServer();

// Método 2: Inicializar com opções
initializeServer({
  apiKey: 'sua_chave_de_api',
  config: {
    // Opções adicionais de configuração (opcional)
    server: {
      name: "MCP-CoConuT-Customizado",
    },
    logging: {
      minLevel: "debug"
    }
  }
});
```

## Configuração da API Key

O MCP-CoConuT oferece várias maneiras de configurar a API key:

1. **Via linha de comando**:
   ```bash
   mcp-coconut --api-key <sua_chave_de_api>
   ```

2. **Via variável de ambiente**:
   ```bash
   # No Linux/Mac
   export MCP_COCONUT_API_KEY=sua_chave_de_api
   mcp-coconut

   # No Windows (PowerShell)
   $env:MCP_COCONUT_API_KEY = "sua_chave_de_api"
   mcp-coconut
   ```

3. **Via programação**:
   ```typescript
   import { setApiKey, initializeServer } from 'mcp-coconut';
   
   // Método 1
   setApiKey('sua_chave_de_api');
   initializeServer();
   
   // Método 2
   initializeServer({ apiKey: 'sua_chave_de_api' });
   ```

## Configuração Avançada

As configurações do servidor podem ser personalizadas de diversas formas:

1. **No código fonte**: Edite o arquivo `src/config.ts` para modificar os valores padrão.

2. **Via código (ao importar como biblioteca)**:
   ```typescript
   import { updateConfig, initializeServer } from 'mcp-coconut';
   
   // Atualizar configurações específicas
   updateConfig({
     server: {
       name: "MCP-CoConuT-Customizado",
     },
     logging: {
       minLevel: "debug",
       enableConsole: true
     },
     coconut: {
       cycleDetectionThreshold: 0.75,
       similarityAlgorithm: 'jaccard'
     }
   });
   
   // Inicializar o servidor com as configurações atualizadas
   initializeServer();
   ```

## Ferramentas Disponíveis

### CoConuT

Ferramenta principal para processamento de pensamentos em cadeia. Parâmetros:

- `thought`: Texto do pensamento atual
- `thoughtNumber`: Número sequencial do pensamento na cadeia
- `totalThoughts`: Número total estimado de pensamentos
- `nextThoughtNeeded`: Se um próximo pensamento é necessário
- `Call_CoConuT_Analyser`: Opcional, para solicitar análise explícita

### CoConuT_Storage

Ferramenta para salvar pensamentos e conclusões em armazenamento persistente. Parâmetros obrigatórios:

- `projectPath`: Caminho para o diretório do projeto
- `WhyChange`: Motivo da alteração (por que foi necessário)
- `WhatChange`: Descrição da alteração (o que foi modificado)

### CoConuT_Analyser

Ferramenta para análise da qualidade da cadeia de pensamentos. Parâmetros:

- `thoughts`: Array contendo os pensamentos a serem analisados
- `projectPath`: Opcional, caminho para o diretório do projeto
- `userQuery`: Opcional, consulta original do usuário

## Contribuição

Contribuições são bem-vindas! Por favor, abra uma issue para discutir sua proposta antes de enviar um pull request.

## Licença

ISC 