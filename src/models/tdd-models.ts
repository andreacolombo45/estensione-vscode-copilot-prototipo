    /**
     * Enumerazione delle diverse fasi del ciclo TDD
     */
    export enum TddPhase {
        PICK = 'pick',
        RED = 'red',
        GREEN = 'green',
        REFACTORING = 'refactoring'
    }

    /**
     * Enumerazione delle modalità di interazione dell'AI
     */
    export enum AiMode {
        ASK = 'ask',     // Solo suggerimenti senza codice
        MENTOR = 'mentor' // Generazione di codice di test
    }

    /**
     * Interfaccia per una user story
     */
    export interface UserStory {
        id: string;
        title: string;
        description: string;
    }

    /**
     * Interfaccia per un test proposto
     */
    export interface TestProposal {
        id: string;
        title: string;
        description: string;
        code: string;
        targetFile?: string; // File a cui il test dovrebbe essere aggiunto
    }

    /**
     * Interfaccia per un suggerimento di refactoring
     */
    export interface RefactoringSuggestion {
        id: string;
        title: string;
        description: string;
        // Nessun codice fornito in questa modalità, solo suggerimenti concettuali
    }

    /**
     * Interfaccia per lo stato corrente dell'estensione
     */
    export interface TddState {
        currentPhase: TddPhase;
        currentMode: AiMode;
        selectedUserStory?: UserStory;
        selectedTest?: TestProposal;
        testProposals: TestProposal[];
        userStories: UserStory[];
        refactoringSuggestions: RefactoringSuggestion[];
        testResults?: {
            success: boolean;
            message: string;
        };
        isEditingTest?: boolean;
    }
