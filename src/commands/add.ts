import { writeFile, access, mkdir } from 'node:fs/promises'
import pc from 'picocolors'
import { parseSource, fetchContent } from '../source.ts'
import {
  getGlobalAgentsPath,
  getGlobalDir,
  getProjectAgentsPath,
  readGlobalConfig,
  writeGlobalConfig,
  readProjectConfig,
  writeProjectConfig,
} from '../config.ts'
import {
  detectInstalledAgents,
  getAgentByName,
  getProjectAgentPath,
} from '../agents.ts'
import { linkAgent, linkAgents, printLinkResults } from '../linker.ts'
import { confirm } from '../prompt.ts'
import type { AgentConfig, ParsedSource } from '../types.ts'

interface AddOptions {
  global?: boolean
  agent?: string
  yes?: boolean
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function resolveAgentOrExit(name: string): AgentConfig {
  const agent = getAgentByName(name)
  if (agent) {
    return agent
  }

  const supportedAgents = [
    'claude-code',
    'gemini-cli',
    'codex',
    'amp',
    'opencode',
    'qwen-code',
    'roo-code',
    'continue',
    'augment',
    'kiro',
  ]
  console.error(pc.red(`Unknown agent: ${name}`))
  console.error(pc.dim(`Supported agents: ${supportedAgents.join(', ')}`))
  process.exit(1)
}

function usesCanonicalSource(source: ParsedSource, targetPath: string): boolean {
  return source.type === 'file' && source.filePath === targetPath
}

export async function addCommand(
  sourceInput: string,
  options: AddOptions,
): Promise<void> {
  const source = parseSource(sourceInput)

  console.log(pc.dim(`Source: ${source.displayUrl}`))
  console.log(pc.dim('Loading content...'))

  let content: string
  try {
    content = await fetchContent(source)
  } catch (err) {
    console.error(pc.red((err as Error).message))
    process.exit(1)
  }

  console.log(pc.green(`Loaded successfully (${content.length} chars)`))

  if (options.global) {
    await addGlobal(source, content, options)
  } else {
    await addProject(source, content, options)
  }
}

/** Install globally. */
async function addGlobal(
  source: ParsedSource,
  content: string,
  options: AddOptions,
): Promise<void> {
  const agentsPath = getGlobalAgentsPath()
  const globalDir = getGlobalDir()
  const selectedAgent = options.agent ? resolveAgentOrExit(options.agent) : null

  // Ensure ~/.agents exists.
  await mkdir(globalDir, { recursive: true })

  const canonicalSource = usesCanonicalSource(source, agentsPath)
  const existingConfig = await readGlobalConfig()

  // Check whether the target file already exists.
  if (!canonicalSource && await fileExists(agentsPath)) {
    if (!options.yes) {
      console.log(pc.yellow(`\n${agentsPath} already exists`))
      const ok = await confirm(
        'Overwrite it? The existing file will be backed up as AGENTS.md.backup.',
      )
      if (!ok) {
        console.log(pc.dim('Cancelled'))
        return
      }
    }

    // Back up the existing file.
    const { rename } = await import('node:fs/promises')
    const backupPath = `${agentsPath}.backup`
    await rename(agentsPath, backupPath)
    console.log(pc.dim(`Backed up the existing file to ${backupPath}`))
  }

  if (canonicalSource) {
    console.log(pc.dim(`\nUsing existing ${agentsPath} as the global source file`))
  } else {
    // Write the canonical source file.
    await writeFile(agentsPath, content, 'utf-8')
    console.log(pc.green(`\nWrote ${agentsPath}`))
  }

  let agents: AgentConfig[] = []
  if (selectedAgent) {
    console.log(pc.dim(`\nLinking to selected agent: ${selectedAgent.displayName}`))
    agents = [selectedAgent]
  } else {
    // Detect installed agent clients.
    console.log(pc.dim('\nDetecting installed agent clients...'))
    agents = await detectInstalledAgents()
  }

  let linkedAgentNames: string[] = existingConfig?.linkedAgents ?? []

  if (agents.length === 0) {
    console.log(pc.yellow('No installed agent clients detected'))
    console.log(
      pc.dim('Run agent-specs link after installing an agent client to create symlinks'),
    )
  } else {
    if (selectedAgent) {
      console.log('')
    } else {
      console.log(`Detected ${agents.length} agent client(s):\n`)
    }

    // Create symlinks.
    const results = await linkAgents(agents, agentsPath, {
      yes: options.yes,
    })
    printLinkResults(results)

    const newlyLinkedAgentNames = results
      .filter((r) => r.status !== 'skipped')
      .map((r) => r.agent.name)

    linkedAgentNames = Array.from(
      new Set([...(existingConfig?.linkedAgents ?? []), ...newlyLinkedAgentNames]),
    )
  }

  // Persist config even when no agent clients are detected.
  const now = new Date().toISOString()
  await writeGlobalConfig({
    version: 1,
    source: source.persistedSource,
    installedAt: existingConfig?.installedAt ?? now,
    updatedAt: now,
    linkedAgents: linkedAgentNames,
    managesSourceFile: !canonicalSource,
  })

  console.log(pc.green('\nDone!'))
}

/** Install in the current project. */
async function addProject(
  source: ParsedSource,
  content: string,
  options: AddOptions,
): Promise<void> {
  const agentsPath = getProjectAgentsPath()
  const selectedAgent = options.agent ? resolveAgentOrExit(options.agent) : null
  const canonicalSource = usesCanonicalSource(source, agentsPath)
  const existingConfig = await readProjectConfig()

  // Check whether the target file already exists.
  if (!canonicalSource && await fileExists(agentsPath)) {
    if (!options.yes) {
      console.log(pc.yellow(`\n${agentsPath} already exists`))
      const ok = await confirm('Overwrite it?')
      if (!ok) {
        console.log(pc.dim('Cancelled'))
        return
      }
    }
  }

  if (canonicalSource) {
    console.log(pc.dim(`\nUsing existing ${agentsPath} as the project source file`))
  } else {
    await writeFile(agentsPath, content, 'utf-8')
    console.log(pc.green(`\nWrote ${agentsPath}`))
  }

  // Persist project config.
  const now = new Date().toISOString()
  let linkedAgents = existingConfig?.linkedAgents

  if (selectedAgent) {
    const targetPath = getProjectAgentPath(selectedAgent)
    console.log(pc.dim(`\nLinking to project agent path: ${selectedAgent.displayName}`))
    const result = await linkAgent(selectedAgent, agentsPath, {
      yes: options.yes,
      targetPath,
    })
    printLinkResults([result])

    if (result.status !== 'skipped') {
      linkedAgents = Array.from(new Set([...(existingConfig?.linkedAgents ?? []), selectedAgent.name]))
    }
  }

  await writeProjectConfig({
    version: 1,
    source: source.persistedSource,
    installedAt: existingConfig?.installedAt ?? now,
    updatedAt: now,
    linkedAgents,
    managesSourceFile: !canonicalSource,
  })

  console.log(pc.green('Done!'))
}
