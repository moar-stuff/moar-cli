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
    for (const workspaceModuleDir of this.workspaceDirs) {
      if (
        fs.existsSync(
          this.workspaceDir + '/' + workspaceModuleDir + '/.git/config'
        )
      ) {
        buffer += `cd ../${workspaceModuleDir} && \\\n`;
        const quietLevel = this.context['quiet-level'];
        if(quietLevel === '0') {
          buffer += `echo "# * ${workspaceModuleDir} ${'*'.repeat(60 - workspaceModuleDir.length)}" && \\\n`;
          buffer += `(${command}) && \\\n`;
        } else if(quietLevel === '1') {
          buffer += `echo "${workspaceModuleDir} $(${command}) " && \\\n`;
        }
        if(quietLevel === '2') {
          buffer += `echo "$(${command}) ${workspaceModuleDir} " && \\\n`;
        }
      }
    }
    const bareModuleDir = this.moduleDir.replace(/.*\//, '');
    buffer += `cd ../${bareModuleDir} \n`;
    console.log(buffer);
  }
}
