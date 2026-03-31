---
name: jira-dev
description: Full dev workflow for a Jira task — fetches task details, creates a branch, researches the codebase, implements the solution, runs /simplify, and creates a PR. Uses the Atlassian MCP server.
user-invocable: true
disable-model-invocation: false
argument-hint: "<issue-key> (e.g., SCRUM-123)"
model: claude-opus-4-6
allowed-tools: mcp__atlassian__*, Bash(git *), Bash(gh *), Read, Grep, Glob, Agent, Edit, Write
---

# Jira Development Workflow

You are executing a full development workflow for Jira issue **$ARGUMENTS**, using the **Atlassian MCP server** for all Jira interactions.

---

## Workflow — Execute these steps in order

### Step 1: Fetch Task Details

Use the MCP `jira_get_issue` tool with key `$ARGUMENTS`. Request fields: `summary, description, status, priority, assignee, customfield_10016, comment, subtasks`.

Parse and display:
- **Title** and **Key**
- **Description** (convert Atlassian Document Format to readable text)
- **Acceptance criteria** (if present in description)
- **Priority** and **Story Points**
- **Current status** and **Assignee**
- **Subtasks** (if any)
- **Recent comments** (may contain additional context)

### Step 2: Create Git Branch

Extract the issue number from the key (e.g., `SCRUM-123` → `123`).

Slugify the title:
- Lowercase
- Replace spaces and special characters with hyphens
- Remove consecutive hyphens
- Trim to max 60 characters total (including the number prefix)

Create and checkout the branch:
```bash
git checkout main
git pull origin main
BRANCH_NAME="<number>-<slugified-title>"
git checkout -b "$BRANCH_NAME"
```

Example: `SCRUM-548` + "Fix layout in marketing" → `548-fix-layout-in-marketing`

### Step 3: Update Jira Status

1. Use MCP `jira_get_myself` to get the current user's accountId
2. Use MCP `jira_assign_issue` to assign the issue to self
3. Use MCP `jira_transition_issue` to move to "En cours" (if not already)

### Step 4: Research the Codebase

Based on the task description, **use Explore agents** to understand the relevant parts of the codebase:

- Identify which files, components, controllers, actions, and models are involved
- Understand the existing patterns and conventions in those areas
- Check for related tests
- Look at recent git history for related changes

**Launch up to 3 Explore agents in parallel** if the task touches multiple areas.

### Step 5: Ask Clarifying Questions — MANDATORY

**STOP HERE and present your findings to the user.** Show:

1. **Task summary** — What the Jira task is asking for
2. **Affected files** — List of files you identified that need changes
3. **Proposed approach** — Brief description of what you plan to do
4. **Questions** — Any ambiguities or decisions that need user input

**Do NOT proceed to implementation until the user confirms.**

### Step 6: Implement the Solution

After user confirmation:
- Follow the project's existing architecture and patterns
- Keep it simple — only change what the task requires
- Follow existing naming conventions

### Step 7: Run /simplify

After implementation is complete, invoke the `/simplify` skill to:
- Review changed code for reuse opportunities
- Check code quality and efficiency
- Fix any issues found

### Step 8: Create Pull Request

```bash
gh pr create \
  --title "[SCRUM-$NUMBER] $TASK_TITLE" \
  --body "$(cat <<'EOF'
## Summary
Brief description of changes made.

## Jira Task
[SCRUM-$ARGUMENTS](https://hpskate26.atlassian.net/browse/$ARGUMENTS)

## Changes
- Bullet list of changes

## Test Plan
- [ ] Manual testing steps
- [ ] Relevant tests pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 9: Update Jira to "En attente"

Use MCP `jira_transition_issue` to move to "En attente" (awaiting review).

### Step 10: Final Summary

Present to the user:
- PR link
- Branch name
- Jira issue link (now in "En attente")
- Summary of all changes made
- Remind user to review the PR and merge when ready

---

## Important Notes

- **Always ask before implementing** — Step 5 is mandatory
- **Follow existing patterns** — Don't introduce new patterns or libraries
- **Keep it simple** — Only change what the task requires
- All Jira interactions use the Atlassian MCP server — no curl needed
