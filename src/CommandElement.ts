export class CommandElement {
  name = ''
  alias = ''
  desc = ''
  example?: string = ''

  static match(element: CommandElement, text: string) {
    text = text.replace(/^\-*/, '').replace(/\=.*/, '')
    return text === element.alias || text === element.name
  }

  static isOption(arg: string) {
    return arg.startsWith('-')
  }

  static value(arg: string): string {
    const pos = arg.indexOf('=') + 1
    return arg.substring(pos)
  }
}
