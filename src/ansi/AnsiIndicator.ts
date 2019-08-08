import { AnsiIndicatorConfig } from './AnsiIndicatorConfig'
import { AnsiTransform } from './AnsiTransform'

/**
 * A display element for the console output.
 */
export class AnsiIndicator {
  private brackets = ''
  private buffer = ''

  constructor(readonly config?: AnsiIndicatorConfig) {}

  pushArrowLine(size: number) {
    this.buffer += ' ' + '━'.repeat(size) + '> '
    return this
  }

  pushText(text: string, transform?: AnsiTransform) {
    this.buffer += transform ? transform(text) : text
    return this
  }

  pushCounter(
    indicator: string,
    count: number,
    transform: AnsiTransform,
    force?: boolean,
    noPad?: boolean
  ) {
    if (count > 0 || force) {
      this.buffer += noPad ? '' : ' '
      const brackets = this.brackets
      if (brackets.length > 1) {
        this.buffer += brackets.charAt(0)
        this.brackets = brackets.charAt(1)
      }
      const noopTransform = (text: string) => {
        return text
      }
      transform = this.config ? transform || noopTransform : noopTransform
      this.buffer += transform(`${indicator}${count}`)
    }
    return this
  }

  get content() {
    return this.buffer
  }
}
