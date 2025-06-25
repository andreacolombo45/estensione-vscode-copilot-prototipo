import * as vscode from 'vscode';
import { AiMode, UserStory, TestProposal, RefactoringSuggestion } from '../models/tdd-models';

/**
 * Servizio che gestisce l'interazione con i modelli AI
 */
export class AiService {
    private static instance: AiService;

    private constructor() {
        // Costruttore privato per il singleton
    }

    public static getInstance(): AiService {
        if (!AiService.instance) {
            AiService.instance = new AiService();
        }
        return AiService.instance;
    }

    /**
     * Analizza il codice del progetto e genera user stories
     * @returns Lista di user stories suggerite
     */
    public async generateUserStories(): Promise<UserStory[]> {
        try {
            // In una implementazione reale, qui ci sarebbe l'integrazione con un modello AI
            // Per ora, restituiamo dati di esempio
            return [
                {
                    id: 'us1',
                    title: 'Gestire l\'autenticazione degli utenti',
                    description: 'Come utente, voglio poter registrarmi e accedere al sistema con le mie credenziali per gestire il mio profilo personale.'
                },
                {
                    id: 'us2',
                    title: 'Aggiungere elementi alla lista',
                    description: 'Come utente, voglio poter aggiungere nuovi elementi alla mia lista per tenere traccia delle attività da svolgere.'
                },
                {
                    id: 'us3',
                    title: 'Filtrare gli elementi per stato',
                    description: 'Come utente, voglio poter filtrare gli elementi della lista per stato (completati, da fare) per concentrarmi su ciò che è rilevante.'
                }
            ];
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante la generazione delle user stories: ${error}`);
            return [];
        }
    }

    /**
     * Genera proposte di test basate su una user story
     * @param userStory La user story selezionata
     * @returns Lista di test proposti
     */
    public async generateTestProposals(userStory: UserStory): Promise<TestProposal[]> {
        try {
            // In una implementazione reale, qui ci sarebbe l'integrazione con un modello AI
            // Per ora, restituiamo dati di esempio
            if (userStory.id === 'us1') {
                return [
                    {
                        id: 'test1',
                        title: 'Test di registrazione utente',
                        description: 'Verifica che un nuovo utente possa registrarsi con email e password valide',
                        code: `
test('should register a new user with valid credentials', async () => {
    const email = 'test@example.com';
    const password = 'Password123!';
    
    const result = await userService.register(email, password);
    
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(email);
});`,
                        targetFile: 'auth.test.js'
                    },
                    {
                        id: 'test2',
                        title: 'Test di login utente',
                        description: 'Verifica che un utente possa accedere con credenziali corrette',
                        code: `
test('should login user with correct credentials', async () => {
    const email = 'existing@example.com';
    const password = 'Password123!';
    
    const result = await userService.login(email, password);
    
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
});`,
                        targetFile: 'auth.test.js'
                    },
                    {
                        id: 'test3',
                        title: 'Test di login fallito',
                        description: 'Verifica che il login fallisca con credenziali errate',
                        code: `
test('should fail login with incorrect credentials', async () => {
    const email = 'existing@example.com';
    const password = 'WrongPassword123!';
    
    const result = await userService.login(email, password);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
});`,
                        targetFile: 'auth.test.js'
                    }
                ];
            } else {
                // Esempi generici per altre user stories
                return [
                    {
                        id: 'test1',
                        title: `Test per la user story: ${userStory.title}`,
                        description: `Verifica funzionalità principale per: ${userStory.title}`,
                        code: `
test('should implement main functionality', () => {
    // Arrange
    const input = 'example input';
    
    // Act
    const result = someFunction(input);
    
    // Assert
    expect(result).toBeDefined();
});`,
                        targetFile: 'feature.test.js'
                    },
                    {
                        id: 'test2',
                        title: `Test caso limite per: ${userStory.title}`,
                        description: `Verifica comportamento in caso limite per: ${userStory.title}`,
                        code: `
test('should handle edge case correctly', () => {
    // Arrange
    const input = null;
    
    // Act
    const result = someFunction(input);
    
    // Assert
    expect(result).toBeNull();
});`,
                        targetFile: 'feature.test.js'
                    },
                    {
                        id: 'test3',
                        title: `Test errore per: ${userStory.title}`,
                        description: `Verifica gestione degli errori per: ${userStory.title}`,
                        code: `
test('should throw error for invalid input', () => {
    // Arrange
    const invalidInput = -1;
    
    // Act & Assert
    expect(() => {
        someFunction(invalidInput);
    }).toThrow('Invalid input');
});`,
                        targetFile: 'feature.test.js'
                    }
                ];
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante la generazione dei test proposti: ${error}`);
            return [];
        }
    }

    /**
     * Genera suggerimenti di refactoring per il codice corrente
     * @returns Lista di suggerimenti di refactoring
     */
    public async generateRefactoringSuggestions(): Promise<RefactoringSuggestion[]> {
        try {
            // In una implementazione reale, qui ci sarebbe l'integrazione con un modello AI
            // Per ora, restituiamo dati di esempio
            return [
                {
                    id: 'refactor1',
                    title: 'Estrai metodo comune',
                    description: 'Il codice contiene logica duplicata nelle funzioni processData e validateData. ' +
                        'Considera di estrarre la logica comune in un metodo separato per migliorare la manutenibilità.'
                },
                {
                    id: 'refactor2',
                    title: 'Utilizza pattern factory',
                    description: 'La creazione degli oggetti utente è sparsa in diverse parti del codice. ' + 
                        'Considera l\'implementazione del pattern Factory per centralizzare la creazione degli oggetti.'
                },
                {
                    id: 'refactor3',
                    title: 'Migliora la gestione degli errori',
                    description: 'Attualmente gli errori vengono gestiti in modo incoerente. ' +
                        'Considera l\'implementazione di un sistema di gestione degli errori coerente utilizzando try/catch o un meccanismo centralizzato.'
                }
            ];
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante la generazione dei suggerimenti di refactoring: ${error}`);
            return [];
        }
    }

    /**
     * Verifica i risultati dei test
     * @returns Se i test sono stati eseguiti con successo e il messaggio associato
     */
    public async verifyTests(): Promise<{ success: boolean; message: string }> {
        try {
            // In una implementazione reale, qui ci sarebbe l'esecuzione effettiva dei test
            // Per ora, simuliamo un risultato di successo
            return {
                success: true,
                message: 'Tutti i test sono stati completati con successo!'
            };
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante la verifica dei test: ${error}`);
            return {
                success: false,
                message: `Errore durante l'esecuzione dei test: ${error}`
            };
        }
    }
}
