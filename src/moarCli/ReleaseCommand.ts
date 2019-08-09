import { PackageCommand } from './PackageCommand'
import chalk from 'chalk'
import { CliElement } from '../cli/CliElement'

/**
 * Output commands to start the `git flow release` process
 */
export class ReleaseCommand extends PackageCommand {
  constructor() {
    super({
      alias: 'R',
      desc: `Start or finish a GIT FLOW release`,
      name: 'release',
      example: 'moar release | sh',
      options: [
        {
          alias: 'f',
          name: 'finish',
          desc: 'Finish the release',
        },
      ],
    })
  }

  protected async doRun(): Promise<void> {
    const args = process.argv
    const patchAddOpt = this.options['finish']
    for (let i = 3; i < args.length; i++) {
      let arg = args[i]
      if (CliElement.match(patchAddOpt, arg)) {
        console.log('git flow release finish `moar at`')
        return
      }
    }
    console.log('git flow release start `moar at -m`')
    console.log('npm version minor')
  }
}
