import { Chalk } from 'chalk'
import { AnsiTransform } from './AnsiTransform'

export class AnsiUtil {
  static noopTransform: AnsiTransform = (text: string) => {
    return text
  }

  static chalkTransform(chalk?: Chalk): (text: string) => string {
    return (text: string) => {
      return chalk ? chalk(text) : text
    }
  }
}
