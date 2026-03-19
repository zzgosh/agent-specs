import { unlink, access } from 'node:fs/promises'
import pc from 'picocolors'
import {
  getGlobalAgentsPath,
  getProjectAgentsPath,
  getProjectConfigPath,
  readGlobalConfig,
  readProjectConfig,
} from '../config.ts'
import { SUPPORTED_AGENTS, getProjectAgentPath } from '../agents.ts'
import { unlinkAgent } from '../linker.ts'
import { confirm } from '../prompt.ts'

interface RemoveOptions {
  global?: boolean
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

async function safeUnlink(path: string): Promise<boolean> {
  try {
    await unlink(path)
    return true
  } catch {
    return false
  }
}

export async function removeCommand(options: RemoveOptions): Promise<void> {
  if (options.global) {
    await removeGlobal(options)
  } else {
    await removeProject(options)
  }
}

async function removeGlobal(options: RemoveOptions): Promise<void> {
  const agentsPath = getGlobalAgentsPath()
  const config = await readGlobalConfig()

  if (!config && !(await fileExists(agentsPath))) {
    console.log(pc.yellow('Global AGENTS.md is not installed'))
    return
  }

  if (!options.yes) {
    const ok = await confirm('Remove the global AGENTS.md file and all related symlinks?')
    if (!ok) {
      console.log(pc.dim('Cancelled'))
      return
    }
  }

  // Remove symlinks for all supported agent clients.
  let removedCount = 0
  for (const agent of SUPPORTED_AGENTS) {
    const removed = await unlinkAgent(agent, agentsPath)
    if (removed) {
      console.log(`  ${pc.red('-')} ${pc.bold(agent.displayName)} ${pc.dim(agent.globalFilePath)}`)
      removedCount++
    }
  }

  if (removedCount > 0) {
    console.log(pc.dim(`\nRemoved ${removedCount} symlink(s)`))
  }

  // Remove the canonical source file.
  if (config?.managesSourceFile !== false) {
    if (await safeUnlink(agentsPath)) {
      console.log(pc.dim(`Deleted ${agentsPath}`))
    }
  } else {
    console.log(pc.dim(`Preserved ${agentsPath}`))
  }

  // Remove the config file.
  if (config) {
    const { join } = await import('node:path')
    const { homedir } = await import('node:os')
    const configPath = join(homedir(), '.agents', 'config.json')
    await safeUnlink(configPath)
    console.log(pc.dim('Deleted config file'))
  }

  console.log(pc.green('\nDone!'))
}

async function removeProject(options: RemoveOptions): Promise<void> {
  const agentsPath = getProjectAgentsPath()
  const configPath = getProjectConfigPath()
  const config = await readProjectConfig()

  if (!(await fileExists(agentsPath)) && !(await fileExists(configPath))) {
    console.log(pc.yellow('Project AGENTS.md is not installed'))
    return
  }

  if (!options.yes) {
    const ok = await confirm('Remove the project AGENTS.md file and related project agent links?')
    if (!ok) {
      console.log(pc.dim('Cancelled'))
      return
    }
  }

  let removedCount = 0
  for (const agent of SUPPORTED_AGENTS) {
    const targetPath = getProjectAgentPath(agent)
    const removed = await unlinkAgent(agent, agentsPath, targetPath)
    if (removed) {
      console.log(`  ${pc.red('-')} ${pc.bold(agent.displayName)} ${pc.dim(targetPath)}`)
      removedCount++
    }
  }

  if (removedCount > 0) {
    console.log(pc.dim(`\nRemoved ${removedCount} project link(s)`))
  }

  if (config?.managesSourceFile !== false) {
    if (await safeUnlink(agentsPath)) {
      console.log(pc.dim(`Deleted ${agentsPath}`))
    }
  } else {
    console.log(pc.dim(`Preserved ${agentsPath}`))
  }
  if (await safeUnlink(configPath)) {
    console.log(pc.dim(`Deleted ${configPath}`))
  }

  console.log(pc.green('\nDone!'))
}
