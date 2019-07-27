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

  static isPackage(packageDir: string) {
    const gitExists = fs.existsSync(packageDir + '/.git/config');
    const packageExists = fs.existsSync(packageDir + '/package.json');
    return gitExists && packageExists;
  }

  static domain?: string;
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
    date: string;
    shortName: string;
    lastCommit?: {
      author: string;
      relative: string;
    };
    relative?: { good?: boolean; result?: string };
  }[] = [];

  constructor(
    private workPackageDir: string,
    public name: string,
    readonly git: simpleGit.SimpleGit,
    readonly theme: Theme,
    private context: CommandLineOptions
  ) {
    this.workspaceDir = PackageDir.dropLastPathPart(this.workPackageDir);
    const workspaceName = this.workspaceDir.substring(
      this.workspaceDir.lastIndexOf('/') + 1
    );
    this.dir = this.workspaceDir + '/' + name;
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
      await this.prepareNoMerged();
      await this.prepareAheadBehind();
      if (fullStatus) {
        for (const branch of this.noMerged) {
          branch.relative = await this.showRelative(branch.id);
          branch.lastCommit = this.parseAuthorAndRelative(branch.relative);
        }
        this.noMerged.sort((a, b) => {
          if (a.date === b.date) {
            return 0;
          }
          return a.date > b.date ? -1 : 0;
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

  private async prepareNoMerged() {
    const branchSummary = await this.git.branch(['-a', '--no-merged']);
    let count = 0;
    const suppressRx = new RegExp(this.context.suppress);
    const showRx =
      this.context.show !== '<null>'
        ? undefined
        : new RegExp(this.context.show);
    const hideRx =
      this.context.hide !== '<null>'
        ? undefined
        : new RegExp(this.context.hide);
    for (const branch of branchSummary.all) {
      if (branch.startsWith('remotes/origin/')) {
        const shortName = PackageDir.simplifyRefName(branch);
        const date = await this.getDate(branch);
        const raw = `BRANCH: ${date}, ${shortName}`;
        let rule = 'show';
        if (raw.match(suppressRx)) {
          rule = 'suppress';
        } else {
          if (hideRx !== undefined) {
            if (raw.match(hideRx)) {
              rule = 'hide';
            }
          }
          if (showRx !== undefined) {
            if (hideRx === undefined) {
              rule = 'hide';
            }
            if (raw.match(showRx)) {
              rule = 'show';
            }
          }
        }
        if (this.context.raw === '1') {
          console.log(`RAW ${rule}: ${raw}`);
        }
        if (rule === 'show') {
          this.noMerged.push({ id: branch, date, shortName });
        }
        count += 1;
      }
    }
    this.unmergedBranchCount = count;
    this.uncommited = this.status ? this.status.files.length : 0;
  }

  private async prepareMaster() {
    const masterShowRelative = await this.showRelative('origin/master');
    const masterRelative = this.parseAuthorAndRelative(masterShowRelative);
    this.masterAuthor = masterRelative.author;
    this.masterRelative = masterRelative.relative;
    this.goodMaster = masterShowRelative.good;
  }

  private async prepareDevelop() {
    const developShowRelative = await this.showRelative('origin/develop');
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
      const developToTracking = await this.git.log({
        symmetric: false,
        from: 'origin/develop',
        to: this.tracking ? this.tracking : 'HEAD'
      });
      this.developToTracking = developToTracking ? developToTracking.total : 0;
    } catch (e) { }
  }

  private async prepareDevelopToMaster() {
    try {
      const developToMaster = await this.git.log({
        symmetric: false,
        from: 'origin/develop',
        to: 'origin/master'
      });
      this.developToMaster = developToMaster ? developToMaster.total : 0;
    } catch (e) { }
  }

  private async prepareMasterToDevelop() {
    try {
      const masterToDevelop = await this.git.log({
        symmetric: false,
        from: 'origin/master',
        to: 'origin/develop'
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
        to: 'origin/develop'
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
    if (PackageDir.domain == undefined) {
      try {
        const result = await this.git.raw(['config', 'user.email']);
        PackageDir.domain = result
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
        if (PackageDir.domain) {
          if (author.toLowerCase().endsWith(PackageDir.domain)) {
            author = author.substring(
              0,
              author.length - PackageDir.domain.length - 1
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
      const options = [id, '--name-only', '--date=relative'];
      if (this.context.verify === '1') {
        options.push('--show-signature');
      }
      const result = await this.git.show(options);
      return this.checkSign(result);
    } catch { }
    return { good: undefined, result: undefined };
  }

  private checkSign(
    result: string
  ): { good?: boolean | undefined; result?: string | undefined } {
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
        unmergedPushArrowSize: 0,
        config
      })
    ];
    const last = this.noMerged.length - 1;
    const maxNumLen = `${last}`.length;
    let maxShortNameLen = 0;
    for (let i = 0; i < this.noMerged.length; i++) {
      const branch = this.noMerged[i];
      const len = branch.shortName.length;
      maxShortNameLen = maxShortNameLen < len ? len : maxShortNameLen;
    }
    let n = 0;
    for (let i = 0; i < this.noMerged.length; i++) {
      const branch = this.noMerged[i];
      const id = branch.id;
      const shortName = branch.shortName;
      const line: string[] = [];

      const num = `${++n}`;
      const numBars = '━'.repeat(maxNumLen - num.length);
      line.push(
        (i === last ? '┗━' : '┣━') +
        numBars +
        ` ${this.theme.unmergedChalk(num)} ${shortName} ━`
      );
      const indicator = new Indicator(config);
      indicator.pushText('━'.repeat(maxShortNameLen - shortName.length));
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
    nameArrowSize,
    trackingPushArrowSize,
    developPushArrowSize,
    masterPushArrowSize,
    unmergedPushArrowSize: unmergedPushLineSize,
    config
  }: {
    nameArrowSize?: number;
    trackingPushArrowSize?: number;
    developPushArrowSize?: number;
    masterPushArrowSize?: number;
    unmergedPushArrowSize?: number;
    config?: IndicatorConfig;
  } = {}) {
    let textualChalk: Chalk | undefined;

    if (config) {
      textualChalk =
        this.workPackageDir === this.dir ? chalk.bold : chalk.reset;
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
        indicator.pushText(`◌<${PackageDir.simplifyRefName(this.tagVerify.tag)}>`);
      }
      indicator.pushText(' ');
      indicator.pushText(this.headRelativeArea);
    }
    return indicator.content;
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
    return good === undefined ? '◌' : '○';
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
