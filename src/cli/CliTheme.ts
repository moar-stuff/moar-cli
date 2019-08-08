import { AnsiTransform } from '../ansi/AnsiTransform'

/**
 * Transformations that work together to produce a desired appearance.
 *
 * The transformation operations provided by the theme simply convert one
 * textual representation to another.
 */
export interface CliTheme {
  commentTransform: AnsiTransform
  emphasisTransform: AnsiTransform
  commandTransform: AnsiTransform
  optionTransform: AnsiTransform
}
