import * as fs from 'fs'

import { CliCommand } from '../cli/CliCommand'
import { CliElement } from '../cli/CliElement'

/**
 * The AWS Account Comamnd associates AWS Accounts with nicknames and allows
 * switching from one account to another.
 */
export class AwsAccountCommand extends CliCommand {
  private moarPath = `${process.env.HOME}/.moar`
  private nicknamesPath = `${this.moarPath}/aws-nicknames.json`

  /**
   * Construct the command.
   */
  constructor() {
    super({
      alias: 'A',
      desc: 'Show AWS Account ID and Nickname',
      name: 'aws-account',
      options: [
        {
          alias: 'n',
          desc: 'Set Nickname for current account ID',
          name: 'nickname',
        },
        {
          alias: 's',
          desc: 'Switch account (index)',
          name: 'switch',
        },
      ],
    })
  }

  async run(errors: string[]): Promise<void> {
    const nicknames: Record<string, string> = this.readNicknames()

    let id = await this.getAccountId()
    if (id != null) {
      nicknames[id] = nicknames[id] || id
      this.handleNicknameParam(nicknames, id)
    }

    id = await this.handleSwitchTo(nicknames, id)

    this.showOutput(nicknames, id)
  }

  /**
   * Read nicknames.
   */
  private readNicknames() {
    let nicknames: Record<string, string>
    if (fs.existsSync(this.nicknamesPath)) {
      const nicknamesBuffer = fs.readFileSync(this.nicknamesPath)
      nicknames = JSON.parse(nicknamesBuffer.toString())
    } else {
      nicknames = {}
    }
    return nicknames
  }

  /**
   * Get the current AWS AccountId or return null if one can not be determined.
   */
  private async getAccountId() {
    const execResult = await this.exec(
      "aws sts get-caller-identity --output text --query 'Account'"
    )
    return execResult.e ? undefined : execResult.stdout.trim()
  }

  /**
   * Handle the nickname param to set the descriptive nickname for the current
   * AWS account.
   *
   * @param nicknames Nicknames record
   * @param id ID for the current account
   */
  private handleNicknameParam(nicknames: Record<string, string>, id: string) {
    const args2 = process.argv
    const setNicknameOpt = this.options.nickname
    for (let i = 2; i < args2.length; i++) {
      const arg = args2[i]
      if (CliElement.match(setNicknameOpt, arg)) {
        const value = CliElement.value(setNicknameOpt, args2, i)
        nicknames[id] = value
        if (!fs.existsSync(this.moarPath)) {
          fs.mkdirSync(this.moarPath)
        }
        fs.writeFileSync(this.nicknamesPath, JSON.stringify(nicknames))
      }
    }
  }

  private readSwitchToParam() {
    const args1 = process.argv
    let switchTo = 0
    const switchOpt = this.options.switch
    for (let i = 2; i < args1.length; i++) {
      const arg = args1[i]
      if (CliElement.match(switchOpt, arg)) {
        const value = CliElement.value(switchOpt, args1, i)
        switchTo = Number.parseInt(value)
      }
    }
    return switchTo
  }

  /**
   * Handle the switch to option.
   *
   * @param nicknames Nickname Record
   * @param id Current ID
   */
  private async handleSwitchTo(nicknames: Record<string, string>, id?: string) {
    const switchTo = this.readSwitchToParam()
    const keys = Object.keys(nicknames)
    if (switchTo) {
      if (id) {
        await this.exec(`
          mkdir -p ${this.moarPath}/aws-${id} && \
          rm -rf ${this.moarPath}/aws-${id}/* && \
          cp -r ${process.env.HOME}/.aws/* ${this.moarPath}/aws-${id}
        `)
      }
      id = keys[switchTo - 1]
      await this.exec(`
        rm -rf ${process.env.HOME}/.aws/*
        cp -r ${this.moarPath}/aws-${id}/* ${process.env.HOME}/.aws
      `)
    }
    return id
  }

  /**
   * Show command output
   *
   * @param nicknames Nicknames record
   * @param id Current AWS Account ID
   */
  private showOutput(nicknames: Record<string, string>, id?: string) {
    const keys = Object.keys(nicknames)
    let n2 = 0
    for (const key of keys) {
      n2++
      if (key === id) {
        this.log(
          this.theme.emphasisTransform(`[${n2}] - ${nicknames[key]} (${key})`)
        )
      } else {
        this.log(` ${n2} -- ${nicknames[key]} (${key})`)
      }
    }
  }
}
