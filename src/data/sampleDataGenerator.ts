/**
 * Generates contextual sample/template data for any tower + capability.
 *
 * Each capability gets unique but representative data so architects
 * see a populated starting point when they click any XLSX in the FileTree.
 * DS-020 (Product Costing) keeps its existing rich sample; all others
 * get generated data based on their tower and capability context.
 */
import type { WorkbookData } from '../utils/xlsxUtils';

/* ── Per-tower context ─────────────────────────────────────────── */

interface TowerContext {
  domain: string;
  systems: string[];
  lanes: string[];
  middleware: string[];
  dataEntities: string[];
  drivers: string[];
  metrics: string[];
}

const TOWER_CONTEXT: Record<string, TowerContext> = {
  FPR: {
    domain: 'Finance, Planning & Reporting',
    systems: ['SAP S/4HANA', 'SAP ECC', 'SAP BPC', 'SAP BW', 'Hyperion', 'OneStream', 'Concur', 'Ariba', 'ICOST', 'XEUS', 'DataBricks', 'SnowFlake'],
    lanes: ['ERP Systems', 'Planning Platform', 'Reporting Layer', 'Data Warehouse', 'Middleware & Integration', 'Boundary Applications'],
    middleware: ['SAP PO', 'SAP CPI', 'Azure ADF', 'SLT', 'CIF'],
    dataEntities: ['GL Posting', 'Cost Element', 'Cost Center', 'Profit Center', 'WBS Element', 'Material Ledger', 'Fixed Asset', 'Journal Entry'],
    drivers: ['S/4HANA Finance Transformation', 'Real-Time Financial Close', 'Unified Reporting Platform', 'Automated Reconciliation'],
    metrics: ['Month-End Close Cycle Time', 'Posting Error Rate', 'Report Generation Time', 'Reconciliation Accuracy'],
  },
  'OTC-IF': {
    domain: 'Order to Cash — Intel Foundry',
    systems: ['SAP S/4HANA', 'SAP ECC', 'CRM', 'ATP Server', 'GTS', 'VISTEX', 'EDI Gateway', 'Customer Portal'],
    lanes: ['ERP Systems', 'CRM Platform', 'Trade Compliance', 'EDI Layer', 'Customer Facing', 'Middleware & Integration'],
    middleware: ['SAP PO', 'SAP CPI', 'EDI VAN', 'SEEBURGER'],
    dataEntities: ['Sales Order', 'Delivery', 'Billing Document', 'Customer Master', 'Pricing Condition', 'Credit Exposure'],
    drivers: ['Foundry Customer Onboarding', 'Automated Order Fulfillment', 'Revenue Recognition Alignment', 'GTS Export Compliance'],
    metrics: ['Order-to-Cash Cycle Time', 'Invoice Accuracy Rate', 'Credit Check Turnaround', 'On-Time Delivery %'],
  },
  'OTC-IP': {
    domain: 'Order to Cash — Intel Products',
    systems: ['SAP S/4HANA', 'SAP ECC', 'Salesforce', 'ATP Server', 'GTS', 'VISTEX', 'EDI Gateway', 'Channel Portal'],
    lanes: ['ERP Systems', 'CRM Platform', 'Trade Compliance', 'EDI Layer', 'Channel Partners', 'Middleware & Integration'],
    middleware: ['SAP PO', 'SAP CPI', 'MuleSoft', 'EDI VAN'],
    dataEntities: ['Sales Order', 'Delivery', 'Invoice', 'Customer Master', 'Pricing Condition', 'Returns Authorization'],
    drivers: ['Channel Partner Integration', 'Returns & Refunds Automation', 'Revenue Recognition', 'Global Trade Services'],
    metrics: ['Order Fulfillment Rate', 'Returns Processing Time', 'Channel Partner SLA', 'Revenue Leakage %'],
  },
  'FTS-IF': {
    domain: 'Fulfill to Ship — Intel Foundry',
    systems: ['SAP S/4HANA', 'SAP ECC', 'SAP EWM', 'SAP TM', 'MES 300', 'WorkStream', 'MARS', 'APO'],
    lanes: ['ERP Systems', 'Warehouse Mgmt', 'Transport Mgmt', 'MES Systems', 'Planning Systems', 'Middleware & Integration'],
    middleware: ['SAP PO', 'SAP CPI', 'MII', 'PI'],
    dataEntities: ['Production Order', 'Shipment', 'Handling Unit', 'BOM', 'Route', 'Quality Notification', 'Maintenance Order'],
    drivers: ['Warehouse Modernization (EWM)', 'Manufacturing Execution Integration', 'Transportation Optimization', 'Quality Traceability'],
    metrics: ['Warehouse Throughput', 'Production Cycle Time', 'Shipping Accuracy', 'Quality First-Pass Yield'],
  },
  'FTS-IP': {
    domain: 'Fulfill to Ship — Intel Products',
    systems: ['SAP S/4HANA', 'SAP ECC', 'SAP EWM', 'SAP TM', 'MES', 'APO', '3PL Portal'],
    lanes: ['ERP Systems', 'Warehouse Mgmt', 'Transport Mgmt', 'MES Systems', 'Planning Systems', '3PL Integration'],
    middleware: ['SAP PO', 'SAP CPI', 'EDI VAN'],
    dataEntities: ['Delivery', 'Shipment', 'Handling Unit', 'Transfer Order', 'Transport Request', 'Material Document'],
    drivers: ['3PL Integration', 'EWM Rollout', 'MRP Optimization', 'Demand Planning Accuracy'],
    metrics: ['Order-to-Ship Time', 'Inventory Accuracy', 'Transport Cost / Unit', 'Demand Forecast Accuracy'],
  },
  PTP: {
    domain: 'Procure to Pay',
    systems: ['SAP S/4HANA', 'SAP ECC', 'SAP Ariba', 'SAP SRM', 'Coupa', 'GTS', 'Concur', 'Vendor Portal'],
    lanes: ['ERP Systems', 'Procurement Platform', 'Trade Compliance', 'Expense Mgmt', 'Supplier Portal', 'Middleware & Integration'],
    middleware: ['SAP PO', 'SAP CPI', 'Ariba Network', 'cXML'],
    dataEntities: ['Purchase Order', 'Goods Receipt', 'Invoice', 'Payment', 'Vendor Master', 'Contract'],
    drivers: ['Ariba Integration for Source-to-Pay', 'Automated Invoice Processing', 'GTS Import Compliance', 'Supplier Risk Management'],
    metrics: ['PO Cycle Time', 'Invoice Match Rate', 'Payment On-Time %', 'Supplier Onboarding Time'],
  },
  MDM: {
    domain: 'Master Data Management',
    systems: ['SAP MDG', 'SAP S/4HANA', 'SAP ECC', 'Informatica MDM', 'DUNS&B', 'Tax Engine', 'Data Quality Hub'],
    lanes: ['MDG Platform', 'ERP Systems', 'Data Quality', 'External Sources', 'Integration Layer'],
    middleware: ['SAP PO', 'SAP CPI', 'Informatica', 'SLT'],
    dataEntities: ['Material Master', 'Customer Master', 'Vendor Master', 'BOM', 'GL Account', 'Cost Center'],
    drivers: ['Master Data Harmonization', 'Data Quality Improvement', 'Cross-System Consistency', 'Regulatory Compliance'],
    metrics: ['Data Completeness %', 'Duplicate Rate', 'Change Request Cycle Time', 'Cross-System Match Rate'],
  },
  E2E: {
    domain: 'End-to-End Integration',
    systems: ['SAP PO', 'SAP CPI', 'Azure Integration Services', 'MuleSoft', 'Kafka', 'API Gateway', 'DataBricks', 'SnowFlake'],
    lanes: ['Integration Platform', 'API Layer', 'Event Streaming', 'Data Platform', 'Security Layer', 'Monitoring'],
    middleware: ['SAP CPI', 'Azure Service Bus', 'Kafka', 'API Management'],
    dataEntities: ['API Contract', 'Event Schema', 'Integration Flow', 'Data Pipeline', 'Security Token', 'Audit Log'],
    drivers: ['Middleware Consolidation', 'API-First Architecture', 'Real-Time Event Mesh', 'Integration Observability'],
    metrics: ['API Uptime %', 'Message Throughput', 'Integration Error Rate', 'Avg Latency (ms)'],
  },
};

/* ── Generator ─────────────────────────────────────────────────── */

const FREQUENCIES = ['Real-Time', 'Near Real-Time', 'Hourly', 'Daily', 'Batch', 'On-Demand'];
const DIRECTIONS = ['->', '<-', '<->'];
const PATTERNS = ['Pub-Sub', 'Point-to-Point', 'ETL', 'API-Led', 'Event-Driven', 'File-Based'];
const PROTOCOLS = ['REST', 'RFC', 'OData', 'IDoc', 'SFTP', 'Kafka', 'SOAP'];
const AUTH_METHODS = ['OAuth', 'NTLM', 'Cert', 'SSO', 'API Key'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const NFR_CATEGORIES = ['Performance', 'Availability', 'Security', 'Scalability', 'Data Retention', 'Disaster Recovery', 'Compliance'];
const SEC_CONCERNS = ['Authentication', 'Authorization', 'Data Encryption', 'Network Security', 'Audit Logging', 'Key Management', 'Compliance', 'Data Masking', 'Vulnerability Mgmt', 'Incident Response'];
const REC_CATEGORIES = ['Architecture', 'Data', 'Integration', 'Security', 'Performance', 'Governance'];

function generateFlows(ctx: TowerContext, capName: string, count: number = 8): Record<string, unknown>[] {
  const flows: Record<string, unknown>[] = [];
  const systems = ctx.systems;
  const lanes = ctx.lanes;

  for (let i = 0; i < count; i++) {
    const chain = `${capName} Flow ${Math.floor(i / 3) + 1}`;
    const hop = (i % 3) + 1;
    const srcIdx = i % systems.length;
    const tgtIdx = (i + 1) % systems.length;
    const entity = ctx.dataEntities[i % ctx.dataEntities.length];
    const mw = ctx.middleware[i % ctx.middleware.length];

    flows.push({
      'Flow Chain': chain,
      'Hop #': hop,
      'Source System': systems[srcIdx],
      'Source Lane': lanes[srcIdx % lanes.length],
      'Target System': systems[tgtIdx],
      'Target Lane': lanes[tgtIdx % lanes.length],
      'Interface / Technology': i % 2 === 0 ? mw : 'Direct',
      'Direction': DIRECTIONS[i % DIRECTIONS.length],
      'Frequency': FREQUENCIES[i % FREQUENCIES.length],
      'Data Description': `${entity} data`,
      'Flow Purpose': `Transfers ${entity.toLowerCase()} from ${systems[srcIdx]} to ${systems[tgtIdx]} for ${capName.toLowerCase()} processing`,
      'Notes / Corrections': '',
      'Process/System Owner': ctx.domain,
      'Data Owner': '',
      'Applicable Scope': i % 2 === 0 ? 'Intel Foundry' : 'Intel Products',
      'Data Entity': entity,
      'Data Format': i % 2 === 0 ? 'XML' : 'JSON',
      'Data Classification': 'Intel Confidential',
      'Master/Transaction': i % 3 === 0 ? 'Master' : 'Transaction',
      'Integration Pattern': PATTERNS[i % PATTERNS.length],
      'Middleware / Platform': mw,
      'Protocol': PROTOCOLS[i % PROTOCOLS.length],
      'Auth Method': AUTH_METHODS[i % AUTH_METHODS.length],
      'Environment Scope': 'DEV,QAS,PRD',
    });
  }
  return flows;
}

function generateDrivers(ctx: TowerContext): Record<string, unknown>[] {
  return ctx.drivers.map((d, i) => ({
    'Driver #': i + 1,
    'Driver Name': d,
    'Description': `${d} — key initiative under the ${ctx.domain} transformation program`,
    'Strategic Alignment': 'IDM 2.0 Transformation',
    'Priority': PRIORITIES[i % PRIORITIES.length],
  }));
}

function generateSuccessCriteria(ctx: TowerContext): Record<string, unknown>[] {
  return ctx.metrics.map(m => ({
    'Metric': m,
    'Target': 'TBD — define during design phase',
    'Measure': `Measured via ${ctx.domain} reporting dashboard`,
    'Baseline': 'Current state to be baselined',
    'Owner': 'Tower Architect',
  }));
}

function generateNFRs(_ctx: TowerContext): Record<string, unknown>[] {
  return NFR_CATEGORIES.map((cat, i) => ({
    'Category': cat,
    'Requirement': `${cat} requirement for ${_ctx.domain} — to be refined during design`,
    'Target / SLA': 'TBD',
    'Priority': PRIORITIES[i % PRIORITIES.length],
    'Notes': '',
  }));
}

function generateSecurityControls(): Record<string, unknown>[] {
  return SEC_CONCERNS.map(c => ({
    'Concern': c,
    'Approach': `Standard Intel ${c.toLowerCase()} approach — to be detailed during security review`,
    'Standard / Policy': 'Intel IT Security Policy',
    'Owner': 'IT Security',
    'Notes': '',
  }));
}

function generateRecommendations(ctx: TowerContext, capName: string): Record<string, unknown>[] {
  return REC_CATEGORIES.map((cat, i) => ({
    '#': i + 1,
    'Category': cat,
    'Recommendation': `Complete ${cat.toLowerCase()} definition for ${capName} within ${ctx.domain}`,
    'Priority': PRIORITIES[i % PRIORITIES.length],
    'Owner': 'Tower Architect',
    'Target Date': '2026-Q3',
    'Status': 'Open',
  }));
}

/**
 * Generate a complete WorkbookData with contextual sample data
 * for the given tower and capability.
 */
export function generateSampleData(
  towerId: string,
  _capId: string,
  capName: string,
): WorkbookData {
  const ctx = TOWER_CONTEXT[towerId] ?? TOWER_CONTEXT['E2E'];

  return {
    'Flows': generateFlows(ctx, capName),
    'Business Drivers': generateDrivers(ctx),
    'Success Criteria': generateSuccessCriteria(ctx),
    'NFRs': generateNFRs(ctx),
    'Security Controls': generateSecurityControls(),
    'Recommendations': generateRecommendations(ctx, capName),
  };
}
