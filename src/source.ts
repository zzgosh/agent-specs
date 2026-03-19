import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ParsedSource } from './types.ts'

/**
 * Parse a source string and normalize it to a readable local path or fetchable URL.
 *
 * Supported formats:
 * - /path/to/FILE.md
 * - ./path/to/FILE.md
 * - file:///path/to/FILE.md
 * - https://github.com/owner/repo/blob/branch/path/to/FILE.md
 * - https://github.com/owner/repo/path/to/FILE.md (tries main first)
 * - https://raw.githubusercontent.com/owner/repo/branch/path
 * - Any other URL (used as-is)
 */
export function parseSource(url: string): ParsedSource {
  if (url.startsWith('file://')) {
    const filePath = fileURLToPath(url)
    return {
      type: 'file',
      filePath,
      displayUrl: url,
      persistedSource: filePath,
    }
  }

  const isWindowsAbsolutePath = /^[a-zA-Z]:[\\/]/.test(url)
  const schemeMatch = isWindowsAbsolutePath
    ? null
    : url.match(/^([a-zA-Z][a-zA-Z\d+.-]*):\/\//)

  if (!schemeMatch) {
    const filePath = resolve(url)
    return {
      type: 'file',
      filePath,
      displayUrl: url,
      persistedSource: filePath,
    }
  }

  // GitHub blob/tree URL: https://github.com/owner/repo/blob/branch-name/path
  // Branch names may contain /, so we split with a lazy branch match plus the trailing file path.
  const blobTreeMatch = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/(.+?)\/([^/].*\.[^/]+)$/,
  )
  if (blobTreeMatch) {
    const [, owner, repo, branch, path] = blobTreeMatch
    return {
      type: 'github',
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
      displayUrl: url,
      persistedSource: url,
    }
  }

  // Short GitHub URL without blob/tree: https://github.com/owner/repo/path
  const githubMatch = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(.+)$/,
  )
  if (githubMatch) {
    const [, owner, repo, path] = githubMatch
    return {
      type: 'github',
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`,
      displayUrl: url,
      persistedSource: url,
      inferredBranch: true,
    }
  }

  // raw.githubusercontent.com or any other URL: use directly.
  return {
    type: 'raw',
    rawUrl: url,
    displayUrl: url,
    persistedSource: url,
  }
}

/**
 * Load file content from a local path or remote URL.
 * GitHub shortcut URLs try main first and then fall back to master.
 */
export async function fetchContent(source: ParsedSource): Promise<string> {
  if (source.type === 'file') {
    return readFile(source.filePath!, 'utf-8')
  }

  if (!source.rawUrl) {
    throw new Error('Missing remote source URL')
  }

  const response = await fetch(source.rawUrl)

  // Only inferred main branches fall back to master on a failed request.
  if (!response.ok && source.inferredBranch) {
    const masterUrl = source.rawUrl.replace('/main/', '/master/')
    const retryResponse = await fetch(masterUrl)
    if (retryResponse.ok) {
      return retryResponse.text()
    }
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch file: ${response.status} ${response.statusText}\n  URL: ${source.rawUrl}`,
    )
  }

  return response.text()
}
