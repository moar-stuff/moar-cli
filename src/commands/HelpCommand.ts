import * as packageJson from '../package.json'
import { Command } from '../Command'
import { commands } from '../moar-cli'
import { CommandElement } from '../CommandElement'
import { TextTransform } from '../TextTransform.js'

export class HelpCommand extends Command {
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
      if (CommandElement.match(versionOption, arg)) {
        this.log(packageJson.version)
        return
      }
    }
    const commandChalk = this.theme.commandChalk
    const optionChalk = this.theme.optionChalk
    const commentChalk = this.theme.commentChalk
    const commandList: Array<string> = []
    for (const command of commands) {
      commandList.push(command.config.alias)
      commandList.push(command.config.name)
    }
    commandList.sort()
    this.apply(commandList, commandChalk)
    const optionList = []
    for (const option of this.config.options) {
      optionList.push(option.alias)
      optionList.push(option.name)
    }
    this.apply(optionList, optionChalk)
    const optionsUsage = optionChalk('options')
    const commandUsage = commandChalk('command')
    const cliName = Command.cliName
    for (const arg of args) {
      for (const command of commands) {
        if (command !== this) {
          command._theme = this.theme
          if (CommandElement.match(command.config, arg)) {
            this.log(command.help)
            return
          }
        }
      }
    }
    this.log(`
      ${commentChalk('#')} ${commandChalk('SYNTAX')}: ${commandChalk(cliName)} <${commandUsage}> [${commandChalk('help')}] [<${optionsUsage}>]
      ${commentChalk('#')}
      ${commentChalk(`#`)} ${commandChalk('COMMANDS')}: ${commandList.join('|')}
      ${commentChalk(`#`)} ${optionChalk('OPTIONS')}: ${optionList.join('|')}
      ${commentChalk('# ')}
    `)
  }

  apply(list: string[], transform: TextTransform) {
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
