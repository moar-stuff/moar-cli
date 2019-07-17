import { CommandElement } from './CommandElement'
import { OptionConfig } from './OptionConfig'

export interface CommandConfig extends CommandElement {
  options: OptionConfig[]
}
