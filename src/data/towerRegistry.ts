/**
 * Tower registry — mirrors config/tower_registry.json from the Architecture repo.
 * Keeps the Input Portal self-contained (no cross-repo dependency at build time).
 */

export interface TowerInfo {
  id: string;
  display: string;
}

export const TOWERS: TowerInfo[] = [
  { id: 'FPR', display: 'Finance, Planning & Reporting' },
  { id: 'OTC-IF', display: 'Order to Cash — Intel Foundry' },
  { id: 'OTC-IP', display: 'Order to Cash — Intel Products' },
  { id: 'FTS-IF', display: 'Fulfill to Ship — Intel Foundry' },
  { id: 'FTS-IP', display: 'Fulfill to Ship — Intel Products' },
  { id: 'PTP', display: 'Procure to Pay' },
  { id: 'MDM', display: 'Master Data Management' },
  { id: 'E2E', display: 'End-to-End Integration' },
];

/**
 * Capability IDs per tower. In the future this will be loaded from the
 * Architecture Portal's capability_master.yaml via API. For now, this is
 * a starter set — easily extended.
 */
export interface CapabilityInfo {
  id: string;
  name: string;
}

export const CAPABILITIES: Record<string, CapabilityInfo[]> = {
  'FPR': [
    { id: 'DS-020', name: 'DS-020 Product Costing' },
    { id: 'DS-030', name: 'DS-030 Inventory Valuation' },
    { id: 'DS-040', name: 'DS-040 Actual Costing / Material Ledger' },
    { id: 'DS-050', name: 'DS-050 Profitability Analysis' },
    { id: 'DS-060', name: 'DS-060 Cost Center Accounting' },
    { id: 'DS-070', name: 'DS-070 Internal Orders' },
    { id: 'DS-080', name: 'DS-080 Project Systems / WBS' },
    { id: 'DS-090', name: 'DS-090 Fixed Assets' },
    { id: 'DS-100', name: 'DS-100 General Ledger' },
    { id: 'DS-110', name: 'DS-110 Accounts Payable' },
    { id: 'DS-120', name: 'DS-120 Accounts Receivable' },
    { id: 'DS-130', name: 'DS-130 Tax' },
    { id: 'DS-140', name: 'DS-140 Treasury' },
    { id: 'DS-150', name: 'DS-150 Consolidation / Group Reporting' },
    { id: 'DS-160', name: 'DS-160 Planning / Budgeting' },
    { id: 'DS-170', name: 'DS-170 Intercompany' },
    { id: 'DS-180', name: 'DS-180 Revenue Recognition' },
    { id: 'DS-190', name: 'DS-190 Bank Accounting' },
  ],
  'OTC-IF': [
    { id: 'L-010', name: 'L-010 Sales Order Management' },
    { id: 'L-020', name: 'L-020 Pricing & Conditions' },
    { id: 'L-030', name: 'L-030 Credit Management' },
    { id: 'L-040', name: 'L-040 Billing & Invoicing' },
    { id: 'L-050', name: 'L-050 Revenue Accounting' },
    { id: 'L-060', name: 'L-060 GTS Export Compliance' },
  ],
  'OTC-IP': [
    { id: 'L-010', name: 'L-010 Sales Order Management' },
    { id: 'L-020', name: 'L-020 Pricing & Conditions' },
    { id: 'L-030', name: 'L-030 Credit Management' },
    { id: 'L-040', name: 'L-040 Billing & Invoicing' },
    { id: 'L-050', name: 'L-050 Revenue Accounting' },
    { id: 'L-060', name: 'L-060 GTS Export Compliance' },
    { id: 'L-070', name: 'L-070 Returns & Refunds' },
  ],
  'FTS-IF': [
    { id: 'L-040', name: 'L-040 Outbound Logistics' },
    { id: 'LO-060', name: 'LO-060 EWM / Warehousing' },
    { id: 'LO-080', name: 'LO-080 Transportation Management' },
    { id: 'LO-100', name: 'LO-100 Manufacturing Execution' },
    { id: 'LO-120', name: 'LO-120 MRP / Demand Planning' },
    { id: 'LO-140', name: 'LO-140 Plant Maintenance' },
    { id: 'LO-160', name: 'LO-160 Quality Management' },
  ],
  'FTS-IP': [
    { id: 'L-040', name: 'L-040 Outbound Logistics' },
    { id: 'LO-060', name: 'LO-060 EWM / Warehousing' },
    { id: 'LO-080', name: 'LO-080 Transportation Management' },
    { id: 'LO-100', name: 'LO-100 Manufacturing Execution' },
    { id: 'LO-120', name: 'LO-120 MRP / Demand Planning' },
  ],
  'PTP': [
    { id: 'P-010', name: 'P-010 Procurement' },
    { id: 'P-020', name: 'P-020 Purchase Orders' },
    { id: 'P-030', name: 'P-030 Goods Receipt' },
    { id: 'P-040', name: 'P-040 Invoice Verification' },
    { id: 'P-050', name: 'P-050 Payments' },
    { id: 'P-060', name: 'P-060 GTS Import Compliance' },
    { id: 'L-040', name: 'L-040 Inbound Logistics' },
    { id: 'LO-160', name: 'LO-160 Quality Management' },
  ],
  'MDM': [
    { id: 'MD-010', name: 'MD-010 Material Master' },
    { id: 'MD-020', name: 'MD-020 Customer Master' },
    { id: 'MD-030', name: 'MD-030 Vendor Master' },
    { id: 'MD-040', name: 'MD-040 BOM Management' },
  ],
  'E2E': [
    { id: 'E2E-10', name: 'E2E-10 Cross-Tower Integration' },
    { id: 'E2E-20', name: 'E2E-20 Data Hub' },
    { id: 'E2E-30', name: 'E2E-30 Middleware / Integration Platform' },
    { id: 'E2E-40', name: 'E2E-40 Reporting & Analytics' },
    { id: 'E2E-80', name: 'E2E-80 Security & Compliance' },
  ],
};
