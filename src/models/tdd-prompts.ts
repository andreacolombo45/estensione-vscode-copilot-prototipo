import { AiGenerationConfig, RefactoringSuggestion, TestProposal, UserStory } from "./tdd-models";

export const userStoriesConfig: AiGenerationConfig<UserStory> = {
    systemPrompt: 'Sei un esperto di analisi di requisiti software. Il tuo compito è analizzare il contesto del progetto e generare 10 user stories realistiche e implementabili.',
    userPrompt: 'Analizza il contesto del progetto e genera 10 potenziali user stories basate sul codice implementato e sulla storia dei commit. Le user stories devono seguire il formato "Come [ruolo] voglio [funzionalità] per [motivo]". Ogni user story deve avere un id, un titolo e una descrizione breve.',
    selectionPrompt: 'Date queste user stories, seleziona le 3 più rilevanti e utili per il progetto. Considera fattori come la fattibilità, il valore per l\'utente e le dipendenze con altre funzionalità.',
    modelOptions: {
        model: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7
    }
};

export const testProposalsConfig: AiGenerationConfig<TestProposal> = {
    systemPrompt: 'Sei un esperto di TDD (Test-Driven Development). Il tuo compito è generare 10 proposte di test che guidino l\'implementazione di una user story.',
    userPrompt: 'Genera 10 proposte di test dettagliate per la user story selezionata. Ogni test deve avere un id, un titolo, una descrizione e il codice di implementazione.',
    selectionPrompt: 'Dati questi test per la user story selezionata, seleziona i 3 test più rilevanti e utili. Considera fattori come la copertura del codice, la complessità dell\'implementazione e i casi limite.',
    modelOptions: {
        model: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7
    }
};

export const refactoringSuggestionsConfig: AiGenerationConfig<RefactoringSuggestion> = {
    systemPrompt: 'Sei un esperto di refactoring del codice e code smell. Il tuo compito è analizzare il codice esistente e generare 10 suggerimenti di refactoring per migliorare la manutenibilità e le prestazioni.',
    userPrompt: 'Analizza il codice e suggerisci 10 miglioramenti. Per ogni suggerimento, fornisci un id, un titolo e una descrizione dettagliata del refactoring proposto. Considera aspetti come la riduzione della complessità, l\'eliminazione di code smell, il miglioramento della leggibilità e l\'uso di pattern riconosciuti.',
    selectionPrompt: 'Dati questi suggerimenti di refactoring, seleziona i 3 più impattanti. Considera fattori come l\'impatto sul codice esistente, il rapporto tra la complessità e i benefici attesi.',
    modelOptions: {
        model: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7
    }
};

export const aiConfigs = {
    userStories: userStoriesConfig,
    testProposals: testProposalsConfig,
    refactoringSuggestions: refactoringSuggestionsConfig
};