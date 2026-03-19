# agent-specs

Chinese documentation: [README.zh-CN](https://github.com/zzgosh/agent-specs/blob/main/docs/README.zh-CN.md)

`agent-specs` is a CLI for managing `AGENTS.md` files.

It can load `AGENTS.md` from a remote URL or a local file and install it either per-project or globally. In global mode, it detects installed AI agent clients on the local machine and symlinks a single shared rules file into each client’s native path so multiple agents can reuse the same source of truth. You can also target a specific agent explicitly.

The examples in this repository use Vercel's public [agent-skills/AGENTS.md](https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md) as a demo source. The project is inspired by [Vercel Skills CLI](https://github.com/vercel-labs/skills).

## Installation

```bash
# Run directly (recommended)
npx agent-specs <command>

# Or install globally
npm install -g agent-specs
```

## Quick Start

```bash
# Project install: download AGENTS.md into the current directory
agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md

# Reuse the existing project AGENTS.md and link it to Claude Code in this project
agent-specs add ./AGENTS.md -a claude-code

# Global install: write to ~/.agents/ and symlink to detected agent clients
agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md -g
```

## Commands

### `agent-specs add <source>`

Install `AGENTS.md` from a remote URL or local file.

```bash
# Project install (default)
agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md

# Project agent install: keep ./AGENTS.md as the source of truth
agent-specs add ./AGENTS.md -a claude-code

# Project agent install from another local file: write ./AGENTS.md, then symlink the selected agent path
agent-specs add ./docs/shared-rules.md -a claude-code

# Global install: write to ~/.agents/AGENTS.md and symlink to detected agents
agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md -g

# Global install for a single agent
agent-specs add ./AGENTS.md -g -a claude-code

# Skip confirmation and overwrite existing files after backing them up
agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md -g -y
```

Supported source formats:

| Format | Example |
|------|------|
| GitHub blob URL | `https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md` |
| Short GitHub URL | `https://github.com/vercel-labs/agent-skills/AGENTS.md` |
| Raw URL | `https://raw.githubusercontent.com/vercel-labs/agent-skills/main/AGENTS.md` |
| Any URL | `https://example.com/path/to/AGENTS.md` |
| Local relative path | `./AGENTS.md` |
| Local absolute path | `/path/to/AGENTS.md` |
| File URL | `file:///path/to/AGENTS.md` |

Options:

| Option | Description |
|------|------|
| `-g, --global` | Install globally and symlink to detected agent clients |
| `-a, --agent <name>` | Link to a specific agent client instead of relying on auto-detection. See Supported Agent Clients for valid values. |
| `-y, --yes` | Skip confirmation and automatically back up then overwrite existing files |

### `agent-specs update`

Re-load and update `AGENTS.md` from its original source.

```bash
agent-specs update
agent-specs update -g
```

### `agent-specs list`

Show installation and symlink status.

```bash
agent-specs list
agent-specs list -g
```

### `agent-specs link`

Detect agent clients again and recreate symlinks. This is useful after installing a new agent client. Explicitly configured global agents are also preserved.

```bash
agent-specs link
agent-specs link -y
```

### `agent-specs remove`

Remove installed `AGENTS.md` files and related symlinks.

```bash
agent-specs remove
agent-specs remove -g
agent-specs remove -g -y
```

- If the install reused an existing `AGENTS.md` as the source of truth, `remove` preserves that file and removes only the symlink(s) plus CLI metadata.

## How Global Install Works

```text
~/.agents/AGENTS.md          <- source of truth
    ^ symlink
    |-- ~/.claude/CLAUDE.md
    |-- ~/.gemini/GEMINI.md
    |-- ~/.codex/AGENTS.md
    |-- ~/.config/amp/AGENTS.md
    |-- ~/.config/opencode/AGENTS.md
    |-- ~/.qwen/QWEN.md
    |-- ~/.roo/rules/AGENTS.md
    |-- ~/.continue/rules/AGENTS.md
    |-- ~/.augment/rules/AGENTS.md
    `-- ~/.kiro/steering/AGENTS.md
```

- Editing `~/.agents/AGENTS.md` updates every linked agent immediately.
- Running `agent-specs update -g` refreshes the shared file without recreating symlinks.

## How Project Agent Install Works

```text
./AGENTS.md                <- source of truth
    ^ symlink
    `-- ./.claude/CLAUDE.md
```

- In project mode, `-a <agent>` keeps `./AGENTS.md` as the source of truth.
- If `<source>` is another local file or a remote URL, the CLI writes its content into `./AGENTS.md` first and then links the selected project agent path to it.
- If `<source>` is already `./AGENTS.md`, the CLI reuses the existing file and `remove` preserves it.

## Supported Agent Clients

| Agent | `--agent` | Detection Directory | Symlink Target | Filename |
|-------|-----------|---------------------|----------------|----------|
| Claude Code | `claude-code` | `~/.claude/` | `~/.claude/CLAUDE.md` | `CLAUDE.md` |
| Gemini CLI | `gemini-cli` | `~/.gemini/` | `~/.gemini/GEMINI.md` | `GEMINI.md` |
| Codex (OpenAI) | `codex` | `~/.codex/` | `~/.codex/AGENTS.md` | `AGENTS.md` |
| Amp | `amp` | `~/.config/amp/` | `~/.config/amp/AGENTS.md` | `AGENTS.md` |
| OpenCode | `opencode` | `~/.config/opencode/` | `~/.config/opencode/AGENTS.md` | `AGENTS.md` |
| Qwen Code | `qwen-code` | `~/.qwen/` | `~/.qwen/QWEN.md` | `QWEN.md` |
| Roo Code | `roo-code` | `~/.roo/` | `~/.roo/rules/AGENTS.md` | `AGENTS.md` |
| Continue | `continue` | `~/.continue/` | `~/.continue/rules/AGENTS.md` | `AGENTS.md` |
| Augment | `augment` | `~/.augment/` | `~/.augment/rules/AGENTS.md` | `AGENTS.md` |
| Kiro | `kiro` | `~/.kiro/` | `~/.kiro/steering/AGENTS.md` | `AGENTS.md` |

The CLI only creates symlinks for agent clients that are actually detected on the machine.
When `-a, --agent <name>` is provided, the CLI links the selected agent directly.

## Conflict Handling

| Scenario | Default Behavior | `-y` Behavior |
|------|---------|----------|
| Source of truth already exists | Ask for confirmation | Back up to `.backup` and overwrite |
| Agent path is a symlink | Replace it directly | Replace it directly |
| Agent path is a regular file | Skip and report it | Back up to `.backup` and replace it |

## Directory Structure

```text
agent-specs/
|-- .github/
|   `-- workflows/
|       |-- ci.yml
|       `-- release.yml
|-- .gitignore
|-- bin/
|   `-- cli.mjs
|-- docs/
|   `-- README.zh-CN.md
|-- src/
|   |-- commands/
|   |   |-- add.ts
|   |   |-- link.ts
|   |   |-- list.ts
|   |   |-- remove.ts
|   |   `-- update.ts
|   |-- agents.ts
|   |-- cli.ts
|   |-- config.ts
|   |-- linker.ts
|   |-- prompt.ts
|   |-- source.ts
|   `-- types.ts
|-- build.config.mjs
|-- LICENSE
|-- package-lock.json
|-- package.json
|-- README.md
`-- tsconfig.json
```

## Development

```bash
npm install
npm run build
npx tsx src/cli.ts --help
node bin/cli.mjs --help
```

## License

[MIT](./LICENSE)
