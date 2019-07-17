import { Chalk } from 'chalk'
export class ChalkUtil {
  static chalkTransformation(chalk?: Chalk): (text: string) => string {
    return (text: string) => {
      return chalk ? chalk(text) : text
    }
  }
}
