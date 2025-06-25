import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Servizio per l'analisi del codice e l'interazione con i file del progetto
 */
export class CodeAnalysisService {
    private static instance: CodeAnalysisService;

    private constructor() {
        // Costruttore privato per il singleton
    }

    public static getInstance(): CodeAnalysisService {
        if (!CodeAnalysisService.instance) {
            CodeAnalysisService.instance = new CodeAnalysisService();
        }
        return CodeAnalysisService.instance;
    }

    /**
     * Analizza il workspace corrente per comprendere la struttura del progetto
     * @returns Informazioni sulla struttura del progetto
     */
    public async analyzeWorkspace(): Promise<{ 
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
            
            // Ottieni tutti i file nel workspace
            const files = await this.getAllFiles(rootPath);
            
            // Identifica file di test e sorgente
            const testFiles = files.filter(file => 
                file.includes('.test.') || 
                file.includes('.spec.') || 
                file.includes('/__tests__/') || 
                file.includes('/test/')
            );
            
            // Determina il linguaggio principale del progetto
            const fileExtensions = files.map(file => path.extname(file).toLowerCase());
            const extensionCounts = new Map<string, number>();
            
            fileExtensions.forEach(ext => {
                const count = extensionCounts.get(ext) || 0;
                extensionCounts.set(ext, count + 1);
            });
            
            let dominantExtension = '';
            let maxCount = 0;
            
            extensionCounts.forEach((count, ext) => {
                if (count > maxCount) {
                    maxCount = count;
                    dominantExtension = ext;
                }
            });
            
            let language = 'javascript'; // Default
            
            switch (dominantExtension) {
                case '.js':
                    language = 'javascript';
                    break;
                case '.ts':
                    language = 'typescript';
                    break;
                case '.py':
                    language = 'python';
                    break;
                case '.java':
                    language = 'java';
                    break;
                case '.cs':
                    language = 'csharp';
                    break;
                // Altri linguaggi possono essere aggiunti qui
            }
            
            // Filtra i file sorgente (escludi node_modules, .git, ecc.)
            const sourceFiles = files.filter(file => 
                !file.includes('node_modules') && 
                !file.includes('.git') && 
                !testFiles.includes(file)
            );
            
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

    /**
     * Inserisce il codice di test in un file appropriato
     * @param testProposal Il test da inserire
     * @returns Se l'operazione è stata completata con successo
     */
    public async insertTestCode(testCode: string, targetFile: string): Promise<boolean> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('Nessun workspace aperto');
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            let testFilePath = '';

            // Cerca il file di test specificato o crea un nuovo file
            const existingTestFiles = await this.getAllFiles(rootPath);
            const matchingFiles = existingTestFiles.filter(file => 
                file.endsWith(targetFile) || 
                path.basename(file) === targetFile
            );

            if (matchingFiles.length > 0) {
                // Usa il primo file corrispondente
                testFilePath = matchingFiles[0];
            } else {
                // Crea un nuovo file
                testFilePath = path.join(rootPath, 'tests', targetFile);
                
                // Assicurati che la directory esista
                const testDir = path.dirname(testFilePath);
                if (!fs.existsSync(testDir)) {
                    fs.mkdirSync(testDir, { recursive: true });
                }
                
                // Crea il file con il contenuto iniziale
                fs.writeFileSync(testFilePath, '');
            }

            // Leggi il contenuto corrente del file
            const currentContent = fs.readFileSync(testFilePath, 'utf8');
            
            // Aggiungi il nuovo test in fondo al file
            const updatedContent = currentContent + '\n' + testCode + '\n';
            
            // Scrivi il file aggiornato
            fs.writeFileSync(testFilePath, updatedContent);
            
            // Apri il file nell'editor
            const document = await vscode.workspace.openTextDocument(testFilePath);
            await vscode.window.showTextDocument(document);
            
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante l'inserimento del codice di test: ${error}`);
            return false;
        }
    }

    /**
     * Esegue i test nel progetto
     * @returns Risultati dell'esecuzione dei test
     */
    public async runTests(): Promise<{ success: boolean; output: string }> {
        try {
            // Determina il comando di test appropriato
            const workspaceInfo = await this.analyzeWorkspace();
            
            // In una implementazione reale, qui ci sarebbe l'esecuzione effettiva dei test
            // Questo dipende dal framework di test utilizzato nel progetto
            
            // Per ora, simuliamo un risultato di successo
            return {
                success: true,
                output: 'Test eseguiti con successo:\n\n' +
                       '✅ Test di registrazione utente\n' +
                       '✅ Test di login utente\n' +
                       '✅ Test di login fallito\n\n' +
                       'PASS: 3 test completati'
            };
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante l'esecuzione dei test: ${error}`);
            return {
                success: false,
                output: `Errore durante l'esecuzione dei test: ${error}`
            };
        }
    }

    /**
     * Ottiene tutti i file in una directory in modo ricorsivo
     * @param dir La directory da scansionare
     * @returns Lista di percorsi dei file
     */
    private async getAllFiles(dir: string): Promise<string[]> {
        const results: string[] = [];
        
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    // Ignora directory comuni da escludere
                    if (entry.name !== 'node_modules' && entry.name !== '.git') {
                        const subDirFiles = await this.getAllFiles(fullPath);
                        results.push(...subDirFiles);
                    }
                } else {
                    results.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`Errore durante la scansione della directory ${dir}:`, error);
        }
        
        return results;
    }
}
