import { CliElement } from '../cli/CliElement'
import { PackageCommand } from './PackageCommand'

/**
 * Output commands to start the `git flow release` process
 */
export class ReleaseCommand extends PackageCommand {
  constructor() {
    super({
      alias: 'R',
      desc: 'Start or finish a GIT FLOW release',
      example: 'moar release | sh',
      name: 'release',
      options: [
        {
          alias: 'f',
          desc: 'Finish the release',
          name: 'finish',
        },
      ],
    })
  }

  protected async doRun(): Promise<void> {
    const args = process.argv
    const patchAddOpt = this.options.finish
    for (let i = 3; i < args.length; i++) {
      const arg = args[i]
      if (CliElement.match(patchAddOpt, arg)) {
        this.log('# Use following to finish the release')
        this.log('echo "git flow release finish `moar at`" | pbcopy')
        return
      }
    }
    this.log('git flow release start `moar at -m`')
    this.log('npm version minor')
  }
}
