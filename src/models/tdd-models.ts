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

export interface RefactoringFeedback {
    hasChanges: boolean;
    feedback: string;
    suggestions: string[];
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
    refactoringFeedback?: RefactoringFeedback;
    testResults?: {
        success: boolean;
        message: string;
    };
    isEditingTest?: boolean;
    nextPhase?: 'pick' | 'red' | 'refactoring';
    greenQuestionCount: number;
    greenChatHistory: { user: string, ai: string }[];
}

export interface AiRequestOptions {
    model?: string;
    problemRequirements?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    context?: any; 
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

export interface AiGenerationConfig<T> {
    systemPrompt: string;
    userPrompt: string;
    selectionPrompt: string;
    modelOptions?: AiRequestOptions;
}
