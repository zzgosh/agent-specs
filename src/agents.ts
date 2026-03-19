import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { access } from 'node:fs/promises'
import type { AgentConfig } from './types.ts'

const home = homedir()

function createAgent(
  name: string,
  displayName: string,
  relativeFilePath: string,
): AgentConfig {
  return {
    name,
    displayName,
    detectDir: join(home, dirname(relativeFilePath)),
    relativeFilePath,
    globalFilePath: join(home, relativeFilePath),
    fileName: basename(relativeFilePath),
  }
}

/**
 * Supported agent clients with known global rules file locations.
 */
export const SUPPORTED_AGENTS: AgentConfig[] = [
  createAgent('claude-code', 'Claude Code', '.claude/CLAUDE.md'),
  createAgent('gemini-cli', 'Gemini CLI', '.gemini/GEMINI.md'),
  createAgent('codex', 'Codex (OpenAI)', '.codex/AGENTS.md'),
  createAgent('amp', 'Amp', '.config/amp/AGENTS.md'),
  createAgent('opencode', 'OpenCode', '.config/opencode/AGENTS.md'),
  createAgent('qwen-code', 'Qwen Code', '.qwen/QWEN.md'),
  createAgent('roo-code', 'Roo Code', '.roo/rules/AGENTS.md'),
  createAgent('continue', 'Continue', '.continue/rules/AGENTS.md'),
  createAgent('augment', 'Augment', '.augment/rules/AGENTS.md'),
  createAgent('kiro', 'Kiro', '.kiro/steering/AGENTS.md'),
]

export function getProjectAgentPath(
  agent: AgentConfig,
  cwd: string = process.cwd(),
): string {
  return join(cwd, agent.relativeFilePath)
}

export function getAgentByName(name: string): AgentConfig | undefined {
  return SUPPORTED_AGENTS.find((agent) => agent.name === name)
}

export function getAgentsByNames(names: string[]): AgentConfig[] {
  const seen = new Set<string>()
  return names.flatMap((name) => {
    const agent = getAgentByName(name)
    if (!agent || seen.has(agent.name)) {
      return []
    }
    seen.add(agent.name)
    return [agent]
  })
}

/** Check whether a directory exists. */
async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Detect installed agent clients. */
export async function detectInstalledAgents(): Promise<AgentConfig[]> {
  const results = await Promise.all(
    SUPPORTED_AGENTS.map(async (agent) => ({
      agent,
      installed: await dirExists(agent.detectDir),
    })),
  )
  return results.filter((r) => r.installed).map((r) => r.agent)
}
