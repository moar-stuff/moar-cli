import { Chalk } from 'chalk'

export class AnsiUtil {
  static chalkTransform(chalk?: Chalk): (text: string) => string {
    return (text: string) => {
      return chalk ? chalk(text) : text
    }
  }
}
