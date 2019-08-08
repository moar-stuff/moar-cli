import { AnsiTransform } from '../ansi/AnsiTransform'
import { CliTheme } from '../cli/CliTheme';

/**
 * Transformations that work together to produce a desired appearance.
 *
 * The transformation operations provided by the theme simply convert one
 * textual representation to another.
 */
export interface PackageTheme extends CliTheme {
  behindChalk: AnsiTransform
  uncommitedChalk: AnsiTransform
  unmergedChalk: AnsiTransform
  aheadChalk: AnsiTransform
  signChalk: AnsiTransform
  commentTransform: AnsiTransform
  emphasisTransform: AnsiTransform
  commandTransform: AnsiTransform
  optionTransform: AnsiTransform
}
