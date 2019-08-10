import { AnsiLineBuilderConfig } from './AnsiLineBuilderConfig'
import { AnsiTransform } from './AnsiTransform'
import { AnsiUtil } from './AnsiUtil'

/**
 * A buffer used to build a line for output in an Ansi Terminal.
 */
export class AnsiLineBuilder {
  private buffer = ''

  constructor(readonly config: AnsiLineBuilderConfig) {}

  /**
   * Push a line with an arrow to the buffer.
   *
   * @param size size of the arrow's line segment
   */
  pushArrowLine(size: number) {
    this.buffer += ' ' + '━'.repeat(size) + '> '
    return this
  }

  /**
   * Push some text to the buffer.
   * @param text Text to push
   * @param transform transformation to apply to the text.
   */
  pushText(text: string, transform: AnsiTransform) {
    if (!this.config.transform) {
      transform = AnsiUtil.noopTransform
    }
    this.buffer += transform(text)
    return this
  }

  pushCounter(
    indicator: string,
    count: number,
    transform: AnsiTransform,
    force?: boolean,
    noPad?: boolean
  ) {
    if (!this.config.transform) {
      transform = AnsiUtil.noopTransform
    }
    if (count > 0 || force) {
      this.buffer += noPad ? '' : ' '
      this.buffer += transform(`${indicator}${count}`)
    }
    return this
  }

  get content() {
    return this.buffer
  }
}
