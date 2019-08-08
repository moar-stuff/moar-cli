import { PackageCommand } from './PackageCommand'
import child_process from 'child_process'
import util from 'util'
import { CliElement } from '../cli/CliElement';
const exec = util.promisify(child_process.exec)

/**
 * Tag the package.
 *
 * The tag applied to the package is built using the base tag named plus
 * information from all packages in the workspace.
 */
export class TagCommand extends PackageCommand {
  constructor() {
    super({
      alias: 't',
      desc: 'Write and push a tag',
      name: 'tag', 
      options: [{
        alias: 'm',
        desc: 'Base tag message',
        name: 'message', 
        type: 'string',
      },
      {
        alias: '',
        desc: 'Base tag message',
        name: 'tag'
      }]
    })
  }

  protected async doRun(): Promise<void> {
    let message = ''
    let tag = ''
    const args = process.argv
    const messageOpt = this.options['message']
    for(let i = 3; i < args.length; i++) {
      const arg = args[i]
      if(CliElement.isOption(arg)) {
        if(CliElement.match(messageOpt, arg)) {
          message = CliElement.value(messageOpt, args, i)
        }
      } else {
        tag = arg
      }
    }
    tag += this.packageDir.version

    message += `\n${'-'.repeat(40)}\n`
    let cmd = 'echo "$(git rev-parse HEAD) ${PWD##*/}@$(moar at)"'
    cmd = `moar e '${cmd}' | sh | grep -v '# *'`
    const result = await exec(cmd, { cwd: this.moarPackageDir })
    const lines = result.stdout.split('\n')
    for (const line of lines) {
      message += line + '\n'
    }

    try {
      const git = this.packageDir.git
      git.silent(true)
      await git.tag(['-s', '-m', message, tag])
      await git.raw(['push', 'origin', tag])
      console.error(`${this.moarPackageDir} - created tag`)
    } catch (e) {
      console.error(
        `💥ERROR: ${this.moarPackageDir} - unable to tag ${e.message}`
      )
      process.exit(1)
    }
  }
}
