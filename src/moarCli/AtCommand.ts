import { PackageCommand } from './PackageCommand'
import { CliElement } from '../cli/CliElement'

/**
 * Display the version of the current package.
 */
export class AtCommand extends PackageCommand {
  constructor() {
    super({
      alias: 'a',
      desc:
        'Display the version from a package.json file found in the current directory',
      name: 'at',
      options: [
        {
          alias: 'M',
          desc: 'Add one to the major',
          name: 'major-add',
        },
        {
          alias: 'm',
          desc: 'Add one to the minor',
          name: 'minor-add',
        },
        {
          alias: 'p',
          desc: 'Add one to the patch',
          name: 'patch-add',
        },
      ],
    })
  }

  async doRun(): Promise<void> {
    let version = this.packageDir.version
    const versionParts = version.split('.')
    const args = process.argv
    const majorAddOpt = this.options['major-add']
    const minorAddOpt = this.options['minor-add']
    const patchAddOpt = this.options['patch-add']
    for (let i = 0; i < args.length; i++) {
      let arg = args[i]
      if (CliElement.match(majorAddOpt, arg)) {
        version = `${Number.parseInt(versionParts[0]) + 1}.0.0`
      }
      if (CliElement.match(minorAddOpt, arg)) {
        version = `${versionParts[0]}.${Number.parseInt(versionParts[1]) + 1}.0`
      }
      if (CliElement.match(patchAddOpt, arg)) {
        version = `${versionParts[0]}.${versionParts[1]}.${Number.parseInt(
          versionParts[2]
        ) + 1}`
      }
    }
    console.log(version)
  }
}
