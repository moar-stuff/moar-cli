import chalk from 'chalk';
import * as simpleGit from 'simple-git/promise';

import { Theme } from './Theme';
import { Command } from './Command';
import { PackageDir } from './PackageDir';
import { Indicator } from './Indicator';
import { CommandLineOptions } from 'command-line-args';

/**
 * Show a description for the package
 */
export class DescribeCommand extends Command {
  constructor(commandContext: CommandLineOptions, theme: Theme) {
    super(commandContext, theme);
  }

  async run(errors: string[]) {
    this.checkPackageDir(errors);
    if (errors.length > 0) {
      return;
    }

    const git = simpleGit.default(this.packageDir);
    const dir = this.packageDir.substring(this.packageDir.lastIndexOf('/') + 1);
    const packageDir = new PackageDir(
      this.packageDir,
      dir,
      git,
      this.theme,
      this.context
    );
    await packageDir.prepare(true);
    const config = { color: true };
    console.log(
      chalk.bold(
        `Status (HEAD): ${
          packageDir.pushCurrentArea(new Indicator({ color: true })).content
        }`
      )
    );
    if (packageDir.tagVerify.tag.length > 0) {
      this.showSignatureLine(
        `${chalk.bold(packageDir.tagVerify.tag)} tag`,
        packageDir.tagVerify.good
      );
    }
    this.showSignatureLine('latest commit', packageDir.goodHead);
    console.log(`  * ${packageDir.headRelativeArea}`);
    if (packageDir.uncommited > 0) {
      console.log(
        `  * ${this.theme.uncommitedChalk('' + packageDir.uncommited)} file ${
          packageDir.uncommited === 1 ? 'change' : 'changes'
        }`
      );
    }
    this.showAheadBehind({
      ahead: packageDir.ahead,
      behind: packageDir.behind,
      trackingLabel: packageDir.trackingLabel
    });
    if (packageDir.trackingLabel !== '') {
      console.log(
        chalk.bold(
          `Tracking Status.....: ${
            packageDir.pushTrackingArea(new Indicator(config)).content
          }`
        )
      );
      this.showSignatureLine('latest commit', packageDir.goodTracking);
      console.log(`  * ${packageDir.trackingRelativeArea}`);
      this.showAheadBehind({
        ahead: packageDir.developToTracking,
        behind: packageDir.trackingToDevelop,
        trackingLabel: 'develop'
      });
    }
    console.log(
      chalk.bold(
        `Develop Status......: ${
          packageDir.pushDevelopArea(new Indicator(config)).content
        }`
      )
    );
    this.showSignatureLine('latest commit', packageDir.goodDevelop);
    console.log(`  * ${packageDir.developRelativeArea}`);
    this.showAheadBehind({
      ahead: packageDir.masterToDevelop,
      behind: packageDir.developToMaster,
      trackingLabel: 'master'
    });
    console.log(
      chalk.bold(
        `Master Status.......: ${
          packageDir.pushMasterArea(new Indicator(config)).content
        }`
      )
    );
    this.showSignatureLine('latest commit', packageDir.goodMaster);
    console.log(`  * ${packageDir.masterRelativeArea}`);
    this.showAheadBehind({
      behind: 0, // Master is **never** behind anything
      ahead: packageDir.developToMaster,
      trackingLabel: 'master'
    });
    console.log(
      chalk.bold(
        `Unmerged Branches...: ${packageDir
          .pushUnmergedArea(new Indicator(config))
          .content.trim()}`
      )
    );
  }

  private showAheadBehind({
    ahead,
    behind,
    trackingLabel
  }: {
    ahead: number;
    behind: number;
    trackingLabel: string;
  }) {
    if (ahead) {
      console.log(
        `  * Ahead of '${chalk.bold(trackingLabel)}' by ${this.theme.aheadChalk(
          '' + ahead
        )} commits`
      );
    }
    if (behind) {
      console.log(
        `  * Behind of '${chalk.bold(
          trackingLabel
        )}' by ${this.theme.behindChalk('' + behind)} commits`
      );
    }
  }

  private showSignatureLine(onWhat: string, good?: boolean) {
    if (good === undefined) {
      console.log(`  ◌ ${this.theme.signChalk('No signature')} on ${onWhat}`);
    } else {
      console.log(
        `  ${good ? '●' : '○'} ${
          good ? this.theme.signChalk('Good') : this.theme.signChalk('Unknown')
        } signature on ${onWhat}`
      );
    }
  }
}
