import chalk from 'chalk';
import { StatusCommand } from './StatusCommand';
import { DescribeCommand } from './DescribeCommand';

import * as packageJson from './package.json';
import { EachCommand } from './EachCommand';

import commandLineArgs from 'command-line-args';
import commandLineUsage, { OptionDefinition } from 'command-line-usage';
import { BranchCommand } from './BranchCommand';
import { TagCommand } from './TagCommand';
import { AtCommand } from './AtCommand';

const aliases: any = {
  '--version': 'version',
  '-r': 'raw',
  '-v': 'version',
  a: 'at',
  b: 'branch',
  d: 'describe',
  e: 'each',
  h: 'help',
  i: 'hide',
  m: 'tag-message',
  n: 'naked',
  o: 'origin',
  p: 'simplify',
  q: 'quiet-level',
  r: 'raw',
  s: 'status',
  t: 'tag',
  u: 'suppress',
  v: 'version',
  w: 'show',
  y: 'verify',
};

const options: OptionDefinition[] = [
  { name: 'hide', defaultValue: '<null>' },
  { name: 'origin', defaultValue: 'origin' },
  { name: 'quiet-level', defaultValue: '0' },
  { name: 'raw', defaultValue: '0' },
  { name: 'show', defaultValue: '<null>' },
  { name: 'suppress', defaultValue: '$^' },
  { name: 'tag-message', defaultValue: 'tagged' },
  { name: 'verify', defaultValue: '0' },
  { name: 'simplify', defaultValue: '2' },
  { name: 'naked', defaultValue: '0' }
];
describe(options, {
  hide: ['Hide using the supplied filter criteria',
    '<null> | <RegEx>'
  ],
  'quiet-level': ['Quiet level',
    '0 | 1 | 2'
  ],
  origin: ['Name of the remote to consider origin',
    '<string>'
  ],
  raw: ['Show raw output',
    '0 | 1'
  ],
  'tag-message': ['Base message for tagging',
    '<string>'
  ],
  show: ['Show using the supplied filter criteria',
    '<null> | <RegEx>'
  ],
  suppress: ['Suppress using the supplied filter criteria',
    '<null> | <RegEx>'
  ],
  verify: ['Verify signatures',
    '0 | 1'
  ],
  simplify: ['Simplify Branch Names',
    '0 | 1 | 2'
  ],
  naked: ['Output "naked" content',
    '0 | 1'
  ],
});

const commands: OptionDefinition[] = [
  { name: 'at' },
  { name: 'branch' },
  { name: 'describe' },
  { name: 'each' },
  { name: 'help' },
  { name: 'status' },
  { name: 'tag' },
  { name: 'version' },
];
describe(commands, {
  at: ['Display the package version'],
  branch: ['Show branches not yet merged'],
  describe: ['Describe'],
  each: ['Build a script to run a command in all package directories'],
  help: ['Display help'],
  status: ['Show status'],
  tag: ['Tag'],
});

run();

function findAlias(name: string) {
  const keys = Object.keys(aliases);
  for (const key of keys) {
    if (aliases[key] === name && key.length === 1) {
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
        item.description += chalk.rgb(30, 30, 0)(desc[1]);
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
      command.name = command.name + ' -m <msg> <tagname>';
    }
    if (command.name === 'version') {
      // the version _command_ is traditionally '-v', '--version'
      command.alias = '-' + command.alias;
      command.name = '--' + command.name;
    }
  }

  for (const option of options) {
    option.name = '--' + option.name;
    option.alias = '-' + option.alias;
  }

  const sections = [
    {
      header: 'Moar CLI',
      content: 'A tool for managing packages'
    },
    {
      content: 'moar <options> <command>'
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
  applyDefaultValues(context);
  let command: any;
  if (context._unknown) {
    command = {};
    for (const arg of process.argv) {
      if (!arg.match(/\//)) {
        if (arg.match(/-(i|o|p|q|r|w|u|m|y).+/)) {
          const option = aliases[arg.charAt(1)];
          if (option) {
            context[option] = arg.substring(2);
            continue;
          }
        }
        command[arg] = true;
      }
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
      await new BranchCommand(context, theme).run(errors);
    } else if (command.tag) {
      await new TagCommand(context, theme).run(errors);
    } else if (command.at) {
      await new AtCommand(context, theme).run(errors);
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

/**
 * Apply default values to the context.
 */
function applyDefaultValues(context: commandLineArgs.CommandLineOptions) {
  for (const option of options) {
    context[option.name] = context[option.name] || option.defaultValue;
  }
}

