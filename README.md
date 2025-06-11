# MCP-Booster 🚀

[![npm version](https://badge.fury.io/js/mcp-booster.svg)](https://www.npmjs.com/package/mcp-booster)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cross-Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/llm-booster/mcp-booster)

Servidor MCP com CoConuT (Continuous Chain of Thought) para uso com Cursor IDE - **Agora disponível como pacote NPM global universal!**

## 🌟 Características

- **🧠 Raciocínio Contínuo**: Sistema CoConuT para pensamento em cadeia
- **📊 Análise Inteligente**: Validação automática da qualidade do raciocínio
- **💾 Armazenamento Estruturado**: Persistência inteligente de dados
- **🔧 Planejamento Inteligente**: Decomposição de tarefas com Booster_Steps
- **🌍 Universal**: Compatível com Windows, macOS e Linux
- **📦 Global**: Instale uma vez, use em qualquer lugar

## 📋 Requisitos do Sistema

- **Node.js**: ≥ 18.0.0
- **NPM**: ≥ 8.0.0
- **Sistemas Suportados**:
  - Windows (x64, arm64)
  - macOS (x64, arm64)
  - Linux (x64, arm64)

## 🚀 Instalação Global (Recomendada)

### Instalação Rápida

```bash
npm install -g mcp-booster
```

### Verificar Instalação

```bash
mcp-booster --help
# ou
which mcp-booster
```

### Verificar Versão

```bash
npm list -g mcp-booster
```

## 💻 Uso

### Iniciando o Servidor

```bash
# Iniciar com configurações padrão
mcp-booster

# Iniciar com API key
mcp-booster --api-key YOUR_API_KEY

# No Windows (PowerShell)
mcp-booster.cmd

# No Windows (CMD)
mcp-booster
```

### Integrando com Cursor IDE

1. Instale o MCP-Booster globalmente
2. Configure no Cursor IDE:

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

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Linux/macOS
export MCP_BOOSTER_API_KEY="your_api_key_here"
export MCP_BOOSTER_LOG_LEVEL="info"

# Windows
set MCP_BOOSTER_API_KEY=your_api_key_here
set MCP_BOOSTER_LOG_LEVEL=info
```

### Argumentos de Linha de Comando

```bash
mcp-booster --api-key YOUR_KEY    # Define API key
mcp-booster --help               # Mostra ajuda
mcp-booster --version            # Mostra versão
```

## 🛠️ Desenvolvimento Local

Se você quiser contribuir ou rodar em modo de desenvolvimento:

```bash
# Clonar repositório
git clone https://github.com/llm-booster/mcp-booster.git
cd mcp-booster

# Instalar dependências
npm install

# Build do projeto
npm run build

# Executar em modo desenvolvimento
npm run dev

# Executar testes
npm test
```

## 🧪 Testando Compatibilidade

Execute os testes de compatibilidade multi-plataforma:

```bash
# Após instalação global
npm test -g mcp-booster

# Em projeto local
npm test
```

## 🔍 Solução de Problemas

### Problema: Comando não encontrado

**Linux/macOS:**
```bash
# Verificar se NPM global bin está no PATH
echo $PATH | grep npm

# Adicionar ao PATH se necessário
export PATH=$PATH:$(npm root -g)/../bin
```

**Windows:**
```cmd
# Verificar PATH
echo %PATH%

# Reinstalar se necessário
npm uninstall -g mcp-booster
npm install -g mcp-booster
```

### Problema: Permissões negadas (Linux/macOS)

```bash
# Corrigir permissões NPM
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Ou usar npx
npx mcp-booster
```

### Problema: Erro de importação

```bash
# Limpar cache NPM
npm cache clean --force

# Reinstalar
npm uninstall -g mcp-booster
npm install -g mcp-booster
```

### Problema: Versão do Node.js

```bash
# Verificar versão
node --version

# Atualizar Node.js para ≥ 18.0.0
# Use nvm, fnm ou baixe do site oficial
```

## 📚 Funcionalidades Principais

### 🧠 Sistema Booster
- Raciocínio contínuo em cadeia
- Análise automática de qualidade
- Controle de ramificações

### 📊 Booster_Analyser
- Validação de cadeia de pensamentos
- Detecção de necessidade de informações adicionais
- Sugestões de melhoria

### 💾 Booster_Storage
- Armazenamento estruturado de conclusões
- Metadados ricos para busca
- Histórico de modificações

### 🔧 Booster_Steps
- Decomposição inteligente de tarefas
- Planejamento estruturado
- Cards otimizados para IA

## 🌍 Suporte Multi-plataforma

Este pacote foi testado e otimizado para:

| Sistema | Arquitetura | Status | Notas |
|---------|-------------|--------|-------|
| Windows 10/11 | x64 | ✅ | Testado em PowerShell e CMD |
| Windows 10/11 | arm64 | ✅ | Compatível com ARM |
| macOS 12+ | x64 | ✅ | Testado em Intel Macs |
| macOS 12+ | arm64 | ✅ | Testado em Apple Silicon |
| Ubuntu 20.04+ | x64 | ✅ | Testado em bash e zsh |
| Ubuntu 20.04+ | arm64 | ✅ | Compatível com ARM |

## 🔄 Atualização

```bash
# Atualizar para versão mais recente
npm update -g mcp-booster

# Verificar atualizações disponíveis
npm outdated -g mcp-booster
```

## 🗑️ Desinstalação

```bash
# Remover instalação global
npm uninstall -g mcp-booster

# Verificar remoção
npm list -g | grep mcp-booster
```

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/llm-booster/mcp-booster/issues)
- **Documentação**: [Wiki](https://github.com/llm-booster/mcp-booster/wiki)
- **Discussões**: [GitHub Discussions](https://github.com/llm-booster/mcp-booster/discussions)

## 📊 Status

- ✅ Instalação global NPM
- ✅ Compatibilidade multi-plataforma
- ✅ Testes automatizados
- ✅ TypeScript completo
- ✅ Documentação abrangente

---

**Feito com ❤️ pela equipe LLM Booster** 