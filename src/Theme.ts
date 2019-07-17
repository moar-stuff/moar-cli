import { Chalk } from 'chalk';

export interface Theme {
  behindChalk: Chalk;
  uncommitedChalk: Chalk;
  unmergedChalk: Chalk;
  aheadChalk: Chalk;
  signChalk: Chalk;
}
