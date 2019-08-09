import { PackageCommand } from './PackageCommand'
import chalk from 'chalk'

/**
 * Refetch tags from origin
 *
 * Delete that do not have the `local/` prefix then re-fetch tags from origin.
 */
export class RefetchCommand extends PackageCommand {
  constructor() {
    super({
      alias: 'r',
      desc: `Delete tags and re-fetch from origin (tags under ${chalk.blue(
        'local/'
      )} are preserved)`,
      name: 'refetch',
      example: 'moar refetch | sh',
      options: [],
    })
  }

  protected async doRun(): Promise<void> {
    console.log('git tag -d `git tag | grep -v "local"`')
    console.log('git fetch --tags origin')
  }
}
