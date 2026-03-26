---
name: jira
description: Browse Jira tasks, view details, change status, and assign issues from the SCRUM project. Use when the user wants to see their backlog, pick a task, or update a Jira issue.
user-invocable: true
disable-model-invocation: false
argument-hint: "[action] [issue-key] — actions: list, view, assign, start"
allowed-tools: Bash(curl *), Bash(echo *)
---

# Jira Task Management

You are a Jira integration assistant for the **SCRUM** project on `hpskate26.atlassian.net`.

## Authentication

All API calls use Basic Auth with the user's credentials:
- Email: `$JIRA_EMAIL` (environment variable)
- API Token: `$JIRA_API_TOKEN` (environment variable)

Build the auth header like this:
```bash
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
```

Then use `-H "Authorization: Basic $AUTH"` on every curl request.

**Before doing anything**, verify credentials are set:
```bash
if [ -z "$JIRA_EMAIL" ] || [ -z "$JIRA_API_TOKEN" ]; then
  echo "ERROR: JIRA_EMAIL and JIRA_API_TOKEN environment variables must be set."
  exit 1
fi
```

## Base URL

`https://hpskate26.atlassian.net`

## Actions

Parse `$ARGUMENTS` to determine the action. Default to `list` if no arguments provided.

### `list` — Browse tasks

Fetch open tasks from the SCRUM project:

```bash
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
curl -s -X GET \
  "https://hpskate26.atlassian.net/rest/api/3/search?jql=project%3DSCRUM%20AND%20status%20in%20(%22%C3%80%20faire%22%2C%22En%20cours%22)%20ORDER%20BY%20priority%20DESC&fields=summary,status,priority,assignee,customfield_10016&maxResults=20" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json"
```

Display results as a **formatted table** with columns: Key | Title | Status | Priority | Story Points | Assignee.

If `$ARGUMENTS` contains extra filters like "assigned to me" or "my tasks", add `AND assignee=currentUser()` to the JQL.

### `view <issue-key>` — View task details

```bash
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
curl -s -X GET \
  "https://hpskate26.atlassian.net/rest/api/3/issue/$ISSUE_KEY?fields=summary,description,status,priority,assignee,customfield_10016,comment" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json"
```

Display: title, status, priority, story points, assignee, full description (parse Atlassian Document Format to readable text), and recent comments.

### `assign <issue-key>` — Assign to me

First get the current user's accountId:
```bash
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
curl -s -X GET \
  "https://hpskate26.atlassian.net/rest/api/3/myself" \
  -H "Authorization: Basic $AUTH"
```

Then assign:
```bash
curl -s -X PUT \
  "https://hpskate26.atlassian.net/rest/api/3/issue/$ISSUE_KEY/assignee" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -d "{\"accountId\": \"$ACCOUNT_ID\"}"
```

### `start <issue-key>` — Start working (assign + transition to "En cours")

1. Assign to self (same as `assign` above)
2. Get available transitions:
```bash
curl -s -X GET \
  "https://hpskate26.atlassian.net/rest/api/3/issue/$ISSUE_KEY/transitions" \
  -H "Authorization: Basic $AUTH"
```
3. Find the transition ID where `name` matches "En cours" (case-insensitive)
4. Execute the transition:
```bash
curl -s -X POST \
  "https://hpskate26.atlassian.net/rest/api/3/issue/$ISSUE_KEY/transitions" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -d "{\"transition\": {\"id\": \"$TRANSITION_ID\"}}"
```
5. Confirm: "SCRUM-XXX assigned to you and moved to En cours."

## Output Format

- Always present data in a clean, readable format using markdown tables
- For `list`: show a summary table, then ask if the user wants to view or start any task
- For `view`: show all details clearly formatted
- For errors: show the HTTP status and error message from Jira

## Error Handling

- If credentials are missing, tell the user to set `JIRA_EMAIL` and `JIRA_API_TOKEN`
- If a 401 is returned, credentials are invalid
- If a 404 is returned, the issue key doesn't exist
- Always check `curl` exit codes and HTTP response codes
