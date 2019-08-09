import * as fs from 'fs'
import { CliCommand } from '../cli/CliCommand'
import { PackageDir } from './PackageDir'
import { CliCommandConfig } from '../cli/CliCommandConfig'
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
  private _packageDir?: PackageDir
  protected packageDirs: PackageDir[] = []
  protected workspaceDir: string
  protected workspaceDirs: string[]

  constructor(readonly config: CliCommandConfig) {
    super(config)
    const pos = this.moarPackageDir.lastIndexOf('/')
    this.workspaceDir = this.moarPackageDir.substring(0, pos)
    this.workspaceDirs = fs.readdirSync(this.workspaceDir)
  }

  protected abstract doRun(): Promise<void>

  async run(errors: string[]): Promise<void> {
    if (this.checkPackageDir(errors)) {
      return
    }
    await this.doRun()
  }

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
    return <PackageDir>this._packageDir
  }

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

  protected get packageTheme() {
    return <PackageTheme>this.theme
  }

  async exec(cmd: string) {
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
