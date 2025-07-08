    export enum TddPhase {
        PICK = 'pick',
        RED = 'red',
        GREEN = 'green',
        REFACTORING = 'refactoring'
    }

    export enum AiMode {
        ASK = 'ask',    
        MENTOR = 'mentor' 
    }

    export interface UserStory {
        id: string;
        title: string;
        description: string;
    }

    export interface TestProposal {
        id: string;
        title: string;
        description: string;
        code: string;
        targetFile?: string;
    }

    export interface RefactoringSuggestion {
        id: string;
        title: string;
        description: string;
    }

    export interface TddState {
        currentPhase: TddPhase;
        currentMode: AiMode;
        selectedUserStory?: UserStory;
        selectedTest?: TestProposal;
        modifiedSelectedTest?: TestProposal; 
        testProposals: TestProposal[];
        userStories: UserStory[];
        refactoringSuggestions: RefactoringSuggestion[];
        testResults?: {
            success: boolean;
            message: string;
        };
        isEditingTest?: boolean;
    }

    export interface AiRequestOptions {
        model: string;
        maxTokens?: number;
        temperature?: number;
        systemPrompt?: string;
    }

    export interface AiRequest {
        role: 'user' | 'system';
        content: string;
    }

    export interface AIResponse {
        choices: Array<{
            message: {
                content: string;
            };
        }>;
    }

