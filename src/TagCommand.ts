import * as simpleGit from 'simple-git/promise';

import { Theme } from './Theme';
import { Command } from './Command';
import { CommandLineOptions } from 'command-line-args';

import child_process from 'child_process';
import util from 'util';
import * as fs from 'fs';
const exec = util.promisify(child_process.exec);

/**
 * Tag the package
 */
export class TagCommand extends Command {
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
    const packageJson = fs.readFileSync(this.packageDir + '/package.json')
    const packageVersion = JSON.parse(packageJson.toString()).version;
    let tag = argv[argv.length - 1];
    tag += packageVersion;
    let message = this.context['tag-message'];
    message += `\n${'-'.repeat(40)}\n`;
    let cmd = 'echo "$(git rev-parse HEAD) ${PWD##*/}"';
    cmd = `moar e '${cmd}' | sh | grep -v '# *'`;
    const result = await exec(cmd, { cwd: this.packageDir });
    const lines = result.stdout.split('\n');
    for (const line of lines) {
      message += line + '\n';
    }

    try {
      const git = simpleGit.default(
        this.packageDir
      );
      git.silent(true);
      await git.tag(['-s', '-m', message, tag]);
      await git.raw(['push', 'origin', tag])
      console.error(`${this.packageDir} - created tag`);
    } catch (e) {
      console.error(`💥ERROR: ${this.packageDir} - unable to tag`);
      process.exit(1);
    }
  }
}
