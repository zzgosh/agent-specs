import { readlink, lstat } from 'node:fs/promises'
import pc from 'picocolors'
import {
  getGlobalAgentsPath,
  getProjectAgentsPath,
  readGlobalConfig,
  readProjectConfig,
} from '../config.ts'
import {
  SUPPORTED_AGENTS,
  detectInstalledAgents,
  getAgentsByNames,
  getProjectAgentPath,
} from '../agents.ts'

interface ListOptions {
  global?: boolean
}

export async function listCommand(options: ListOptions): Promise<void> {
  if (options.global) {
    await listGlobal()
  } else {
    await listProject()
  }
}

async function listGlobal(): Promise<void> {
  const config = await readGlobalConfig()
  const agentsPath = getGlobalAgentsPath()

  if (!config) {
    console.log(pc.yellow('Global AGENTS.md is not installed'))
    console.log(pc.dim(`Install it with ${pc.bold('agent-specs add <source> -g')}`))
    return
  }

  console.log(pc.bold('Global AGENTS.md'))
  console.log(`  Source:    ${config.source}`)
  console.log(`  Path:      ${agentsPath}`)
  console.log(`  Installed: ${formatDate(config.installedAt)}`)
  console.log(`  Updated:   ${formatDate(config.updatedAt)}`)

  // Show symlink status.
  console.log(`\n${pc.bold('Symlink status:')}`)
  const installed = await detectInstalledAgents()
  const configured = getAgentsByNames(config.linkedAgents ?? [])
  const visibleAgentNames = new Set([
    ...installed.map((agent) => agent.name),
    ...configured.map((agent) => agent.name),
  ])
  const agents = SUPPORTED_AGENTS.filter((agent) => visibleAgentNames.has(agent.name))

  if (agents.length === 0) {
    console.log(pc.dim('  No installed agent clients detected'))
    return
  }

  for (const agent of agents) {
    const status = await getSymlinkStatus(agent.globalFilePath, agentsPath)
    const name = pc.bold(agent.displayName)
    const path = pc.dim(agent.globalFilePath)

    switch (status) {
      case 'linked':
        console.log(`  ${pc.green('●')} ${name} ${path}`)
        break
      case 'other-link':
        console.log(`  ${pc.yellow('●')} ${name} ${path} ${pc.dim('(points elsewhere)')}`)
        break
      case 'file':
        console.log(`  ${pc.yellow('●')} ${name} ${path} ${pc.dim('(regular file, not a symlink)')}`)
        break
      case 'missing':
        console.log(`  ${pc.dim('○')} ${name} ${pc.dim('not linked')}`)
        break
    }
  }
}

async function listProject(): Promise<void> {
  const config = await readProjectConfig()
  const agentsPath = getProjectAgentsPath()

  if (!config) {
    console.log(pc.yellow('Project AGENTS.md is not installed'))
    console.log(pc.dim(`Install it with ${pc.bold('agent-specs add <source>')}`))
    return
  }

  console.log(pc.bold('Project AGENTS.md'))
  console.log(`  Source:    ${config.source}`)
  console.log(`  Path:      ${agentsPath}`)
  console.log(`  Installed: ${formatDate(config.installedAt)}`)
  console.log(`  Updated:   ${formatDate(config.updatedAt)}`)

  const linkedAgents = getAgentsByNames(config.linkedAgents ?? [])
  if (linkedAgents.length === 0) {
    return
  }

  console.log(`\n${pc.bold('Project agent links:')}`)
  for (const agent of linkedAgents) {
    const targetPath = getProjectAgentPath(agent)
    const status = await getSymlinkStatus(targetPath, agentsPath)
    const name = pc.bold(agent.displayName)
    const path = pc.dim(targetPath)

    switch (status) {
      case 'linked':
        console.log(`  ${pc.green('●')} ${name} ${path}`)
        break
      case 'other-link':
        console.log(`  ${pc.yellow('●')} ${name} ${path} ${pc.dim('(points elsewhere)')}`)
        break
      case 'file':
        console.log(`  ${pc.yellow('●')} ${name} ${path} ${pc.dim('(regular file, not a symlink)')}`)
        break
      case 'missing':
        console.log(`  ${pc.dim('○')} ${name} ${pc.dim('not linked')}`)
        break
    }
  }
}

async function getSymlinkStatus(
  path: string,
  expectedTarget: string,
): Promise<'linked' | 'other-link' | 'file' | 'missing'> {
  try {
    const stat = await lstat(path)
    if (stat.isSymbolicLink()) {
      const target = await readlink(path)
      return target === expectedTarget ? 'linked' : 'other-link'
    }
    return 'file'
  } catch {
    return 'missing'
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US')
  } catch {
    return iso
  }
}
