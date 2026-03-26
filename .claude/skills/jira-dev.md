---
name: jira-dev
description: Full dev workflow for a Jira task — fetches task details, creates a branch, researches the codebase, implements the solution, runs /simplify, and creates a PR. Use after picking a task with /jira.
user-invocable: true
disable-model-invocation: false
argument-hint: "<issue-key> (e.g., SCRUM-123)"
model: claude-opus-4-6
allowed-tools: Bash(curl *), Bash(git *), Bash(gh *), Read, Grep, Glob, Agent, Edit, Write
---

# Jira Development Workflow

You are executing a full development workflow for Jira issue **$ARGUMENTS**.

## Authentication

All Jira API calls use Basic Auth:
```bash
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
```

**Before doing anything**, verify credentials are set:
```bash
if [ -z "$JIRA_EMAIL" ] || [ -z "$JIRA_API_TOKEN" ]; then
  echo "ERROR: JIRA_EMAIL and JIRA_API_TOKEN environment variables must be set."
  exit 1
fi
```

Base URL: `https://hpskate26.atlassian.net`

---

## Workflow — Execute these steps in order

### Step 1: Fetch Task Details

```bash
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
curl -s -X GET \
  "https://hpskate26.atlassian.net/rest/api/3/issue/$ARGUMENTS?fields=summary,description,status,priority,assignee,customfield_10016,comment,subtasks" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json"
```

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
# Ensure we're on main and up to date
git checkout main
git pull origin main

# Create the new branch
BRANCH_NAME="<number>-<slugified-title>"
git checkout -b "$BRANCH_NAME"
```

Example: `SCRUM-548` + "Fix layout in marketing" → `548-fix-layout-in-marketing`

### Step 3: Update Jira Status

Assign to self and transition to "En cours" (if not already):

```bash
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)

# Get current user
MYSELF=$(curl -s "https://hpskate26.atlassian.net/rest/api/3/myself" -H "Authorization: Basic $AUTH")
ACCOUNT_ID=$(echo $MYSELF | python -c "import sys,json; print(json.load(sys.stdin)['accountId'])" 2>/dev/null || echo $MYSELF | grep -o '"accountId":"[^"]*"' | head -1 | cut -d'"' -f4)

# Assign
curl -s -X PUT \
  "https://hpskate26.atlassian.net/rest/api/3/issue/$ARGUMENTS/assignee" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -d "{\"accountId\": \"$ACCOUNT_ID\"}"

# Get transitions and move to "En cours"
TRANSITIONS=$(curl -s "https://hpskate26.atlassian.net/rest/api/3/issue/$ARGUMENTS/transitions" -H "Authorization: Basic $AUTH")
# Find the transition ID for "En cours" and execute it
```

### Step 4: Research the Codebase

Based on the task description, **use Explore agents** to understand the relevant parts of the codebase:

- Identify which files, components, controllers, actions, and models are involved
- Understand the existing patterns and conventions in those areas
- Check for related tests
- Look at recent git history for related changes

**Launch up to 3 Explore agents in parallel** if the task touches multiple areas.

Refer to the project architecture:
- **Backend**: `app/Domains/{Domain}/{Actions,Http/Controllers,Http/Requests,Models}/`
- **Frontend**: `resources/js/features/{featureName}/{api,hooks,components,lib,types}/`
- **Routes**: `routes/web.php`

### Step 5: Ask Clarifying Questions — MANDATORY

**STOP HERE and present your findings to the user.** Show:

1. **Task summary** — What the Jira task is asking for
2. **Affected files** — List of files you identified that need changes
3. **Proposed approach** — Brief description of what you plan to do
4. **Questions** — Any ambiguities or decisions that need user input

**Do NOT proceed to implementation until the user confirms.**

### Step 6: Implement the Solution

After user confirmation:
- Follow the project's DDD architecture (backend) and feature-based architecture (frontend)
- Keep controllers thin — business logic goes in Actions
- Use TanStack Query for data fetching, Zustand for complex client state
- Follow existing naming conventions (PascalCase for PHP, camelCase for features)
- Use `useTranslation()` for any user-facing strings
- Add translations to both `en.json` and `fr.json`

### Step 7: Run /simplify

After implementation is complete, invoke the `/simplify` skill to:
- Review changed code for reuse opportunities
- Check code quality and efficiency
- Fix any issues found

### Step 8: Create Pull Request

Create a PR using GitHub CLI:

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

Transition the issue to "En attente" (awaiting review):

```bash
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
TRANSITIONS=$(curl -s "https://hpskate26.atlassian.net/rest/api/3/issue/$ARGUMENTS/transitions" -H "Authorization: Basic $AUTH")
# Find transition ID for "En attente" and execute it
```

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
- **Translations** — Any new user-facing text needs both `en.json` and `fr.json` entries
- **No mocks in tests** — Use real database connections for integration tests
