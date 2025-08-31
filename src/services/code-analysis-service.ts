import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CommitInfo, GitService } from './git-service';
import { TddPhase, TddState } from '../models/tdd-models';
import { exec } from 'child_process';
import {promisify} from 'util';

const IGNORED_DIRS = ['node_modules', '.git', '.vscode', 'dist', 'build', 'out', '.gradle', 'gradle'];

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
                const testDir = path.join(rootPath, 'src', 'test', 'java');
                testFilePath = path.join(testDir, targetFile);
                const dir = path.dirname(testFilePath);

                await fs.promises.mkdir(dir, { recursive: true });
                const packageName = this.extractPackageFromTestFile(targetFile);
                const className = path.basename(targetFile, '.java');
                const baseTemplate = `package ${packageName};

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ${className} {
    // I test verranno aggiunti qui
}
`;
                await fs.promises.writeFile(testFilePath, baseTemplate);
            }

            const currentContent = await fs.promises.readFile(testFilePath, 'utf8');

            const lastBraceIndex = currentContent.lastIndexOf('}');
            if (lastBraceIndex === -1) {
                throw new Error('Formato del file di test non valido');
            }

            const beforeLastBrace = currentContent.substring(0, lastBraceIndex);
            const afterLastBrace = currentContent.substring(lastBraceIndex);

            const updatedContent = `${beforeLastBrace}
    ${testCode.trim()}

${afterLastBrace}`;

            await fs.promises.writeFile(testFilePath, updatedContent);

            const document = await vscode.workspace.openTextDocument(testFilePath);
            await vscode.window.showTextDocument(document);
            
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante l'inserimento del codice di test: ${error}`);
            return false;
        }
    }

    private extractPackageFromTestFile(fileName: string): string {
        const pathParts = fileName.split('/');
        if (pathParts.length > 1) {
            return pathParts.slice(0, -1).join('.');
        }
        return 'test'; 
    }
    
    public async runTests(): Promise<{ success: boolean; output: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return { success: false, output: 'Nessun workspace aperto' };
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const buildGradlePath = path.join(rootPath, 'build.gradle');
            const settingsGradlePath = path.join(rootPath, 'settings.gradle');

            if (!this.fsExistsSync(buildGradlePath)) {
                const createAction = 'Crea build.gradle';
                const cancelAction = 'Annulla';
                
                const choice = await vscode.window.showWarningMessage(
                    'Non è stato trovato un file build.gradle nel progetto. Vuoi crearne uno per eseguire i test?',
                    createAction, cancelAction
                );
                
                if (choice === createAction) {
                    const result = await this.createGradleProject();
                    if (!result.success) {
                        return { success: false, output: result.message };
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } else {
                    return { success: false, output: 'Operazione annullata dall\'utente.' };
                }
            } else {
                try {
                    await this.execPromise('gradle --version', { cwd: rootPath });
                } catch (err: any) {
                    try {
                        await this.execPromise('./gradlew --version', { cwd: rootPath });
                    } catch (wrapperErr: any) {
                        return { 
                            success: false, 
                            output: 'Gradle non trovato. Installa Gradle o usa il Gradle Wrapper.' 
                        };
                    }
                }
            }

            try {
                let command = './gradlew test';
                try {
                    const { stdout, stderr } = await this.execPromise(command, { cwd: rootPath });
                    return { success: true, output: stdout || stderr };
                } catch (wrapperError) {
                    command = 'gradle test';
                    const { stdout, stderr } = await this.execPromise(command, { cwd: rootPath });
                    return { success: true, output: stdout || stderr };
                }
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

            function isTestFile(file: string): boolean {
                const normalized = file.replace(/\\/g, '/');
                return (
                    /\/test\//.test(normalized) &&
                    /\.java$/.test(normalized) &&
                    /(Test\.java|Tests\.java)$/.test(path.basename(normalized))
                );
            }

            const testFiles = files.filter(isTestFile);

            const sourceFiles = files
                .filter(file => file.endsWith('.java'))
                .filter(file => !testFiles.includes(file))
                .filter(file => {
                    const normalized = file.replace(/\\/g, '/');
                    return /\/main\//.test(normalized) || !/\/test\//.test(normalized);
                });
            
            return {
                language: 'java',
                hasTests: testFiles.length > 0,
                testFiles,
                sourceFiles
            };
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante l'analisi del workspace: ${error}`);
            return {
                language: 'java',
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

    public extractAddedLines(diff: string): string[] {
        return diff
            .split('\n')
            .filter(line =>
                (line.startsWith('+') && !line.startsWith('+++')) ||
                (line.startsWith('-') && !line.startsWith('---'))
            )
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

    private async createGradleProject(): Promise<{ success: boolean; message: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return { success: false, message: 'Nessun workspace aperto' };
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const buildGradlePath = path.join(rootPath, 'build.gradle');
            const settingsGradlePath = path.join(rootPath, 'settings.gradle');
            
            const buildGradleContent = `plugins {
    id 'java'
    id 'application'
}

group = 'com.example'
version = '1.0.0'
sourceCompatibility = '11'

repositories {
    mavenCentral()
}

dependencies {
    testImplementation platform('org.junit:junit-bom:5.9.1')
    testImplementation 'org.junit.jupiter:junit-jupiter'
}

test {
    useJUnitPlatform()
}

application {
    mainClass = 'com.example.Main'
}
`;

            const projectName = path.basename(rootPath);
            const settingsGradleContent = `rootProject.name = '${projectName}'
`;

            this.fsWriteFileSync(buildGradlePath, buildGradleContent);
            this.fsWriteFileSync(settingsGradlePath, settingsGradleContent);

            const srcMainJava = path.join(rootPath, 'src', 'main', 'java', 'com', 'example');
            const srcTestJava = path.join(rootPath, 'src', 'test', 'java', 'com', 'example');

            await fs.promises.mkdir(srcMainJava, { recursive: true });
            await fs.promises.mkdir(srcTestJava, { recursive: true });

            const mainJavaContent = `package com.example;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, TDD World!");
    }
}
`;
            const mainJavaPath = path.join(srcMainJava, 'Main.java');
            this.fsWriteFileSync(mainJavaPath, mainJavaContent);

            try {
                const terminal = vscode.window.createTerminal('TDD-Mentor-AI Gradle Setup');
                terminal.sendText(`cd "${rootPath}"`);
                terminal.sendText('gradle wrapper --gradle-version 7.6');
                terminal.show();
            } catch (error) {
                console.log('Gradle wrapper initialization failed, but project structure created');
            }

            return { success: true, message: 'Progetto Gradle creato con successo!' };
        } catch (err: any) {
            return { success: false, message: `Errore durante la creazione del progetto Gradle: ${err.message}` };
        }
    }
}
