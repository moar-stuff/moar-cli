import * as fs from 'fs'

import { CliCommand } from '../cli/CliCommand'
import { CliElement } from '../cli/CliElement'

/**
 * Output commands to start the `git flow release` process
 */
export class AwsAccountCommand extends CliCommand {
  constructor() {
    super({
      alias: 'A',
      desc: 'Show AWS Account ID or Nickname',
      name: 'aws-account-id',
      options: [
        {
          alias: 'n',
          desc: 'Set Nickname for current account ID',
          name: 'set-nickname',
        },
      ],
    })
  }

  async run(errors: string[]): Promise<void> {
    let dirty = false
    const moarPath = `${process.env.HOME}/.moar`
    const nicknamesPath = `${moarPath}/aws-nicknames.json`
    let nicknames: Record<string, string> = {}
    if (fs.existsSync(nicknamesPath)) {
      const nicknamesBuffer = fs.readFileSync(nicknamesPath)
      nicknames = JSON.parse(nicknamesBuffer.toString())
    }

    const execResult = await this.exec(
      "aws sts get-caller-identity --output text --query 'Account'"
    )
    const id = execResult.stdout.trim()

    const setNicknameOpt = this.options['set-nickname']
    const args = process.argv
    for (let i = 2; i < args.length; i++) {
      const arg = args[i]
      if (CliElement.match(setNicknameOpt, arg)) {
        const value = CliElement.value(setNicknameOpt, args, i)
        nicknames[id] = value
        dirty = true
      }
    }

    if (dirty) {
      if (!fs.existsSync(moarPath)) {
        fs.mkdirSync(moarPath)
      }
      fs.writeFileSync(nicknamesPath, JSON.stringify(nicknames))
    }

    const nickname = nicknames[id]
    if (nickname) {
      this.log(nickname)
    } else {
      this.log(id)
    }
  }

  log(text: string) {
    text = text.trim()
    if (text) {
      super.log(text)
    }
  }
}
