# TDD-Mentor-AI

TDD-Mentor-AI è un'estensione per Visual Studio Code che supporta gli studenti nell'apprendimento e nell'applicazione del Test-Driven Development (TDD) attraverso un mentore basato sull'intelligenza artificiale.

## Caratteristiche

- **Guida interattiva** attraverso il ciclo TDD con un mentor AI
- **Due modalità di AI**:
  - **Modalità Ask**: fornisce solo suggerimenti concettuali senza codice
  - **Modalità Mentor**: genera test che lo studente può implementare
- **Pannello laterale** per la navigazione tra le diverse fasi del ciclo TDD
- **Area di interazione** per visualizzare suggerimenti e selezionare opzioni

## Flusso di lavoro del ciclo TDD

L'estensione guida gli studenti attraverso le seguenti fasi del ciclo TDD:

1. **Fase PICK**
   - L'AI in modalità Ask analizza il codice del progetto
   - Suggerisce 3 user stories tra cui lo studente può scegliere
   - Interfaccia con bottoni per selezionare una storia

2. **Fase RED**
   - Una volta selezionata una user story, l'AI passa in modalità Mentor
   - L'AI propone 3 possibili test da implementare
   - Lo studente ne sceglie uno e l'AI inserisce il test nel file appropriato

3. **Fase GREEN**
   - L'AI torna in modalità Ask
   - Lo studente implementa il codice per far passare il test
   - Un pulsante "Verify" per controllare che i test abbiano successo
   - L'AI verifica i risultati e passa alla fase successiva solo se tutti i test passano

4. **Fase REFACTORING**
   - L'AI in modalità Ask suggerisce 3 possibili miglioramenti al codice
   - Non fornisce implementazioni, solo suggerimenti concettuali
   - Un pulsante "Complete" per terminare questa fase e tornare alla fase PICK

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

**2**. **Inserirsci la tua API Key di** [OpenRouter](https://openrouter.ai/) e le **specifiche del problema** quando richiesto (tramite i popup offerti dall'estensione)

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
