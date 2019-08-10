import * as fs from 'fs'
import { CliCommand } from '../cli/CliCommand'
import { CliCommandConfig } from '../cli/CliCommandConfig'
import { PackageDir } from './PackageDir'
import { PackageTheme } from './PackageTheme'

let _moarPackageDir: string
if (process.env.MOAR_PACKAGE_DIR) {
  _moarPackageDir = process.env.MOAR_PACKAGE_DIR
} else {
  _moarPackageDir = process.cwd()
}

/**
 * Command that must run in a repository root.
 */
export abstract class PackageCommand extends CliCommand {
  protected get moarPackageDir() {
    return _moarPackageDir
  }

  get packageDir() {
    if (!this._packageDir) {
      const errors: string[] = []
      if (this.checkPackageDir(errors)) {
        throw new Error(errors[0])
      }
    }
    return this._packageDir as PackageDir
  }

  protected get packageTheme() {
    return this.theme as PackageTheme
  }
  protected packageDirs: PackageDir[] = []
  protected workspaceDir: string
  protected workspaceDirs: string[]
  private _packageDir?: PackageDir

  constructor(readonly config: CliCommandConfig) {
    super(config)
    const pos = this.moarPackageDir.lastIndexOf('/')
    this.workspaceDir = this.moarPackageDir.substring(0, pos)
    this.workspaceDirs = fs.readdirSync(this.workspaceDir)
  }

  async run(errors: string[]): Promise<void> {
    if (this.checkPackageDir(errors)) {
      return
    }
    await this.doRun()
  }

  protected abstract doRun(): Promise<void>

  protected checkPackageDir(errors: string[]) {
    const isPackageDir = PackageDir.isGit(this.moarPackageDir)
    if (!isPackageDir) {
      errors.push('Must be run from a git repository root')
    } else {
      const dir = this.moarPackageDir.substring(
        this.moarPackageDir.lastIndexOf('/') + 1
      )
      this._packageDir = new PackageDir(
        this.moarPackageDir,
        dir,
        this.packageTheme
      )
    }
    return errors.length > 0
  }
}
