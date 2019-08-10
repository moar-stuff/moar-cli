import { verify } from 'crypto'
import { CliElement } from '../cli/CliElement'
import { PackageCommand } from './PackageCommand'
import { PackageDir } from './PackageDir'
import { PrepareConfig } from './PrepareConfig'

/**
 * A command to show status for the Workspace.
 */
export class StatusCommand extends PackageCommand {
  constructor() {
    super({
      alias: 's',
      desc: 'Display status of all packages from the parent directory',
      name: 'status',
      options: [
        {
          alias: 'y',
          desc: 'Verify signatures',
          name: 'verify',
        },
      ],
    })
  }

  /**
   * Displays the Status for the Workspace
   */
  protected async doRun(): Promise<void> {
    const prepareConfig: PrepareConfig = {
      hideRx: new RegExp('$^'),
      naked: false,
      rawMode: false,
      showRx: new RegExp('$^'),
      simplifyNameMode: 0,
      testMerge: false,
      verify: false,
    }
    const verifyOpt = this.options.verify
    const args = process.argv
    for (let i = 3; i < args.length; i++) {
      const arg = args[i]
      if (CliElement.isOption(arg)) {
        if (CliElement.match(verifyOpt, arg)) {
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
          this.packageTheme
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

    const maxNameLen = this.maxLen('nameAreaLen')
    const maxCurrentLen = this.maxLen('currentAreaLen')
    const maxTrackingLen = this.maxLen('trackingAreaLen')
    const maxDevelopLen = this.maxLen('developAreaLen')
    const maxMasterLen = this.maxLen('masterAreaLen')
    const maxUnmergedLen = this.maxLen('unmergedAreaLen')

    const labelConfig = { transform: true }
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
        config: labelConfig,
        developPushArrowSize,
        highlightCurrent: true,
        masterPushArrowSize,
        nameArrowSize,
        trackingPushArrowSize,
        unmergedPushLineSize,
      })
      this.log(label)
    }
  }

  private maxLen(prop: string) {
    let maxLen = 0
    for (const packageDir of this.packageDirs) {
      const len = (packageDir as any)[prop]
      maxLen = len > maxLen ? len : maxLen
    }
    return maxLen
  }
}
