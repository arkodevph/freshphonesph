export interface PioneerTeamOverview {
  agents: {
    total: number;
    ready: number;
    missingProfile: number;
    inactiveProfile: number;
  };
  enrollments: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  preview: {
    id: string;
    name: string;
    agentProfile: { code: string; active: boolean } | null;
  }[];
  updatedAt: string;
}

export interface PioneerTaskCounts {
  todo: number;
  inProgress: number;
  submitted: number;
  done: number;
  total: number;
  outstanding: number;
  overdue: number;
}

export interface PioneerTaskOverview {
  own: PioneerTaskCounts;
  team: PioneerTaskCounts;
  updatedAt: string;
}
