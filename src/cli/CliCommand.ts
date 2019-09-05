import child_process from 'child_process'
import util from 'util'

import { CliCommandConfig } from './CliCommandConfig'
import { CliExecResult } from './CliExecResult'
import { CliOptionConfig } from './CliOptionConfig'
import { CliTheme } from './CliTheme'

const _cliName = process.argv[1]
  .replace(/.*\//, '')
  .replace(/\..*/, '')
  .replace(/\-cli$/, '')

/**
 * Command provided by **moar-cli**.
 */
export abstract class CliCommand {
  get theme() {
    return this._theme as CliTheme
  }

  static get cliName() {
    return _cliName
  }

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
    const buffer = []
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
        const columnLen = this.calcOptionColumnLen(option)
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
        const columnBuffer: string[] = []
        if (option.alias) {
          if (option.type && option.type !== 'boolean') {
            columnBuffer.push('(')
            columnBuffer.push(optionChalk(`-${option.alias}`))
            columnBuffer.push('|')
            columnBuffer.push(optionChalk(`--${option.name}`))
            columnBuffer.push(')')
            columnBuffer.push(optionChalk(this.theme.emphasisTransform('=')))
            columnBuffer.push('<')
            columnBuffer.push(commentChalk(option.type))
            columnBuffer.push('>')
          } else {
            columnBuffer.push(optionChalk(`-${option.alias}`))
            columnBuffer.push('|')
            columnBuffer.push(optionChalk(`--${option.name}`))
          }
        } else {
          columnBuffer.push(optionChalk(option.name))
        }
        const column = columnBuffer.join('')
        const columnLen = this.calcOptionColumnLen(option)
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

  static async run(command: CliCommand, theme: CliTheme, errors: string[]) {
    command._theme = theme
    await command.run(errors)
  }
  private static _exec = util.promisify(child_process.exec)
  _theme?: CliTheme

  protected readonly options: Record<string, CliOptionConfig>

  /**
   * Construct the command with configuraton options.
   *
   * @param config Configuration for the command.
   */
  constructor(readonly config: CliCommandConfig) {
    const options: Record<string, CliOptionConfig> = {}
    for (const option of config.options) {
      options[option.name] = option
    }
    this.options = options
  }

  log(text: string) {
    process.stdout.write(text)
    process.stdout.write('\n')
  }

  /**
   * The `run` method defines the entry point for the execution of a command.
   *
   * @param errors Array used to return errors.
   */
  abstract async run(errors: string[]): Promise<void>

  trimLines(text: string) {
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
    return list.join('\n')
  }

  async exec(cmd: string): Promise<CliExecResult> {
    try {
      return await CliCommand._exec(cmd)
    } catch (e) {
      return { e, stderr: e.stderr, stdout: e.stdout }
    }
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
}
