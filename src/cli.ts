import { createRequire } from 'node:module'
import { Command } from 'commander'
import { SUPPORTED_AGENTS } from './agents.ts'
import { addCommand } from './commands/add.ts'
import { removeCommand } from './commands/remove.ts'
import { updateCommand } from './commands/update.ts'
import { listCommand } from './commands/list.ts'
import { linkCommand } from './commands/link.ts'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')
const supportedAgentNames = SUPPORTED_AGENTS.map((agent) => agent.name).join(', ')

const program = new Command()

program
  .name('agent-specs')
  .description('CLI for managing AGENTS.md files')
  .version(pkg.version)
  .showHelpAfterError()
  .addHelpText(
    'after',
    `
Install modes:
  Project mode (default): writes ./AGENTS.md in the current directory
  Global mode (-g): writes ~/.agents/AGENTS.md and links detected agent clients

Examples:
  $ agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md
  $ agent-specs add ./AGENTS.md -a claude-code
  $ agent-specs add ./AGENTS.md -g -a codex
  $ agent-specs list -g

Run "agent-specs <command> --help" for command-specific help.
`,
  )

program
  .command('add')
  .description('Install AGENTS.md from a remote URL or local file')
  .argument('<source>', 'Source URL or local file path')
  .option('-g, --global', 'Install globally (~/.agents/) and symlink to detected agent clients')
  .option('-a, --agent <name>', 'Link to a specific agent client')
  .option('-y, --yes', 'Skip confirmation and overwrite existing files')
  .addHelpText(
    'after',
    `
Notes:
  Project mode: writes ./AGENTS.md and optionally links one project agent path with -a
  Global mode: writes ~/.agents/AGENTS.md and links detected agent clients
  Use -a to bypass auto-detection and target one agent directly

Supported source formats:
  GitHub blob URL, short GitHub URL, raw URL, any URL, local path, file:// URL

Examples:
  $ agent-specs add ./AGENTS.md
  $ agent-specs add ./AGENTS.md -a claude-code
  $ agent-specs add https://example.com/AGENTS.md -g
  $ agent-specs add ./AGENTS.md -g -a codex

Supported --agent values:
  ${supportedAgentNames}
`,
  )
  .action(addCommand)

program
  .command('remove')
  .alias('rm')
  .description('Remove installed AGENTS.md files and related symlinks')
  .option('-g, --global', 'Remove the global installation')
  .option('-y, --yes', 'Skip confirmation prompts')
  .addHelpText(
    'after',
    `
Notes:
  Project mode: removes ./AGENTS.md and any project agent symlinks created by this CLI
  Global mode (-g): removes ~/.agents/AGENTS.md and related global symlinks
  If the install reused an existing AGENTS.md as the source of truth, that file is preserved

Examples:
  $ agent-specs remove
  $ agent-specs remove -g
  $ agent-specs rm -g -y
`,
  )
  .action(removeCommand)

program
  .command('update')
  .description('Re-fetch and update AGENTS.md from its original source')
  .option('-g, --global', 'Update the global installation')
  .addHelpText(
    'after',
    `
Notes:
  Re-fetches content from the original source recorded during install
  Project mode updates ./AGENTS.md
  Global mode (-g) updates ~/.agents/AGENTS.md without recreating symlinks

Examples:
  $ agent-specs update
  $ agent-specs update -g
`,
  )
  .action(updateCommand)

program
  .command('list')
  .alias('ls')
  .description('Show installation and symlink status')
  .option('-g, --global', 'Show global installation status')
  .addHelpText(
    'after',
    `
Notes:
  Project mode shows ./AGENTS.md plus project agent symlink status
  Global mode (-g) shows ~/.agents/AGENTS.md plus detected or configured global agent links

Examples:
  $ agent-specs list
  $ agent-specs list -g
  $ agent-specs ls -g
`,
  )
  .action(listCommand)

program
  .command('link')
  .description('Detect agent clients and recreate symlinks (requires a global install)')
  .option('-y, --yes', 'Automatically handle conflicting files')
  .addHelpText(
    'after',
    `
Notes:
  Requires an existing global install in ~/.agents/AGENTS.md
  Re-runs agent detection and recreates missing global symlinks
  Useful after installing a new agent client

Examples:
  $ agent-specs link
  $ agent-specs link -y
`,
  )
  .action(linkCommand)

program.parse()
