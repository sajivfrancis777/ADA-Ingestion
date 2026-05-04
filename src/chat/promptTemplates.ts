/**
 * promptTemplates.ts — Curated architecture prompt templates.
 */

export interface PromptTemplate {
  id: string;
  category: string;
  icon: string;
  title: string;
  prompt: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // ── Architecture Analysis ──
  { id: 'flow-analysis', category: 'Analysis', icon: '🔍',
    title: 'Analyze Flow Chain',
    prompt: 'Analyze the integration flow between {Source System} and {Target System}. What are the key risks, data quality considerations, and recommended interface patterns?' },
  { id: 'system-dependencies', category: 'Analysis', icon: '🕸️',
    title: 'System Dependencies',
    prompt: 'What systems integrate with {System Name}? List all upstream and downstream dependencies with their interface types.' },
  { id: 'data-lineage', category: 'Analysis', icon: '📊',
    title: 'Data Lineage',
    prompt: 'Trace the data lineage for {Data Entity} from source through transformation to target. Include all intermediate systems and transformations.' },

  // ── Design Patterns ──
  { id: 'integration-pattern', category: 'Patterns', icon: '🔗',
    title: 'Integration Pattern',
    prompt: 'Recommend the best integration pattern for connecting {Source System} to {Target System}. Consider volume, frequency ({Frequency}), and data format requirements.' },
  { id: 'migration-strategy', category: 'Patterns', icon: '🚀',
    title: 'Migration Strategy',
    prompt: 'Design a migration strategy for moving from {Legacy System} to {Target System}. Include cutover approach, data migration, and rollback plan.' },
  { id: 'error-handling', category: 'Patterns', icon: '⚡',
    title: 'Error Handling Design',
    prompt: 'Design an error handling and retry strategy for the {Interface/Technology} integration between {Source System} and {Target System}.' },

  // ── Documentation ──
  { id: 'sad-section', category: 'Documentation', icon: '📄',
    title: 'Generate SAD Section',
    prompt: 'Generate a Solution Architecture Document section for capability {Capability ID}. Include application architecture, data architecture, and technology architecture views.' },
  { id: 'decision-record', category: 'Documentation', icon: '📝',
    title: 'Architecture Decision',
    prompt: 'Document an Architecture Decision Record for choosing {Decision}. Include context, alternatives considered, and rationale.' },

  // ── Review & Validation ──
  { id: 'review-flows', category: 'Review', icon: '✅',
    title: 'Review Flow Design',
    prompt: 'Review the current flow design for completeness. Are there missing hops, incorrect interface types, or missing error handling paths?' },
  { id: 'security-review', category: 'Review', icon: '🔒',
    title: 'Security Assessment',
    prompt: 'Assess the security implications of the integration between {Source System} and {Target System}. Consider data classification, encryption, and access control.' },

  // ── Diagrams ──
  { id: 'mermaid-app', category: 'Diagrams', icon: '📐',
    title: 'Application Diagram',
    prompt: 'Generate a Mermaid application architecture diagram showing the swim-lane layout for this capability with all system integrations.' },
  { id: 'mermaid-data', category: 'Diagrams', icon: '🗄️',
    title: 'Data Architecture Diagram',
    prompt: 'Generate a Mermaid data architecture diagram showing database-to-database flows with application boxes clustered above their databases.' },
  { id: 'bpmn-processes', category: 'Diagrams', icon: '🔀',
    title: 'BPMN Process Diagrams',
    prompt: 'List all BPMN business processes for this capability grouped by phase. Show process ID, name, and one-line purpose for each. I will click on specific processes to see their detailed diagrams.' },
  { id: 'mermaid-sequence', category: 'Diagrams', icon: '⏱️',
    title: 'Sequence Diagram',
    prompt: 'Generate a Mermaid sequence diagram showing the message flow between systems for the primary integration chain in this capability.' },
];

export const TEMPLATE_CATEGORIES = [...new Set(PROMPT_TEMPLATES.map(t => t.category))];
