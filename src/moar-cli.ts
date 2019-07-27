import chalk from 'chalk';
import { StatusCommand } from './StatusCommand';
import { DescribeCommand } from './DescribeCommand';

import * as packageJson from './package.json';
import { EachCommand } from './EachCommand';

import commandLineArgs from 'command-line-args';
import commandLineUsage, { OptionDefinition } from 'command-line-usage';
import { NotMergedCommand } from './NoMergedCommand';
import { TagCommand } from './TagCommand';

const aliases: any = {
  b: 'branch',
  d: 'describe',
  e: 'each',
  h: 'help',
  i: 'hide',
  m: 'tag-message',
  o: 'sort',
  q: 'quiet-level',
  r: 'raw',
  s: 'status',
  t: 'tag',
  u: 'suppress',
  w: 'show',
  y: 'verify',
  v: 'version',
  '-r': 'raw',
  '-v': 'version',
  '--version': 'version'
};

const options: OptionDefinition[] = [
  { name: 'quiet-level', defaultValue: '0' },
  { name: 'suppress', defaultValue: '$^' },
  { name: 'show', defaultValue: '<null>' },
  { name: 'hide', defaultValue: '<null>' },
  { name: 'raw', defaultValue: '0' },
  { name: 'verify', defaultValue: '0' },
  { name: 'sort', defaultValue: 'time' },
  { name: 'tag-message', defaultValue: 'tagged' }
];
describe(options, {
  sort: ['time | tag', 'Sort'],
  suppress: ['<null> | <RegEx>', 'Suppress using the supplied filter criteria'],
  show: ['<null> | <RegEx>', 'Show using the supplied filter criteria'],
  hide: ['<null> | <RegEx>', 'Hide using the supplied filter criteria'],
  'quiet-level': ['0 | 1 | 2', 'Quiet level'],
  verify: ['0 | 1', 'Verify signatures'],
  raw: ['0 | 1', 'Show raw output'],
  'tag-message': ['<string>', 'Base message for tagging']
});

const commands: OptionDefinition[] = [
  { name: 'version' },
  { name: 'tag' },
  { name: 'describe' },
  { name: 'each' },
  { name: 'branch' },
  { name: 'status' },
  { name: 'help' }
];
describe(commands, {
  tag: ['Tag'],
  describe: ['Describe'],
  each: ['Build a script to run a command in all package directories'],
  branch: ['Show branches not yet merged'],
  status: ['Show status'],
  help: ['Display help']
});

run();

function findAlias(name: string) {
  const keys = Object.keys(aliases);
  for(const key of keys) {
    if(aliases[key] === name && key.length === 1) {
      return key;
    }
  }
}

function describe(set: any[], descriptions: any) {
  for (const item of set) {
    item.alias = findAlias(item.name);
    const desc = (<any>descriptions)[item.name];
    if (desc) {
      item.description = desc[0];
      if (desc.length > 1) {
        item.description += '\n';
        item.description += (<any>descriptions)[item.name][1];
        item.description += '\n';
      }
    }
  }
}

/**
 * For **command-line-usage** the order of keys on the first element of the
 * options array influences the formatting.  This **fixup** is needed to
 * set the order for key display.
 */
function setColumnOrder() {
  options[0] = {
    alias: options[0].alias,
    name: options[0].name,
    defaultValue: options[0].defaultValue,
    description: options[0].description
  };
  commands[0] = {
    alias: commands[0].alias,
    name: commands[0].name,
    description: commands[0].description
  };
}

function showHelp() {
  setColumnOrder();
  for (const command of commands) {
    if (command.name === 'tag') {
      command.name = command.name + ' <tagname> -m <msg>';
    }
  }
  for (const option of options) {
    option.name = '--' + option.name;
    option.alias = '-' + option.alias;
  }
  commands[0].alias = '-' + commands[0].alias;
  commands[0].name = '--' + commands[0].name;
  const sections = [
    {
      header: 'Moar CLI',
      content: 'A tool for managing packages'
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

  if (!process.env.MOAR_PACKAGE_DIR) {
    errors.push('MOAR_PACKAGE_DIR must be defined');
  } else {
    if (context.version !== undefined || context['--version'] !== undefined) {
      console.log(packageJson.version);
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
    } else if (command.tag) {
      await new TagCommand(context, theme).run(errors);
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
