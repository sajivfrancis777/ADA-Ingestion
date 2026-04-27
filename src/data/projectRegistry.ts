/**
 * Project registry — defines available projects for the ADA Editor.
 *
 * Each project has its own towers, releases, and display metadata.
 * Adding a new project: add an entry here and its tower/capability data.
 */

export interface ProjectInfo {
  id: string;
  name: string;
  subtitle: string;
  docsUrl: string;
  towers: string[];
  releases: string[];
  theme?: {
    primary?: string;
    accent?: string;
    icon?: string;
  };
}

export const PROJECTS: ProjectInfo[] = [
  {
    id: 'iao',
    name: 'IAO Architecture',
    subtitle: 'IDM 2.0 Capability Data Editor',
    docsUrl: 'https://sajivfrancis777.github.io/ADA-Artifacts/',
    towers: ['FPR', 'OTC-IF', 'OTC-IP', 'FTS-IF', 'FTS-IP', 'PTP', 'MDM', 'E2E'],
    releases: ['R1', 'R2', 'R3', 'R4', 'R5'],
    theme: { primary: '#00285a', accent: '#0071c5', icon: '🏗️' },
  },
  // To add a second project, uncomment and customize:
  // {
  //   id: 'sample-project',
  //   name: 'Sample Project',
  //   subtitle: 'Demonstrates multi-project scalability',
  //   docsUrl: 'https://sajivfrancis777.github.io/ADA-Artifacts/projects.html',
  //   towers: ['Finance', 'Supply-Chain', 'HR'],
  //   releases: ['Phase1', 'Phase2'],
  //   theme: { primary: '#1a3c5e', accent: '#2196f3', icon: '🔮' },
  // },
];

export const DEFAULT_PROJECT_ID = 'iao';

export function getProject(id: string): ProjectInfo | undefined {
  return PROJECTS.find(p => p.id === id);
}

export function getDefaultProject(): ProjectInfo {
  return PROJECTS.find(p => p.id === DEFAULT_PROJECT_ID) ?? PROJECTS[0];
}
