import { PackageDir } from '../PackageDir'
import { RootCommand } from '../RootCommand'
import { PrepareConfig } from '../PrepareConfig';
import { CommandElement } from '../CommandElement';
import { verify } from 'crypto';

/**
 * A command to show status for the Workspace.
 */
export class StatusCommand extends RootCommand {
  constructor() {
    super({
      alias: 's',
      desc: 'Display status of all packages from the parent directory',
      name: 'status', 
      options: [{
        alias: 'y',
        desc:'Verify signatures',
        name: 'verify'
      }]
    })
  }

  private maxLen(prop: string) {
    let maxLen = 0
    for (const packageDir of this.packageDirs) {
      let len = (<any>packageDir)[prop]
      maxLen = len > maxLen ? len : maxLen
    }
    return maxLen
  }

  /**
   * Displays the Status for the Workspace
   */
  protected async doRun(): Promise<void> {
    const prepareConfig: PrepareConfig = {
      verify: false,
      testMerge: false,
      showRx: new RegExp('$^'),
      hideRx: new RegExp('$^'),
      naked: false,
      rawMode: false,
      simplifyNameMode: 0
    }
    const verifyOpt = this.options['verify']
    const args = process.argv
    for (let i = 3; i < args.length; i++) {
      const arg = args[i]
      if (CommandElement.isOption(arg)) {
        if (CommandElement.match(verifyOpt, arg)) {
          prepareConfig.verify = true
        }
      }
    }
    for (const workDir of this.workspaceDirs) {
      const isPackage = PackageDir.isGit(this.workspaceDir + '/' + workDir)
      if (isPackage) {
        const packageDir = new PackageDir(
          this.moarPackageDir,
          workDir,
          this.theme
        )
        await packageDir.prepare(prepareConfig)
        this.packageDirs.push(packageDir)
      }
    }

    this.packageDirs.sort((a, b) => {
      if (a.tagVerify.tag === b.tagVerify.tag) {
        if (a.headDate === b.headDate) {
          return 0
        } else {
          return a.headDate > b.headDate ? 1 : -1
        }
      }
      return a.tagVerify.tag > b.tagVerify.tag ? 1 : -1
    })

    let maxNameLen = this.maxLen('nameAreaLen')
    let maxCurrentLen = this.maxLen('currentAreaLen')
    let maxTrackingLen = this.maxLen('trackingAreaLen')
    let maxDevelopLen = this.maxLen('developAreaLen')
    let maxMasterLen = this.maxLen('masterAreaLen')
    let maxUnmergedLen = this.maxLen('unmergedAreaLen')

    const labelConfig = { color: true, size: maxDevelopLen }
    for (const memberDir of this.packageDirs) {
      const nameLen = memberDir.nameAreaLen
      const currentLen = memberDir.currentAreaLen
      const trackingLen = memberDir.trackingAreaLen
      const developLen = memberDir.developAreaLen
      const masterLen = memberDir.masterAreaLen
      const unmergedLen = memberDir.unmergedAreaLen
      const nameArrowSize = 1 + maxNameLen - nameLen
      const trackingPushArrowSize = 1 + maxCurrentLen - currentLen
      const developPushArrowSize = 1 + maxTrackingLen - trackingLen
      const masterPushArrowSize = 1 + maxDevelopLen - developLen
      const unmergedPushLineSize =
        1 + (maxMasterLen - masterLen) + (maxUnmergedLen - unmergedLen)
      const label = memberDir.getStatusLabel({
        highlightCurrent: true,
        nameArrowSize,
        trackingPushArrowSize,
        developPushArrowSize,
        masterPushArrowSize,
        unmergedPushLineSize,
        config: labelConfig,
      })
      console.log(label)
    }
  }
}
