import * as fs from 'fs';

import { Theme } from './Theme';
import { PackageDir } from './PackageDir';
import { CommandLineOptions } from 'command-line-args';

export class Command {
  protected packageDirs: PackageDir[] = [];
  protected packageDir: string = <string>process.env.MOAR_PACKAGE_DIR;
  protected workspaceDir: string;
  protected workspaceDirs: string[];

  constructor(protected context: CommandLineOptions, protected theme: Theme) {
    const pos = this.packageDir.lastIndexOf('/');
    this.workspaceDir = this.packageDir.substring(0, pos);
    this.workspaceDirs = fs.readdirSync(this.workspaceDir);
  }

  run(errors: string[]) {
    throw new Error('not implemented')
  }

  protected checkPackageDir(errors: string[]) {
    const isPackageDir = PackageDir.isGit(this.packageDir);
    if (!isPackageDir) {
      errors.push('Status must be run from a git directory with package.json in the root');
    }
  }

}
