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
            const { stdout, stderr } = await this.execPromise('npm test');
            return { success: true, output: stdout || stderr };
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
}
