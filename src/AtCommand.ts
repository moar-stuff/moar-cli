import { Command } from "./Command";
import { PackageDir } from "./PackageDir";

export class AtCommand extends Command {
  async run(errors: string[]): Promise<void> {
    this.checkPackageDir(errors);
    if (errors.length > 0) {
      return;
    }

    const dir = this.packageDir.substring(this.packageDir.lastIndexOf('/') + 1);
    const packageDir = new PackageDir(
      this.packageDir,
      dir,
      this.theme,
      this.context
    );
    console.log(packageDir.version);
  }
}
