/** Agent client configuration. */
export interface AgentConfig {
  /** Internal identifier. */
  name: string
  /** Display name. */
  displayName: string
  /** Directory used to detect whether the client is installed. */
  detectDir: string
  /** Relative file path used by the client inside a project or home directory. */
  relativeFilePath: string
  /** Absolute path to the global rules file expected by the client. */
  globalFilePath: string
  /** Filename expected by the client. */
  fileName: string
}

/** Global config stored at ~/.agents/config.json. */
export interface GlobalConfig {
  version: number
  source: string
  installedAt: string
  updatedAt: string
  linkedAgents: string[]
  managesSourceFile?: boolean
}

/** Project config stored at .agents.json. */
export interface ProjectConfig {
  version: number
  source: string
  installedAt: string
  updatedAt: string
  linkedAgents?: string[]
  managesSourceFile?: boolean
}

/** Parsed source information. */
export interface ParsedSource {
  type: 'github' | 'raw' | 'file'
  displayUrl: string
  persistedSource: string
  rawUrl?: string
  filePath?: string
  /** Whether the branch was inferred; only inferred main falls back to master. */
  inferredBranch?: boolean
}
