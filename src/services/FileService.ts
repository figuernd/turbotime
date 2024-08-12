import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';

export class FileService {
  private workspaceRoot: string | undefined;
  private ignoreFilter: ReturnType<typeof ignore> | null = null;

  constructor(context: vscode.ExtensionContext) {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
      this.initializeIgnoreFilter();
    }
  }

  private async initializeIgnoreFilter(): Promise<void> {
    if (!this.workspaceRoot) return;

    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    try {
      const gitignoreContent = await fs.promises.readFile(gitignorePath, 'utf8');
      this.ignoreFilter = ignore().add(gitignoreContent);
    } catch (error) {
      console.log('No .gitignore file found or error reading it. Proceeding without ignore rules.');
      this.ignoreFilter = null;
    }
  }

  public async getProjectFiles(): Promise<string[]> {
    if (!this.workspaceRoot) {
      return [];
    }
    const files: string[] = [];
    await this.walkDirectory(this.workspaceRoot, files);
    return files;
  }

  private async walkDirectory(dir: string, filelist: string[]): Promise<void> {
    if (!this.workspaceRoot) return;

    const files = await fs.promises.readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.promises.stat(filePath);
      const relativePath = path.relative(this.workspaceRoot, filePath);

      if (this.ignoreFilter && this.ignoreFilter.ignores(relativePath)) {
        continue;
      }

      if (stat.isDirectory()) {
        await this.walkDirectory(filePath, filelist);
      } else {
        filelist.push(relativePath);
      }
    }
  }

  public async readFile(filePath: string): Promise<string> {
    if (!this.workspaceRoot) {
      throw new Error('No workspace folder found');
    }
    const fullPath = path.join(this.workspaceRoot, filePath);
    return fs.promises.readFile(fullPath, 'utf8');
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.workspaceRoot) {
      throw new Error('No workspace folder found');
    }
    const fullPath = path.join(this.workspaceRoot, filePath);
    await fs.promises.writeFile(fullPath, content, 'utf8');
  }

  public hasWorkspace(): boolean {
    return !!this.workspaceRoot;
  }
}