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
      const isPackage = PackageDir.isGit(this.workspaceDir + '/' + workDir);
    if (isPackage) {
        const packageDir = new PackageDir(
          this.packageDir,
          workDir,
          this.theme,
          this.context
        );
        await packageDir.prepare(false);
        this.packageDirs.push(packageDir);
      }
    }

    this.packageDirs.sort((a, b) => {
      if (a.tagVerify.tag === b.tagVerify.tag) {
        if (a.headDate === b.headDate) {
          return 0;
        } else {
          return a.headDate > b.headDate ? 1 : -1;
        }
      }
      return a.tagVerify.tag > b.tagVerify.tag ? 1 : -1;
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
        highlightCurrent: true,
        nameArrowSize,
        trackingPushArrowSize,
        developPushArrowSize,
        masterPushArrowSize,
        unmergedPushLineSize,
        config: labelConfig
      });
      console.log(label);
    }
  }
}
