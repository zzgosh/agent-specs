# agent-specs

English README: [README.md](../README.md)

统一管理 `AGENTS.md` 的 CLI 工具。

它可以从远程 URL 或本地文件读取 `AGENTS.md`，支持项目级安装或全局安装。全局安装时会自动检测本机已安装的 AI agent 客户端，并通过 symlink 将同一份规则文件映射到各客户端的原生路径，实现一份规则文件在多个 agent 间复用；也可以显式指定安装到某个 agent。

文档中的演示资源使用 Vercel 的公开仓库 [agent-skills/AGENTS.md](https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md)。灵感来自 [Vercel Skills CLI](https://github.com/vercel-labs/skills)。

## 安装

```bash
# 直接使用（推荐）
npx agent-specs <command>

# 或全局安装
npm install -g agent-specs
```

## 快速开始

```bash
# 项目级：下载 AGENTS.md 到当前目录
agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md

# 复用当前项目已有的 AGENTS.md，并链接到项目内的 Claude Code 路径
agent-specs add ./AGENTS.md -a claude-code

# 全局级：下载到 ~/.agents/ 并 symlink 到已检测到的 agent 客户端
agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md -g
```

## 命令

### `agent-specs add <source>`

从远程 URL 或本地文件安装 `AGENTS.md`。

```bash
# 项目级安装（默认）
agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md

# 项目级定向安装：让 ./AGENTS.md 成为 truth source，并 symlink 到指定 agent 的项目路径
agent-specs add ./AGENTS.md -a claude-code

# 从其他本地文件导入到当前项目，再 symlink 到指定 agent
agent-specs add ./docs/shared-rules.md -a claude-code

# 全局安装：写入 ~/.agents/AGENTS.md，并 symlink 到各 agent
agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md -g

# 全局安装到指定 agent
agent-specs add ./AGENTS.md -g -a claude-code

# 跳过确认提示（已有文件时自动备份并覆盖）
agent-specs add https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md -g -y
```

支持的 source 格式：

| 格式 | 示例 |
|------|------|
| GitHub blob URL | `https://github.com/vercel-labs/agent-skills/blob/main/AGENTS.md` |
| GitHub 简化 URL | `https://github.com/vercel-labs/agent-skills/AGENTS.md` |
| Raw URL | `https://raw.githubusercontent.com/vercel-labs/agent-skills/main/AGENTS.md` |
| 任意 URL | `https://example.com/path/to/AGENTS.md` |
| 相对本地路径 | `./AGENTS.md` |
| 绝对本地路径 | `/path/to/AGENTS.md` |
| File URL | `file:///path/to/AGENTS.md` |

选项：

| 选项 | 说明 |
|------|------|
| `-g, --global` | 全局安装，并 symlink 到各 agent 客户端 |
| `-a, --agent <name>` | 定向安装到指定 agent，而不是依赖自动检测 |
| `-y, --yes` | 跳过确认，自动备份并覆盖已有文件 |

### `agent-specs update`

从原始来源重新读取并更新 `AGENTS.md`。

```bash
agent-specs update
agent-specs update -g
```

### `agent-specs list`

查看当前安装状态和 symlink 情况。

```bash
agent-specs list
agent-specs list -g
```

### `agent-specs link`

重新检测 agent 客户端并创建 symlink，适用于安装了新 agent 后需要补建链接的场景。通过 `-a` 显式配置过的全局 agent 也会被保留。

```bash
agent-specs link
agent-specs link -y
```

### `agent-specs remove`

移除已安装的 `AGENTS.md` 及相关 symlink。

```bash
agent-specs remove
agent-specs remove -g
agent-specs remove -g -y
```

- 如果安装时复用了一个已经存在的 `AGENTS.md` 作为 truth source，`remove` 会保留该文件，只移除 symlink 和 CLI 元数据。

## 全局安装工作原理

```text
~/.agents/AGENTS.md          <- truth source
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

- 修改 `~/.agents/AGENTS.md` 后，已链接的 agent 会立即读取到新内容。
- 执行 `agent-specs update -g` 后，所有 symlink 目标会同步到最新内容，无需重新链接。

## 项目级定向安装工作原理

```text
./AGENTS.md                <- truth source
    ^ symlink
    `-- ./.claude/CLAUDE.md
```

- 项目模式下使用 `-a <agent>` 时，`./AGENTS.md` 会作为 truth source。
- 如果 `<source>` 是其他本地文件或远程 URL，CLI 会先把内容写入 `./AGENTS.md`，再把指定 agent 的项目路径 symlink 到它。
- 如果 `<source>` 本身就是 `./AGENTS.md`，CLI 会直接复用该文件，且 `remove` 不会删除它。

## 支持的 Agent 客户端

| Agent | 检测目录 | Symlink 目标 | 文件名 |
|-------|---------|-------------|--------|
| Claude Code | `~/.claude/` | `~/.claude/CLAUDE.md` | `CLAUDE.md` |
| Gemini CLI | `~/.gemini/` | `~/.gemini/GEMINI.md` | `GEMINI.md` |
| Codex (OpenAI) | `~/.codex/` | `~/.codex/AGENTS.md` | `AGENTS.md` |
| Amp | `~/.config/amp/` | `~/.config/amp/AGENTS.md` | `AGENTS.md` |
| OpenCode | `~/.config/opencode/` | `~/.config/opencode/AGENTS.md` | `AGENTS.md` |
| Qwen Code | `~/.qwen/` | `~/.qwen/QWEN.md` | `QWEN.md` |
| Roo Code | `~/.roo/` | `~/.roo/rules/AGENTS.md` | `AGENTS.md` |
| Continue | `~/.continue/` | `~/.continue/rules/AGENTS.md` | `AGENTS.md` |
| Augment | `~/.augment/` | `~/.augment/rules/AGENTS.md` | `AGENTS.md` |
| Kiro | `~/.kiro/` | `~/.kiro/steering/AGENTS.md` | `AGENTS.md` |

CLI 只会为检测到已安装的 agent 创建 symlink。
如果显式传入 `-a, --agent <name>`，CLI 会直接为该 agent 建立链接。

## 冲突处理

| 场景 | 默认行为 | `-y` 行为 |
|------|---------|----------|
| truth source 已存在 | 提示确认 | 备份为 `.backup` 后覆盖 |
| agent 路径是 symlink | 直接替换 | 直接替换 |
| agent 路径是普通文件 | 跳过并提示 | 备份为 `.backup` 后替换 |

## Directory Structure

```text
agent-specs/
|-- .github/
|   `-- workflows/
|       |-- ci.yml          # PR 与 main 分支构建检查
|       `-- release.yml     # 手动触发 npm 发布、tag 与 GitHub Release
|-- bin/
|   `-- cli.mjs              # CLI 入口
|-- docs/
|   `-- README.zh-CN.md      # 中文文档
|-- src/
|   |-- commands/
|   |   |-- add.ts           # 安装命令
|   |   |-- link.ts          # 重建 symlink
|   |   |-- list.ts          # 查看安装状态
|   |   |-- remove.ts        # 移除安装与链接
|   |   `-- update.ts        # 从来源重新拉取
|   |-- agents.ts            # Agent 检测与配置
|   |-- cli.ts               # Commander 命令注册
|   |-- config.ts            # 配置文件读写
|   |-- linker.ts            # Symlink 创建 / 替换 / 备份
|   |-- prompt.ts            # 终端确认提示
|   |-- source.ts            # URL 解析与内容获取
|   `-- types.ts             # 类型定义
|-- build.config.mjs         # unbuild 配置
|-- LICENSE                  # MIT 许可
|-- package-lock.json        # npm lockfile
|-- package.json             # 包元数据
|-- README.md                # English documentation
`-- tsconfig.json
```

## 开发

```bash
npm install
npm run build
npx tsx src/cli.ts --help
node bin/cli.mjs --help
```

## License

[MIT](./LICENSE)
