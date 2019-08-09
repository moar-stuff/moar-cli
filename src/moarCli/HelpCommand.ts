import * as packageJson from '../package.json'
import { CliCommand } from '../cli/CliCommand'
import { commands } from '../moar-cli'
import { CliElement } from '../cli/CliElement'
import { AnsiTransform } from '../ansi/AnsiTransform'

export class HelpCommand extends CliCommand {
  private static versionOption = {
    alias: '-v',
    name: '--version',
    desc: 'Show version',
  }
  constructor() {
    super({
      alias: 'h',
      desc: 'Display Help',
      name: 'help',
      options: [HelpCommand.versionOption],
    })
  }
  async run(): Promise<void> {
    const args = process.argv
    for (const arg of args) {
      const versionOption = HelpCommand.versionOption
      if (CliElement.match(versionOption, arg)) {
        console.log(packageJson.version)
        return
      }
    }
    const commandChalk = this.theme.commandTransform
    const optionChalk = this.theme.optionTransform
    const commentChalk = this.theme.commentTransform
    const commandList: Array<string> = []
    let maxLen = 0
    for (const command of commands) {
      let len = 0
      len += command.config.alias.length
      len += command.config.name.length
      maxLen = Math.max(maxLen, len)
    }
    for (const command of commands) {
      let len = 0
      len += command.config.alias.length
      len += command.config.name.length
      let line = commentChalk('#')
      line += '    '
      line += `(${command.config.alias}|${command.config.name})`
      line += ' '
      line += '━'.repeat(1 + maxLen - len)
      line += ' '
      line += commentChalk(this.theme.emphasisTransform(command.config.desc))
      commandList.push(line)
    }
    commandList.sort()
    this.apply(commandList, commandChalk)
    const optionList = []
    for (const option of this.config.options) {
      optionList.push(`(${option.alias}|${option.name})`)
    }
    this.apply(optionList, optionChalk)
    const optionsUsage = optionChalk('options')
    const commandUsage = commandChalk('command')
    const cliName = CliCommand.cliName
    for (const arg of args) {
      for (const command of commands) {
        if (command !== this) {
          command._theme = this.theme
          if (CliElement.match(command.config, arg)) {
            console.log(command.help)
            return
          }
        }
      }
    }
    console.log(
      this.trimLines(`
      ${commentChalk('#')} ${commandChalk('SYNTAX')}: ${commandChalk(
        cliName
      )} <${commandUsage}> [${commandChalk('help')}] [<${optionsUsage}>]
      ${commentChalk('#')}
      ${commentChalk(`#`)} ${commandChalk('COMMANDS')}:\n${commandList.join(
        '\n'
      )}
      ${commentChalk('#')}
      ${commentChalk(`#`)} ${optionChalk('OPTIONS')}: ${optionList.join('|')}
      ${commentChalk('#')}      
      ${commentChalk(
        `# EXAMPLE: ${this.theme.emphasisTransform(this.config.desc)}`
      )}
    `) + `\n  ${cliName} branch help`
    )
  }

  apply(list: string[], transform: AnsiTransform) {
    for (let i = 0; i < list.length; i++) {
      list[i] = transform(list[i])
    }
  }
}
