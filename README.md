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

- Visual Studio Code versione 1.101.0 o superiore

## Installazione

1. Apri Visual Studio Code
2. Vai alla sezione Estensioni (Ctrl+Shift+X)
3. Cerca "TDD-Mentor-AI"
4. Clicca su "Installa"

## Utilizzo

1. Apri il progetto su cui vuoi lavorare in VS Code
2. Apri il pannello laterale di TDD-Mentor-AI facendo clic sull'icona del test nella barra delle attività
3. Clicca su "Avvia Sessione" per iniziare una sessione di TDD
4. Segui le istruzioni nell'area di interazione per ogni fase del ciclo TDD

## Comandi

L'estensione fornisce i seguenti comandi:

- `TDD Mentor: Avvia Sessione` - Inizia una nuova sessione di TDD
- `TDD Mentor: Fase PICK` - Vai alla fase di selezione della user story
- `TDD Mentor: Fase RED` - Vai alla fase di creazione dei test
- `TDD Mentor: Fase GREEN` - Vai alla fase di implementazione del codice
- `TDD Mentor: Fase REFACTORING` - Vai alla fase di miglioramento del codice
- `TDD Mentor: Verifica Test` - Verifica che i test passino
- `TDD Mentor: Completa Fase` - Completa la fase corrente e passa alla successiva

## Contribuire

Le contribuzioni sono benvenute! Per favore leggi le linee guida per i contributi prima di iniziare.

## Licenza

MIT

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
