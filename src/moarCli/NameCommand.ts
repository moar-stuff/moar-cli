import { PackageCommand } from './PackageCommand'

/**
 * Display the version of the current package.
 */
export class NameCommand extends PackageCommand {
  constructor() {
    super({
      alias: 'n',
      desc: 'Display the name from a package.json file found in the current directory',
      name: 'name', 
      options: []
    })
  }

  async doRun(): Promise<void> {
    console.log(this.packageDir.name)
  }
}
