import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { APP_PATHS } from '../app.routes.paths';
import { JiraBoard, JiraIssue, JiraSprint } from '../models/jira.models';
import { AuthService } from '../services/auth.service';
import { JiraService } from '../services/jira.service';

export type ColId =
  | 'type'
  | 'work'
  | 'sprint'
  | 'assignee'
  | 'reporter'
  | 'priority'
  | 'status'
  | 'resolution'
  | 'pts'
  | 'created'
  | 'updated'
  | 'space';

export const ALL_COLUMNS: { id: ColId; label: string; sortKey?: string }[] = [
  { id: 'type', label: 'Type' },
  { id: 'work', label: 'Work', sortKey: 'key' },
  { id: 'sprint', label: 'Sprint', sortKey: 'sprint' },
  { id: 'assignee', label: 'Assignee', sortKey: 'assignee' },
  { id: 'reporter', label: 'Reporter', sortKey: 'reporter' },
  { id: 'priority', label: 'Priority', sortKey: 'priority' },
  { id: 'status', label: 'Status', sortKey: 'status' },
  { id: 'resolution', label: 'Resolution', sortKey: 'resolution' },
  { id: 'pts', label: 'Pts', sortKey: 'pts' },
  { id: 'created', label: 'Created', sortKey: 'created' },
  { id: 'updated', label: 'Updated', sortKey: 'updated' },
  { id: 'space', label: 'Space', sortKey: 'space' },
];

const DEFAULT_VISIBLE = new Set<ColId>([
  'type', 'work', 'sprint', 'assignee', 'priority', 'status', 'pts', 'created', 'space',
]);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private jira = inject(JiraService);
  private router = inject(Router);

  readonly columns = ALL_COLUMNS;

  loading = signal(true);
  error = signal<string | null>(null);
  issues = signal<JiraIssue[]>([]);
  sprints = signal<JiraSprint[]>([]);

  // Filters (multi-select Sets)
  searchQuery = signal('');
  filterSprints = signal(new Set<string>());
  filterPriorities = signal(new Set<string>());
  filterStatuses = signal(new Set<string>());
  filterIssueTypes = signal(new Set<string>());

  // Filter menu open states
  showSprintMenu = signal(false);
  showTypeMenu = signal(false);
  showPriorityMenu = signal(false);
  showStatusMenu = signal(false);

  // Sort
  sortCol = signal('');
  sortDir = signal<'asc' | 'desc'>('asc');

  // Column visibility
  visibleColumns = signal<Set<ColId>>(new Set(DEFAULT_VISIBLE));
  showColumnsMenu = signal(false);

  // Dropdown options
  uniquePriorities = computed(() =>
    [...new Set(this.issues().map((i) => i.fields.priority?.name).filter(Boolean))] as string[],
  );
  uniqueStatuses = computed(() => [...new Set(this.issues().map((i) => i.fields.status.name))]);
  uniqueIssueTypes = computed(() => [...new Set(this.issues().map((i) => i.fields.issuetype.name))]);

  filteredIssues = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sps = this.filterSprints();
    const prs = this.filterPriorities();
    const sts = this.filterStatuses();
    const its = this.filterIssueTypes();
    const col = this.sortCol();
    const dir = this.sortDir();

    let list = this.issues();

    if (q) {
      list = list.filter(
        (i) =>
          i.key.toLowerCase().includes(q) ||
          i.fields.summary.toLowerCase().includes(q) ||
          (i.fields.assignee?.displayName.toLowerCase().includes(q) ?? false) ||
          i.fields.project.name.toLowerCase().includes(q),
      );
    }
    if (sps.size) list = list.filter((i) => sps.has(i.fields.customfield_10020?.name ?? ''));
    if (prs.size) list = list.filter((i) => prs.has(i.fields.priority?.name ?? ''));
    if (sts.size) list = list.filter((i) => sts.has(i.fields.status.name));
    if (its.size) list = list.filter((i) => its.has(i.fields.issuetype.name));

    if (col) {
      list = [...list].sort((a, b) => {
        let va: string | number = '';
        let vb: string | number = '';
        switch (col) {
          case 'key':        va = a.key;                                   vb = b.key;                                   break;
          case 'sprint':     va = a.fields.customfield_10020?.name ?? '';  vb = b.fields.customfield_10020?.name ?? '';  break;
          case 'assignee':   va = a.fields.assignee?.displayName ?? '';    vb = b.fields.assignee?.displayName ?? '';    break;
          case 'reporter':   va = a.fields.reporter?.displayName ?? '';    vb = b.fields.reporter?.displayName ?? '';    break;
          case 'priority':   va = a.fields.priority?.name ?? '';           vb = b.fields.priority?.name ?? '';           break;
          case 'status':     va = a.fields.status.name;                    vb = b.fields.status.name;                    break;
          case 'resolution': va = a.fields.resolution?.name ?? '';         vb = b.fields.resolution?.name ?? '';         break;
          case 'pts':        va = a.fields.customfield_10016 ?? -1;        vb = b.fields.customfield_10016 ?? -1;        break;
          case 'created':    va = a.fields.created;                        vb = b.fields.created;                        break;
          case 'updated':    va = a.fields.updated;                        vb = b.fields.updated;                        break;
          case 'space':      va = a.fields.project.name;                   vb = b.fields.project.name;                   break;
        }
        const cmp = typeof va === 'number'
          ? va - (vb as number)
          : (va as string).localeCompare(vb as string);
        return dir === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  });

  hasActiveFilters = computed(
    () =>
      !!this.searchQuery() ||
      this.filterSprints().size > 0 ||
      this.filterPriorities().size > 0 ||
      this.filterStatuses().size > 0 ||
      this.filterIssueTypes().size > 0,
  );

  ngOnInit(): void {
    void this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      const boardsRes = await this.jira.getBoards();
      const boards: JiraBoard[] = boardsRes.values;

      const sprintsPerBoard = await Promise.all(
        boards.map((b) =>
          this.jira.getActiveSprintsForBoard(b.id).catch(() => ({ values: [], isLast: true })),
        ),
      );

      const allSprints = sprintsPerBoard.flatMap((r) => r.values);
      this.sprints.set(allSprints);

      const issuesPerSprint = await Promise.all(
        allSprints.map((s) =>
          this.jira.getIssuesForSprint(s.id).catch(() => ({ issues: [], total: 0 })),
        ),
      );

      const seen = new Set<string>();
      const allIssues: JiraIssue[] = [];
      for (const res of issuesPerSprint) {
        for (const issue of res.issues) {
          if (!seen.has(issue.id)) {
            seen.add(issue.id);
            allIssues.push(issue);
          }
        }
      }
      this.issues.set(allIssues);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load Jira data.');
    } finally {
      this.loading.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate([APP_PATHS.LOGIN]);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterSprints.set(new Set());
    this.filterPriorities.set(new Set());
    this.filterStatuses.set(new Set());
    this.filterIssueTypes.set(new Set());
  }

  filterLabel(sig: WritableSignal<Set<string>>, label: string): string {
    const s = sig();
    if (s.size === 0) return label;
    if (s.size === 1) return [...s][0];
    return `${label} (${s.size})`;
  }

  toggleFilter(sig: WritableSignal<Set<string>>, value: string): void {
    const next = new Set(sig());
    next.has(value) ? next.delete(value) : next.add(value);
    sig.set(next);
  }

  toggleSort(key: string): void {
    if (this.sortCol() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortCol.set(key);
      this.sortDir.set('asc');
    }
  }

  sortIcon(key: string): string {
    if (this.sortCol() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  isColVisible(col: ColId): boolean {
    return this.visibleColumns().has(col);
  }

  toggleCol(col: ColId): void {
    const next = new Set(this.visibleColumns());
    next.has(col) ? next.delete(col) : next.add(col);
    this.visibleColumns.set(next);
  }

  statusClass(colorName: string): string {
    switch (colorName) {
      case 'green':     return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'yellow':    return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'blue-grey': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default:          return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  }
}
