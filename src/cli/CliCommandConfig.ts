import { CliElement } from './CliElement'
import { CliOptionConfig } from './CliOptionConfig'

export interface CliCommandConfig extends CliElement {
  options: CliOptionConfig[]
}
