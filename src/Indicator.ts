import { Chalk } from 'chalk';
import { IndicatorConfig } from './IndicatorConfig';
export class Indicator {
  private brackets = '';
  private buffer = '';

  constructor(readonly config?: IndicatorConfig) {}

  pushArrowLine(size: number, chalk: Chalk) {
    this.buffer += chalk(' ' + '─'.repeat(size) + '> ');
    return this;
  }

  pushLeftArrowLine(size: any) {
    this.buffer += ' <' + '─'.repeat(size);
    return this;
  }

  pushText(text: string, chalk?: Chalk) {
    let formatter = this.getFormatter(chalk);
    this.buffer += formatter(text);
    return this;
  }

  push(
    indicator: string,
    count: number,
    chalk?: Chalk,
    force?: boolean,
    noPad?: boolean
  ) {
    let formatter = this.getFormatter(chalk);
    if (count > 0 || force) {
      this.buffer += noPad ? '' : ' ';
      const brackets = this.brackets;
      if (brackets.length > 1) {
        this.buffer += brackets.charAt(0);
        this.brackets = brackets.charAt(1);
      }
      this.buffer += formatter(`${indicator}${count}`);
    }
    return this;
  }

  get content() {
    return this.buffer;
  }

  private getFormatter(chalk: Chalk | undefined): (text: string) => string {
    if (this.config && chalk) {
      return (text: string) => {
        return chalk(text);
      };
    } else {
      return (text: string) => {
        return text;
      };
    }
  }
}
