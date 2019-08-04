import { Theme } from './Theme';
import { Command } from './Command';
import { CommandLineOptions } from 'command-line-args';
import { PackageDir } from './PackageDir';

/**
 * Build a script to run a command in all package dirs
 */
export class EachCommand extends Command {
  constructor(commandContext: CommandLineOptions, theme: Theme) {
    super(commandContext, theme);
  }

  /**
   * Displays the Status for the Workspace
   */
  async run(errors: string[]): Promise<void> {
    this.checkPackageDir(errors);
    if (errors.length > 0) {
      return;
    }

    const argv = process.argv;
    const defaultCommand = 'git remote update';
    let command = argv[argv.length - 1];
    if (command === 'e') {
      command = defaultCommand;
    } else {
      if (command === 'each') {
        command = defaultCommand;
      } else {
        command = argv[argv.length - 1];
      }
    }

    let buffer = '';
    for (const workPackageDir of this.workspaceDirs) {
      const isPackage = PackageDir.isGit(this.workspaceDir + '/' + workPackageDir);
      if (isPackage) {
        buffer += `cd ../${workPackageDir} && \\\n`;
        const quietLevel = this.context['quiet-level'];
        if (quietLevel === '0') {
          buffer += `echo "# * ${workPackageDir} ${'*'.repeat(60 - workPackageDir.length)}" && \\\n`;
          buffer += `(${command}) && \\\n`;
        } else if (quietLevel === '1') {
          buffer += `echo "${workPackageDir} $(${command}) " && \\\n`;
        }
        if (quietLevel === '2') {
          buffer += `echo "$(${command}) ${workPackageDir} " && \\\n`;
        }
      }
    }
    const barePackageDir = this.packageDir.replace(/.*\//, '');
    buffer += `cd ../${barePackageDir} \n`;
    console.log(buffer);
  }
}
