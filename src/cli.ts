import { createRequire } from 'node:module'
import { Command } from 'commander'
import { addCommand } from './commands/add.ts'
import { removeCommand } from './commands/remove.ts'
import { updateCommand } from './commands/update.ts'
import { listCommand } from './commands/list.ts'
import { linkCommand } from './commands/link.ts'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const program = new Command()

program
  .name('agent-specs')
  .description('CLI for managing AGENTS.md files')
  .version(pkg.version)

program
  .command('add')
  .description('Install AGENTS.md from a remote URL')
  .argument('<source>', 'Source URL (GitHub URL or direct URL)')
  .option('-g, --global', 'Install globally (~/.agents/) and symlink to detected agent clients')
  .option('-y, --yes', 'Skip confirmation and overwrite existing files')
  .action(addCommand)

program
  .command('remove')
  .alias('rm')
  .description('Remove installed AGENTS.md files and related symlinks')
  .option('-g, --global', 'Remove the global installation')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(removeCommand)

program
  .command('update')
  .description('Re-fetch and update AGENTS.md from its original source')
  .option('-g, --global', 'Update the global installation')
  .action(updateCommand)

program
  .command('list')
  .alias('ls')
  .description('Show installation and symlink status')
  .option('-g, --global', 'Show global installation status')
  .action(listCommand)

program
  .command('link')
  .description('Detect agent clients and recreate symlinks (requires a global install)')
  .option('-y, --yes', 'Automatically handle conflicting files')
  .action(linkCommand)

program.parse()
