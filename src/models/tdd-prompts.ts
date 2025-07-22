import { AiGenerationConfig, RefactoringSuggestion, TestProposal, UserStory } from "./tdd-models";

export const userStoriesConfig: AiGenerationConfig<UserStory> = {
    systemPrompt: `Sei un esperto di analisi di requisiti software. Il tuo compito è analizzare il contesto del progetto e generare 10 user stories realistiche e implementabili.
        FORMATO DI RISPOSTA RICHIESTO:
        Devi rispondere SOLO con un oggetto JSON senza blocchi di codice o backticks.
        Il formato deve essere esattamente:
        
        {
            "items": [
                {
                    "id": "us-001",
                    "title": "Titolo della user story",
                    "description": "Descrizione della user story"
                },
                ...altre user stories...
            ]
        }`,
    userPrompt: 'Analizza il contesto del progetto e genera 10 potenziali user stories basate sul codice implementato e sulla storia dei commit. Le user stories devono seguire il formato "Come [ruolo] voglio [funzionalità] per [motivo]". Ogni user story deve avere un id, un titolo e una descrizione breve.',
    selectionPrompt: `Date queste user stories, seleziona le 3 più rilevanti e utili per il progetto. Considera fattori come la fattibilità, il valore per l\'utente e le dipendenze con altre funzionalità.
        FORMATO DI RISPOSTA RICHIESTO:
            Devi rispondere SOLO con un oggetto JSON senza blocchi di codice o backticks.
            Il formato deve essere esattamente:
            
            {
                "items": [
                    {
                        "id": "us-001",
                        "title": "Titolo della user story",
                        "description": "Descrizione della user story"
                    },
                    ...altre user stories...
                ]
            }`,
    modelOptions: {
        model: 'deepseek/deepseek-chat-v3-0324:free',
        maxTokens: 2000,
        temperature: 0.7
    }
};

export const testProposalsConfig: AiGenerationConfig<TestProposal> = {
    systemPrompt: `Sei un esperto di TDD (Test-Driven Development). Il tuo compito è generare 10 proposte di test che guidino l\'implementazione di una user story.
        FORMATO DI RISPOSTA RICHIESTO:
            Devi rispondere SOLO con un oggetto JSON senza blocchi di codice o backticks.
            Il formato deve essere esattamente:
            
            {
                "items": [
                    {
                        "id": "test-001",
                        "title": "Titolo del test",
                        "description": "Descrizione del test",
                        "code": "Codice del test",
                        "targetFile": "nomeDelFile.test.js"
                    },
                    ...altre proposte di test...
                ]
            }
        IMPORTANTE: Nel campo "targetFile" inserisci SOLO il nome del file (esempio: "calculator.test.js"), 
        NON il percorso completo. Non usare mai percorsi assoluti come "C:\\path\\to\\file.js" o relativi 
        come "src/tests/file.js".`,
    userPrompt: 'Genera 10 proposte di test dettagliate per la user story selezionata. Ogni test deve avere un id, un titolo, una descrizione e il codice di implementazione. Nel caso in cui il progetto contenga già un file di test specifico per la user story, includi anche il percorso del file target, altrimenti creane uno nuovo.',
    selectionPrompt: `Dati questi test per la user story selezionata, seleziona i 3 test più rilevanti e utili. Considera fattori come la copertura del codice, la complessità dell\'implementazione e i casi limite.
        FORMATO DI RISPOSTA RICHIESTO:
            Devi rispondere SOLO con un oggetto JSON senza blocchi di codice o backticks.
            Il formato deve essere esattamente:
            
            {
                "items": [
                    {
                        "id": "test-001",
                        "title": "Titolo del test",
                        "description": "Descrizione del test",
                        "code": "Codice del test",
                        "targetFile": "nomeDelFile.test.js"
                    },
                    ...altre proposte di test...
                ]
            }
        IMPORTANTE: Nel campo "targetFile" inserisci SOLO il nome del file (esempio: "calculator.test.js"), 
        NON il percorso completo. Non usare mai percorsi assoluti come "C:\\path\\to\\file.js" o relativi 
        come "src/tests/file.js".`,
    modelOptions: {
        model: 'deepseek/deepseek-chat-v3-0324:free',
        maxTokens: 2000,
        temperature: 0.7
    }
};

export const refactoringSuggestionsConfig: AiGenerationConfig<RefactoringSuggestion> = {
    systemPrompt: `Sei un esperto di refactoring del codice e code smell. Il tuo compito è analizzare il codice esistente e generare 10 suggerimenti di refactoring per migliorare la manutenibilità e le prestazioni.
        FORMATO DI RISPOSTA RICHIESTO:
            Devi rispondere SOLO con un oggetto JSON senza blocchi di codice o backticks.
            Il formato deve essere esattamente:
            
            {
                "items": [
                    {
                        "id": "suggestion-001",
                        "title": "Titolo del suggerimento",
                        "description": "Descrizione del suggerimento"
                    },
                    ...altri suggerimenti di refactoring...
                ]
            }`,
    userPrompt: 'Analizza il codice e suggerisci 10 miglioramenti. Per ogni suggerimento, fornisci un id, un titolo e una descrizione dettagliata del refactoring proposto. Considera aspetti come la riduzione della complessità, l\'eliminazione di code smell, il miglioramento della leggibilità e l\'uso di pattern riconosciuti.',
    selectionPrompt: `Dati questi suggerimenti di refactoring, seleziona i 3 più impattanti. Considera fattori come l\'impatto sul codice esistente, il rapporto tra la complessità e i benefici attesi.
        FORMATO DI RISPOSTA RICHIESTO:
            Devi rispondere SOLO con un oggetto JSON senza blocchi di codice o backticks.
            Il formato deve essere esattamente:
            
            {
                "items": [
                    {
                        "id": "suggestion-001",
                        "title": "Titolo del suggerimento",
                        "description": "Descrizione del suggerimento"
                    },
                    ...altri suggerimenti di refactoring...
                ]
            }`,
    modelOptions: {
        model: 'deepseek/deepseek-chat-v3-0324:free',
        maxTokens: 2000,
        temperature: 0.7
    }
};

export const aiConfigs = {
    userStories: userStoriesConfig,
    testProposals: testProposalsConfig,
    refactoringSuggestions: refactoringSuggestionsConfig
};