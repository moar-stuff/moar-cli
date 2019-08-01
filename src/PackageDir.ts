import * as fs from 'fs';

import { default as chalk, Chalk } from 'chalk';
import * as simpleGit from 'simple-git/promise';
import { Theme } from './Theme';
import { Indicator } from './Indicator';
import { IndicatorConfig } from './IndicatorConfig';
import { StatusResult } from 'simple-git/typings/response';
import { CommandLineOptions } from 'command-line-args';

import child_process from 'child_process';
import util from 'util';
const exec = util.promisify(child_process.exec);

export class PackageDir {
  version: string;
  git: simpleGit.SimpleGit;

  static isGit(packageDir: string) {
    const gitExists = fs.existsSync(packageDir + '/.git/config');
    return gitExists;
  }

  static defaultDomain?: string;
  uncommited = 0;
  ahead = 0;
  behind = 0;
  tracking?: string;
  trackingToDevelop = 0;
  masterToDevelop = 0;
  developToMaster = 0;
  developToTracking = 0;
  unmergedBranchCount = 0;
  status?: StatusResult;
  goodHead?: boolean;
  goodTracking?: boolean;
  goodMaster?: boolean;
  goodDevelop?: boolean;
  trackingLabel = '';
  headAuthor = '';
  headRelative = '';
  trackingAuthor = '';
  trackingRelative = '';
  developAuthor = '';
  developRelative = '';
  masterAuthor = '';
  masterRelative = '';
  errorOnPrepare?: any;
  headDate = '';
  current = '';
  tagVerify: {
    tag: string;
    good?: boolean;
  } = {
      tag: ''
    };
  dir: string;
  workspaceDir: string;
  noMerged: {
    id: string;
    ahead: number;
    behind: number;
    date: string;
    shortName: string;
    lastCommit?: {
      author: string;
      relative: string;
    };
    relative: { good?: boolean; result?: string };
  }[] = [];

  constructor(
    private workPackageDir: string,
    public name: string,
    readonly theme: Theme,
    private context: CommandLineOptions
  ) {
    this.workspaceDir = PackageDir.dropLastPathPart(this.workPackageDir);
    this.dir = this.workspaceDir + '/' + name;
    if(fs.existsSync(this.dir + '/package.json')) {
      const packageJson = fs.readFileSync(this.dir + '/package.json')
      this.version = JSON.parse(packageJson.toString()).version;
    } else {
      this.version = '';
    }
    this.git = simpleGit.default(this.dir);
  }

  private static dropLastPathPart(workspaceDir: string) {
    return workspaceDir.substring(0, workspaceDir.lastIndexOf('/'));
  }

  /**
   * Prepare the package
   */
  async prepare(fullStatus: boolean) {
    try {
      this.git.silent(true);
      await this.init();
      await this.prepareStatus();
      await this.prepareTracking();
      await this.prepareDescribe();
      await this.prepareDevelopToX();
      await this.prepareMasterToDevelop();
      await this.prepareHead();
      await this.prepareDevelop();
      await this.prepareMaster();
      await this.prepareNoMerged(fullStatus);
      await this.prepareAheadBehind();
      if (fullStatus) {
        this.noMerged.sort((a, b) => {
          if (a.date === b.date) {
            return 0;
          }
          return a.date > b.date ? -1 : 1;
        });
      }
    } catch (e) {
      this.errorOnPrepare = e;
    }
  }

  private prepareAheadBehind() {
    if (this.tracking) {
      this.ahead = this.status ? this.status.ahead : 0;
      this.behind = this.status ? this.status.behind : 0;
    } else {
      this.ahead = this.developToTracking;
      this.behind = this.trackingToDevelop;
      this.trackingToDevelop = 0;
      this.developToTracking = 0;
    }
  }

  private async prepareNoMerged(calcAheadBehind: boolean) {
    const branchSummary = await this.git.branch(['-a', '--no-merged']);
    let count = 0;
    const suppressRx = new RegExp(this.context.suppress);
    const showRx =
      this.context.show === '<null>'
        ? undefined
        : new RegExp(this.context.show);
    const hideRx =
      this.context.hide === '<null>'
        ? undefined
        : new RegExp(this.context.hide);
    if (this.context.raw === '1') {
      console.log(`SUPPRESS: ${this.context.suppress}`)
      console.log(`SHOW: ${this.context.show}`)
      console.log(`HIDE: ${this.context.hide}`)
    }
    for (const branch of branchSummary.all) {
      if (branch.startsWith(`remotes/${this.context.origin}/`)) {
        const shortName = PackageDir.simplifyRefName(branch);
        const date = await this.getDate(branch);
        let ahead = -1;
        let behind = -1;
        if (calcAheadBehind) {
          const behindLog = await this.git.log({
            symmetric: false,
            from: branch,
            to: 'HEAD'
          });
          behind = behindLog.total;

          const aheadLog = await this.git.log({
            symmetric: false,
            from: 'HEAD',
            to: branch
          });
          ahead = aheadLog.total;
        }
        const relative = await this.showRelative(branch);
        const lastCommit = this.parseAuthorAndRelative(relative);
        const raw = `BRANCH: ${date}, ${shortName}, ${lastCommit.author}, ${lastCommit.relative}`;
        let rule = 'show';
        if (raw.match(suppressRx)) {
          if (this.context.raw === '1') {
            console.log(`SUPPRESS ${raw}`);
          }
          rule = 'suppress';
        } else {
          if (hideRx !== undefined) {
            if (raw.match(hideRx)) {
              if (this.context.raw === '1') {
                console.log(`HIDE ${raw}`);
              }
              rule = 'hide';
            }
          }
          if (showRx !== undefined) {
            if (hideRx === undefined) {
              if (this.context.raw === '1') {
                console.log(`HIDE ${raw}`);
              }
              rule = 'hide';
            }
            if (raw.match(showRx)) {
              if (this.context.raw === '1') {
                console.log(`SHOW ${raw}`);
              }
              rule = 'show';
            }
          }
        }
        if (this.context.raw === '1') {
          console.log(`RAW ${rule}: ${raw}`);
        }
        if (rule === 'show') {
          this.noMerged.push({ id: branch, date, shortName, ahead, behind, relative, lastCommit });
        }
        count += 1;
      }
    }
    this.unmergedBranchCount = count;
    this.uncommited = this.status ? this.status.files.length : 0;
  }

  private async prepareMaster() {
    const masterShowRelative = await this.showRelative(`${this.context.origin}/master`);
    const masterRelative = this.parseAuthorAndRelative(masterShowRelative);
    this.masterAuthor = masterRelative.author;
    this.masterRelative = masterRelative.relative;
    this.goodMaster = masterShowRelative.good;
  }

  private async prepareDevelop() {
    const developShowRelative = await this.showRelative(`${this.context.origin}/develop`);
    const developRelative = this.parseAuthorAndRelative(developShowRelative);
    this.developAuthor = developRelative.author;
    this.developRelative = developRelative.relative;
    this.goodDevelop = developShowRelative.good;
  }

  private async prepareHead() {
    await this.prepareHeadDate();
    const headShowRelative = await this.showRelative('HEAD');
    const headRelative = this.parseAuthorAndRelative(headShowRelative);
    this.headAuthor = headRelative.author;
    this.headRelative = headRelative.relative;
    this.goodHead = headShowRelative.good;
  }

  private async prepareHeadDate() {
    this.headDate = await this.getDate('HEAD');
  }

  private async getDate(id: string): Promise<string> {
    let result = await this.git.show([id, '--date=iso', '--name-only']);
    const lines = result.split('\n');
    for (const line of lines) {
      if (line.startsWith('Date: ')) {
        result = line.replace(/^Date: /, '').trim();
        break;
      }
    }
    return result;
  }

  private async prepareDevelopToX() {
    await this.prepareDevelopToMaster();
    await this.prepareDevelopToTracking();
  }

  private async prepareDescribe() {
    try {
      const describe = await this.git.raw(['describe', '--exact-match']);
      if (describe.length > 0) {
        this.tagVerify.tag = describe.trim();
        if (this.context.verify === '1') {
          try {
            await exec(`git tag -v ${this.tagVerify.tag}`, {
              cwd: this.dir
            });
            this.tagVerify.good = true;
          } catch (e) {
            if (e.message && e.message.match(/.*no signature found.*/)) {
              this.tagVerify.good = undefined;
            } else {
              this.tagVerify.good = false;
            }
          }
        }
      }
    } catch (e) {
      this.tagVerify = { tag: '' };
    }
  }

  private async prepareDevelopToTracking() {
    try {
      const developToTrackingLog = await this.git.log({
        symmetric: false,
        from: `${this.context.origin}/develop`,
        to: this.tracking ? this.tracking : 'HEAD'
      });
      this.developToTracking = developToTrackingLog ? developToTrackingLog.total : 0;
    } catch (e) { }
  }

  private async prepareDevelopToMaster() {
    try {
      const developToMasterLog = await this.git.log({
        symmetric: false,
        from: `${this.context.origin}/develop`,
        to: `${this.context.origin}/master`
      });
      this.developToMaster = developToMasterLog ? developToMasterLog.total : 0;
    } catch (e) { }
  }

  private async prepareMasterToDevelop() {
    try {
      const masterToDevelop = await this.git.log({
        symmetric: false,
        from: `${this.context.origin}/master`,
        to: `${this.context.origin}/develop`
      });
      this.masterToDevelop = masterToDevelop ? masterToDevelop.total : 0;
    } catch (e) { }
  }

  private async prepareTracking() {
    this.tracking = this.status ? this.status.tracking : undefined;
    try {
      const trackingToDevelop = await this.git.log({
        symmetric: false,
        from: this.tracking ? this.tracking : 'HEAD',
        to: `${this.context.origin}/develop`
      });
      this.trackingToDevelop = trackingToDevelop ? trackingToDevelop.total : 0;
    } catch (e) {
      this.trackingLabel = '';
    }
    const trackingShowRelative = await this.showRelative(this.tracking);
    const trackingRelative = this.parseAuthorAndRelative(trackingShowRelative);
    this.trackingAuthor = trackingRelative.author;
    this.trackingRelative = trackingRelative.relative;
    this.goodTracking = trackingShowRelative.good;
    let trackingLabel = this.tracking ? this.tracking.replace(/HEAD/, '') : '';
    if (trackingLabel === this.current) {
      trackingLabel = '';
    }
    trackingLabel = PackageDir.simplifyRefName(trackingLabel);
    this.trackingLabel = trackingLabel;
  }

  private static simplifyRefName(name: string): string {
    name = name.replace(/.*\//, '');
    const p1 = name.indexOf('-');
    let p2 = p1;
    while (++p2 < name.length - 1) {
      if (name.charAt(p2).match(/[-_]/)) {
        return name.substring(0, p2);
      }
    }
    return name;
  }

  private async prepareStatus() {
    try {
      this.status = await this.git.status();
      this.current = this.status.current.replace(/.*\//, '');
    } catch (e) { }
  }

  private async init() {
    if (PackageDir.defaultDomain == undefined) {
      try {
        const result = await this.git.raw(['config', 'user.email']);
        PackageDir.defaultDomain = result
          .replace(/.*\@/, '')
          .trim()
          .toLowerCase();
      } catch (e) { }
    }
  }

  private parseAuthorAndRelative(headShow: {
    good?: boolean | undefined;
    result?: string | undefined;
  }): { author: string; relative: string } {
    let author = '';
    let relative = '';
    const lines = headShow.result ? headShow.result.split('\n') : [];
    for (const line of lines) {
      if (line.startsWith('Author:')) {
        author = line
          .replace(/.*</, '')
          .replace(/>.*/, '')
          .toLowerCase();
        if (PackageDir.defaultDomain) {
          if (author.toLowerCase().endsWith(PackageDir.defaultDomain)) {
            author = author.substring(
              0,
              author.length - PackageDir.defaultDomain.length - 1
            );
          }
        }
        const shortendAuthor = author.replace(/[\.-\@\+].*/, '');
        if (author !== shortendAuthor) {
          author = shortendAuthor + '...';
        }
        break;
      }
    }
    for (const line of lines) {
      if (line.startsWith('Date:')) {
        relative = line.replace('Date: ', '').trim();
        break;
      }
    }
    return { author, relative };
  }

  get trackingAreaLen(): number {
    let len = 0;
    len += this.sign(this.goodTracking).length;
    len += this.trackingLabel.length;
    if (this.trackingToDevelop) {
      len += ` ▲${this.trackingToDevelop}`.length;
    }
    if (this.developToTracking) {
      len += ` ▼${this.developToTracking}`.length;
    }
    return len;
  }

  get nameAreaLen(): number {
    const indicator = new Indicator();
    this.pushNameArea(indicator);
    return indicator.content.length;
  }

  get currentAreaLen(): number {
    const indicator = new Indicator();
    this.pushCurrentArea(indicator);
    return indicator.content.length;
  }

  get developAreaLen(): number {
    const indicator = new Indicator();
    this.pushDevelopArea(indicator);
    return indicator.content.length;
  }

  get masterAreaLen(): number {
    const indicator = new Indicator();
    this.pushMasterArea(indicator);
    return indicator.content.length;
  }

  get unmergedAreaLen(): number {
    const indicator = new Indicator();
    this.pushUnmergedArea(indicator);
    return indicator.content.length;
  }

  private async showRelative(
    id?: string
  ): Promise<{ good?: boolean; result?: string }> {
    if (id === undefined) {
      return { good: undefined, result: undefined };
    }
    try {
      return await this.checkSign(id);
    } catch { }
    return { good: undefined, result: undefined };
  }

  private async checkSign(
    id: string
  ): Promise<{ good?: boolean | undefined; result?: string | undefined }> {
    const options = [id, '--name-only', '--date=relative'];
    if (this.context.verify === '1') {
      options.push('--show-signature');
    }
    const result = await this.git.show(options);
    if (this.context.verify === '1') {
      if (result.indexOf('gpg: Good signature from') >= 0) {
        return { good: true, result };
      } else {
        if (result.indexOf("gpg: Can't check signature") >= 0) {
          return { good: false, result };
        }
      }
    }
    return { good: undefined, result };
  }

  /**
   * Get the label used for the **Not Merged** command
   */
  getNotMergedLabel(config?: IndicatorConfig) {
    const buffer: string[] = [
      '┏━> ' +
      this.getStatusLabel({
        trackingPushArrowSize: 1,
        developPushArrowSize: 1,
        masterPushArrowSize: 1,
        unmergedPushLineSize: 0,
        config
      })
    ];
    const maxNumLen = `${this.noMerged.length}`.length;
    let maxShortNameLen = 1;
    for (let i = 0; i < this.noMerged.length; i++) {
      const branch = this.noMerged[i];
      const len = branch.shortName.length;
      maxShortNameLen = maxShortNameLen < len ? len : maxShortNameLen;
    }
    let n = 0;
    const last = this.noMerged.length - 1;
    for (let i = 0; i < this.noMerged.length; i++) {
      const branch = this.noMerged[i];
      const id = branch.id;
      const shortName = branch.shortName;
      const line: string[] = [];

      const num = `${++n}`;
      const numBars = '━'.repeat(maxNumLen - num.length);
      const good = branch.relative ? branch.relative.good : undefined;
      line.push((i === last ? '┗━' : '┣━'));
      line.push(numBars);
      line.push(' ');
      line.push(this.theme.unmergedChalk(num));
      line.push(' ');
      line.push(this.theme.signChalk(this.sign(good)));
      line.push(shortName);
      line.push(' ━');
      const indicator = new Indicator(config);
      indicator.pushText('━'.repeat(maxShortNameLen - shortName.length));
      indicator.pushText(' ');
      indicator.push('▲', branch.ahead, this.theme.aheadChalk);
      indicator.push('▼', branch.behind, this.theme.behindChalk);
      indicator.pushText(' ');
      line.push(indicator.content);
      if (branch.lastCommit) {
        line.push(
          `${branch.lastCommit.relative} by ${branch.lastCommit.author}`
        );
      }
      buffer.push(line.join(''));
    }
    return buffer.join('\n');
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
    config
  }: {
    highlightCurrent?: boolean;
    nameArrowSize?: number;
    trackingPushArrowSize?: number;
    developPushArrowSize?: number;
    masterPushArrowSize?: number;
    unmergedPushLineSize?: number;
    config?: IndicatorConfig;
  } = {}) {
    let textualChalk: Chalk | undefined;
    const isCurrentDir = this.workPackageDir === this.dir;

    if (config) {
      textualChalk =
        isCurrentDir ? chalk.bold : chalk.reset;
    }

    trackingPushArrowSize = trackingPushArrowSize || 1;
    developPushArrowSize = developPushArrowSize || 1;
    masterPushArrowSize = masterPushArrowSize || 1;
    unmergedPushLineSize = unmergedPushLineSize || 0;
    nameArrowSize = nameArrowSize || 1;

    const indicator = new Indicator(config);
    if (unmergedPushLineSize > 0) {
      indicator.pushText('━'.repeat(unmergedPushLineSize));
      indicator.pushText(' ');
    }
    this.pushUnmergedArea(indicator, textualChalk);
    indicator.pushText(' ');
    this.pushNameArea(indicator, textualChalk);
    indicator.pushArrowLine(nameArrowSize);
    this.pushCurrentArea(indicator, textualChalk);
    indicator.pushArrowLine(trackingPushArrowSize);
    this.pushTrackingArea(indicator, textualChalk);
    indicator.pushArrowLine(developPushArrowSize);
    this.pushDevelopArea(indicator, textualChalk);
    indicator.pushArrowLine(masterPushArrowSize);
    this.pushMasterArea(indicator, textualChalk);
    indicator.pushText(' │');
    if (this.errorOnPrepare) {
      indicator.pushText(' 💥ERROR', chalk.redBright);
    } else {
      const signChalk = this.theme.signChalk;
      if (this.tagVerify.good === true) {
        indicator.pushText(`●<${PackageDir.simplifyRefName(this.tagVerify.tag)}>`, signChalk);
      } else if (this.tagVerify.good === false) {
        indicator.pushText(`○<${PackageDir.simplifyRefName(this.tagVerify.tag)}>`, signChalk);
      } else if (this.tagVerify.tag.length > 0) {
        indicator.pushText(`◌<${PackageDir.simplifyRefName(this.tagVerify.tag)}>`, signChalk);
      }
      indicator.pushText(' ');
      indicator.pushText(this.headRelativeArea);
    }
    let content = indicator.content;
    if (isCurrentDir && highlightCurrent) {
      content = chalk.bgRgb(30, 30, 0)(content);
    }
    return content;
  }

  pushTrackingArea(indicator: Indicator, textualChalk?: Chalk) {
    return this.pushGoodAheadBehind({
      indicator,
      textualChalk,
      label: this.trackingLabel,
      good: this.goodTracking,
      ahead: this.developToTracking,
      behind: this.trackingToDevelop
    });
  }

  pushUnmergedArea(indicator: Indicator, _textualChalk?: Chalk) {
    return indicator.push(
      'ᚮ',
      this.unmergedBranchCount,
      this.theme.unmergedChalk,
      true,
      true
    );
  }

  pushMasterArea(indicator: Indicator, textualChalk?: Chalk) {
    return indicator
      .pushText(this.sign(this.goodMaster), this.theme.signChalk)
      .pushText('master', textualChalk);
  }

  pushDevelopArea(indicator: Indicator, textualChalk?: Chalk) {
    return indicator
      .pushText(this.sign(this.goodDevelop), this.theme.signChalk)
      .pushText('develop', textualChalk)
      .push('▲', this.masterToDevelop, this.theme.aheadChalk)
      .push('▼', this.developToMaster, this.theme.behindChalk);
  }

  pushNameArea(indicator: Indicator, textualChalk?: Chalk) {
    return indicator
      .pushText(this.name, textualChalk)
      .pushText(`@${this.version}`, this.theme.signChalk)
      .push('▶', this.uncommited, this.theme.aheadChalk);
  }

  pushCurrentArea(indicator: Indicator, textualChalk?: Chalk) {
    return indicator
      .pushText(this.sign(this.goodHead), this.theme.signChalk)
      .pushText(PackageDir.simplifyRefName(this.current), textualChalk)
      .push('▲', this.ahead, this.theme.aheadChalk)
      .push('▼', this.behind, this.theme.behindChalk);
  }

  private pushGoodAheadBehind({
    indicator,
    label,
    good,
    ahead,
    behind,
    textualChalk,
    forceSignChar
  }: {
    indicator: Indicator;
    label: string;
    good: boolean | undefined;
    ahead: number;
    behind: number;
    textualChalk?: Chalk | undefined;
    forceSignChar?: boolean;
  }) {
    return indicator
      .pushText(this.sign(good), this.theme.signChalk)
      .pushText(label, textualChalk)
      .push('▲', ahead, this.theme.aheadChalk, false)
      .push('▼', behind, this.theme.behindChalk);
  }

  private sign(good: boolean | undefined) {
    if (good === true) {
      return '●';
    }
    return good === undefined ? '◌' : '◑';
  }

  get headRelativeArea() {
    return `${this.headRelative} by ${this.headAuthor}`;
  }

  get trackingRelativeArea() {
    return `${this.trackingRelative} by ${this.trackingAuthor}`;
  }

  get developRelativeArea() {
    return `${this.developRelative} by ${this.developAuthor}`;
  }

  get masterRelativeArea() {
    return `${this.masterRelative} by ${this.masterAuthor}`;
  }
}
