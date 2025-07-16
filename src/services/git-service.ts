import { exec as defaultExec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execPromise = promisify(defaultExec);

export interface CommitInfo {
    hash: string;
    author: string;
    date: Date;
    message: string;
    filesChanged: string[];
}

export class GitService {
    private static instance: GitService;

    private constructor(
        private workspacePath: string,
        private execFn: (command: string, options: { cwd: string }) => Promise<{ stdout: string }>
    ) {}

    public static async create(
        execFn: (command: string, options: { cwd: string }) => Promise<{ stdout: string }> = execPromise
    ): Promise<GitService | null> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return null;
        }

        const workspacePath = workspaceFolder.uri.fsPath;

        try {
            await execFn('git rev-parse --is-inside-work-tree', { cwd: workspacePath });
            return new GitService(workspacePath, execFn);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize Git service: ${error}`);
            return null;
        }
    }

    public async getRecentCommits(limit: number = 10): Promise<CommitInfo[]> {
        try {
            
            try {
                await this.execFn('git rev-parse --verify HEAD', { cwd: this.workspacePath });
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to get revision count: ${error}`);
                return [];
            }

            const logCmd = `git log -${limit} --pretty=format:"%H|%an|%at|%s"`;
            const { stdout } = await this.execFn(logCmd, { cwd: this.workspacePath });

            const lines = stdout.trim().split('\n');
            const commits: CommitInfo[] = [];

            for (const line of lines) {
                const [hash, author, timestamp, subject] = line.split('|');
                const files = await this.getFilesChangedInCommit(hash);
                commits.push({
                    hash,
                    author,
                    date: new Date(parseInt(timestamp) * 1000), 
                    message: subject,
                    filesChanged: files
                });
            }

            return commits;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get recent commits: ${error}`);
            return [];
        }
    }

    private async getFilesChangedInCommit(hash: string): Promise<string[]> {
        const showCmd = `git show --pretty="" --name-only ${hash}`;
        const { stdout } = await this.execFn(showCmd, { cwd: this.workspacePath });
        return stdout.trim().split('\n').filter(f => f.length > 0);
    }

    public async showCommitDetails(args: string[]): Promise<string> {
        const { stdout } = await this.execFn(`git show ${args.join(' ')}`, { cwd: this.workspacePath });
        return stdout;
    }

    public async getModifiedFiles(): Promise<string> {
        const { stdout } = await this.execFn('git status --porcelain', { cwd: this.workspacePath });
        return stdout;
    }

    private async addFilesToCommit(files: string[]): Promise<void> {
        if (files.length === 0) {
            return;
        }
        const addCmd = `git add ${files.map(f => `"${f}"`).join(' ')}`;
        await this.execFn(addCmd, { cwd: this.workspacePath });
    }

    public async commitFiles(files: string[], message: string): Promise<void> {
        await this.addFilesToCommit(files);
        const commitCmd = `git commit -m "${message}"`;
        await this.execFn(commitCmd, { cwd: this.workspacePath });
    }
}