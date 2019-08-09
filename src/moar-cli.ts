import { AtCommand } from './moarCli/AtCommand'
import { BranchCommand } from './moarCli/BranchCommand'
import chalk from 'chalk'
import { EachCommand } from './moarCli/EachCommand'
import { NameCommand } from './moarCli/NameCommand'
import { StatusCommand } from './moarCli/StatusCommand'
import { TagCommand } from './moarCli/TagCommand'
import { CliCommand } from './cli/CliCommand'
import { PackageTheme } from './moarCli/PackageTheme'
import { HelpCommand } from './moarCli/HelpCommand'
import { CliElement } from './cli/CliElement'
import { RefetchCommand } from './moarCli/RefetchCommand'
import { ReleaseCommand } from './moarCli/ReleaseCommand'
import { CycleAwsAccessKey } from './moarCli/CycleAwsAccessKey'

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
commands.push(new CycleAwsAccessKey())

const cliCommands: string[] = []

const args = process.argv
for (let i = 0; i < args.length; i++) {
  let arg = args[i]
  if (!arg.startsWith('-')) {
    cliCommands.push(arg)
  }
}

if (cliCommands.length < 3) {
  cliCommands.push('help')
}

const theme: PackageTheme = {
  aheadChalk: chalk.green,
  behindChalk: chalk.red,
  signChalk: chalk.magenta,
  uncommitedChalk: chalk.cyan,
  unmergedChalk: chalk.yellow,
  emphasisTransform: chalk.bold,
  commandTransform: chalk.yellow,
  commentTransform: chalk.green,
  optionTransform: chalk.cyan,
}

const errors: string[] = []

start()

function start() {
  for (let i = 0; i < cliCommands.length; i++) {
    let cliCommand = cliCommands[i]
    if (CliElement.match(helpCommand.config, cliCommand)) {
      CliCommand.run(helpCommand, theme, errors).then(() => {
        process.exit(0)
      })
      return
    }
  }

  for (let i = 0; i < cliCommands.length; i++) {
    let cliCommand = cliCommands[i]
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
