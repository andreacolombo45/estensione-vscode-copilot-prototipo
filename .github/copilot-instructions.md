<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# TDD-Mentor-AI Extension Development

This is a VS Code extension project that supporta gli studenti nel ciclo di Test-Driven Development (TDD) attraverso un mentore AI.

Please use the get_vscode_api with a query as input to fetch the latest VS Code API references.

## Componenti principali dell'estensione

- **Struttura base dell'estensione VS Code**
- **Interfaccia utente con pannello laterale e webview**
- **Sistema di analisi del codice**
- **Due distinti modelli di AI:**
  - Modalità Ask (solo suggerimenti)
  - Modalità Mentor (generazione di test)

## Flusso di lavoro del ciclo TDD

1. **Fase PICK**: L'AI in modalità Ask analizza il codice e suggerisce user stories
2. **Fase RED**: L'AI in modalità Mentor propone e implementa test
3. **Fase GREEN**: Lo studente implementa il codice per far passare i test
4. **Fase REFACTORING**: L'AI in modalità Ask suggerisce miglioramenti al codice
