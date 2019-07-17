import chalk from 'chalk';
import * as simpleGit from 'simple-git/promise';

import { Theme } from './Theme';
import { Command } from './Command';
import { ModuleDir } from './ModuleDir';
import { CommandLineOptions } from 'command-line-args';

/**
 * A command to show a description for the module directory.
 */
export class NotMergedCommand extends Command {
  constructor(commandContext: CommandLineOptions, theme: Theme) {
    super(commandContext, theme);
  }

  async run(errors: string[]) {
    this.checkModuleDir(errors);
    if (errors.length > 0) {
      return;
    }

    const gitModule = await simpleGit.default(this.moduleDir);
    const dir = this.moduleDir.substring(this.moduleDir.lastIndexOf('/') + 1);
    const moduleDir = new ModuleDir(
      this.moduleDir,
      dir,
      gitModule,
      this.theme,
      this.context
    );
    await moduleDir.prepare(true);
    console.log(moduleDir.getFullStatus({ color: true }));
  }
}
