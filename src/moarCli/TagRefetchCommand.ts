import { PackageCommand } from './PackageCommand'
import child_process from 'child_process'
import util from 'util'
import chalk from 'chalk'
const exec = util.promisify(child_process.exec)

/**
 * Refetch tags from origin
 *
 * Delete that do not have the `local/` prefix then fetch tags from origin.
 */
export class TagRefetchCommand extends PackageCommand {
  constructor() {
    super({
      alias: 'r',
      desc: `Delete tags and re-fetch from origin (tags under ${chalk.blue(
        'local/'
      )} are preserved)`,
      name: 'refetch-tags',
      options: [],
    })
  }

  protected async doRun(): Promise<void> {
    await this.exec('git tag -d `git tag | grep -v "local"`')
    await this.exec('git fetch --tags origin')
  }

  private async exec(cmd: string) {
    const result = await this.packageDir.exec(cmd)
    for (const line of result.stderr.split('\n')) {
      if (line.trim()) console.error(line)
    }
    const lines = result.stdout.split('\n')
    for (const line of lines) {
      console.log(line)
    }
  }
}
