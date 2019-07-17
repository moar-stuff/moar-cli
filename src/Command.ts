import * as fs from 'fs';

import { Theme } from './Theme';
import { ModuleDir } from './ModuleDir';
import { CommandLineOptions } from 'command-line-args';

export class Command {
  protected moduleDirs: ModuleDir[] = [];
  protected moduleDir: string = <string>process.env.MOAR_MODULE_DIR;
  protected workspaceDir: string;
  protected workspaceDirs: string[];

  constructor(protected context: CommandLineOptions, protected theme: Theme) {
    this.workspaceDir = this.moduleDir.substring(
      0,
      this.moduleDir.lastIndexOf('/')
    );
    this.workspaceDirs = fs.readdirSync(this.workspaceDir);
  }

  run(errors: string[]) {
    errors.push('RUN NOT IMPLEMENTED');
  }

  protected checkModuleDir(errors: string[]) {
    if (!fs.existsSync(this.moduleDir + '/.git/config')) {
      errors.push('Status command must be run from a git module root');
    }
  }
}
