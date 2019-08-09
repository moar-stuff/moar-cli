import { CliCommandConfig } from './CliCommandConfig'
import { CliOptionConfig } from './CliOptionConfig'
import { CliTheme } from './CliTheme'

const _cliName = process.argv[1].replace(/.*\//, '').replace(/\..*/, '')

/**
 * Command provided by **moar-cli**.
 */
export abstract class CliCommand {
  _theme?: CliTheme

  get theme() {
    return <CliTheme>this._theme
  }

  static get cliName() {
    return _cliName
  }

  protected readonly options: Record<string, CliOptionConfig>

  constructor(readonly config: CliCommandConfig) {
    const options: Record<string, CliOptionConfig> = {}
    for (const option of config.options) {
      options[option.name] = option
    }
    this.options = options
  }

  abstract async run(errors: string[]): Promise<void>

  get help() {
    const commentChalk = this.theme.commentTransform
    const emphasis = this.theme.emphasisTransform
    const commandChalk = this.theme.commandTransform
    const optionChalk = this.theme.optionTransform
    let defaultOption = ''
    for (const option of this.config.options) {
      if (!option.alias) {
        defaultOption = option.name
      }
    }
    let buffer = []
    buffer.push(commentChalk('# '))
    buffer.push(commandChalk('SYNTAX'))
    buffer.push(': ')
    buffer.push(commandChalk(CliCommand.cliName))
    buffer.push(' ')
    buffer.push(commandChalk(this.config.name))
    buffer.push(' [')
    buffer.push(optionChalk('<options>'))
    buffer.push(']')
    buffer.push(' [')
    buffer.push(commandChalk('help'))
    buffer.push(']')
    buffer.push(' ')
    buffer.push(optionChalk(defaultOption))
    buffer.push('\n')
    if (this.config.options) {
      let maxColumnLen = 0
      for (const option of this.config.options) {
        let columnLen = this.calcOptionColumnLen(option)
        maxColumnLen = Math.max(maxColumnLen, columnLen)
      }
      this.config.options.sort((a, b) => {
        if (a.type && b.type && a.type > b.type) {
          return 1
        } else if (a.type && b.type && a.type < b.type) {
          return -1
        } else if (a.alias < b.alias) {
          return -1
        } else if (a.alias > b.alias) {
          return 1
        } else if (a.alias < b.alias) {
          return -1
        } else if (a.name > b.name) {
          return 1
        } else if (a.name < b.name) {
          return -1
        }
        return 0
      })
      for (const option of this.config.options) {
        buffer.push(commentChalk('#    '))
        let columnBuffer: string[] = []
        if (option.alias) {
          columnBuffer.push('(')
          columnBuffer.push(optionChalk(`-${option.alias}`))
          columnBuffer.push('|')
          columnBuffer.push(optionChalk(`--${option.name}`))
          columnBuffer.push(')')
          if (option.type && option.type !== 'boolean') {
            columnBuffer.push(optionChalk(this.theme.emphasisTransform('=')))
            columnBuffer.push('<')
            columnBuffer.push(commentChalk(option.type))
            columnBuffer.push('>')
          }
        } else {
          columnBuffer.push(optionChalk(option.name))
        }
        const column = columnBuffer.join('')
        let columnLen = this.calcOptionColumnLen(option)
        buffer.push(column)
        buffer.push(' ')
        buffer.push('━'.repeat(maxColumnLen - columnLen))
        buffer.push('━')
        buffer.push(' ')
        buffer.push(commentChalk(option.desc))
        buffer.push('\n')
      }
      buffer.push(commentChalk('#'))
      buffer.push('\n')
    }
    buffer.push(commentChalk('#    '))
    buffer.push(commentChalk('EXAMPLE: '))
    buffer.push(commentChalk(emphasis(this.config.desc)))
    buffer.push('\n')
    buffer.push(commentChalk('     '))
    if (this.config.example) {
      buffer.push(this.config.example)
    } else {
      buffer.push(CliCommand.cliName)
      buffer.push(' ')
      buffer.push(this.config.name)
    }
    return buffer.join('')
  }

  private calcOptionColumnLen(option: CliOptionConfig) {
    let columnLen = option.alias
      ? `(-${option.alias}|--${option.name})`.length
      : option.name.length + 1
    if (option.alias && option.type && option.type !== 'boolean') {
      columnLen += `=<${option.type}>`.length
    }
    return columnLen
  }

  static async run(command: CliCommand, theme: CliTheme, errors: string[]) {
    command._theme = theme
    await command.run(errors)
  }
}
