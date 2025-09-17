import * as vscode from 'vscode';
import { TddCycleView } from './views/tdd-cycle-view';
import { TddInteractionView } from './views/tdd-interaction-view';
import { TddPhase } from './models/tdd-models';
import { TddStateManager } from './services/tdd-state-manager';
import { AiService } from './services/ai-service';
import { CodeAnalysisService } from './services/code-analysis-service';
import { GitService } from './services/git-service';
import { AiClient } from './services/ai-client';

export async function activate(context: vscode.ExtensionContext) {

	console.log('Estensione "TDD-Mentor-AI" attivata!');

    const stateManager = TddStateManager.getInstance(context);
    let tddInteractionViewProvider: TddInteractionView | undefined;
    let tddCycleViewProvider: TddCycleView | undefined;

    const previousSession = stateManager.loadPreviousSession();

    const apikey = vscode.workspace.getConfiguration('tddMentorAI').get('openaiApiKey', '');
    if (!apikey) {
        const configAction = 'Configura API Key';
        const response = await vscode.window.showWarningMessage(
            'Per utilizzare TDD-Mentor-AI è necessaria una API key di OpenAI.',
            configAction
        );
        
        if (response === configAction) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'tddMentorAI.openaiApiKey');
        }
    }

    const problemRequirements = vscode.workspace.getConfiguration('tddMentorAI').get('problemRequirements', '');
    if (!problemRequirements) {
        const configAction = 'Configura Requisiti Problema';
        const response = await vscode.window.showWarningMessage(
            'Per utilizzare TDD-Mentor-AI è necessario specificare i requisiti del problema.',
            configAction
        );

        if (response === configAction) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'tddMentorAI.problemRequirements');
        }
    }

    const model = vscode.workspace.getConfiguration('tddMentorAI').get('model', '');
    const apiUrl = vscode.workspace.getConfiguration('tddMentorAI').get('apiUrl', '');
    if (!apiUrl || !model) {
        const configAction = 'Configura Impostazioni AI';
        const response = await vscode.window.showWarningMessage(
            'Per utilizzare TDD-Mentor-AI è necessario configurare le impostazioni AI (modello e URL API).',
            configAction
        );

        if (response === configAction) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'tddMentorAI');
        }
    }

    let gitService: GitService | null = null;
    let codeAnalysisService: CodeAnalysisService | null = null;
    let aiService: AiService;

    try {
        gitService = await GitService.create();
        if (!gitService) {
            const initGitAction = 'Inizializza Git';
            const response = await vscode.window.showWarningMessage(
                'TDD-Mentor-AI richiede un repository Git. Alcune funzionalità saranno limitate.',
                initGitAction
            );
            
            if (response === initGitAction) {
                vscode.commands.executeCommand('git.init').then(async () => {
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders && workspaceFolders.length > 0) {
                        const rootPath = workspaceFolders[0].uri.fsPath;
                        const gitignorePath = `${rootPath}\\.gitignore`;
                        const fs = require('fs');
                        const path = require('path');
                        const defaultGitignore = `###########################
# Gradle / Java
###########################
.gradle/
build/
bin/
out/

# File compilati
*.class
*.jar
*.war
*.ear

# Log
*.log

# Risultati test
*.bin
*.xml
*.html
*.json

###########################
# VS Code Extension / Node
###########################
node_modules/
dist/
.vscode-test/
*.vsix

###########################
# IDEs / Editor
###########################
.vscode/
.idea/
*.iml

###########################
# Sistema operativo
###########################
# macOS
.DS_Store
.AppleDouble
.LSOverride

# Windows
Thumbs.db
ehthumbs.db
Desktop.ini

# Linux
*~
`;

                        if (!fs.existsSync(gitignorePath)) {
                            fs.writeFileSync(gitignorePath, defaultGitignore, 'utf8');
                            vscode.window.showInformationMessage('Creato file .gitignore con le regole standard per Gradle/Java/Node.');
                        }

                        const buildGradlePath = path.join(rootPath, 'build.gradle');
                        const settingsGradlePath = path.join(rootPath, 'settings.gradle');
                        const srcMainJava = path.join(rootPath, 'src', 'main', 'java');
                        const srcTestJava = path.join(rootPath, 'src', 'test', 'java');
                        const mainJavaPath = path.join(srcMainJava, 'Main.java');
                        const projectName = path.basename(rootPath);

                        const buildGradleContent = `plugins {
    id 'java'
    id 'application'
}

group = 'example'
version = '1.0.0'
sourceCompatibility = '17'

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
    mainClass = 'Main'
}
`;

            const settingsGradleContent = `rootProject.name = '${projectName}'
`;

            const mainJavaContent = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, TDD World!");
    }
}
`;

                        if (!fs.existsSync(buildGradlePath)) {
                            fs.writeFileSync(buildGradlePath, buildGradleContent, 'utf8');
                        }
                        if (!fs.existsSync(settingsGradlePath)) {
                            fs.writeFileSync(settingsGradlePath, settingsGradleContent, 'utf8');
                        }
                        if (!fs.existsSync(srcMainJava)) {
                            fs.mkdirSync(srcMainJava, { recursive: true });
                        }
                        if (!fs.existsSync(srcTestJava)) {
                            fs.mkdirSync(srcTestJava, { recursive: true });
                        }
                        if (!fs.existsSync(mainJavaPath)) {
                            fs.writeFileSync(mainJavaPath, mainJavaContent, 'utf8');
                        }

                        const { exec } = require('child_process');
                        exec('git add .gitignore build.gradle settings.gradle src/main/java/Main.java', { cwd: rootPath }, (err: any) => {
                            if (!err) {
                                exec('git commit -m "Initial commit: aggiunti .gitignore e file Gradle"', { cwd: rootPath }, (err2: any) => {
                                    if (!err2) {
                                        vscode.window.showInformationMessage('Commit iniziale creato con .gitignore e file Gradle.');
                                    }
                                });
                            }
                        });

                        try {
                            const terminal = vscode.window.createTerminal('TDD-Mentor-AI Gradle Setup');
                            terminal.sendText(`cd "${rootPath}"`);
                            terminal.sendText('gradle wrapper --gradle-version 8.5');
                            terminal.show();
                        } catch (error) {
                            console.log('Gradle wrapper initialization failed, but project structure created');
                        }
                    }
                });
            }
        } else {
            codeAnalysisService = CodeAnalysisService.getInstance(gitService);
            
            const aiClient = new AiClient(apikey, apiUrl, model);
            aiService = await AiService.getInstance(codeAnalysisService, aiClient);

            tddCycleViewProvider = new TddCycleView(context.extensionUri);

            try {
                if (aiService && codeAnalysisService) {
                    tddInteractionViewProvider = await TddInteractionView.create(context.extensionUri, aiService, codeAnalysisService);

                    if (apikey && problemRequirements && gitService && !previousSession) {
                        vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: 'TDD Mentor AI sta generando le user stories iniziali...',
                            cancellable: false
                        }, async () => {
                            const userStories = await aiService.generateUserStories();
                            stateManager.setUserStories(userStories);
                            stateManager.setPhase(TddPhase.PICK);
                            vscode.window.showInformationMessage('User stories iniziali generate con successo!');
                        });
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Errore durante la creazione della vista di interazione TDD: ${error}`);
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Errore durante l'inizializzazione dei servizi: ${error}`);
    }

    if (tddCycleViewProvider) {
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                TddCycleView.viewType,
                tddCycleViewProvider
            )
        );
    }

    if (tddInteractionViewProvider) {
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                TddInteractionView.viewType,
                tddInteractionViewProvider
            )
        );
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.start', () => {
            vscode.commands.executeCommand('workbench.view.extension.tdd-mentor-ai-sidebar');
            
            stateManager.reset();
            vscode.window.showInformationMessage('Sessione TDD Mentor avviata!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.pickPhase', async () => {
            stateManager.setPhase(TddPhase.PICK);
            
            const userStories = await aiService.generateUserStories();
            stateManager.setUserStories(userStories);
            
            vscode.window.showInformationMessage('Fase PICK avviata: scegli una user story.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.redPhase', () => {
            const state = stateManager.state;
            if (!state.selectedUserStory) {
                vscode.window.showWarningMessage('Devi prima selezionare una user story nella fase PICK.');
                return;
            }
            
            stateManager.setPhase(TddPhase.RED);
            vscode.window.showInformationMessage('Fase RED avviata: scegli un test da implementare.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.greenPhase', () => {
            const state = stateManager.state;
            if (!state.selectedTest) {
                vscode.window.showWarningMessage('Devi prima selezionare un test nella fase RED.');
                return;
            }
            
            stateManager.setPhase(TddPhase.GREEN);
            vscode.window.showInformationMessage('Fase GREEN avviata: implementa il codice per far passare il test.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.refactorPhase', () => {
            const state = stateManager.state;
            if (!state.testResults?.success) {
                vscode.window.showWarningMessage('I test devono passare prima di procedere al refactoring.');
                return;
            }
            
            stateManager.setPhase(TddPhase.REFACTORING);
            vscode.window.showInformationMessage('Fase REFACTORING avviata: migliora il tuo codice.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.verify', async () => {
            vscode.window.showInformationMessage('Verifica dei test in corso...');

            const testResults = await codeAnalysisService?.runTests();
            if (testResults) {
                stateManager.setTestResults(testResults.success, testResults.output);
            }

            if (testResults?.success) {
                vscode.window.showInformationMessage('Tutti i test sono passati!');
            } else {
                vscode.window.showWarningMessage('Alcuni test non sono passati. Controlla il messaggio di errore.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.complete', async () => {
            stateManager.setPhase(TddPhase.PICK);
            
            const userStories = await aiService.generateUserStories();
            stateManager.setUserStories(userStories);
            
            vscode.window.showInformationMessage('Fase completata! Ritorno alla fase PICK.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.runTests', async () => {
            stateManager.setPhase(TddPhase.RED);

            const testResults = await codeAnalysisService?.runTests();
            if (testResults) {
                vscode.window.showInformationMessage(`Test eseguiti: ${testResults.success ? 'Successo' : 'Fallimento'}`);
            } else {
                vscode.window.showErrorMessage('Errore durante l\'esecuzione dei test.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.getImplementedCode', async () => {
            const implementedCode = await codeAnalysisService?.getImplementedCode();
            if (implementedCode) {
                vscode.window.showInformationMessage(`Codice implementato: ${implementedCode}`);
            } else {
                vscode.window.showErrorMessage('Errore durante il recupero del codice implementato.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.getModifiedFiles', async () => {
            const modifiedFiles = await codeAnalysisService?.getModifiedFiles();
            if (modifiedFiles) {
                vscode.window.showInformationMessage(`File modificati: ${modifiedFiles}`);
            } else {
                vscode.window.showErrorMessage('Errore durante il recupero dei file modificati.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.getProjectStructure', async () => {
            const projectStructure = await codeAnalysisService?.getProjectStructure();
            if (projectStructure) {
                vscode.window.showInformationMessage(`Struttura del progetto: ${JSON.stringify(projectStructure, null, 2)}`);
            } else {
                vscode.window.showErrorMessage('Errore durante il recupero della struttura del progetto.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.getRecentCommits', async () => {
            const recentCommits = await gitService?.getRecentCommits();
            if (recentCommits) {
                vscode.window.showInformationMessage(`Ultimi commit: ${JSON.stringify(recentCommits, null, 2)}`);
            } else {
                vscode.window.showErrorMessage('Errore durante il recupero degli ultimi commit.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.getLastCommitDetails', async () => {
            const commits = await gitService?.getRecentCommits(1);
            if (!commits || commits.length === 0) {
                vscode.window.showErrorMessage('Nessun commit trovato.');
                return;
            }
                const lastCommitDetails = await gitService?.showCommitDetails([commits[0].hash]);
                if (lastCommitDetails) {
                    vscode.window.showInformationMessage(`Ultimo commit: ${JSON.stringify(lastCommitDetails, null, 2)}`);
                    const diff = codeAnalysisService?.extractAddedLines(lastCommitDetails).join('\n');
                    vscode.window.showInformationMessage(`diff: ${diff}`);
                } else {
                    vscode.window.showErrorMessage('Errore durante il recupero dei dettagli dell\'ultimo commit.');
                }
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.getQuestionCount', () => {
            const count = stateManager.state.greenQuestionCount;
            vscode.window.showInformationMessage(`Contatore domande AI verde: ${count}`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.clearChat', () => {
            stateManager.clearChatHistory();
            vscode.window.showInformationMessage('Chat resettata.');
        })
    );

}

export function deactivate() {}
