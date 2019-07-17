import chalk from 'chalk';
import * as simpleGit from 'simple-git/promise';

import { Theme } from './Theme';
import { Command } from './Command';
import { ModuleDir } from './ModuleDir';
import { Indicator } from './Indicator';
import { CommandLineOptions } from 'command-line-args';

/**
 * A command to show a description for the module directory.
 */
export class DescribeCommand extends Command {
  constructor(commandContext: CommandLineOptions, theme: Theme) {
    super(commandContext, theme);
  }

  async run(errors: string[]) {
    this.checkModuleDir(errors);
    if (errors.length > 0) {
      return;
    }

    const gitModule = simpleGit.default(this.moduleDir);
    const dir = this.moduleDir.substring(this.moduleDir.lastIndexOf('/') + 1);
    const moduleDir = new ModuleDir(
      this.moduleDir,
      dir,
      gitModule,
      this.theme,
      this.context
    );
    await moduleDir.prepare(true);
    const config = { color: true };
    console.log(
      chalk.bold(
        `Module Status (HEAD): ${
          moduleDir.pushCurrentArea(new Indicator({ color: true })).content
        }`
      )
    );
    if (moduleDir.tagVerify.tag.length > 0) {
      this.showSignatureLine(
        `${chalk.bold(moduleDir.tagVerify.tag)} tag`,
        moduleDir.tagVerify.good
      );
    }
    this.showSignatureLine('latest commit', moduleDir.goodHead);
    console.log(`  * ${moduleDir.headRelativeArea}`);
    if (moduleDir.uncommited > 0) {
      console.log(
        `  * ${this.theme.uncommitedChalk('' + moduleDir.uncommited)} file ${
          moduleDir.uncommited === 1 ? 'change' : 'changes'
        }`
      );
    }
    this.showAheadBehind({
      ahead: moduleDir.ahead,
      behind: moduleDir.behind,
      trackingLabel: moduleDir.trackingLabel
    });
    if (moduleDir.trackingLabel !== '') {
      console.log(
        chalk.bold(
          `Tracking Status.....: ${
            moduleDir.pushTrackingArea(new Indicator(config)).content
          }`
        )
      );
      this.showSignatureLine('latest commit', moduleDir.goodTracking);
      console.log(`  * ${moduleDir.trackingRelativeArea}`);
      this.showAheadBehind({
        ahead: moduleDir.developToTracking,
        behind: moduleDir.trackingToDevelop,
        trackingLabel: 'develop'
      });
    }
    console.log(
      chalk.bold(
        `Develop Status......: ${
          moduleDir.pushDevelopArea(new Indicator(config)).content
        }`
      )
    );
    this.showSignatureLine('latest commit', moduleDir.goodDevelop);
    console.log(`  * ${moduleDir.developRelativeArea}`);
    this.showAheadBehind({
      ahead: moduleDir.masterToDevelop,
      behind: moduleDir.developToMaster,
      trackingLabel: 'master'
    });
    console.log(
      chalk.bold(
        `Master Status.......: ${
          moduleDir.pushMasterArea(new Indicator(config)).content
        }`
      )
    );
    this.showSignatureLine('latest commit', moduleDir.goodMaster);
    console.log(`  * ${moduleDir.masterRelativeArea}`);
    this.showAheadBehind({
      behind: 0, // Master is **never** behind anything
      ahead: moduleDir.developToMaster,
      trackingLabel: 'master'
    });
    console.log(
      chalk.bold(
        `Unmerged Branches...: ${moduleDir
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
