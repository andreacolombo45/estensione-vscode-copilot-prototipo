import { AiGenerationConfig, RefactoringSuggestion, TestProposal, UserStory, RefactoringFeedback } from "./tdd-models";

export const userStoriesConfig: AiGenerationConfig<UserStory> = {
    systemPrompt: `Sei un esperto di analisi di requisiti software e progettazione TDD. Il tuo compito è analizzare il contesto del progetto Java e generare 10 user stories realistiche e implementabili. Le user stories devono essere semplici, chiare ed evitare soluzioni troppo complesse o astratte.
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
        model: 'deepseek/deepseek-chat-v3.1:free',
        maxTokens: 2000,
        temperature: 0.7
    }
};

export const testProposalsConfig: AiGenerationConfig<TestProposal> = {
    systemPrompt: `Sei un esperto di TDD, con particolare attenzione alla progettazione di test significativi per guidare la scrittura del codice. Il tuo compito è supportare uno studente nello sviluppo incrementale attraverso test ben scelti.
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
                        "targetFile": "nomeDelFileTest.java"
                    },
                    ...altre proposte di test...
                ]
            }

        IMPORTANTE: 
        - Nel campo "targetFile" inserisci SOLO il nome del file (esempio: "CalculatorTest.java"), 
        - I test devono usare JUnit 5 completo con annotazioni @Test e Mockito per mockare elementi esterni,
        - Usa le convenzioni di naming Java (camelCase per metodi, PascalCase per classi),
        - Includi import appropriati nei commenti se necessario
        
        ESEMPI DI TEST:
        @Test
        public void testNotifyObserver() {
            Model model = new Model();
            Observer<List<Train>> obs = mock();

            model.addObserver(obs);
            model.notifyObservers();

            verify(obs).update(model);
        }
        `,
    userPrompt: 'Analizza il codice già implementato e genera 10 proposte di test dettagliate per la user story selezionata. Ogni test deve avere un id, un titolo, una descrizione e il codice di implementazione. Nel caso in cui il progetto contenga già un file di test specifico per la user story, includi anche il percorso del file target, altrimenti creane uno nuovo. Includi dove sensato, test parametrici (@ParametrizedTest) per testare lo stesso comportamento su più valori significativi. I test devono essere facilmente implementabili, assertivi, devono far emergere nuove funzionalità.',
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
                        "targetFile": "nomeDelFileTest.java"
                    },
                    ...altre proposte di test...
                ]
            }

        IMPORTANTE: 
        - Nel campo "targetFile" inserisci SOLO il nome del file (esempio: "CalculatorTest.java"), 
        - I test devono usare JUnit 5 completo con annotazioni @Test e Mockito per mockare elementi esterni,
        - Usa le convenzioni di naming Java (camelCase per metodi, PascalCase per classi),
        - Includi import appropriati nei commenti se necessario
        
        ESEMPI DI TEST:
        @Test
        public void testNotifyObserver() {
            Model model = new Model();
            Observer<List<Train>> obs = mock();

            model.addObserver(obs);
            model.notifyObservers();
            
            verify(obs).update(model);
        }
        `,
    modelOptions: {
        model: 'deepseek/deepseek-chat-v3.1:free',
        maxTokens: 5000,
        temperature: 0.7
    }
};

export const refactoringSuggestionsConfig: AiGenerationConfig<RefactoringSuggestion> = {
    systemPrompt: `Sei un esperto di refactoring del codice e code smell. Il tuo compito è analizzare il codice esistente e proporre migliorie che aumentino la qualità senza alterarne il comportamento e senza introdurre implementazioni premature. Focalizza l'attenzione su un design semplice, pattern noti e best practice nel contesto del TDD.
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
            }
                
            IMPORTANTE:
            - Non devi aggiungere nuove funzionalità;
            - Non devi complicare inutilmente il codice;
            - Considera SOLO refactoring minimali e immediati;
            - Evita l'aggiunta di nuovi campi o metodi se non strettamente necessari;
            - Non suggerire modifiche architetturali o strutturali complesse.
            `,
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
            }  

            IMPORTANTE:
            - Non devi aggiungere nuove funzionalità;
            - Non devi complicare inutilmente il codice;
            - Considera SOLO refactoring minimali e immediati;
            - Evita l'aggiunta di nuovi campi o metodi se non strettamente necessari;
            - Non suggerire modifiche architetturali o strutturali complesse.
            `,
    modelOptions: {
        model: 'deepseek/deepseek-chat-v3.1:free',
        maxTokens: 2000,
        temperature: 0.7
    }
};

export const refactoringFeedbackConfig: AiGenerationConfig<RefactoringFeedback> = {
    systemPrompt: `Sei un esperto di refactoring del codice e code review. Il tuo compito è analizzare le modifiche apportate al codice durante la fase di refactoring e fornire un feedback costruttivo.
        FORMATO DI RISPOSTA RICHIESTO:
            Devi rispondere SOLO con un oggetto JSON senza blocchi di codice o backticks.
            Il formato deve essere esattamente:

            {
                "hasChanges": true,
                "feedback": "Descrizione dettagliata dei cambiamenti effettuati.",
                "suggestions": [
                    "Suggerimento 1",
                    "Suggerimento 2"
                ]
            }
            
            IMPORTANTE:
            - Non devi aggiungere nuove funzionalità;
            - Non devi complicare inutilmente il codice;
            - Considera SOLO refactoring minimali e immediati;
            - Evita l'aggiunta di nuovi campi o metodi se non strettamente necessari;
            - Non suggerire modifiche architetturali o strutturali complesse.
            `,
    userPrompt: 'Analizza il codice modificato e fornisci un feedback dettagliato sui cambiamenti effettuati. Valuta la qualità delle modifiche considerando: principi SOLID, design patterns Java, gestione delle eccezioni, uso appropriato delle Collections, performance, e leggibilità del codice. Indica se sono stati apportati cambiamenti significativi e fornisci suggerimenti per ulteriori miglioramenti specifici.',
    selectionPrompt: '',
    modelOptions: {
        model: 'deepseek/deepseek-chat-v3.1:free',
        maxTokens: 2000,
        temperature: 0.7
    }
};

export const greenQuestionConfig: AiGenerationConfig<string> = {
    systemPrompt: `Sei un esperto mentore AI specializzato in TDD e sviluppo software. Il tuo compito è rispondere a domande tecniche poste da uno studente che sta implementando codice seguendo la metodologia TDD. 
        IMPORTANTE: Le tue risposte devono seguire la metodologia TDD e non devono mai fornire soluzioni complete, ma solo suggerimenti e indicazioni per aiutare lo studente a trovare la soluzione da solo.
    `,
    userPrompt: '',
    selectionPrompt: '',
    modelOptions: {
        model: 'deepseek/deepseek-chat-v3.1:free',
        maxTokens: 2000,
        temperature: 0.7
    }
};

export const aiConfigs = {
    userStories: userStoriesConfig,
    testProposals: testProposalsConfig,
    refactoringSuggestions: refactoringSuggestionsConfig,
    refactoringFeedback: refactoringFeedbackConfig,
    greenQuestion: greenQuestionConfig
};