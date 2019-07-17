import { Chalk } from 'chalk'
import { TextTransform } from './TextTransform'

/**
 * Transformations that work together to produce a desired appearance.
 *
 * The transformation operations provided by the theme simply convert one
 * textual representation to another.
 */
export interface Theme {
  behindChalk: TextTransform
  uncommitedChalk: TextTransform
  unmergedChalk: TextTransform
  aheadChalk: TextTransform
  signChalk: TextTransform
  commentChalk: TextTransform
  emphasis: TextTransform
  commandChalk: TextTransform
  optionChalk: TextTransform
}
