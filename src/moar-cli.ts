import chalk from 'chalk'
import { CliCommand } from './cli/CliCommand'
import { CliElement } from './cli/CliElement'

import { AtCommand } from './moarCli/AtCommand'
import { AwsAccountCommand } from './moarCli/AwsAccountCommand'
import { AwsCycleAccessKeyCommand } from './moarCli/AwsCycleAccessKeyCommand'
import { BranchCommand } from './moarCli/BranchCommand'
import { EachCommand } from './moarCli/EachCommand'
import { HelpCommand } from './moarCli/HelpCommand'
import { NameCommand } from './moarCli/NameCommand'
import { PackageTheme } from './moarCli/PackageTheme'
import { RefetchCommand } from './moarCli/RefetchCommand'
import { ReleaseCommand } from './moarCli/ReleaseCommand'
import { StatusCommand } from './moarCli/StatusCommand'
import { TagCommand } from './moarCli/TagCommand'

const helpCommand = new HelpCommand()
export const commands: CliCommand[] = []
commands.push(helpCommand)
commands.push(new AtCommand())
commands.push(new BranchCommand())
commands.push(new EachCommand())
commands.push(new NameCommand())
commands.push(new StatusCommand())
commands.push(new TagCommand())
commands.push(new RefetchCommand())
commands.push(new ReleaseCommand())
commands.push(new AwsAccountCommand())
commands.push(new AwsCycleAccessKeyCommand())

const cliCommands: string[] = []

const args = process.argv
for (let i = 2; i < args.length; i++) {
  const arg = args[i]
  if (!arg.startsWith('-')) {
    cliCommands.push(arg)
  }
}

if (cliCommands.length === 0) {
  cliCommands.push('help')
}

const theme: PackageTheme = {
  aheadChalk: chalk.green,
  behindChalk: chalk.red,
  commandTransform: chalk.yellow,
  commentTransform: chalk.green,
  emphasisTransform: chalk.bold,
  optionTransform: chalk.cyan,
  signChalk: chalk.magenta,
  uncommitedChalk: chalk.cyan,
  unmergedChalk: chalk.yellow,
}

const errors: string[] = []

start()

function start() {
  if (cliCommands[0] === 'complete') {
    const output: string[] = []
    for (const command of commands) {
      output.push(command.config.name)
    }
    process.stdout.write(output.sort().join(' '))
    return
  }

  for (const cliCommand of cliCommands) {
    if (CliElement.match(helpCommand.config, cliCommand)) {
      CliCommand.run(helpCommand, theme, errors).then(() => {
        process.exit(0)
      })
      return
    }
  }

  for (const cliCommand of cliCommands) {
    for (const command of commands) {
      if (CliElement.match(command.config, cliCommand)) {
        CliCommand.run(command, theme, errors).then(() => {
          process.exit(0)
        })
        return
      }
    }
  }
}
