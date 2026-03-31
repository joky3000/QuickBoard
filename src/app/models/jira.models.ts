export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location?: {
    projectId: number;
    projectKey: string;
    projectName: string;
  };
}

export interface JiraBoardsResponse {
  values: JiraBoard[];
  total: number;
  isLast: boolean;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'future' | 'closed';
}

export interface JiraSprintsResponse {
  values: JiraSprint[];
  isLast: boolean;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: { name: string; iconUrl: string };
    assignee: { displayName: string; avatarUrls: { '24x24': string } } | null;
    reporter: { displayName: string; avatarUrls: { '24x24': string } } | null;
    priority: { name: string; iconUrl: string } | null;
    status: { name: string; statusCategory: { colorName: string } };
    resolution: { name: string } | null;
    created: string;
    updated: string;
    project: { key: string; name: string };
    customfield_10016: number | null;
    customfield_10020?: { id: number; name: string } | null;
    subtasks?: JiraSubtask[];
    timetracking?: {
      originalEstimate?: string;
      remainingEstimate?: string;
      timeSpent?: string;
      originalEstimateSeconds?: number;
      remainingEstimateSeconds?: number;
      timeSpentSeconds?: number;
    };
  };
}

export interface JiraSubtask {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: { name: string; iconUrl: string };
    status: { name: string; statusCategory: { colorName: string } };
    priority: { name: string; iconUrl: string } | null;
  };
}

export interface JiraIssuesResponse {
  issues: JiraIssue[];
  total: number;
}
