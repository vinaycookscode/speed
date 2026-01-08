# Contributing to Speed (Multi-Agent AI System)

## 🌿 Git Workflow

### Branch Naming Convention

```
<type>/<short-description>

Types:
  feature/   - New features
  fix/       - Bug fixes
  refactor/  - Code refactoring
  docs/      - Documentation only
  test/      - Adding tests
  chore/     - Maintenance tasks
```

**Examples:**
- `feature/llm-integration`
- `feature/meta-agent`
- `fix/agent-memory-leak`
- `refactor/tool-system`

### Branch Strategy

```
main (production)
  └── develop (integration)
        ├── feature/llm-integration
        ├── feature/agent-base-class
        └── feature/tool-system
```

---

## 📝 Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding tests |
| `chore` | Maintenance, dependencies |
| `perf` | Performance improvement |

### Scopes (for this project)

| Scope | Description |
|-------|-------------|
| `llm` | LLM integration layer |
| `agent` | Agent classes |
| `tools` | Tool system |
| `codegen` | Code generation |
| `ui` | User interface |
| `orchestrator` | Sprint/workflow orchestration |

### Examples

```bash
# Feature
feat(agent): add BaseAgent class with LLM integration

# Bug fix
fix(llm): handle Gemini API timeout errors

# Documentation
docs(readme): add installation instructions

# Refactor
refactor(tools): extract common tool interface

# With body
feat(codegen): implement code validator

Adds syntax checking for TypeScript files using the compiler API.
Validates: syntax errors, type errors, and lint rules.

Closes #123
```

---

## 📁 File Header Template

Every TypeScript/JavaScript file must include this header:

```typescript
/**
 * @fileoverview [Brief description of the file]
 * @module [module/path]
 * 
 * @copyright 2026 Speed Team
 * @license MIT
 * 
 * @author [Your Name]
 * @created [Date]
 */
```

---

## 💻 Code Standards

### 1. Naming Conventions

```typescript
// Classes: PascalCase
class MetaAgent { }

// Interfaces: PascalCase with 'I' prefix (optional) or descriptive
interface AgentConfig { }
interface IAgent { }

// Functions: camelCase
function analyzeProject() { }

// Variables: camelCase
const agentCount = 5;

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const DEFAULT_TEMPERATURE = 0.7;

// Private properties: prefix with underscore
private _memory: Memory;

// Files: kebab-case
// agent-factory.ts, meta-agent.ts, llm-client.ts
```

### 2. Documentation

```typescript
/**
 * Creates a new agent with the specified configuration.
 * 
 * @param config - The agent configuration options
 * @param config.role - The role of the agent (e.g., "PM", "Engineer")
 * @param config.tools - Array of tools available to the agent
 * @returns A new Agent instance
 * 
 * @example
 * ```typescript
 * const agent = createAgent({
 *   role: "Product Manager",
 *   tools: [askUserTool, createStoryTool]
 * });
 * ```
 * 
 * @throws {InvalidConfigError} If required config fields are missing
 */
function createAgent(config: AgentConfig): Agent {
  // Implementation
}
```

### 3. Code Organization

```typescript
// 1. File header (copyright, description)
// 2. Imports (external, then internal)
// 3. Constants
// 4. Types/Interfaces
// 5. Main class/function
// 6. Helper functions
// 7. Exports
```

---

## 🏷️ Release Tagging

### Version Format

```
v<major>.<minor>.<patch>

Examples:
  v0.1.0 - Initial development release
  v0.2.0 - New feature added
  v0.2.1 - Bug fix
  v1.0.0 - First stable release
```

### Creating a Release

```bash
# 1. Ensure all tests pass
npm test

# 2. Update version in package.json
npm version minor  # or major, patch

# 3. Create annotated tag
git tag -a v0.1.0 -m "Release v0.1.0: Foundation complete"

# 4. Push with tags
git push origin main --tags
```

### Release Notes Template

```markdown
## v0.1.0 - Foundation (2026-01-15)

### ✨ Features
- LLM integration with Gemini API
- BaseAgent class with tool support
- Message queue for agent communication

### 🐛 Bug Fixes
- Fixed memory leak in agent context

### 📝 Documentation
- Added contributing guidelines
- Updated README with examples

### ⚠️ Breaking Changes
- None
```

---

## 🔄 Pull Request Template

```markdown
## Description
[Describe what this PR does]

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Added comments for complex logic
- [ ] Updated documentation
- [ ] Added tests
- [ ] All tests passing

## Screenshots (if applicable)
[Add screenshots for UI changes]
```

---

## 📂 Project Structure

```
src/
├── lib/                    # Core library code
│   ├── llm/               # LLM integration
│   │   ├── index.ts       # Exports
│   │   ├── types.ts       # Type definitions
│   │   └── gemini.ts      # Gemini client
│   │
│   ├── agents/            # Agent implementations
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── base.ts        # BaseAgent class
│   │   ├── meta/          # Meta-Agent
│   │   ├── pm/            # PM Agent
│   │   └── ...
│   │
│   ├── tools/             # Tool system
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── file.ts
│   │
│   ├── codegen/           # Code generation
│   │   ├── index.ts
│   │   ├── generator.ts
│   │   └── validator.ts
│   │
│   └── orchestrator/      # Sprint orchestration
│       ├── index.ts
│       └── sprint.ts
│
├── store/                 # State management (Zustand)
├── views/                 # React views
├── components/            # React components
└── utils/                 # Utilities
```
