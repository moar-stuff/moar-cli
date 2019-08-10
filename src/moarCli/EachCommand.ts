import { CliElement } from '../cli/CliElement'
import { PackageCommand } from './PackageCommand'
import { PackageDir } from './PackageDir'

/**
 * Build a script to run a command in **each** package dir.
 */
export class EachCommand extends PackageCommand {
  constructor() {
    super({
      alias: 'e',
      desc: 'Build a script to run a command in all package directories',
      example: 'moar each | sh',
      name: 'each',
      options: [
        {
          alias: 'b',
          desc: 'Provide a very brief output',
          name: 'brief',
          type: 'boolean',
        },
        {
          alias: 'r',
          desc: 'Put the name on the right hand of output line',
          name: 'right',
          type: 'boolean',
        },
        {
          alias: '',
          desc: 'Command to run in each package directory',
          name: 'command',
        },
      ],
    })
  }

  /**
   * Displays the Status for the Workspace
   */
  async doRun(): Promise<void> {
    let brief = false
    let right = false
    const briefOpt = this.options.brief
    const rightOpt = this.options.right
    const args = process.argv
    const defaultCommand = 'git remote update'
    let command = defaultCommand
    for (let i = 3; i < args.length; i++) {
      const arg = args[i]
      if (CliElement.isOption(arg)) {
        if (CliElement.match(briefOpt, arg)) {
          brief = true
        } else if (CliElement.match(rightOpt, arg)) {
          right = true
        }
      } else if (CliElement.match(this.config, arg)) {
        // noop
      } else {
        command = arg
      }
    }
    if (command === defaultCommand) {
      brief = !right
    }

    let buffer = ''
    for (const workPackageDir of this.workspaceDirs) {
      const isPackage = PackageDir.isGit(
        this.workspaceDir + '/' + workPackageDir
      )
      if (isPackage) {
        buffer += `cd ../${workPackageDir} && \\\n`
        if (brief) {
          buffer += `echo "$(${command}) ${workPackageDir} " && \\\n`
        } else if (right) {
          buffer += `echo "${workPackageDir} $(${command}) " && \\\n`
        } else {
          buffer += `echo "# * ${workPackageDir} ${'*'.repeat(
            60 - workPackageDir.length
          )}" && \\\n`
          buffer += `(${command}) && \\\n`
        }
      }
    }
    const barePackageDir = this.moarPackageDir.replace(/.*\//, '')
    buffer += `cd ../${barePackageDir} \n`
    this.log(buffer)
  }
}
