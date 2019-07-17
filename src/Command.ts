import * as fs from 'fs'
import { CommandConfig } from './CommandConfig'
import { OptionConfig } from './OptionConfig'
import { PackageDir } from './PackageDir'
import { Theme } from './Theme'

let _moarPackageDir: string
if (process.env.MOAR_PACKAGE_DIR) {
  _moarPackageDir = process.env.MOAR_PACKAGE_DIR
} else {
  _moarPackageDir = process.cwd()
}

const _cliName = process.argv[1].replace(/.*\//, '').replace(/\..*/, '')

/**
 * Command provided by **moar-cli**.
 */
export abstract class Command {
  static get cliName() {
    return _cliName
  }

  static async run(command: Command, theme: Theme, errors: string[]) {
    command._theme = theme
    await command.run(errors)
  }

  _theme?: Theme
  private _packageDir?: PackageDir
  protected packageDirs: PackageDir[] = []
  protected workspaceDir: string
  protected workspaceDirs: string[]
  protected readonly options: Record<string, OptionConfig>

  protected get moarPackageDir() {
    return _moarPackageDir
  }

  constructor(readonly config: CommandConfig) {
    const pos = this.moarPackageDir.lastIndexOf('/')
    this.workspaceDir = this.moarPackageDir.substring(0, pos)
    this.workspaceDirs = fs.readdirSync(this.workspaceDir)
    const options: Record<string, OptionConfig> = {}
    for (const option of config.options) {
      options[option.name] = option
    }
    this.options = options
  }

  get theme() {
    return <Theme>this._theme
  }

  get packageDir() {
    if (!this._packageDir) {
      const errors: string[] = []
      if (this.checkPackageDir(errors)) {
        throw new Error(errors[0])
      }
    }
    return <PackageDir>this._packageDir
  }

  abstract async run(errors: string[]): Promise<void>

  protected checkPackageDir(errors: string[]) {
    const isPackageDir = PackageDir.isGit(this.moarPackageDir)
    if (!isPackageDir) {
      errors.push('Must be run from a git repository root')
    } else {
      const dir = this.moarPackageDir.substring(
        this.moarPackageDir.lastIndexOf('/') + 1
      )
      this._packageDir = new PackageDir(this.moarPackageDir, dir, this.theme)
    }
    return errors.length > 0
  }

  get help() {
    const commentChalk = this.theme.commentChalk
    const emphasis = this.theme.emphasis
    const commandChalk = this.theme.commandChalk
    const optionChalk = this.theme.optionChalk
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
    buffer.push(commandChalk(Command.cliName))
    buffer.push(' ')
    buffer.push(commandChalk(this.config.name))
    buffer.push(' [')
    buffer.push(optionChalk('<options>'))
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
            columnBuffer.push(optionChalk(this.theme.emphasis('=')))
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
        buffer.push(option.desc)
        buffer.push('\n')
      }
      buffer.push(commentChalk('#'))
      buffer.push('\n')
    }
    buffer.push(commentChalk('#    '))
    buffer.push(commentChalk('EXAMPLE: '))
    buffer.push(commentChalk(emphasis(this.config.desc)))
    buffer.push('\n')
    buffer.push(commentChalk('#    '))
    if (this.config.example) {
      buffer.push(commandChalk(this.config.example))
    } else {
      buffer.push(commandChalk(Command.cliName))
      buffer.push(' ')
      buffer.push(commandChalk(this.config.name))
    }
    return buffer.join('')
  }

  private calcOptionColumnLen(option: OptionConfig) {
    let columnLen = option.alias
      ? `(-${option.alias}|--${option.name})`.length
      : option.name.length + 1
    if (option.alias && option.type && option.type !== 'boolean') {
      columnLen += `=<${option.type}>`.length
    }
    return columnLen
  }
}
