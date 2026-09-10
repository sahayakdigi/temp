// Central Glossary of Trade Terms — used for contextual tooltips across all screens
export const GLOSSARY = {
  LR: {
    term: 'LR / Bilty / GR / CN',
    definition: 'Lorry Receipt / Goods Receipt / Consignment Note — the core legal receipt issued when goods are booked for transport. It is the primary document of a consignment.',
    category: 'booking'
  },
  BILTY: {
    term: 'Bilty',
    definition: 'Colloquial name for a Lorry Receipt (LR/GR). It is the printed receipt given by the transporter to the shipper confirming goods are accepted for transport.',
    category: 'booking'
  },
  CHALLAN: {
    term: 'Challan',
    definition: 'Generic transport note: may refer to a booking/loading challan, delivery challan, or truck challan (lorry hire note). Each has a specific legal use case.',
    category: 'booking'
  },
  PRIVATE_MARK: {
    term: 'Private Mark',
    definition: "Shipper's identifying code stamped on each package (e.g. LG-DEL-BOM-12). Used for hub sorting and delivery matching without opening the package.",
    category: 'booking'
  },
  ARTICLES: {
    term: 'Articles',
    definition: 'Total count of physical packages or cartons in a consignment. Distinct from weight — a single LR may contain many articles.',
    category: 'booking'
  },
  CHARGEABLE_WEIGHT: {
    term: 'Chargeable Weight',
    definition: 'The higher of actual weight and volumetric (dimensional) weight. PTL freight is billed on chargeable weight, not actual weight. Formula: L×B×H / 4000 for volumetric.',
    category: 'booking'
  },
  FREIGHT_TERMS: {
    term: 'Freight Terms',
    definition: 'How freight is paid: To-Pay = collected from consignee at delivery; Paid = prepaid by consignor at booking; TBB (To Be Billed) = billed monthly on credit.',
    category: 'billing'
  },
  TO_PAY: {
    term: 'To-Pay',
    definition: 'A freight payment mode where the consignee pays the freight upon delivery. The transporter collects the amount at the destination before releasing goods.',
    category: 'billing'
  },
  TBB: {
    term: 'TBB (To Be Billed)',
    definition: 'To Be Billed — the consignor is on monthly credit and will be invoiced at the end of the billing period. Also called credit freight.',
    category: 'billing'
  },
  BOD: {
    term: 'BOD (Basis of Delivery)',
    definition: 'Customer pays after partial delivery before the remaining balance of goods is released from the godown.',
    category: 'billing'
  },
  GRN: {
    term: 'GRN (Goods Receipt Note)',
    definition: 'Goods Receipt Note — an internal warehouse document recording the articles received against an LR. Reconciles booked vs actually received quantity.',
    category: 'warehouse'
  },
  MATERIAL_TAG: {
    term: 'Material Tag',
    definition: 'A per-article barcode/QR label bound to the LR and private mark. Scanned at every handoff point (putaway, manifest, crossing, delivery) for chain-of-custody.',
    category: 'warehouse'
  },
  PUTAWAY: {
    term: 'Putaway / Bin',
    definition: 'The act of placing tagged goods into an assigned storage bin or rack location in the warehouse. Bin occupancy is tracked per article.',
    category: 'warehouse'
  },
  GODOWN: {
    term: 'Godown',
    definition: 'Warehouse or storage shed at a branch or hub location. Goods transit through the godown between pickup and delivery.',
    category: 'warehouse'
  },
  MANIFEST: {
    term: 'Manifest / Trip Sheet',
    definition: 'A document tying many LRs to one vehicle for a line-haul leg. The manifest lists all consignments loaded on a truck for a specific lane.',
    category: 'hub'
  },
  CROSSING: {
    term: 'Crossing / Transshipment',
    definition: 'The process of moving consignments between vehicles at an intermediate hub en route to the final destination. Also called transshipment.',
    category: 'hub'
  },
  DRS: {
    term: 'DRS (Delivery Run Sheet)',
    definition: 'Delivery Run Sheet — a destination delivery list assigned to a vehicle or delivery area. The driver uses the DRS to deliver all LRs in a locality.',
    category: 'hub'
  },
  EPOD: {
    term: 'ePOD (Electronic Proof of Delivery)',
    definition: 'Electronic Proof of Delivery captured on the driver app — typically a consignee photo + signature confirming goods were delivered in acceptable condition.',
    category: 'hub'
  },
  HAMALI: {
    term: 'Hamali',
    definition: 'Loading/unloading labour charge at origin or destination. Usually recovered from the customer and shown as a surcharge on the LR.',
    category: 'billing'
  },
  BHADA: {
    term: 'Bhada / Hire',
    definition: 'Freight/hire amount paid to a hired (attached or market) lorry owner. Distinct from the freight charged to the client.',
    category: 'billing'
  },
  ADVANCE_BALANCE: {
    term: 'Advance & Balance',
    definition: 'A lorry owner is paid an advance at loading and the balance at unloading after the driver submits the signed POD. Standard hire settlement practice.',
    category: 'billing'
  },
  MAMOOL: {
    term: 'Mamool',
    definition: 'Customary informal/incidental payments made en route (e.g., at checkposts). Tracked as a miscellaneous expense on the trip for reconciliation.',
    category: 'billing'
  },
  KANTA: {
    term: 'Kanta / Dharam Kanta',
    definition: 'Weighbridge — the physical or digital scale used to determine the actual weight of a loaded truck. The weighbridge slip is the source of chargeable weight.',
    category: 'warehouse'
  },
  DETENTION: {
    term: 'Detention / Halting Charges',
    definition: 'Charges levied when a vehicle or goods are held beyond the agreed free-time at loading or unloading. Billed to the party responsible for the delay.',
    category: 'billing'
  },
  QUOTATION: {
    term: 'Quotation / Indent',
    definition: 'A priced offer sent to a client for a transport requirement. The indent/order is the confirmed load request that follows acceptance of the quotation.',
    category: 'booking'
  },
  GTA: {
    term: 'GTA / RCM',
    definition: 'Goods Transport Agency (GTA) — under GST, freight is often taxed under Reverse Charge Mechanism (RCM), meaning the recipient pays the GST instead of the transporter.',
    category: 'compliance'
  },
  TDS: {
    term: 'TDS (194C)',
    definition: 'Tax Deducted at Source under Section 194C — customers deduct TDS on freight payments above threshold and deposit it with the government. Reconciled against receipts.',
    category: 'compliance'
  },
  EINVOICE: {
    term: 'e-Invoice / IRN',
    definition: 'GST-compliant e-Invoice with an Invoice Reference Number (IRN) issued by the Invoice Registration Portal (IRP). Mandatory for B2B transactions above the threshold.',
    category: 'compliance'
  },
  IMPREST: {
    term: 'Imprest / Trip Advance',
    definition: 'Cash advanced to a driver before a trip for fuel, tolls, and other expenses. Reconciled against actual expense submissions after the trip ends.',
    category: 'billing'
  },
  RTO: {
    term: 'RTO (Return to Origin)',
    definition: 'An undelivered consignment that is returned to the booking branch for rebooking or client collection. Triggers a reverse LR and claim process.',
    category: 'hub'
  },
  VAHAN: {
    term: 'VAHAN / Sarathi',
    definition: 'Government portals/APIs for vehicle (RC) and driving-licence verification. VAHAN is for vehicles; Sarathi is for driver licences.',
    category: 'fleet'
  },
  FTL: {
    term: 'FTL (Full Truck Load)',
    definition: 'A booking mode where one client hires the entire truck capacity for a trip. Pricing is on a per-trip contract rate.',
    category: 'booking'
  },
  PTL: {
    term: 'PTL (Part Truck Load)',
    definition: 'A booking mode where multiple consignors share a truck. Goods are consolidated at a hub onto a manifest. Pricing is per kg or per article.',
    category: 'booking'
  }
};

// Group terms by category for display
export const CATEGORIES = {
  booking: { label: 'Booking & Consignment', color: 'var(--accent-cyan)' },
  warehouse: { label: 'Warehouse & Tagging', color: 'var(--accent-blue)' },
  hub: { label: 'Hub, Manifest & Delivery', color: '#a78bfa' },
  billing: { label: 'Billing & Settlement', color: 'var(--accent-warning)' },
  compliance: { label: 'GST & Compliance', color: 'var(--accent-success)' },
  fleet: { label: 'Fleet & Compliance', color: 'var(--accent-danger)' },
};
