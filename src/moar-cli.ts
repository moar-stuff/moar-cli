import chalk from 'chalk';
import { StatusCommand } from './StatusCommand';
import { DescribeCommand } from './DescribeCommand';

import * as modulePackage from './package.json';
import { EachCommand } from './EachCommand';

import commandLineArgs from 'command-line-args';
import commandLineUsage, { OptionDefinition } from 'command-line-usage';
import { NotMergedCommand } from './NoMergedCommand';

const aliases: any = {
  s: 'status',
  d: 'describe',
  h: 'help',
  e: 'each',
  b: 'branch',
  '-r': 'raw',
  '--version': 'version',
  '-v': 'version'
};

const options: OptionDefinition[] = [
  {
    alias: 'y',
    name: 'verify',
    description: 'Verify signatures'
  },
  {
    alias: 'u',
    name: 'suppress',
    description: 'Suppress using the supplied filter criteria',
    defaultValue: '$^'
  },
  {
    alias: 'w',
    name: 'show',
    description: 'Show using the supplied filter criteria'
  },
  {
    alias: 'i',
    name: 'hide',
    description: 'Hide using the supplied filter criteria'
  },
  { alias: 'r', name: 'raw', description: 'Show raw output' }
];
const commands: OptionDefinition[] = [
  { name: 'version', alias: 'v', description: 'Display help' },
  {
    alias: 'd',
    name: 'describe',
    description: 'Describe the current module'
  },
  {
    alias: 'e',
    name: 'each',
    description: 'Build a script to run a command in all module directories'
  },
  {
    alias: 'b',
    name: 'branch',
    description:
      'Draw a picture of branches not yet merged to the current HEAD.'
  },
  { name: 'status', alias: 's', description: 'Show status for all modules' },
  { name: 'help', alias: 'h', description: 'Display help' }
];

run();

/**
 * For **command-line-usage** the order of keys on the first element of the
 * options array influences the formatting.  This **fixup** is needed to
 * set the order for key display.
 */
function setColumnOrder() {
  options[0] = {
    name: options[0].name,
    alias: options[0].alias,
    defaultValue: options[0].defaultValue,
    description: options[0].description
  };
  commands[0] = {
    name: commands[0].name,
    alias: commands[0].alias,
    description: commands[0].description
  };
}

function showHelp() {
  setColumnOrder();
  for (const option of options) {
    option.name = '--' + option.name;
    option.alias = '-' + option.alias;
  }
  commands[0].alias = '-' + commands[0].alias;
  commands[0].name = '--' + commands[0].name;
  const sections = [
    {
      header: 'Moar CLI',
      content: 'A tool for managing more then one GIT module.'
    },
    {
      content: 'moar <command> <options>'
    },
    {
      header: 'Options',
      content: options
    },
    {
      header: 'Commands',
      content: commands
    }
  ];
  const usage = commandLineUsage(sections);
  console.log(usage);
}

async function run() {
  const theme = {
    aheadChalk: chalk.green.bold,
    behindChalk: chalk.red.bold,
    uncommitedChalk: chalk.blue.bold,
    unmergedChalk: chalk.blue.bold,
    signChalk: chalk.magenta.bold
  };

  const optionDefinitions = commands.concat(options);
  const context = commandLineArgs(optionDefinitions, { partial: true });
  let command: any;
  if (context._unknown) {
    command = {};
    for (const unknown of context._unknown) {
      command[unknown] = true;
    }
  } else {
    command = { help: true };
  }
  let alias = aliases[Object.keys(command)[0]];
  if (alias) {
    command[alias] = true;
  }

  const errors: string[] = [];

  if (!process.env.MOAR_MODULE_DIR) {
    errors.push('MOAR_MODULE_DIR must be defined');
  } else {
    if (context.version !== undefined || context['--version'] !== undefined) {
      console.log(modulePackage.version);
      return;
    }
    if (command.help) {
      showHelp();
      return;
    }
    if (command.r) {
      console.log('RAW');
      return;
    }

    if (command.status) {
      await new StatusCommand(context, theme).run(errors);
    } else if (command.describe) {
      await new DescribeCommand(context, theme).run(errors);
    } else if (command.each) {
      await new EachCommand(context, theme).run(errors);
    } else if (command.branch) {
      await new NotMergedCommand(context, theme).run(errors);
    } else {
      errors.push(`Invalid Command: ${Object.keys(command)[0]}`);
    }
  }

  if (errors.length) {
    showHelp();
    console.log();
    for (const error of errors) {
      console.log(chalk.red(`  * ${error}`));
    }
    console.log();
  }
}
