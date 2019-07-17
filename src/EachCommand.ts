import * as fs from 'fs';
import { Theme } from './Theme';
import { Command } from './Command';
import { CommandLineOptions } from 'command-line-args';

/**
 * A command to show a description for the module directory.
 */
export class EachCommand extends Command {
  constructor(commandContext: CommandLineOptions, theme: Theme) {
    super(commandContext, theme);
  }

  /**
   * Displays the Status for the Workspace
   */
  async run(errors: string[]): Promise<void> {
    this.checkModuleDir(errors);
    if (errors.length > 0) {
      return;
    }

    const argv = process.argv;
    let command = argv[3] || 'git remote update --prune';
    if (argv.length > 4) {
      command +=
        " '" +
        argv
          .slice(4)
          .join("' '")
          .trim() +
        "'";
    }

    let buffer = '';
    for (const workspaceModuleDir of this.workspaceDirs) {
      if (
        fs.existsSync(
          this.workspaceDir + '/' + workspaceModuleDir + '/.git/config'
        )
      ) {
        buffer += `echo '# ${'*'.repeat(60)}' && \\\n`;
        buffer += `cd ../${workspaceModuleDir} && \\\n`;
        buffer += `echo "# * $\{PWD##*/\} " && \\\n`;
        buffer += `echo '# * ${'-'.repeat(60)}' && \\\n`;
        buffer += `(${command}) && \\\n`;
      }
    }
    buffer += `cd ../${this.moduleDir.replace(/.*\//, '')} \n`;
    console.log(buffer);
  }
}
