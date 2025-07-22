import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CommitInfo, GitService } from './git-service';
import { TddPhase, TddState } from '../models/tdd-models';
import { exec } from 'child_process';
import {promisify} from 'util';

const IGNORED_DIRS = ['node_modules', '.git', '.vscode', 'dist', 'build', 'out'];

export class CodeAnalysisService {
    private static instance: CodeAnalysisService;
    private execPromise = promisify(exec);
    private fsExistsSync = fs.existsSync;   
    private fsReadFileSync = fs.readFileSync;
    private fsWriteFileSync = fs.writeFileSync;

    private constructor(private gitService: GitService) {}

    public static getInstance(gitService: GitService): CodeAnalysisService {
        if (!CodeAnalysisService.instance) {
            CodeAnalysisService.instance = new CodeAnalysisService(gitService);
        }
        return CodeAnalysisService.instance;
    }

    public async insertTestCode(testCode: string, targetFile: string): Promise<boolean> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('Nessun workspace aperto');
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const allFiles = await this.getAllFiles(rootPath);

            let testFilePath = allFiles.find(file =>
                file.endsWith(targetFile) || path.basename(file) === targetFile
            );

            if (!testFilePath) {
                testFilePath = path.join(rootPath, 'tests', targetFile);
                const dir = path.dirname(testFilePath);

                await fs.promises.mkdir(dir, { recursive: true });
                await fs.promises.writeFile(testFilePath, '');
            }

            const currentContent = await fs.promises.readFile(testFilePath, 'utf8');

            const updatedContent = `${currentContent.trim()}\n\n${testCode.trim()}\n`;

            await fs.promises.writeFile(testFilePath, updatedContent);

            const document = await vscode.workspace.openTextDocument(testFilePath);
            await vscode.window.showTextDocument(document);
            
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante l'inserimento del codice di test: ${error}`);
            return false;
        }
    }
    
    public async runTests(): Promise<{ success: boolean; output: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return { success: false, output: 'Nessun workspace aperto' };
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const packageJsonPath = path.join(rootPath, 'package.json');

            if (!this.fsExistsSync(packageJsonPath)) {
                const createAction = 'Crea package.json';
                const cancelAction = 'Annulla';
                
                const choice = await vscode.window.showWarningMessage(
                    'Non è stato trovato un file package.json nel progetto. Vuoi crearne uno per eseguire i test?',
                    createAction, cancelAction
                );
                
                if (choice === createAction) {
                    console.log('1');
                    const result = await this.createPackageJson();
                    if (!result.success) {
                        return { success: false, output: result.message };
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } else {
                    return { success: false, output: 'Operazione annullata dall\'utente.' };
                }
            } else {
                try {
                    const packageJson = JSON.parse(this.fsReadFileSync(packageJsonPath, 'utf8'));
                    if (!packageJson.scripts || !packageJson.scripts.test) {
                        const fixAction = 'Ripara package.json';
                        const cancelAction = 'Annulla';
                        
                        const choice = await vscode.window.showWarningMessage(
                            'Lo script "test" non è configurato nel package.json del progetto. Vuoi ripararlo?',
                            fixAction, cancelAction
                        );
                        
                        if (choice === fixAction) {
                            const result = await this.createPackageJson();
                            if (!result.success) {
                                return { success: false, output: result.message };
                            }
                            
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        } else {
                            return { success: false, output: 'Operazione annullata dall\'utente.' };
                        }
                    }
                } catch (err: any) {
                    return { success: false, output: 'Errore nella lettura del package.json: ' + err.message };
                }
            }

            try {
                const { stdout, stderr } = await this.execPromise('npm test', { cwd: rootPath });
                return { success: true, output: stdout || stderr };
            } catch (execError: any) {
                return { 
                    success: false, 
                    output: execError.stdout || execError.stderr || execError.message 
                };
            }
        } catch (err: any) {
            return { success: false, output: err.message };
        }
    }

    private async getAllFiles(dir: string): Promise<string[]> {
        const results: string[] = [];
        
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            
            const entryPromises = entries.map(async entry => {
                
                if (entry.isDirectory() && IGNORED_DIRS.includes(entry.name)) {
                    return [];
                }
                
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    return await this.getAllFiles(fullPath);
                } else {
                    return [fullPath];
                }
            });

            const fileArrays = await Promise.all(entryPromises);

            for (const fileArray of fileArrays) {
                results.push(...fileArray);
            }
        } catch (error) {
            console.error(`Errore durante la scansione della directory ${dir}:`, error);
        }
        return results;
    }

    public async getProjectStructure(): Promise<{ 
        language: string; 
        hasTests: boolean;
        testFiles: string[];
        sourceFiles: string[];
    }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('Nessun workspace aperto');
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            
            const files = await this.getAllFiles(rootPath);
            
            const testFiles = files.filter(file => 
                file.includes('.test.') || 
                file.includes('.spec.') || 
                file.includes('/__tests__/') || 
                file.includes('/test/')
            );
            
            const fileExtensions = files.map(file => path.extname(file).toLowerCase());
            const extensionCounts = new Map<string, number>();
            
            fileExtensions.forEach(ext => {
                if (ext) {
                    const count = extensionCounts.get(ext) || 0;
                    extensionCounts.set(ext, count + 1);
                }
            });
            
            let dominantExtension = '';
            let maxCount = 0;
            const codeExtensions = ['.ts', '.js', '.py', '.java', '.cs', '.go', '.rb', '.php', '.c', '.cpp'];

            extensionCounts.forEach((count, ext) => {
                if (count > maxCount || (count === maxCount && codeExtensions.includes(ext) && !codeExtensions.includes(dominantExtension))) {
                    maxCount = count;
                    dominantExtension = ext;
                }
            });
            
            const languageMap: Record<string, string> = {
                '.js': 'javascript',
                '.ts': 'typescript',
                '.py': 'python',
                '.java': 'java',
                '.cs': 'csharp',
                '.go': 'go',
                '.rb': 'ruby',
                '.php': 'php',
                '.c': 'c',
                '.cpp': 'cpp'
            };

            const language = languageMap[dominantExtension] || 'javascript';
            
            const sourceFiles = files
                .filter(file => codeExtensions.includes(path.extname(file).toLowerCase()))
                .filter(file => !testFiles.includes(file));
            
            return {
                language,
                hasTests: testFiles.length > 0,
                testFiles,
                sourceFiles
            };
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante l'analisi del workspace: ${error}`);
            return {
                language: 'unknown',
                hasTests: false,
                testFiles: [],
                sourceFiles: []
            };
        }
    }

    public async getCommitHistory(limit: number = 10): Promise<CommitInfo[]> {
        return await this.gitService.getRecentCommits(limit);
    }

    public async getImplementedCode(): Promise<string> {
        const commits = await this.gitService.getRecentCommits(1);
        if (commits.length === 0) {
            return '';
        }

        const diff = await this.gitService.showCommitDetails([commits[0].hash]);
        return this.extractAddedLines(diff).join('\n');
    }

    private extractAddedLines(diff: string): string[] {
        return diff
            .split('\n')
            .filter(line => line.startsWith('+') && !line.startsWith('+++'))
            .map(line => line.slice(1));
    }

    public async commitChanges(state: TddState, commitTitle?: string): Promise<void> {
        try {
            const modifiedFiles = await this.gitService.getModifiedFiles();
            const filesToCommit = modifiedFiles
                .split('\n')
                .filter(line => line.trim() !== '')
                .map(line => line.substring(3));
            
            if (filesToCommit.length === 0) {
                vscode.window.showInformationMessage('Nothing to commit. No modified files found.');
            }

            let commitMessage = '';

            switch (state.currentPhase) {
                case TddPhase.GREEN:
                    commitMessage = `GREEN: ${state.selectedTest?.title || 'Implementazione funzionalità'}`;
                    break;
                case TddPhase.REFACTORING:
                    commitMessage = `REFACTORING: ${commitTitle || 'Refactoring del codice'}`;
                    break;
                default:
                    commitMessage = `${state.currentPhase.toUpperCase()}: ${state.selectedTest?.title || 'Implementazione di test'}`;
                    break;
            }

            await this.gitService.commitFiles(filesToCommit, commitMessage);
        } catch (error) {
            vscode.window.showErrorMessage(`Error during commit: ${error}`);
        }
    }

    public async getModifiedFiles(): Promise<string> {
        try {
            return await this.gitService.getModifiedFiles();
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante il recupero dei file modificati: ${error}`);
            return '';
        }
    }

    private async createPackageJson(): Promise<{ success: boolean; message: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return { success: false, message: 'Nessun workspace aperto' };
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const packageJsonPath = path.join(rootPath, 'package.json');
            
            let packageJson: any = {};
            let exists = false;
            
            try {
                if (fs.existsSync(packageJsonPath)) {
                    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                    exists = true;
                }
            } catch (err: any) {
                return { success: false, message: `Errore nella lettura del package.json: ${err.message}` };
            }
            
            let modified = false;
            
            if (!exists) {
                packageJson = {
                    "name": path.basename(rootPath),
                    "version": "1.0.0",
                    "description": "Progetto TDD con TDD-Mentor-AI",
                    "main": "index.js",
                    "scripts": {
                        "test": "jest"
                    },
                    "keywords": ["tdd", "testing"],
                    "author": "",
                    "license": "ISC",
                    "devDependencies": {
                        "jest": "^29.0.0"
                    }
                };
                modified = true;
            } 
            else if (!packageJson.scripts || !packageJson.scripts.test) {
                if (!packageJson.scripts) {
                    packageJson.scripts = {};
                }
                packageJson.scripts.test = "jest";
                
                if (!packageJson.devDependencies) {
                    packageJson.devDependencies = {};
                }
                if (!packageJson.devDependencies.jest) {
                    packageJson.devDependencies.jest = "^29.0.0";
                }
                
                modified = true;
            }
            
            if (modified) {
                this.fsWriteFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

                const terminalCommand = 'npm install';
                const terminal = vscode.window.createTerminal('TDD-Mentor-AI Setup');
                terminal.sendText(`cd "${rootPath}"`);
                terminal.sendText(terminalCommand);
                terminal.show();
                
                return { 
                    success: true, 
                    message: exists ? 
                        'Il package.json è stato aggiornato con lo script test.' : 
                        'Il package.json è stato creato con la configurazione per i test.' 
                };
            }
            
            return { success: true, message: 'Il package.json è già configurato correttamente.' };
        } catch (err: any) {
            return { success: false, message: `Errore durante la configurazione: ${err.message}` };
        }
    }
}
