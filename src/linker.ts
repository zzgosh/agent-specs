import { dirname } from 'node:path'
import {
  symlink,
  readlink,
  unlink,
  lstat,
  mkdir,
  rename,
} from 'node:fs/promises'
import type { AgentConfig } from './types.ts'
import pc from 'picocolors'

export interface LinkResult {
  agent: AgentConfig
  targetPath: string
  status: 'created' | 'exists' | 'replaced' | 'backed-up' | 'skipped'
  detail?: string
}

/** Check whether a path is a symlink pointing to a specific target. */
async function isSymlinkTo(
  linkPath: string,
  target: string,
): Promise<boolean> {
  try {
    const stat = await lstat(linkPath)
    if (!stat.isSymbolicLink()) return false
    const currentTarget = await readlink(linkPath)
    return currentTarget === target
  } catch {
    return false
  }
}

/** Check whether a path exists without resolving symlinks. */
async function lexists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch {
    return false
  }
}

/** Check whether a path is a symlink. */
async function isSymlink(path: string): Promise<boolean> {
  try {
    const stat = await lstat(path)
    return stat.isSymbolicLink()
  } catch {
    return false
  }
}

/**
 * Create a symlink for a single agent client.
 * canonicalSource -> agent.globalFilePath
 */
export async function linkAgent(
  agent: AgentConfig,
  truthSource: string,
  options: { yes?: boolean; targetPath?: string } = {},
): Promise<LinkResult> {
  const target = options.targetPath ?? agent.globalFilePath

  // Already linked correctly.
  if (await isSymlinkTo(target, truthSource)) {
    return { agent, targetPath: target, status: 'exists' }
  }

  // Ensure the parent directory exists.
  await mkdir(dirname(target), { recursive: true })

  // The target path already exists.
  if (await lexists(target)) {
    if (await isSymlink(target)) {
      // Existing symlink points elsewhere: replace it.
      await unlink(target)
      await symlink(truthSource, target)
      return {
        agent,
        targetPath: target,
        status: 'replaced',
        detail: 'Replaced an existing symlink',
      }
    }

    // Existing target is a regular file.
    if (!options.yes) {
      // In interactive mode, skip and tell the user what to do.
      return {
        agent,
        targetPath: target,
        status: 'skipped',
        detail: `${target} already exists and is not a symlink; use -y to overwrite it or back it up manually`,
      }
    }

    // In non-interactive mode, back it up and replace it.
    const backupPath = `${target}.backup`
    await rename(target, backupPath)
    await symlink(truthSource, target)
    return {
      agent,
      targetPath: target,
      status: 'backed-up',
      detail: `Backed up the existing file to ${backupPath}`,
    }
  }

  // The target path does not exist: create it.
  await symlink(truthSource, target)
  return { agent, targetPath: target, status: 'created' }
}

/** Create symlinks for multiple agent clients. */
export async function linkAgents(
  agents: AgentConfig[],
  truthSource: string,
  options: { yes?: boolean } = {},
): Promise<LinkResult[]> {
  const results = await Promise.all(
    agents.map((agent) => linkAgent(agent, truthSource, options)),
  )
  return results
}

/** Remove a single agent symlink if it points to the canonical source file. */
export async function unlinkAgent(
  agent: AgentConfig,
  truthSource: string,
  targetPath: string = agent.globalFilePath,
): Promise<boolean> {
  if (await isSymlinkTo(targetPath, truthSource)) {
    await unlink(targetPath)
    return true
  }
  return false
}

/** Print link results. */
export function printLinkResults(results: LinkResult[]): void {
  for (const r of results) {
    const name = pc.bold(r.agent.displayName)
    const path = pc.dim(r.targetPath)
    switch (r.status) {
      case 'created':
        console.log(`  ${pc.green('+')} ${name} ${path}`)
        break
      case 'exists':
        console.log(`  ${pc.blue('=')} ${name} ${pc.dim('already linked')}`)
        break
      case 'replaced':
        console.log(`  ${pc.yellow('~')} ${name} ${path} ${pc.dim(r.detail ?? '')}`)
        break
      case 'backed-up':
        console.log(`  ${pc.yellow('~')} ${name} ${path}`)
        if (r.detail) console.log(`    ${pc.dim(r.detail)}`)
        break
      case 'skipped':
        console.log(`  ${pc.red('!')} ${name} ${pc.dim(r.detail ?? 'skipped')}`)
        break
    }
  }
}
