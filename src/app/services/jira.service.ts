import { inject, Injectable } from '@angular/core';
import { JiraBoard, JiraBoardsResponse, JiraIssuesResponse, JiraProject, JiraSprintsResponse } from '../models/jira.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class JiraService {
  private auth = inject(AuthService);

  private async fetch<T>(path: string): Promise<T> {
    const creds = this.auth.getCredentials();
    if (!creds) throw new Error('Not authenticated');
    const res = await fetch(`/api/jira${path}`, {
      headers: {
        Authorization: this.auth.getAuthHeader(),
        Accept: 'application/json',
        'X-Jira-Base-URL': creds.baseUrl,
      },
    });
    if (!res.ok) throw new Error(`Jira API error ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async validateCredentials(email: string, apiToken: string, baseUrl: string): Promise<void> {
    const res = await fetch('/api/jira/rest/api/3/myself', {
      headers: {
        Authorization: `Basic ${btoa(`${email}:${apiToken}`)}`,
        Accept: 'application/json',
        'X-Jira-Base-URL': baseUrl,
      },
    });
    if (!res.ok) throw new Error(res.status === 401 ? 'Invalid credentials.' : `Jira returned ${res.status}.`);
  }

  getProjects(): Promise<JiraProject[]> {
    return this.fetch<JiraProject[]>('/rest/api/3/project');
  }

  getBoards(): Promise<JiraBoardsResponse> {
    return this.fetch<JiraBoardsResponse>('/rest/agile/1.0/board');
  }

  getActiveSprintsForBoard(boardId: number): Promise<JiraSprintsResponse> {
    return this.fetch<JiraSprintsResponse>(`/rest/agile/1.0/board/${boardId}/sprint?state=active`);
  }

  getIssuesForSprint(sprintId: number): Promise<JiraIssuesResponse> {
    const fields = [
      'summary', 'issuetype', 'assignee', 'reporter', 'priority',
      'status', 'resolution', 'created', 'updated', 'project',
      'customfield_10016', 'customfield_10020',
    ].join(',');
    return this.fetch<JiraIssuesResponse>(`/rest/agile/1.0/sprint/${sprintId}/issue?fields=${fields}&maxResults=200`);
  }
}
