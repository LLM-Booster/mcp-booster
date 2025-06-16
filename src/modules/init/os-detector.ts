import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Interface para definir os caminhos de configuração do Cursor
 */
export interface CursorPaths {
    /** Caminho global do Cursor (configuração do usuário) */
    globalPath: string;
    /** Caminho local do Cursor (configuração do projeto) */
    localPath: string;
    /** Sistema operacional detectado */
    platform: string;
}

/**
 * Detecta o sistema operacional e retorna os caminhos corretos
 * para o diretório de configuração do Cursor IDE
 */
export function detectCursorPaths(): CursorPaths {
    const platform = os.platform();
    const homeDir = os.homedir();

    let globalPath: string;

    switch (platform) {
        case 'win32':
            // Windows: ~/.cursor (caminho padrão do Cursor)
            globalPath = path.join(homeDir, '.cursor');
            break;

        case 'darwin':
            // macOS: ~/.cursor (caminho padrão do Cursor)
            globalPath = path.join(homeDir, '.cursor');
            break;

        case 'linux':
            // Linux: ~/.cursor (caminho padrão do Cursor)
            globalPath = path.join(homeDir, '.cursor');
            break;

        default:
            // Fallback para sistemas não suportados
            globalPath = path.join(homeDir, '.cursor');
            console.warn(`⚠️  Sistema operacional '${platform}' não é oficialmente suportado. Usando fallback: ${globalPath}`);
            break;
    }

    // Caminho local é sempre .cursor no diretório atual
    const localPath = path.join(process.cwd(), '.cursor');

    return {
        globalPath,
        localPath,
        platform
    };
}

/**
 * Verifica se o Cursor está instalado no sistema
 * checando se o diretório de configuração existe
 */
export function isCursorInstalled(): boolean {
    const paths = detectCursorPaths();

    try {
        // Verifica se o diretório global do Cursor existe
        return fs.existsSync(paths.globalPath);
    } catch (error) {
        console.warn('⚠️  Erro ao verificar instalação do Cursor:', error);
        return false;
    }
}

/**
 * Cria os diretórios necessários se não existirem
 */
export function ensureCursorDirectories(useGlobal: boolean = true): string {
    const paths = detectCursorPaths();
    const targetPath = useGlobal ? paths.globalPath : paths.localPath;

    try {
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
            console.log(`✅ Diretório criado: ${targetPath}`);
        }
        return targetPath;
    } catch (error) {
        throw new Error(`❌ Erro ao criar diretório ${targetPath}: ${error}`);
    }
}

/**
 * Retorna informações detalhadas sobre o sistema e caminhos do Cursor
 */
export function getCursorSystemInfo(): {
    platform: string;
    arch: string;
    nodeVersion: string;
    paths: CursorPaths;
    cursorInstalled: boolean;
} {
    const paths = detectCursorPaths();

    return {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        paths,
        cursorInstalled: isCursorInstalled()
    };
}

/**
 * Detecta o sistema operacional de forma simplificada
 */
export function detectOS(): 'windows' | 'macos' | 'linux' {
    const platform = os.platform();

    switch (platform) {
        case 'win32':
            return 'windows';
        case 'darwin':
            return 'macos';
        case 'linux':
            return 'linux';
        default:
            return 'linux'; // fallback
    }
}

/**
 * Obtém o caminho do arquivo mcp.json do Cursor baseado no OS e tipo de instalação
 */
export function getCursorMcpPath(isGlobal: boolean = true): string {
    const homeDir = os.homedir();

    // Para todas as plataformas, usar ~/.cursor para instalação global
    // Para instalação local, usar o diretório atual do projeto
    if (isGlobal) {
        return path.join(homeDir, '.cursor', 'mcp.json');
    } else {
        return path.join(process.cwd(), '.cursor', 'mcp.json');
    }
}

/**
 * Obtém o caminho do diretório de configurações do Cursor baseado no OS
 */
export function getCursorConfigPath(): string {
    const osType = detectOS();
    const homeDir = os.homedir();

    switch (osType) {
        case 'windows':
            return path.join(homeDir, 'AppData', 'Roaming', 'Cursor');
        case 'macos':
            return path.join(homeDir, 'Library', 'Application Support', 'Cursor');
        case 'linux':
            return path.join(homeDir, '.config', 'Cursor');
        default:
            throw new Error(`Sistema operacional não suportado: ${osType}`);
    }
} 