import * as vscode from 'vscode';

/**
 * Classe base per i panel WebView dell'estensione
 */
export abstract class BaseWebViewPanel {
    protected readonly _panel: vscode.WebviewPanel;
    protected readonly _extensionUri: vscode.Uri;
    protected _disposables: vscode.Disposable[] = [];

    constructor(
        extensionUri: vscode.Uri,
        viewType: string,
        title: string,
        viewColumn: vscode.ViewColumn,
        options: vscode.WebviewPanelOptions & vscode.WebviewOptions = {}
    ) {
        this._extensionUri = extensionUri;
        
        // Crea il pannello WebView
        this._panel = vscode.window.createWebviewPanel(
            viewType,
            title,
            viewColumn,
            {
                // Abilita JavaScript nel WebView
                enableScripts: true,
                // Limita il WebView a caricare solo contenuto sicuro
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
                // Mantieni il WebView in background anche quando non è visibile
                retainContextWhenHidden: true,
                ...options
            }
        );

        // Aggiorna il contenuto HTML del pannello
        this._updateWebview();

        // Gestisce i messaggi dal WebView
        this._panel.webview.onDidReceiveMessage(
            this._handleMessage,
            this,
            this._disposables
        );

        // Gestisce quando il pannello viene chiuso
        this._panel.onDidDispose(
            () => this.dispose(),
            null,
            this._disposables
        );
    }

    /**
     * Aggiorna il contenuto del WebView
     */
    protected abstract _updateWebview(): void;

    /**
     * Gestisce i messaggi inviati dal WebView
     */
    protected abstract _handleMessage(message: any): void;

    /**
     * Ottiene una versione specifica di un'URI locale
     * Aggiunge il parametro di versione per evitare problemi di cache
     */
    protected _getWebviewUri(webview: vscode.Webview, ...pathSegments: string[]): vscode.Uri {
        const uri = vscode.Uri.joinPath(this._extensionUri, ...pathSegments);
        return webview.asWebviewUri(uri);
    }

    /**
     * Elimina le risorse utilizzate dal WebView
     */
    public dispose() {
        // Pulisce le risorse utilizzate dal pannello
        this._panel.dispose();

        // Pulisce i disposable 
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
