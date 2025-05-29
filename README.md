# MCP-Booster

Servidor MCP (Model Context Protocol) com funcionalidades avançadas de raciocínio contínuo e análise de qualidade para integração com IDEs como Cursor.

## Visão Geral

O MCP-Booster é um servidor que implementa o Model Context Protocol (MCP) para fornecer capacidades avançadas de raciocínio e análise para modelos de linguagem. Ele oferece:

- **Raciocínio Estruturado**: Sistema de pensamento em cadeia com validação de qualidade
- **Análise de Qualidade**: Avaliação automática do progresso do raciocínio
- **Armazenamento de Conclusões**: Documentação estruturada de mudanças e decisões
- **Integração com IDEs**: Funcionamento otimizado para Cursor e outros ambientes de desenvolvimento

## Recursos Principais

### 🧠 Booster - Raciocínio Avançado
- Sistema de pensamento em cadeia contínua
- Pontuação de confiança (0-10) para cada etapa
- Gerenciamento de status e progresso
- Suporte a ramificações de pensamento

### 🔍 Booster_Analyser - Análise de Qualidade  
- Validação automática da qualidade do raciocínio
- Detecção de necessidade de informações adicionais
- Sugestões para melhoria do processo
- Análise de alinhamento com objetivos

### 💾 Booster_Storage - Armazenamento Estruturado
- Documentação automática de mudanças
- Categorização e tags para organização
- Histórico completo de modificações
- Contexto técnico e de negócio

## Instalação

### Instalação Global (Recomendado)

```bash
npm install -g mcp-booster
```

### Instalação Local

```bash
npm install mcp-booster
```

### Instalação via Código Fonte

```bash
git clone https://github.com/llm-booster/mcp-booster.git
cd mcp-booster
npm install
npm run build
```

## Configuração

### Configuração da API Key

O MCP-Booster requer uma API key para funcionar. Configure de uma das seguintes formas:

**1. Via linha de comando:**
```bash
mcp-booster --api-key YOUR_API_KEY
```

**2. Via variável de ambiente:**
```bash
# Linux/Mac
export MCP_BOOSTER_API_KEY=YOUR_API_KEY
mcp-booster

# Windows (PowerShell)
$env:MCP_BOOSTER_API_KEY = "YOUR_API_KEY"
mcp-booster
```

**3. Via código (uso como biblioteca):**
```typescript
import { setApiKey, initializeServer } from 'mcp-booster';

setApiKey('YOUR_API_KEY');
initializeServer();
```

### Obter API Key

Para obter sua API key, visite: https://llmbooster.com

## Uso

### Como Servidor MCP (Padrão)

```bash
# Se instalado globalmente
mcp-booster --api-key YOUR_API_KEY

# Se instalado localmente  
npx mcp-booster --api-key YOUR_API_KEY

# Usando código fonte
npm start -- --api-key YOUR_API_KEY
npm run dev -- --api-key YOUR_API_KEY
```

### Como Biblioteca TypeScript

```typescript
import { initializeServer, updateConfig } from 'mcp-booster';

// Configuração básica
initializeServer({
  apiKey: 'YOUR_API_KEY'
});

// Configuração avançada
updateConfig({
  server: {
    name: "MCP-Booster-Custom"
  },
  logging: {
    minLevel: "info"
  }
});

initializeServer({
  apiKey: 'YOUR_API_KEY',
  config: {
    // Configurações personalizadas
  }
});
```

## Ferramentas Disponíveis

### Booster
Ferramenta principal para raciocínio estruturado em cadeia.

**Parâmetros obrigatórios:**
- `thought`: Texto do pensamento atual
- `thoughtNumber`: Número sequencial na cadeia (1, 2, 3...)
- `totalThoughts`: Estimativa total de pensamentos necessários (mínimo 3)
- `nextThoughtNeeded`: Se mais pensamentos são necessários (true/false)
- `score`: Nível de confiança (0-10)
- `problemStatus`: Descrição do status atual do problema
- `Call_Booster_Analyser`: Se deve chamar análise de qualidade (true/false)

**Parâmetros opcionais:**
- `isRevision`: Se é uma revisão de pensamento anterior
- `branchId`: Identificador de ramificação
- `inputType`: Tipo de entrada esperada do usuário
- `options`: Lista de opções para o usuário

### Booster_Analyser  
Ferramenta para análise da qualidade do raciocínio.

**Parâmetros obrigatórios:**
- `thoughts`: Array de pensamentos para análise
- `userQuery`: Pergunta original do usuário

**Parâmetros opcionais:**
- `projectPath`: Caminho do projeto para contexto adicional

### Booster_Storage
Ferramenta para armazenamento estruturado de conclusões.

**Parâmetros obrigatórios:**
- `projectPath`: Caminho absoluto do diretório do projeto
- `WhyChange`: Motivo da mudança (por que foi necessária)
- `WhatChange`: Descrição da mudança (o que foi modificado)

**Parâmetros opcionais:**
- `category`: Categoria principal da mudança
- `impactLevel`: Nível de impacto (low/medium/high)
- `affectedFiles`: Lista de arquivos afetados
- `tags`: Tags para organização
- `technicalContext`: Contexto técnico adicional

## Integração com Cursor IDE

Para usar com Cursor IDE, adicione ao seu `cursor-mcp.json`:

```json
{
  "mcpServers": {
    "mcp-booster": {
      "command": "mcp-booster",
      "args": ["--api-key", "YOUR_API_KEY"]
    }
  }
}
```

## Desenvolvimento

```bash
# Clonar repositório
git clone https://github.com/llm-booster/mcp-booster.git
cd mcp-booster

# Instalar dependências
npm install

# Desenvolvimento
npm run dev -- --api-key YOUR_API_KEY

# Build
npm run build

# Executar versão compilada
npm start -- --api-key YOUR_API_KEY
```

## Estrutura do Projeto

```
mcp-booster/
├── src/
│   ├── modules/
│   │   ├── types.ts          # Definições de tipos
│   │   ├── logger.ts         # Sistema de logging
│   │   ├── storage.ts        # Armazenamento de dados
│   │   ├── coconut.ts        # Lógica do Booster
│   │   └── coconut-storage.ts # Lógica do Storage
│   ├── config.ts             # Configurações
│   └── index.ts              # Servidor principal
├── bin/
│   └── server.js             # Script de linha de comando
├── dist/                     # Arquivos compilados
└── coconut-data/             # Dados persistidos
```

## Requisitos

- Node.js 18 ou superior
- NPM
- API Key válida do LLM Booster

## Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

ISC

## Links Úteis

- [Documentação da API](https://llmbooster.com/docs)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Cursor IDE](https://cursor.sh)

## Suporte

Para suporte técnico ou dúvidas:
- [Issues no GitHub](https://github.com/llm-booster/mcp-booster/issues)
- [Documentação completa](https://llmbooster.com/docs) 