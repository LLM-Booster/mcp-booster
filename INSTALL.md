# 📦 Guia de Instalação - MCP-Booster

Este guia fornece instruções detalhadas para instalar o MCP-Booster em diferentes sistemas operacionais.

## 📋 Pré-requisitos

### Requisitos Mínimos
- **Node.js**: 18.0.0 ou superior
- **NPM**: 8.0.0 ou superior
- **Espaço em disco**: 100MB livres
- **Memória RAM**: 512MB disponível

### Verificar Pré-requisitos

```bash
# Verificar versões instaladas
node --version    # Deve ser >= 18.0.0
npm --version     # Deve ser >= 8.0.0
```

## 🌍 Instalação por Sistema Operacional

### 🖥️ Windows

#### Windows 10/11 - PowerShell (Recomendado)

```powershell
# 1. Verificar pré-requisitos
node --version
npm --version

# 2. Instalar MCP-Booster globalmente
npm install -g mcp-booster

# 3. Verificar instalação
mcp-booster --help
```

#### Windows 10/11 - Command Prompt (CMD)

```cmd
REM 1. Verificar pré-requisitos
node --version
npm --version

REM 2. Instalar MCP-Booster globalmente
npm install -g mcp-booster

REM 3. Verificar instalação
mcp-booster --help
```

#### Problemas Comuns no Windows

**Erro de permissão:**
```powershell
# Executar PowerShell como Administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npm install -g mcp-booster
```

**PATH não configurado:**
```cmd
# Adicionar NPM global ao PATH
set PATH=%PATH%;%APPDATA%\npm
```

### 🍎 macOS

#### macOS (Homebrew + Node.js)

```bash
# 1. Instalar Node.js via Homebrew (se não instalado)
brew install node

# 2. Verificar versões
node --version
npm --version

# 3. Instalar MCP-Booster
npm install -g mcp-booster

# 4. Verificar instalação
mcp-booster --help
which mcp-booster
```

#### macOS (Usando NVM)

```bash
# 1. Instalar/atualizar Node.js via NVM
nvm install 18
nvm use 18

# 2. Instalar MCP-Booster
npm install -g mcp-booster

# 3. Verificar instalação
mcp-booster --help
```

#### Problemas Comuns no macOS

**Permissões do NPM:**
```bash
# Corrigir permissões
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Ou usar prefix local
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bash_profile
source ~/.bash_profile
```

### 🐧 Linux

#### Ubuntu/Debian

```bash
# 1. Atualizar sistema
sudo apt update

# 2. Instalar Node.js (se não instalado)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Verificar versões
node --version
npm --version

# 4. Instalar MCP-Booster
npm install -g mcp-booster

# 5. Verificar instalação
mcp-booster --help
which mcp-booster
```

#### CentOS/RHEL/Fedora

```bash
# 1. Instalar Node.js via DNF/YUM
sudo dnf install nodejs npm  # Fedora
# ou
sudo yum install nodejs npm   # CentOS/RHEL

# 2. Verificar versões
node --version
npm --version

# 3. Instalar MCP-Booster
npm install -g mcp-booster

# 4. Verificar instalação
mcp-booster --help
```

#### Arch Linux

```bash
# 1. Instalar Node.js
sudo pacman -S nodejs npm

# 2. Instalar MCP-Booster
npm install -g mcp-booster

# 3. Verificar instalação
mcp-booster --help
```

#### Problemas Comuns no Linux

**Permissões globais:**
```bash
# Opção 1: Usar sudo (não recomendado)
sudo npm install -g mcp-booster

# Opção 2: Configurar prefix (recomendado)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g mcp-booster
```

## 🔧 Instalação via Gerenciadores Alternativos

### Usando Yarn

```bash
# Instalar globalmente via Yarn
yarn global add mcp-booster

# Verificar instalação
mcp-booster --help
```

### Usando PNPM

```bash
# Instalar globalmente via PNPM
pnpm add -g mcp-booster

# Verificar instalação
mcp-booster --help
```

## 🐳 Instalação via Docker

### Dockerfile Básico

```dockerfile
FROM node:18-alpine

# Instalar MCP-Booster
RUN npm install -g mcp-booster

# Definir comando padrão
CMD ["mcp-booster"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  mcp-booster:
    image: node:18-alpine
    command: sh -c "npm install -g mcp-booster && mcp-booster"
    environment:
      - MCP_BOOSTER_API_KEY=${API_KEY}
    volumes:
      - ./data:/data
```

## ✅ Verificação da Instalação

### Teste Básico

```bash
# Verificar se o comando está disponível
mcp-booster --help

# Verificar versão instalada
npm list -g mcp-booster

# Localizar executável
which mcp-booster  # Linux/macOS
where mcp-booster  # Windows
```

### Teste de Funcionalidade

```bash
# Executar testes de compatibilidade
npm test -g mcp-booster

# Testar inicialização (pressione Ctrl+C para parar)
mcp-booster --api-key test
```

## 🔄 Atualização

### Atualizar para Versão Mais Recente

```bash
# Verificar versão atual
npm list -g mcp-booster

# Verificar atualizações disponíveis
npm outdated -g mcp-booster

# Atualizar
npm update -g mcp-booster

# Verificar nova versão
npm list -g mcp-booster
```

## 🗑️ Desinstalação

### Remover Completamente

```bash
# 1. Desinstalar pacote global
npm uninstall -g mcp-booster

# 2. Verificar remoção
npm list -g | grep mcp-booster

# 3. Limpar cache (opcional)
npm cache clean --force

# 4. Verificar que comando não existe mais
mcp-booster --help  # Deve dar erro "command not found"
```

## 🚨 Solução de Problemas

### Problema: "Command not found"

**Diagnóstico:**
```bash
# Verificar PATH
echo $PATH  # Linux/macOS
echo %PATH% # Windows

# Verificar localização NPM global
npm config get prefix
npm root -g
```

**Solução:**
```bash
# Adicionar NPM bin ao PATH
export PATH=$PATH:$(npm root -g)/../bin  # Linux/macOS
```

### Problema: Permissões negadas

**Linux/macOS:**
```bash
# Corrigir ownership
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Ou usar npx
npx mcp-booster
```

**Windows:**
```powershell
# Executar como Administrador
Set-ExecutionPolicy RemoteSigned
npm install -g mcp-booster
```

### Problema: Versão do Node.js muito antiga

**Atualizar Node.js:**
```bash
# Via NVM (recomendado)
nvm install --lts
nvm use --lts

# Via gerenciador de pacotes
brew upgrade node     # macOS
sudo apt update && sudo apt upgrade nodejs  # Ubuntu
```

### Problema: Rede/Proxy

**Configurar proxy NPM:**
```bash
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
npm config set registry https://registry.npmjs.org/
```

### Problema: Cache corrompido

**Limpar e reinstalar:**
```bash
# Limpar cache NPM
npm cache clean --force

# Remover e reinstalar
npm uninstall -g mcp-booster
npm install -g mcp-booster
```

## 📞 Suporte

Se você continuar enfrentando problemas:

1. **Verifique o log de erro** completo
2. **Consulte o GitHub Issues**: [Issues](https://github.com/llm-booster/mcp-booster/issues)
3. **Procure discussões**: [Discussions](https://github.com/llm-booster/mcp-booster/discussions)
4. **Reporte novo bug**: Inclua OS, versão do Node.js, e log completo

---

**Instalação bem-sucedida? Comece usando com `mcp-booster --help`! 🚀** 