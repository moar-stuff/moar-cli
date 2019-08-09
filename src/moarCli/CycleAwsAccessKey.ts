import { PackageCommand } from './PackageCommand'
import { CliElement } from '../cli/CliElement'
import { CliCommand } from '../cli/CliCommand'

/**
 * Output commands to start the `git flow release` process
 */
export class CycleAwsAccessKey extends CliCommand {
  constructor() {
    super({
      alias: 'C',
      desc: `Cycle the AWS Access Key`,
      name: 'cycle',
      example: 'cycle',
      options: [],
    })
  }

  async run(errors: string[]): Promise<void> {
    let execResult = await this.exec('aws configure get aws_access_key_id')
    const currentAwsAccessKeyId = execResult.stdout
    execResult = await this.exec('aws iam create-access-key')
    const out = JSON.parse(execResult.stdout)
    const newKey = out.AccessKey.AccessKeyId
    console.log(newKey)
    const newSecret = out.AccessKey.SecretAccessKey
    execResult = await this.exec(
      `aws configure set aws_access_key_id ${newKey}`
    )
    this.log(execResult.stderr)
    this.log(execResult.stdout)
    if (!execResult.e) {
      execResult = await this.exec(
        `aws configure set aws_secret_access_key ${newSecret}`
      )
      this.log(execResult.stderr)
      this.log(execResult.stdout)
      if (!execResult.e) {
        execResult = await this.exec(
          `sleep 10 && aws iam delete-access-key --access-key-id ${currentAwsAccessKeyId}`
        )
        this.log(execResult.stderr)
        this.log(execResult.stdout)
      }
    } else {
      throw new Error('Unable set aws_access_key_id')
    }
  }

  log(text: string) {
    text = text.trim()
    if (text) {
      console.log(text)
    }
  }
}
