## Requisiti

Assicurati di avere installato:

- [Visual Studio Code](https://code.visualstudio.com/) **v1.101.0** o superiore
- [Node.js](https://nodejs.org/) (versione LTS consigliata)
- [Git](https://git-scm.com/)

## Installazione

**1**. **Clona il repository**
```bash
   git clone https://github.com/andreacolombo45/estensione-vscode-copilot-prototipo.git
   cd estensione-vscode-copilot-prototipo
```

**2**. **Installa le dipendenze**
```bash 
npm install
```

**3**. **Compila l'estensione**
```bash
npm run compile
```

**4**. **Apri il progetto in VS Code**
```bash
code.
```

**5**. **Installa le estensioni consigliate (se suggerite al primo avvio)**
- ESLint
- TypeScript + WebPack Problem Matchers
- Extension Test Runner

**6**. **Avvia l'estensione in modalità debug**

Premi `F5` per avviare una nuova finestra di **Extension Development Host** con l’estensione attiva.
In questa finestra, troverai la tua estensione nella **Activity Bar** (barra laterale delle estensioni) con l’icona di un **becher**.

## Utilizzo

**1**. **Apri una cartella di lavoro** (progetto su cui usare il TDD Mentor)

**2**. **Inserirsci la tua API Key di** OpenRouter e le **specifiche del problema** quando richiesto (tramite i popup offerti dall'estensione)

**3**. **Inizializza Git**, se richiesto

**4**. **Avvia il ciclo TDD**
Per generare le **User Stories iniziali**, clicca sul pulsante di refresh delle User Stories nel pannello laterale.

## Comandi

L'estensione fornisce i seguenti comandi:

- `TDD Mentor: Avvia Sessione` - Inizia una nuova sessione di TDD
- `TDD Mentor: Fase PICK` - Vai alla fase di selezione della user story
- `TDD Mentor: Fase RED` - Vai alla fase di creazione dei test
- `TDD Mentor: Fase GREEN` - Vai alla fase di implementazione del codice
- `TDD Mentor: Fase REFACTORING` - Vai alla fase di miglioramento del codice
- `TDD Mentor: Verifica Test` - Verifica che i test passino
- `TDD Mentor: Completa Fase` - Completa la fase corrente e passa alla successiva
