import { Theme } from '../Theme'
import { CommandLineOptions } from 'command-line-args'
import { PackageDir } from '../PackageDir'
import { RootCommand } from '../RootCommand'
import { CommandElement } from '../CommandElement'

/**
 * Build a script to run a command in **each** package dir.
 */
export class EachCommand extends RootCommand {
  constructor() {
    super({
      alias: 'e',
      desc: 'Build a script to run a command in all package directories',
      name: 'each',
      example: 'moar each | sh',
      options: [
        {
          name: 'brief',
          alias: 'b',
          type: 'boolean',
          desc: 'Provide a very brief output',
        },
        {
          name: 'right',
          alias: 'r',
          type: 'boolean',
          desc: 'Put the name on the right hand of output line',
        },
        {
          name: 'command',
          alias: '',
          desc: 'Command to run in each package directory',
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
    const briefOpt = this.options['brief']
    const rightOpt = this.options['right']
    const args = process.argv
    const defaultCommand = 'git remote update'
    let command = defaultCommand
    for (let i = 3; i < args.length; i++) {
      const arg = args[i]
      if (CommandElement.isOption(arg)) {
        if (CommandElement.match(briefOpt, arg)) {
          brief = true
        } else if (CommandElement.match(rightOpt, arg)) {
          right = true
        }
      } else if (CommandElement.match(this.config, arg)) {
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
    console.log(buffer)
  }
}
