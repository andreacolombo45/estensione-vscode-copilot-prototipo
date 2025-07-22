## Prima Generazione dell'Estensione

- **Prompt iniziale fornito a Github Copilot** 
>Vorrei creare un'estensione VS Code chiamata "TDD-Mentor-AI" che supporti gli utenti nel ciclo di Test-Driven Development (TDD) attraverso un mentore AI. Vorrei che fosse strutturata in questo modo:
>
>Panoramica dell'estensione
>
>L'estensione "TDD-Mentor-AI" dovrà guidare gli studenti attraverso il ciclo TDD con due distinte modalità di AI:
>
>Modalità Ask: fornisce solo suggerimenti e considerazioni senza codice
>
>Modalità Mentor: genera codice di test da mostrare all'utente
>
>Componenti principali
>
>Questa estensione necessita di:
>
>Struttura base dell'estensione VS Code
>
>Interfaccia utente con:
>
>- Pannello laterale per le interazioni
>
>- Pulsanti per le varie fasi del TDD
>
>- Area per visualizzare suggerimenti e codice
>
>Sistema di analisi del codice per:
>
>- Comprendere il contesto del progetto
>
>- Verificare il successo dei test
>
>Due distinti modelli di AI:
>
>- Modalità Ask (solo suggerimenti)
>
>- Modalità Mentor (generazione di test)
>
>Flusso di lavoro del ciclo TDD
>
>1. Fase PICK:
>L'AI in modalità Ask analizza il codice del progetto
>Suggerisce 3 user stories tra cui l'utente può scegliere
>Interfaccia con bottoni per selezionare una storia
>2. Fase RED:
>Una volta selezionata una user story, l'AI passa in modalità Mentor
>L'AI propone 3 possibili test da implementare
>L'utente ne sceglie uno e l'AI inserisce il test nel file appropriato
>3. Fase GREEN:
>L'AI torna in modalità Ask
>L'utente implementa il codice per far passare il test
>Un pulsante "Verify" per controllare che i test abbiano successo
>L'AI verifica i risultati e passa alla fase successiva solo se tutti i test passano
>4. Fase REFACTORING:
>L'AI in modalità Ask suggerisce 3 possibili miglioramenti al codice
>Non fornisce implementazioni, solo suggerimenti concettuali
>Un pulsante "Complete" per terminare questa fase e tornare alla fase PICK
>
>Struttura tecnica:
>
>Extension manifest (package.json)
>Extension activation (extension.js)
>WebView per l'interfaccia utente
>API di comunicazione con modelli di AI
>Sistema di esecuzione test integrato con VS Code
>Gestione dello stato per le varie fasi del TDD
>
>Vorrei che fosse chiara la distinzione tra:
>
>Le fasi PICK, GREEN e REFACTORING (solo suggerimenti, niente codice)
>La fase RED (generazione di test, ma non di implementazione)

- **Risultato**: ottenuto un prototipo di un'estensione di VS Code non funzionante. Conteneva una finta struttura di AI, con risposte prefissate, ma utile per determinare la struttura del progetto e il cambiamento tra le fasi TDD.

- **Decisione**: ho usato questo prototipo come base di partenza, su cui costruire un'estensione funzionante di un Mentor AI per il TDD.


## Selezione delle User Stories

- **Contesto**: nella generazione delle User Stories da parte dell'AI, ho attuato un meccanismo in cui vengono generate 10 User Stories e poi selezionate 3.

- **Problema**: quando l'utente chiede di generare delle nuove User Stories, è possibile fornirgli alcune di quelle scartate in precedenza dalla scelta dell'AI?

- **Decisione**: ho notato che la generazione delle User Stories era sensibile alla temperatura del prompt e produceva risultati differenti. Ho, pertanto, deciso di far rigenerare completamente 10 User Stories nuove ad ogni refresh dell'utente.

- **Motivazione**: a scapito dell'efficienza del sistema, la scelta da parte dell'AI delle 3 User Stories dovrebbe produrre come risultato le migliori da applicare al momento, per cui rigenerarle dovrebbe produrre 3 nuove soluzioni migliori, con la consapevolezza che queste potrebbero essere simili.

- **Considerazioni**: potrebbe essere utile modificare ulteriormente la temperatura nel momento in cui l'utente effettua un refresh, così da aumentare la possibilità di User Stories differenti dalle precedenti.

## Integrazione Git

- **Contesto**: per favorire una maggiore affidabilità e ottimalità delle risposte dell'AI, sarebbe utile fornire nel contesto anche l'evoluzione del progetto.

- **Decisione**: ho implementato un meccanismo semi-automatico di commit al termine delle fasi TDD. I commit per la fase GREEN avvengono automaticamente, mentre nella fase di REFACTORING c'è bisogno di un intervento dell'utente per determinare il titolo del commit.

- **Motivazione**: l'uso di questa struttura che forza i commit permette di creare una cronologia dell'evoluzione del progetto pulita e coerente, facilitando il lavoro dell'AI e aiutando maggiormente l'utente nella pratica del TDD, bloccando in maniera minima il flusso di sviluppo.

- **Considerazioni**: per favorire maggiormente una pulizia nell'evoluzione del progetto, si potrebbe implementare una struttura basata su Git Flow, con l'utilizzo di feature per suddividere maggiormente le funzionalità implementate. 

## Integrazione AI

- **Problematicità**: l'estensione che sto sviluppando ha l'obiettivo di essere completamente gratuita. Per questa ragione deve prescindere da qualsiasi tipo di modello AI a pagamento.

- **Soluzione**: ho deciso di utilizzare delle API fornite da OpenRouter e il modello gratuito [deepseek/deepseek-chat-v3-0324:free](https://openrouter.ai/deepseek/deepseek-chat-v3-0324:free).

- **Struttura output**: questo modello, a differenza di altri meno performanti, non dispone di un meccanismo per forzare la struttura dell'output. Ho dovuto, quindi, ricorrere all'uso di un prompt contenenti un esempio di output da fornire, con la consapevolezza che questo potrebbe non essere utilizzato sempre dall'AI.

- **System Prompt**: costituisce le informazioni base a cui deve aderire strettamente l'AI nella risposta.

- **User Prompt**: sono le indicazioni più generiche e variabili di ogni richiesta.
