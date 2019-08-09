import { AnsiIndicator } from '../ansi/AnsiIndicator'
import { PackageCommand } from './PackageCommand'
import { CliElement } from '../cli/CliElement'
import { PrepareConfig } from './PrepareConfig'

/**
 * Show branch view that have not been merged
 */
export class BranchCommand extends PackageCommand {
  constructor() {
    super({
      alias: 'b',
      name: 'branch',
      desc: 'Display branches with recent activity',
      example: `moar branch -s'(hours|days|[1-2] weeks)'`,
      options: [
        {
          name: 'hide',
          alias: 'h',
          type: 'RegEx',
          desc: 'Hide using the supplied regular expression',
        },
        {
          name: 'show',
          alias: 's',
          type: 'RegEx',
          desc: 'Show using the supplied regular expression',
        },
        {
          name: 'raw',
          alias: 'r',
          type: 'boolean',
          desc: 'Show "raw" output (useful to understand hide/show)',
        },
        {
          name: 'naked-mode',
          alias: 'n',
          type: 'boolean',
          desc: 'Display only the full branch names',
        },
        {
          name: 'full-name',
          alias: 'f',
          type: 'boolean',
          desc: 'Display full branch names',
        },
        {
          name: 'test-merge',
          alias: 't',
          type: 'boolean',
          desc: 'Test Merges',
        },
        {
          name: 'verify',
          alias: 'y',
          type: 'boolean',
          desc: 'Verify Signatures',
        },
      ],
    })
  }

  async doRun() {
    const config = {
      hideRx: /$^/,
      rawMode: false,
      showRx: /.*/,
      simplifyNameMode: 0,
      testMerge: false,
      verify: false,
      naked: false,
    }
    const nakedOpt = this.options['naked-mode']
    const rawOpt = this.options['raw']
    const testMergeOpt = this.options['test-merge']
    const fullNameOpt = this.options['full-name']
    const showOpt = this.options['show']
    const hideOpt = this.options['hide']
    const verifyOpt = this.options['verify']
    const args = process.argv
    for (let i = 3; i < args.length; i++) {
      const arg = args[i]
      if (CliElement.isOption(arg)) {
        if (CliElement.match(nakedOpt, arg)) {
          config.naked = true
        } else if (CliElement.match(rawOpt, arg)) {
          config.rawMode = true
        } else if (CliElement.match(testMergeOpt, arg)) {
          config.testMerge = true
        } else if (CliElement.match(verifyOpt, arg)) {
          config.verify = true
        } else if (CliElement.match(fullNameOpt, arg)) {
          config.simplifyNameMode = 2
        } else if (CliElement.match(showOpt, arg)) {
          config.showRx = new RegExp(CliElement.value(showOpt, args, i))
          config.hideRx = new RegExp('.*')
        } else if (CliElement.match(hideOpt, arg)) {
          config.hideRx = new RegExp(CliElement.value(hideOpt, args, i))
          config.showRx = new RegExp('^$')
        }
      }
    }
    await this.packageDir.prepare(config)
    console.log(this.getBranchLabel(config))
  }

  /**
   * Get the label used for the **Not Merged** command
   */
  getBranchLabel(config: PrepareConfig) {
    const packageDir = this.packageDir
    const buffer: string[] = []
    if (!config.naked) {
      const statusLabel = packageDir.getStatusLabel({
        trackingPushArrowSize: 1,
        developPushArrowSize: 1,
        masterPushArrowSize: 1,
        unmergedPushLineSize: 0,
        config: { color: true },
      })
      if (packageDir.noMerged.length === 0) {
        buffer.push(`━> ${statusLabel}`)
      } else {
        buffer.push(`┏━> ${statusLabel}`)
      }
    }
    const maxNumLen = `${packageDir.noMerged.length}`.length
    let maxShortNameLen = 1
    for (let i = 0; i < packageDir.noMerged.length; i++) {
      const branch = packageDir.noMerged[i]
      const len = branch.shortName.length
      maxShortNameLen = maxShortNameLen < len ? len : maxShortNameLen
    }
    let n = 0
    const last = packageDir.noMerged.length - 1
    for (let i = 0; i < packageDir.noMerged.length; i++) {
      const branch = packageDir.noMerged[i]
      if (config.naked) {
        buffer.push(branch.id)
      } else {
        const id = branch.id
        const shortName = branch.shortName
        const line: string[] = []

        const num = `${++n}`
        const numBars = '━'.repeat(maxNumLen - num.length)
        const good = branch.relative ? branch.relative.good : undefined
        line.push(i === last ? '┗━' : '┣━')
        line.push(numBars)
        line.push(' ')
        line.push(this.packageTheme.unmergedChalk(num))
        line.push(' ')
        line.push(this.packageTheme.signChalk(packageDir.sign(good)))
        line.push(shortName)
        line.push(' ━')
        const indicator = new AnsiIndicator({ color: true })
        indicator.pushText('━'.repeat(maxShortNameLen - shortName.length))
        indicator.pushText(' ')
        indicator.pushText(branch.mergeable)
        indicator.pushCounter('▲', branch.ahead, this.packageTheme.aheadChalk)
        indicator.pushCounter('▼', branch.behind, this.packageTheme.behindChalk)
        indicator.pushText(' ')
        line.push(indicator.content)
        if (branch.lastCommit) {
          line.push(
            `${branch.lastCommit.relative} by ${branch.lastCommit.author}`
          )
        }
        buffer.push(line.join(''))
      }
    }
    return buffer.join('\n')
  }
}
