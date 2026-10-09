

# 🎯 Agent Instructions (CLAUDE.md)

## Purpose
This file defines **role-based agents** for the ReRoomAI project. Agents are specialized AI personas with unique goals, tools, and workflows. Developers and tools can invoke agents to perform specific tasks without rewriting the instructions.

## 📖 Agent Directory

### 1. ✨ Product Manager Agent (`product-manager.md`)
**Role:** Defines product vision, features, and user experience.
**Triggers:** Product strategy, feature brainstorming, user stories.
**Best for:** High-level planning and product definition.

### 2. ✏️ Product Content Writer Agent (`content-writer.md`)
**Role:** Writes marketing copy, product descriptions, and content.
**Triggers:** Website copy, taglines, promotional materials.
**Best for:** Creating marketing content.

### 3. 👨‍💻 Technical Writer Agent (`technical-writer.md`)
**Role:** Creates documentation, API references, and technical content.
**Triggers:** Technical documentation, READMEs, tutorials.
**Best for:** Technical documentation.

### 4. 🔧 Lead Developer Agent (`lead-developer.md`)
**Role:** Architects the system, makes technical decisions, oversees implementation.
**Triggers:** Architecture, technical design, implementation strategy.
**Best for:** Technical leadership and architecture.

### 5. ⚛️ React Developer Agent (`react-developer.md`)
**Role:** Builds React components and frontend features.
**Triggers:** UI development, component implementation, React code.
**Best for:** Frontend development.

### 6. 🤖 Backend Developer Agent (`backend-developer.md`)
**Role:** Implements backend logic, APIs, and server-side code.
**Triggers:** Backend development, API implementation, server logic.
**Best for:** Backend development.

### 7. 🎨 UI/UX Designer Agent (`ui-ux-designer.md`)
**Role:** Designs interfaces, wireframes, and user experiences.
**Triggers:** UI design, wireframes, UX flows.
**Best for:** UI/UX design tasks.

### 8. 🛠️ Frontend Maintenance Developer Agent (`frontend-maintenance-developer.md`)
**Role:** Fixes frontend bugs, refactors code, and maintains UI code.
**Triggers:** Frontend bugs, code maintenance, UI improvements.
**Best for:** Frontend maintenance tasks.

### 9. 🔧 Backend Maintenance Developer Agent (`backend-maintenance-developer.md`)
**Role:** Fixes backend bugs, refactors server code, and maintains APIs.
**Triggers:** Backend bugs, API issues, server code maintenance.
**Best for:** Backend maintenance tasks.

### 10. 🚀 QA/Tester Agent (`qa-tester.md`)
**Role:** Tests functionality, identifies bugs, ensures quality.
**Triggers:** Testing, quality assurance, bug verification.
**Best for:** QA tasks.

### 11. 📂 File Management Agent (`file-manager.md`)
**Role:** Manages files, creates directories, handles file operations.
**Triggers:** File operations, directory creation, file management.
**Best for:** File system operations.

## 🚀 How to Use Agents

### Method 1: Direct Invocation (Command Line)
```bash
# Invoke Lead Developer Agent
claude -p product-manager.md

# Invoke React Developer Agent with a task
claude -p react-developer.md "Create a login component"

# Invoke multiple agents sequentially
claude -p lead-developer.md "Design system architecture" | \
claude -p react-developer.md "Implement design system components"
```

### Method 2: Using Agent Pipeline

**Linear Pipeline:**
```bash
# Process multiple agents in sequence
claude -p agents/lead-developer.md | \
claude -p agents/react-developer.md | \
claude -p agents/backend-developer.md
```

**Parallel Pipeline (GNU Parallel):**
```bash
# Run multiple agents in parallel
parallel -j 3 claude -p {} ::: \
  agents/lead-developer.md \
  agents/react-developer.md \
  agents/backend-developer.md
```

### Method 3: Multi-Agent Workflow
```bash
# Define a multi-agent workflow
workflows:
  - name: FeatureDevelopment
    agents:
      - lead-developer
      - react-developer
      - backend-developer
    order: sequential
    error_handling:
      continue_on_error: true

# Run the workflow
claude workflow run FeatureDevelopment "Implement user authentication"
```

### Method 4: Agent Communication
Agents can communicate through:
1. **Piped output:** Output of one agent becomes input to the next
2. **Shared files:** Agents read/write to shared files in the project
3. **Direct references:** Reference other agent files in agent instructions

## 🔧 Writing a New Agent

To create a new agent:

1. **Create a new file** in the agents directory:
   ```bash
   touch agents/new-agent.md
   ```

2. **Add agent instructions** to the file:
   ```markdown
   # Role
   Describe the agent's responsibilities and expertise.

   # Tools
   List available tools and when to use them.

   # Workflow
   Describe the step-by-step process for this agent.

   # Output Format
   Specify how the agent should format its output.

   # Best Practices
   Any specific guidelines or recommendations.
   ```

3. **Add examples** of how to invoke the agent:
   ```markdown
   ## Examples

   ```bash
   claude -p agents/new-agent.md "Task description"
   ```
   ```

4. **Add to agent directory** (optional, for easier discovery):
   ```markdown
   # Agent Directory

   ## 11. New Agent (`new-agent.md`)
   **Role:** [Brief description]
   **Triggers:** [Triggers]
   **Best for:** [Use cases]
   ```

## 📁 Agent Directory Structure

```
agents/
├── product-manager.md
├── content-writer.md
├── technical-writer.md
├── lead-developer.md
├── react-developer.md
├── backend-developer.md
├── ui-ux-designer.md
├── frontend-maintenance-developer.md
├── backend-maintenance-developer.md
├── qa-tester.md
├── file-manager.md
└── workflows.yaml
```

## 🔄 Workflow Automation

You can create automated workflows that chain multiple agents together:

**Example: `feature-development.yaml`**
```yaml
name: Feature Development
description: Complete feature development workflow with multiple agents
trigger: manual

steps:
  - agent: lead-developer
    task: "Architect the feature"
    output: architecture.md

  - agent: react-developer
    task: "Implement frontend components based on architecture"
    requires: architecture.md
    output: ui-components/

  - agent: backend-developer
    task: "Implement backend APIs and logic"
    requires: architecture.md
    output: backend-api/

  - agent: qa-tester
    task: "Test the feature"
    requires: [ui-components/, backend-api/]
    output: test-report.md

error_handling:
  continue_on_error: true
  report_error: true
```

**Run workflow:**
```bash
claude workflow run feature-development
```

## 🤝 Agent Collaboration

Agents can collaborate effectively by:

### Method 1: Sequential Processing
```bash
# Product Manager defines requirements → Lead Developer architects → Developers implement
claude -p product-manager.md | \
claude -p lead-developer.md | \
claude -p react-developer.md
```

### Method 2: Shared Files
1. Agent A writes to a file
2. Agent B reads from that file
3. Agent B writes to another file
4. Agent C reads from both files

**Example:**
```bash
# Product Manager writes specs
claude -p product-manager.md "Define user authentication flow" > docs/flow.
