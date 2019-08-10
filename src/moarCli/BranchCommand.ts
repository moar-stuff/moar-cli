import { AnsiLineBuilder } from '../ansi/AnsiLineBuilder'
import { AnsiUtil } from '../ansi/AnsiUtil'

import { CliElement } from '../cli/CliElement'

import { PackageCommand } from './PackageCommand'
import { PrepareConfig } from './PrepareConfig'

/**
 * Show branch view that have not been merged
 */
export class BranchCommand extends PackageCommand {
  constructor() {
    super({
      alias: 'b',
      desc: 'Display branches with recent activity',
      example: "moar branch -s'(hours|days|[1-2] weeks)'",
      name: 'branch',
      options: [
        {
          alias: 'h',
          desc: 'Hide using the supplied regular expression',
          name: 'hide',
          type: 'RegEx',
        },
        {
          alias: 's',
          desc: 'Show using the supplied regular expression',
          name: 'show',
          type: 'RegEx',
        },
        {
          alias: 'r',
          desc: 'Show "raw" output (useful to understand hide/show)',
          name: 'raw',
          type: 'boolean',
        },
        {
          alias: 'n',
          desc: 'Display only the full branch names',
          name: 'naked-mode',
          type: 'boolean',
        },
        {
          alias: 'f',
          desc: 'Display full branch names',
          name: 'full-name',
          type: 'boolean',
        },
        {
          alias: 't',
          desc: 'Test Merges',
          name: 'test-merge',
          type: 'boolean',
        },
        {
          alias: 'y',
          desc: 'Verify Signatures',
          name: 'verify',
          type: 'boolean',
        },
      ],
    })
  }

  async doRun() {
    const config = {
      hideRx: /$^/,
      naked: false,
      rawMode: false,
      showRx: /.*/,
      simplifyNameMode: 0,
      testMerge: false,
      verify: false,
    }
    const nakedOpt = this.options['naked-mode']
    const rawOpt = this.options.raw
    const testMergeOpt = this.options['test-merge']
    const fullNameOpt = this.options['full-name']
    const showOpt = this.options.show
    const hideOpt = this.options.hide
    const verifyOpt = this.options.verify
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
    this.log(this.getBranchLabel(config))
  }

  /**
   * Get the label used for the **Not Merged** command
   */
  getBranchLabel(config: PrepareConfig) {
    const packageDir = this.packageDir
    const buffer: string[] = []
    if (!config.naked) {
      const statusLabel = packageDir.getStatusLabel({
        config: { transform: true },
        developPushArrowSize: 1,
        masterPushArrowSize: 1,
        trackingPushArrowSize: 1,
        unmergedPushLineSize: 0,
      })
      if (packageDir.noMerged.length === 0) {
        buffer.push(`━> ${statusLabel}`)
      } else {
        buffer.push(`┏━> ${statusLabel}`)
      }
    }
    const maxNumLen = `${packageDir.noMerged.length}`.length
    let maxShortNameLen = 1
    for (const branch of packageDir.noMerged) {
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
        const indicator = new AnsiLineBuilder({ transform: true })
        indicator.pushText(
          '━'.repeat(maxShortNameLen - shortName.length),
          AnsiUtil.noopTransform
        )
        indicator.pushText(' ', AnsiUtil.noopTransform)
        indicator.pushText(branch.mergeable, AnsiUtil.noopTransform)
        indicator.pushCounter('▲', branch.ahead, this.packageTheme.aheadChalk)
        indicator.pushCounter('▼', branch.behind, this.packageTheme.behindChalk)
        indicator.pushText(' ', AnsiUtil.noopTransform)
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
