import { Command } from './Command'

/**
 * Command that must run in a repository root.
 */
export abstract class RootCommand extends Command {
  protected abstract doRun(): Promise<void>
  async run(errors: string[]): Promise<void> {
    if (super.checkPackageDir(errors)) {
      return
    }
    await this.doRun()
  }
}
