import { writeFile } from 'node:fs/promises'
import pc from 'picocolors'
import { parseSource, fetchContent } from '../source.ts'
import {
  getGlobalAgentsPath,
  getProjectAgentsPath,
  readGlobalConfig,
  writeGlobalConfig,
  readProjectConfig,
  writeProjectConfig,
} from '../config.ts'

interface UpdateOptions {
  global?: boolean
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  if (options.global) {
    await updateGlobal()
  } else {
    await updateProject()
  }
}

async function updateGlobal(): Promise<void> {
  const config = await readGlobalConfig()
  if (!config) {
    console.error(pc.red('Global AGENTS.md is not installed. Run agent-specs add <source> -g first.'))
    process.exit(1)
  }

  console.log(pc.dim(`Source: ${config.source}`))
  console.log(pc.dim('Loading latest content...'))

  const source = parseSource(config.source)
  let content: string
  try {
    content = await fetchContent(source)
  } catch (err) {
    console.error(pc.red((err as Error).message))
    process.exit(1)
  }

  const agentsPath = getGlobalAgentsPath()
  await writeFile(agentsPath, content, 'utf-8')

  await writeGlobalConfig({
    ...config,
    updatedAt: new Date().toISOString(),
  })

  console.log(pc.green(`Updated ${agentsPath}`))
  console.log(pc.dim('Existing symlinks now point to the latest content; no relinking is needed'))
  console.log(pc.green('\nDone!'))
}

async function updateProject(): Promise<void> {
  const config = await readProjectConfig()
  if (!config) {
    console.error(pc.red('Project AGENTS.md is not installed. Run agent-specs add <source> first.'))
    process.exit(1)
  }

  console.log(pc.dim(`Source: ${config.source}`))
  console.log(pc.dim('Loading latest content...'))

  const source = parseSource(config.source)
  let content: string
  try {
    content = await fetchContent(source)
  } catch (err) {
    console.error(pc.red((err as Error).message))
    process.exit(1)
  }

  const agentsPath = getProjectAgentsPath()
  await writeFile(agentsPath, content, 'utf-8')

  await writeProjectConfig({
    ...config,
    updatedAt: new Date().toISOString(),
  })

  console.log(pc.green(`Updated ${agentsPath}`))
  console.log(pc.green('\nDone!'))
}
