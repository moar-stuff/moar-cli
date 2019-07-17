import * as simpleGit from 'simple-git/promise';

import * as fs from 'fs';
import { Theme } from './Theme';
import { Command } from './Command';
import { CommandLineOptions } from 'command-line-args';

import child_process from 'child_process';
import util from 'util';
const exec = util.promisify(child_process.exec);

/**
 * A command to show a description for the module directory.
 */
export class TagCommand extends Command {
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
    const tag = argv[argv.length - 1];
    let message = this.context['tag-message'];
    message += `\n${'-'.repeat(40)}\n`;
    let cmd = 'echo "$(git rev-parse HEAD) ${PWD##*/}"';
    cmd = `moar e '${cmd}' | sh | grep -v '# *'`;
    const result = await exec(cmd, { cwd: this.moduleDir });
    const lines = result.stdout.split('\n');
    for (const line of lines) {
      message += line + '\n';
    }

    try {
      const gitModule = simpleGit.default(
        this.moduleDir
      );
      gitModule.silent(true);
      await gitModule.tag(['-s', '-m', message, tag]);
      await gitModule.raw(['push', 'origin', tag])
      console.error(`${this.moduleDir} - created tag`);
    } catch (e) {
      console.error(`💥ERROR: ${this.moduleDir} - unable to tag`);
      process.exit(1);
    }
  }
}
