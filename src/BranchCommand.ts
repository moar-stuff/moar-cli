import { Theme } from './Theme';
import { Command } from './Command';
import { PackageDir } from './PackageDir';
import { CommandLineOptions } from 'command-line-args';

/**
 * Show branches that have not been merged
 */
export class BranchCommand extends Command {
  constructor(commandContext: CommandLineOptions, theme: Theme) {
    super(commandContext, theme);
  }

  async run(errors: string[]) {
    this.checkPackageDir(errors);
    if (errors.length > 0) {
      return;
    }

    const dir = this.packageDir.substring(this.packageDir.lastIndexOf('/') + 1);
    const packageDir = new PackageDir(
      this.packageDir,
      dir,
      this.theme,
      this.context
    );
    await packageDir.prepare(true);
    console.log(packageDir.getBranchLabel({ color: true }));
  }
}
