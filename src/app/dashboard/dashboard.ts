import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { APP_PATHS } from '../app.routes.paths';
import { JiraIssue, JiraSprint } from '../models/jira.models';
import { AuthService } from '../services/auth.service';
import { JiraService } from '../services/jira.service';

type ColId =
  | 'type'
  | 'key'
  | 'summary'
  | 'sprint'
  | 'assignee'
  | 'reporter'
  | 'priority'
  | 'status'
  | 'resolution'
  | 'pts'
  | 'time'
  | 'created'
  | 'updated'
  | 'space';

const ALL_COLUMNS: { id: ColId; label: string; sortKey?: string }[] = [
  { id: 'type', label: 'Type' },
  { id: 'key', label: 'Key', sortKey: 'key' },
  { id: 'summary', label: 'Summary', sortKey: 'summary' },
  { id: 'sprint', label: 'Sprint', sortKey: 'sprint' },
  { id: 'assignee', label: 'Assignee', sortKey: 'assignee' },
  { id: 'reporter', label: 'Reporter', sortKey: 'reporter' },
  { id: 'priority', label: 'Priority', sortKey: 'priority' },
  { id: 'status', label: 'Status', sortKey: 'status' },
  { id: 'resolution', label: 'Resolution', sortKey: 'resolution' },
  { id: 'pts', label: 'User Point', sortKey: 'pts' },
  { id: 'time', label: 'Time', sortKey: 'time' },
  { id: 'created', label: 'Created', sortKey: 'created' },
  { id: 'updated', label: 'Updated', sortKey: 'updated' },
  { id: 'space', label: 'Space', sortKey: 'space' },
];

const DEFAULT_VISIBLE = new Set<ColId>([
  'type', 'key', 'summary', 'sprint', 'priority', 'status', 'pts', 'time', 'created', 'space',
]);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, FormsModule],
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

  // Which dropdown menu is currently open (null = all closed)
  openMenu = signal<'sprint' | 'type' | 'priority' | 'status' | 'columns' | null>(null);

  // View mode
  viewMode = signal<'list' | 'kanban'>('list');

  // Sort
  sortCol = signal<string | null>(null);
  sortDir = signal<'asc' | 'desc'>('asc');

  // Expanded subtasks
  expandedIssues = signal(new Set<string>());

  // Column visibility
  visibleColumns = signal<Set<ColId>>(new Set(DEFAULT_VISIBLE));

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
          case 'summary':    va = a.fields.summary;                        vb = b.fields.summary;                        break;
          case 'sprint':     va = a.fields.customfield_10020?.name ?? '';  vb = b.fields.customfield_10020?.name ?? '';  break;
          case 'assignee':   va = a.fields.assignee?.displayName ?? '';    vb = b.fields.assignee?.displayName ?? '';    break;
          case 'reporter':   va = a.fields.reporter?.displayName ?? '';    vb = b.fields.reporter?.displayName ?? '';    break;
          case 'priority':   va = a.fields.priority?.name ?? '';           vb = b.fields.priority?.name ?? '';           break;
          case 'status':     va = a.fields.status.name;                    vb = b.fields.status.name;                    break;
          case 'resolution': va = a.fields.resolution?.name ?? '';         vb = b.fields.resolution?.name ?? '';         break;
          case 'pts':        va = a.fields.customfield_10016 ?? -1;        vb = b.fields.customfield_10016 ?? -1;        break;
          case 'created':    va = a.fields.created;                        vb = b.fields.created;                        break;
          case 'time':       va = a.fields.timetracking?.timeSpentSeconds ?? -1; vb = b.fields.timetracking?.timeSpentSeconds ?? -1; break;
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

  kanbanColumns = computed(() => {
    const issues = this.filteredIssues();
    const grouped = new Map<string, { colorName: string; issues: JiraIssue[] }>();
    for (const issue of issues) {
      const status = issue.fields.status.name;
      const colorName = issue.fields.status.statusCategory.colorName;
      let col = grouped.get(status);
      if (!col) {
        col = { colorName, issues: [] };
        grouped.set(status, col);
      }
      col.issues.push(issue);
    }
    return [...grouped.entries()].map(([name, { colorName, issues: items }]) => ({
      name,
      colorName,
      issues: items,
    }));
  });

  hasSubtasks = computed(() => this.filteredIssues().some((i) => (i.fields.subtasks?.length ?? 0) > 0));

  allExpanded = computed(() => {
    const expanded = this.expandedIssues();
    return this.filteredIssues()
      .filter((i) => (i.fields.subtasks?.length ?? 0) > 0)
      .every((i) => expanded.has(i.id));
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
      const res = await this.jira.getMyRecentIssues();
      this.issues.set(res.issues);

      // Derive sprints from fetched issues
      const sprintMap = new Map<number, JiraSprint>();
      for (const issue of res.issues) {
        const sprint = issue.fields.customfield_10020;
        if (sprint && !sprintMap.has(sprint.id)) {
          sprintMap.set(sprint.id, { id: sprint.id, name: sprint.name, state: 'active' });
        }
      }
      this.sprints.set([...sprintMap.values()]);
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

  toggleMenu(menu: 'sprint' | 'type' | 'priority' | 'status' | 'columns'): void {
    this.openMenu.update((v) => (v === menu ? null : menu));
  }

  closeMenu(): void {
    this.openMenu.set(null);
  }

  // Time log modal
  logIssue = signal<JiraIssue | null>(null);
  logTimeValue = signal('');
  logSaving = signal(false);

  toggleExpand(issueId: string): void {
    const next = new Set(this.expandedIssues());
    next.has(issueId) ? next.delete(issueId) : next.add(issueId);
    this.expandedIssues.set(next);
  }

  toggleExpandAll(): void {
    if (this.allExpanded()) {
      this.expandedIssues.set(new Set());
    } else {
      const all = new Set(
        this.filteredIssues()
          .filter((i) => (i.fields.subtasks?.length ?? 0) > 0)
          .map((i) => i.id),
      );
      this.expandedIssues.set(all);
    }
  }

  openLogTime(issue: JiraIssue): void {
    this.logIssue.set(issue);
    this.logTimeValue.set('');
  }

  closeLogTime(): void {
    this.logIssue.set(null);
    this.logTimeValue.set('');
  }

  async submitLogTime(): Promise<void> {
    const issue = this.logIssue();
    const time = this.logTimeValue().trim();
    if (!issue || !time) return;
    this.logSaving.set(true);
    try {
      await this.jira.logWork(issue.key, time);
      this.closeLogTime();
      void this.loadData();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to log time.');
    } finally {
      this.logSaving.set(false);
    }
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
