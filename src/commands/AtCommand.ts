import { RootCommand } from '../RootCommand'
import { Command } from '../Command';

/**
 * Display the version of the current package.
 */
export class AtCommand extends RootCommand {
  constructor() {
    super({
      alias: 'a',
      desc: 'Display the version from a package.json file found in the current directory',
      name: 'at',
      options: [],
    })
  }

  async doRun(): Promise<void> {
    console.log(this.packageDir.version)
  }

}
