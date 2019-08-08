import { CliOptionConfig } from "./CliOptionConfig";

export class CliElement {
  name = ''
  alias = ''
  desc = ''
  example?: string = ''

  static match(element: CliElement, text: string) {
    if (text === element.alias || text === element.name) {
      return true
    }
    if (!text.startsWith('-')) {
      return false
    }
    text = text.replace(/^\-*/, '')
    return text.startsWith(element.alias) || text.startsWith(element.name)
  }

  static isOption(arg: string) {
    return arg.startsWith('-')
  }

  static value(option: CliOptionConfig, args: string[], index: number): string {
    let arg = args[index]
    if(arg.startsWith(option.alias + '=') || arg.startsWith(option.name + '=')) {
      const pos = arg.indexOf('=') + 1
      return arg.substring(pos)
    }
    const alias = '-' + option.alias
    const name = '--' + option.name
    if(arg.startsWith(alias)) {
      arg = arg.substring(alias.length)
      if(arg.length === 0) {
        arg = args[index + 1]
      }
      return arg
    }
    if(arg.startsWith(name)) {
      arg = arg.substring(name.length)
      if(arg.length === 0) {
        arg = args[index + 1]
      }
      return arg
    }
    throw new Error('Unable to parse value')
  }
}
