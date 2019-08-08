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
        this.log(packageJson.version)
        return
      }
    }
    const commandChalk = this.theme.commandTransform
    const optionChalk = this.theme.optionTransform
    const commentChalk = this.theme.commentTransform
    const commandList: Array<string> = []
    for (const command of commands) {
      commandList.push(`(${command.config.alias}|${command.config.name})`)
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
            this.log(command.help)
            return
          }
        }
      }
    }
    this.log(`
      ${commentChalk('#')} ${commandChalk('SYNTAX')}: ${commandChalk(
      cliName
    )} <${commandUsage}> [${commandChalk('help')}] [<${optionsUsage}>]
      ${commentChalk('#')}
      ${commentChalk(`#`)} ${commandChalk('COMMANDS')}: ${commandList.join('|')}
      ${commentChalk(`#`)} ${optionChalk('OPTIONS')}: ${optionList.join('|')}
      ${commentChalk('#')}      
      ${commentChalk(
        `# EXAMPLE: ${this.theme.emphasisTransform(this.config.desc)}`
      )}
      ${commentChalk(`#`)} ${commandChalk(`${cliName} branch help`)}
    `)
  }

  apply(list: string[], transform: AnsiTransform) {
    for (let i = 0; i < list.length; i++) {
      list[i] = transform(list[i])
    }
  }

  log(text: string) {
    const list = text.split('\n')
    for (let i = 0; i < list.length; i++) {
      list[i] = list[i].trim()
    }
    while (list[0] !== undefined && list[0].trim() === '') {
      list.shift()
    }
    while (
      list[list.length - 1] !== undefined &&
      list[list.length - 1].trim() === ''
    ) {
      list.pop()
    }
    console.log(list.join('\n'))
  }
}
