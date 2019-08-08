import { AnsiIndicator } from '../ansi/AnsiIndicator'
import { AnsiIndicatorConfig } from '../ansi/AnsiIndicatorConfig'
import { AnsiTransform } from '../ansi/AnsiTransform'
import { AnsiUtil } from '../ansi/AnsiUtil'
import { default as chalk } from 'chalk'
import { PackageTheme } from './PackageTheme'
import { PrepareConfig } from './PrepareConfig'
import { StatusResult } from 'simple-git/typings/response'
import { TagVerify } from './TagVerify'
import * as fs from 'fs'
import * as simpleGit from 'simple-git/promise'
import child_process from 'child_process'
import util from 'util'

/**
 * A `PackageDir` is simply a directory **GIT** repo that has a npm compatabile
 * `package.json` in at the root level.
 *
 * The **moar-cli** provides many options that act in the context of
 * **PackageDir** through the methods defined on this class.
 */
export class PackageDir {
  static defaultDomain?: string
  private _exec = util.promisify(child_process.exec)
  ahead = 0
  behind = 0
  current = ''
  developAuthor = ''
  developRelative = ''
  developToMaster = 0
  developToTracking = 0
  dir: string
  errorOnPrepare?: any
  git: simpleGit.SimpleGit
  goodDevelop?: boolean
  goodHead?: boolean
  goodMaster?: boolean
  goodTracking?: boolean
  headAuthor = ''
  headDate = ''
  headRelative = ''
  masterAuthor = ''
  masterRelative = ''
  masterToDevelop = 0
  status?: StatusResult
  tagVerify: TagVerify = new TagVerify()
  tracking?: string
  trackingAuthor = ''
  trackingLabel = ''
  trackingRelative = ''
  trackingToDevelop = 0
  uncommited = 0
  unmergedBranchCount = 0
  version: string
  workspaceDir: string
  noMerged: {
    id: string
    ahead: number
    behind: number
    date: string
    shortName: string
    mergeable: string
    lastCommit?: {
      author: string
      relative: string
    }
    relative: { good?: boolean; result?: string }
  }[] = []

  static isGit(packageDir: string) {
    const gitExists = fs.existsSync(packageDir + '/.git/config')
    return gitExists
  }

  constructor(
    private workPackageDir: string,
    public name: string,
    readonly theme: PackageTheme
  ) {
    this.workspaceDir = PackageDir.dropLastPathPart(this.workPackageDir)
    this.dir = this.workspaceDir + '/' + name
    if (fs.existsSync(this.dir + '/package.json')) {
      const packageJson = fs.readFileSync(this.dir + '/package.json')
      this.version = JSON.parse(packageJson.toString()).version
    } else {
      this.version = ''
    }
    this.git = simpleGit.default(this.dir)
  }

  private static dropLastPathPart(workspaceDir: string) {
    return workspaceDir.substring(0, workspaceDir.lastIndexOf('/'))
  }

  /**
   * Prepare the package
   */
  async prepare(prepareConfig: PrepareConfig) {
    try {
      this.git.silent(true)
      await this.init()
      await this.prepareStatus()
      await this.prepareTracking(prepareConfig)
      await this.prepareDescribe(prepareConfig ? prepareConfig.verify : false)
      await this.prepareDevelopToX()
      await this.prepareMasterToDevelop()
      await this.prepareHead(prepareConfig)
      await this.prepareDevelop(prepareConfig)
      await this.prepareMaster(prepareConfig)
      await this.prepareNoMerged(prepareConfig)
      await this.prepareAheadBehind()
      if (prepareConfig) {
        this.noMerged.sort((a, b) => {
          if (a.date === b.date) {
            return 0
          }
          return a.date > b.date ? -1 : 1
        })
      }
    } catch (e) {
      this.errorOnPrepare = e
    }
  }

  private prepareAheadBehind() {
    if (this.tracking) {
      this.ahead = this.status ? this.status.ahead : 0
      this.behind = this.status ? this.status.behind : 0
    } else {
      this.ahead = this.developToTracking
      this.behind = this.trackingToDevelop
      this.trackingToDevelop = 0
      this.developToTracking = 0
    }
  }

  private async prepareNoMerged(config: PrepareConfig) {
    const branchSummary = await this.git.branch(['-a', '--no-merged'])
    let count = 0
    if (config && config.rawMode) {
      console.log(`SHOW: ${config.showRx}`)
      console.log(`HIDE: ${config.hideRx}`)
    }
    for (const branch of branchSummary.all) {
      const shortName = this.simplifyRefName(branch, config)
      const date = await this.getDate(branch)
      let ahead = -1
      let behind = -1
      if (config) {
        const behindLog = await this.git.log({
          symmetric: false,
          from: branch,
          to: 'HEAD',
        })
        behind = behindLog.total

        const aheadLog = await this.git.log({
          symmetric: false,
          from: 'HEAD',
          to: branch,
        })
        ahead = aheadLog.total
      }
      const relative = await this.prepareRelative(config, branch)
      const lastCommit = this.parseAuthorAndRelative(relative)
      let raw = `BRANCH: ${date}, `
      raw += `${shortName}, `
      raw += `${lastCommit.author}, `
      raw += `${lastCommit.relative}`
      let mergeable = ''
      if (config && config.testMerge && this.uncommited === 0) {
        let out = ''
        await this.git.raw(['tag', '-f', '_moar'])
        try {
          let rawResult = await this.exec(
            `git merge --allow-unrelated-histories ${branch}`
          )
          out = rawResult.stderr + '\n' + rawResult.stdout
          if (out.indexOf('CONFLICT') !== -1) {
            mergeable = '🔥'
          } else if (out.indexOf('Already up to date!') !== -1) {
            mergeable = '👌'
          } else {
            const diff = await this.exec('git diff _moar --shortstat')
            if (diff.stderr + diff.stdout === '') {
              mergeable = '✅'
            } else {
              mergeable = '🙏'
            }
          }
        } finally {
          await this.git.reset(['_moar', '--hard'])
          await this.git.raw(['clean', '-fd'])
          await this.git.raw(['tag', '-d', '_moar'])
        }
      }
      if (mergeable === '🔥' || mergeable === '👌') {
        raw += ' #CONFLICT '
      } else if (mergeable === '✅') {
        raw += ' #MERGE-READY '
      } else {
        raw += ' #MERGEABLE '
      }
      if (this.evaluate(raw, config) === 'show') {
        this.noMerged.push({
          id: branch,
          date,
          shortName,
          ahead,
          behind,
          relative,
          lastCommit,
          mergeable,
        })
        count += 1
      }
    }
    this.unmergedBranchCount = count
  }

  private evaluate(raw: string, config?: PrepareConfig) {
    let rule = 'show'
    if (config) {
      if (config.hideRx && raw.match(config.hideRx)) {
        rule = 'hide'
      }
      if (config.showRx && raw.match(config.showRx)) {
        rule = 'show'
      }
      if (config.rawMode) {
        console.log(`RAW: ${rule}: ${raw}`)
      }
    }
    return rule
  }

  private async exec(
    cmd: string
  ): Promise<{ e?: any; stderr: string; stdout: string }> {
    try {
      return await this._exec(cmd, { cwd: this.dir })
    } catch (e) {
      return { e, stderr: e.stderr, stdout: e.stdout }
    }
  }

  private async prepareMaster(config: PrepareConfig) {
    const masterShowRelative = await this.prepareRelative(
      config,
      `origin/master`
    )
    const masterRelative = this.parseAuthorAndRelative(masterShowRelative)
    this.masterAuthor = masterRelative.author
    this.masterRelative = masterRelative.relative
    this.goodMaster = masterShowRelative.good
  }

  private async prepareDevelop(config: PrepareConfig) {
    const developShowRelative = await this.prepareRelative(
      config,
      `origin/develop`
    )
    const developRelative = this.parseAuthorAndRelative(developShowRelative)
    this.developAuthor = developRelative.author
    this.developRelative = developRelative.relative
    this.goodDevelop = developShowRelative.good
  }

  private async prepareHead(config: PrepareConfig) {
    await this.prepareHeadDate()
    const headShowRelative = await this.prepareRelative(config, 'HEAD')
    const headRelative = this.parseAuthorAndRelative(headShowRelative)
    this.headAuthor = headRelative.author
    this.headRelative = headRelative.relative
    this.goodHead = headShowRelative.good
  }

  private async prepareHeadDate() {
    this.headDate = await this.getDate('HEAD')
  }

  private async getDate(id: string): Promise<string> {
    let result = await this.git.show([id, '--date=iso', '--name-only'])
    const lines = result.split('\n')
    for (const line of lines) {
      if (line.startsWith('Date: ')) {
        result = line.replace(/^Date: /, '').trim()
        break
      }
    }
    return result
  }

  private async prepareDevelopToX() {
    await this.prepareDevelopToMaster()
    await this.prepareDevelopToTracking()
  }

  private async prepareDescribe(verify: boolean) {
    try {
      const describe = await this.git.raw(['describe', '--exact-match'])
      if (describe.length > 0) {
        this.tagVerify.tag = describe.trim()
        if (verify) {
          const execResult = await this.exec(`git tag -v ${this.tagVerify.tag}`)
          const out = [execResult.stderr, execResult.stdout].join('\n')
          if (out.match(/.*no signature found.*/)) {
            this.tagVerify.good = undefined
          } else if (
            execResult.e === undefined &&
            out.match(/.*Good signature from*/)
          ) {
            this.tagVerify.good = true
          } else {
            this.tagVerify.good = false
          }
        }
      }
    } catch (e) {
      this.tagVerify = { tag: '' }
    }
  }

  private async prepareDevelopToTracking() {
    try {
      const developToTrackingLog = await this.git.log({
        symmetric: false,
        from: `origin/develop`,
        to: this.tracking ? this.tracking : 'HEAD',
      })
      this.developToTracking = developToTrackingLog
        ? developToTrackingLog.total
        : 0
    } catch (e) {}
  }

  private async prepareDevelopToMaster() {
    try {
      const developToMasterLog = await this.git.log({
        symmetric: false,
        from: `origin/develop`,
        to: `origin/master`,
      })
      this.developToMaster = developToMasterLog ? developToMasterLog.total : 0
    } catch (e) {}
  }

  private async prepareMasterToDevelop() {
    try {
      const masterToDevelop = await this.git.log({
        symmetric: false,
        from: `origin/master`,
        to: `origin/develop`,
      })
      this.masterToDevelop = masterToDevelop ? masterToDevelop.total : 0
    } catch (e) {}
  }

  private async prepareTracking(config: PrepareConfig) {
    this.tracking = this.status ? this.status.tracking : undefined
    try {
      const trackingToDevelop = await this.git.log({
        symmetric: false,
        from: this.tracking ? this.tracking : 'HEAD',
        to: `origin/develop`,
      })
      this.trackingToDevelop = trackingToDevelop ? trackingToDevelop.total : 0
    } catch (e) {
      this.trackingLabel = ''
    }
    const trackingShowRelative = await this.prepareRelative(
      config,
      this.tracking
    )
    const trackingRelative = this.parseAuthorAndRelative(trackingShowRelative)
    this.trackingAuthor = trackingRelative.author
    this.trackingRelative = trackingRelative.relative
    this.goodTracking = trackingShowRelative.good
    let trackingLabel = this.tracking ? this.tracking.replace(/HEAD/, '') : ''
    if (trackingLabel === this.current) {
      trackingLabel = ''
    }
    trackingLabel = this.simplifyRefName(trackingLabel)
    this.trackingLabel = trackingLabel
  }

  private simplifyRefName(name: string, config?: PrepareConfig): string {
    if (config) {
      switch (config.simplifyNameMode) {
        case 1:
          return name
        case 2:
          return name.replace(/^remotes\/origin\//, 'origin/')
        default:
        // continue
      }
    }
    name = name.replace(/.*\//, '')
    const p1 = name.indexOf('-')
    let p2 = p1
    while (++p2 < name.length - 1) {
      if (name.charAt(p2).match(/[-_]/)) {
        return name.substring(0, p2)
      }
    }
    return name
  }

  private async prepareStatus() {
    try {
      this.status = await this.git.status()
      this.uncommited = this.status ? this.status.files.length : 0
      this.current = this.status.current.replace(/.*\//, '')
    } catch (e) {}
  }

  private async init() {
    if (PackageDir.defaultDomain == undefined) {
      try {
        const result = await this.git.raw(['config', 'user.email'])
        PackageDir.defaultDomain = result
          .replace(/.*\@/, '')
          .trim()
          .toLowerCase()
      } catch (e) {}
    }
  }

  private parseAuthorAndRelative(headShow: {
    good?: boolean | undefined
    result?: string | undefined
  }): { author: string; relative: string } {
    let author = ''
    let relative = ''
    const lines = headShow.result ? headShow.result.split('\n') : []
    for (const line of lines) {
      if (line.startsWith('Author:')) {
        author = line
          .replace(/.*</, '')
          .replace(/>.*/, '')
          .toLowerCase()
        if (PackageDir.defaultDomain) {
          if (author.toLowerCase().endsWith(PackageDir.defaultDomain)) {
            author = author.substring(
              0,
              author.length - PackageDir.defaultDomain.length - 1
            )
          }
        }
        const shortendAuthor = author.replace(/[\.-\@\+].*/, '')
        if (author !== shortendAuthor) {
          author = shortendAuthor + '...'
        }
        break
      }
    }
    for (const line of lines) {
      if (line.startsWith('Date:')) {
        relative = line.replace('Date: ', '').trim()
        break
      }
    }
    return { author, relative }
  }

  get trackingAreaLen(): number {
    let len = 0
    len += this.sign(this.goodTracking).length
    len += this.trackingLabel.length
    if (this.trackingToDevelop) {
      len += ` ▲${this.trackingToDevelop}`.length
    }
    if (this.developToTracking) {
      len += ` ▼${this.developToTracking}`.length
    }
    return len
  }

  get nameAreaLen(): number {
    const indicator = new AnsiIndicator()
    this.pushNameArea(indicator)
    return indicator.content.length
  }

  get currentAreaLen(): number {
    const indicator = new AnsiIndicator()
    this.pushCurrentArea(indicator)
    return indicator.content.length
  }

  get developAreaLen(): number {
    const indicator = new AnsiIndicator()
    this.pushDevelopArea(indicator)
    return indicator.content.length
  }

  get masterAreaLen(): number {
    const indicator = new AnsiIndicator()
    this.pushMasterArea(indicator)
    return indicator.content.length
  }

  get unmergedAreaLen(): number {
    const indicator = new AnsiIndicator()
    this.pushUnmergedArea(indicator)
    return indicator.content.length
  }

  private async prepareRelative(
    config: PrepareConfig,
    id?: string
  ): Promise<{ good?: boolean; result?: string }> {
    if (id === undefined) {
      return { good: undefined, result: undefined }
    }
    try {
      return await this.checkSign(id, config)
    } catch {}
    return { good: undefined, result: undefined }
  }

  private async checkSign(
    id: string,
    config: PrepareConfig
  ): Promise<{ good?: boolean | undefined; result?: string | undefined }> {
    const options = [id, '--name-only', '--date=relative']
    if (config && config.verify) {
      options.push('--show-signature')
    }
    const result = await this.git.show(options)
    if (config && config.verify) {
      if (result.indexOf('gpg: Good signature from') >= 0) {
        return { good: true, result }
      } else {
        if (result.indexOf("gpg: Can't check signature") >= 0) {
          return { good: false, result }
        }
      }
    }
    return { good: undefined, result }
  }

  /**
   * Output the status label for a workspace member directory
   */
  getStatusLabel({
    highlightCurrent,
    nameArrowSize,
    trackingPushArrowSize,
    developPushArrowSize,
    masterPushArrowSize,
    unmergedPushLineSize,
    config,
  }: {
    highlightCurrent?: boolean
    nameArrowSize?: number
    trackingPushArrowSize?: number
    developPushArrowSize?: number
    masterPushArrowSize?: number
    unmergedPushLineSize?: number
    config?: AnsiIndicatorConfig
  } = {}) {
    const isCurrentDir = this.workPackageDir === this.dir
    const lineTransform: AnsiTransform =
      config && highlightCurrent && isCurrentDir
        ? AnsiUtil.chalkTransform(chalk.bold)
        : PackageDir.noopTransform

    trackingPushArrowSize = trackingPushArrowSize || 1
    developPushArrowSize = developPushArrowSize || 1
    masterPushArrowSize = masterPushArrowSize || 1
    unmergedPushLineSize = unmergedPushLineSize || 0
    nameArrowSize = nameArrowSize || 1

    const indicator = new AnsiIndicator(config)
    if (unmergedPushLineSize > 0) {
      indicator.pushText('━'.repeat(unmergedPushLineSize))
      indicator.pushText(' ')
    }
    this.pushUnmergedArea(indicator)
    indicator.pushText(' ')
    this.pushNameArea(indicator, lineTransform)
    indicator.pushArrowLine(nameArrowSize)
    this.pushCurrentArea(indicator, lineTransform)
    indicator.pushArrowLine(trackingPushArrowSize)
    this.pushTrackingArea(indicator, lineTransform)
    indicator.pushArrowLine(developPushArrowSize)
    this.pushDevelopArea(indicator, lineTransform)
    indicator.pushArrowLine(masterPushArrowSize)
    this.pushMasterArea(indicator, lineTransform)
    indicator.pushText(' │')
    if (this.errorOnPrepare) {
      indicator.pushText(' 💥ERROR', chalk.redBright)
    } else {
      const signChalk = this.theme.signChalk
      if (this.tagVerify.good === true) {
        indicator.pushText(
          `●<${this.simplifyRefName(this.tagVerify.tag)}>`,
          signChalk
        )
      } else if (this.tagVerify.good === false) {
        indicator.pushText(
          `○<${this.simplifyRefName(this.tagVerify.tag)}>`,
          signChalk
        )
      } else if (this.tagVerify.tag.length > 0) {
        indicator.pushText(
          `◌<${this.simplifyRefName(this.tagVerify.tag)}>`,
          signChalk
        )
      }
      indicator.pushText(' ')
      indicator.pushText(this.headRelativeArea)
    }
    let content = indicator.content
    return content
  }

  /**
   * A no-operation transformation
   */
  static noopTransform(text: string) {
    return text
  }

  pushTrackingArea(indicator: AnsiIndicator, transform?: AnsiTransform) {
    return this.pushGoodAheadBehind({
      indicator,
      transform,
      label: this.trackingLabel,
      good: this.goodTracking,
      ahead: this.developToTracking,
      behind: this.trackingToDevelop,
    })
  }

  pushUnmergedArea(indicator: AnsiIndicator) {
    return indicator.pushCounter(
      'ᚮ',
      this.unmergedBranchCount,
      this.theme.unmergedChalk,
      true,
      true
    )
  }

  pushMasterArea(indicator: AnsiIndicator, transform?: AnsiTransform) {
    return indicator
      .pushText(this.sign(this.goodMaster), this.theme.signChalk)
      .pushText('master', transform)
  }

  pushDevelopArea(indicator: AnsiIndicator, transform?: AnsiTransform) {
    return indicator
      .pushText(this.sign(this.goodDevelop), this.theme.signChalk)
      .pushText('develop', transform)
      .pushCounter('▲', this.masterToDevelop, this.theme.aheadChalk)
      .pushCounter('▼', this.developToMaster, this.theme.behindChalk)
  }

  pushNameArea(indicator: AnsiIndicator, transform?: AnsiTransform) {
    return indicator
      .pushText(this.name, transform)
      .pushText(`@${this.version}`, this.theme.signChalk)
      .pushCounter('▶', this.uncommited, this.theme.aheadChalk)
  }

  pushCurrentArea(indicator: AnsiIndicator, transform?: AnsiTransform) {
    return indicator
      .pushText(this.sign(this.goodHead), this.theme.signChalk)
      .pushText(this.simplifyRefName(this.current), transform)
      .pushCounter('▲', this.ahead, this.theme.aheadChalk)
      .pushCounter('▼', this.behind, this.theme.behindChalk)
  }

  private pushGoodAheadBehind({
    indicator,
    label,
    good,
    ahead,
    behind,
    transform,
    forceSignChar,
  }: {
    indicator: AnsiIndicator
    label: string
    good: boolean | undefined
    ahead: number
    behind: number
    transform?: AnsiTransform
    forceSignChar?: boolean
  }) {
    return indicator
      .pushText(this.sign(good), this.theme.signChalk)
      .pushText(label, transform)
      .pushCounter('▲', ahead, this.theme.aheadChalk, false)
      .pushCounter('▼', behind, this.theme.behindChalk)
  }

  sign(good: boolean | undefined) {
    if (good === true) {
      return '●'
    }
    return good === undefined ? '◌' : '◑'
  }

  get headRelativeArea() {
    return `${this.headRelative} by ${this.headAuthor}`
  }

  get trackingRelativeArea() {
    return `${this.trackingRelative} by ${this.trackingAuthor}`
  }

  get developRelativeArea() {
    return `${this.developRelative} by ${this.developAuthor}`
  }

  get masterRelativeArea() {
    return `${this.masterRelative} by ${this.masterAuthor}`
  }
}
