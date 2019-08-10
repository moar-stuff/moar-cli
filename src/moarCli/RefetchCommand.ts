import chalk from 'chalk'
import { PackageCommand } from './PackageCommand'

import { CliCommand } from '../cli/CliCommand'

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
      example: 'moar refetch | sh',
      name: 'refetch',
      options: [],
    })
  }

  protected async doRun(): Promise<void> {
    let commentLine = this.theme.commentTransform('# Use with pipe (i.e. ')
    commentLine += this.theme.commandTransform(CliCommand.cliName)
    commentLine += this.theme.commandTransform(' ')
    commentLine += this.theme.commandTransform(this.config.name)
    commentLine += this.theme.commandTransform(' | sh')
    commentLine += this.theme.commentTransform(')')
    this.log(commentLine)
    this.log('git tag -d `git tag | grep -v "local"`')
    this.log('git fetch --tags origin')
  }
}
