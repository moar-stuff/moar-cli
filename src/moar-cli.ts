import { AtCommand } from './commands/AtCommand'
import { BranchCommand } from './commands/BranchCommand'
import chalk from 'chalk'
import { EachCommand } from './commands/EachCommand'
import { NameCommand } from './commands/NameCommand'
import { StatusCommand } from './commands/StatusCommand'
import { TagCommand } from './commands/TagCommand'
import { Command } from './Command'
import { Theme } from './Theme'
import { HelpCommand } from './commands/HelpCommand'
import { CommandElement } from './CommandElement'

const helpCommand = new HelpCommand()
export const commands: Command[] = []
commands.push(helpCommand)
commands.push(new AtCommand())
commands.push(new BranchCommand())
commands.push(new EachCommand())
commands.push(new NameCommand())
commands.push(new StatusCommand())
commands.push(new TagCommand())

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

const theme: Theme = {
  aheadChalk: chalk.green,
  behindChalk: chalk.red,
  signChalk: chalk.magenta,
  uncommitedChalk: chalk.cyan,
  unmergedChalk: chalk.yellow,
  emphasis: chalk.bold,
  commandChalk: chalk.yellow,
  commentChalk: chalk.green,
  optionChalk: chalk.cyan,
}

const errors: string[] = []

start()

function start() {
  for (let i = 0; i < cliCommands.length; i++) {
    let cliCommand = cliCommands[i]
    if (CommandElement.match(helpCommand.config, cliCommand)) {
      Command.run(helpCommand, theme, errors).then(() => {
        process.exit(0)
      })
      return
    }
  }

  for (let i = 0; i < cliCommands.length; i++) {
    let cliCommand = cliCommands[i]
    for (const command of commands) {
      if (CommandElement.match(command.config, cliCommand)) {
        Command.run(command, theme, errors).then(() => {
          process.exit(0)
        })
        return
      }
    }
  }
}
