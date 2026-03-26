const REPORTS = [
  {
    title: 'Project Reports',
    items: [
      { label: 'Project Summary', slug: 'project-summary' },
      
      { label: 'Project Costing', slug: 'project-costing' },
      { label: 'Project Profitability', slug: 'project-profitability' },
      
    ],
  },
  {
    title: 'Manufacturing / Idol Reports',
    items: [
      { label: 'Idol Manufacturing Summary', slug: 'idol-manufacturing-summary' },
      { label: 'Idol Stage Progress', slug: 'idol-stage-progress' },
      { label: 'Idol Material Consumption', slug: 'idol-material-consumption' },
    ],
  },
  {
    title: 'Blueprint / Construction Reports',
    items: [
      { label: 'Blueprint Position Progress', slug: 'blueprint-position-progress' },
      { label: 'Position Dependency Health', slug: 'position-dependency-health' },
      { label: 'Installation Report', slug: 'installation-report' },
    ],
  },
  {
    title: 'Inventory Reports',
    items: [
      
      { label: 'Stock Ledger / Movement', slug: 'stock-ledger-movement' },
      { label: 'Stock Allocated vs Free', slug: 'serialized-stock' },
      { label: 'Stone Block Availability', slug: 'stone-block-availability' },
      { label: 'Scrap Report', slug: 'scrap-report' },
    ],
  },
  {
    title: 'Procurement / Purchase Reports',
    items: [
      { label: 'Purchase Orders', slug: 'purchase-orders' },
      { label: 'Purchase Receipts', slug: 'purchase-receipts' },
      { label: 'Purchase Payments', slug: 'purchase-payments' },
    ],
  },
  {
    title: 'Contractor Reports',
    items: [
      { label: 'Contractor Agreements', slug: 'contractor-agreements' },
      { label: 'Contractor Invoices & Payments', slug: 'contractor-invoices-payments' },
    ],
  },
  {
    title: 'Billing & GST',
    items: [
      { label: 'Sales Invoices', slug: 'sales-invoices' },
      { label: 'Advance Payments', slug: 'advance-payments' },
    ],
  },
  {
    title: 'Log / Audit',
    items: [
      { label: 'Audit Log', slug: 'audit-log' },
    ],
  },
];

export default function Reports() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-subtitle">All available reports across modules</div>
        </div>
      </div>

      <div className="card" style={{ padding: '16px' }}>
        <div className="grid-2">
          {REPORTS.map(section => (
            <div key={section.title} className="card" style={{ padding: '14px' }}>
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>{section.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#64748b', fontSize: '13px' }}>
                {section.items.map(item => (
                  <a
                    key={item.slug}
                    href={`/reports/${item.slug}`}
                    style={{
                      padding: '6px 8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      color: '#1f2937',
                      background: '#f8fafc',
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
