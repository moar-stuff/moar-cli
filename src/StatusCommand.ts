import * as fs from 'fs';
import * as simpleGit from 'simple-git/promise';
import { PackageDir } from './PackageDir';
import { Theme } from './Theme';
import { Command } from './Command';
import { CommandLineOptions } from 'command-line-args';

/**
 * A command to show status for the Workspace.
 */
export class StatusCommand extends Command {
  constructor(context: CommandLineOptions, theme: Theme) {
    super(context, theme);
  }

  private maxLen(prop: string) {
    let maxLen = 0;
    for (const packageDir of this.packageDirs) {
      let len = (<any>packageDir)[prop];
      maxLen = len > maxLen ? len : maxLen;
    }
    return maxLen;
  }

  /**
   * Displays the Status for the Workspace
   */
  async run(errors: string[]): Promise<void> {
    this.checkPackageDir(errors);
    if (errors.length > 0) {
      return;
    }

    for (const workDir of this.workspaceDirs) {
      if (
        fs.existsSync(
          this.workspaceDir + '/' + workDir + '/.git/config'
        )
      ) {
        const git = simpleGit.default(
          this.workspaceDir + '/' + workDir
        );
        const packageDir = new PackageDir(
          this.packageDir,
          workDir,
          git,
          this.theme,
          this.context
        );
        await packageDir.prepare(false);
        this.packageDirs.push(packageDir);
      }
    }

    this.packageDirs.sort((a, b) => {
      let sortA = '';
      let sortB = '';
      if(this.context.sort === 't')  {
        this.context.sort = 'tag';
      }
      if (this.context.sort === 'tag') {
        sortA = a.tagVerify.tag;
        sortB = b.tagVerify.tag;
      } else {
        sortA = a.headDate;
        sortB = b.headDate;
      }
      if (sortA === sortB) {
        return 0;
      }
      return sortA > sortB ? 1 : -1;
    });

    let maxNameLen = this.maxLen('nameAreaLen');
    let maxCurrentLen = this.maxLen('currentAreaLen');
    let maxTrackingLen = this.maxLen('trackingAreaLen');
    let maxDevelopLen = this.maxLen('developAreaLen');
    let maxMasterLen = this.maxLen('masterAreaLen');
    let maxUnmergedLen = this.maxLen('unmergedAreaLen');

    const labelConfig = { color: true, size: maxDevelopLen };
    for (const memberDir of this.packageDirs) {
      const nameLen = memberDir.nameAreaLen;
      const currentLen = memberDir.currentAreaLen;
      const trackingLen = memberDir.trackingAreaLen;
      const developLen = memberDir.developAreaLen;
      const masterLen = memberDir.masterAreaLen;
      const unmergedLen = memberDir.unmergedAreaLen;
      const nameArrowSize = 1 + maxNameLen - nameLen;
      const trackingPushArrowSize = 1 + maxCurrentLen - currentLen;
      const developPushArrowSize = 1 + maxTrackingLen - trackingLen;
      const masterPushArrowSize = 1 + maxDevelopLen - developLen;
      const unmergedPushLineSize =
        1 + (maxMasterLen - masterLen) + (maxUnmergedLen - unmergedLen);
      const label = memberDir.getStatusLabel({
        nameArrowSize,
        trackingPushArrowSize,
        developPushArrowSize,
        masterPushArrowSize,
        unmergedPushArrowSize: unmergedPushLineSize,
        config: labelConfig
      });
      console.log(label);
    }
  }
}
