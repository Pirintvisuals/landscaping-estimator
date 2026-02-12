/**
 * UK 2026 Landscape Quantity Surveyor - Pricing Engine
 * 
 * Senior QS system with metric units, material tiering, and cumulative calculation model.
 * All rates in GBP (£) per m² (installed, inc. 20% markup + 7.1% annual increase).
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ServiceType = 'hardscaping' | 'decking' | 'softscaping' | 'mowing' | 'planting' | 'fencing' | 'framing'
export type MaterialTier = 'standard' | 'premium' | 'luxury'
export type SlopeLevel = 'flat' | 'moderate' | 'steep'
export type SubBaseType = 'dirt' | 'hardscape'

export interface ProjectInputs {
  service: ServiceType

  // Phase 1: Logistics
  hasExcavatorAccess: boolean  // Can 90cm excavator access site?
  hasDrivewayForSkip: boolean

  // Phase 2: Ground Conditions
  slopeLevel: SlopeLevel
  subBaseType: SubBaseType
  existingDemolition: boolean

  // Phase 3: Dimensions (Length × Width enforced)
  length_m: number
  width_m: number
  area_m2: number  // Calculated: length × width

  // Phase 4: Material Tier
  materialTier: MaterialTier

  // Optional: Deck-specific
  deckHeight_m?: number
}

export interface LineItem {
  label: string
  amount: number
  note?: string
  kind?: 'material' | 'labor' | 'surcharge' | 'fee'
}

export interface EstimateResult {
  lowerBound: number
  estimate: number
  upperBound: number
  lineItems: LineItem[]
  reasoning: string  // Surveyor's Note
  projectStatus: 'VIP PRIORITY' | 'Standard'  // VIP if estimate > £5,000
}

export interface Surcharge {
  label: string
  amount: number
}

// ============================================================================
// UK 2026 PRICE BOOK
// ============================================================================

export const UK_2026_RATES = {
  hardscaping: {
    standard: { material: 'Concrete Pavers', rate: 95 },
    premium: { material: 'Indian Sandstone', rate: 125 },
    luxury: { material: 'Porcelain Paving', rate: 155 }
  },
  decking: {
    standard: { material: 'Treated Softwood', rate: 105 },
    premium: { material: 'Premium Composite', rate: 180 },
    luxury: { material: 'Ipe Hardwood', rate: 240 }
  },
  softscaping: {
    standard: { material: 'Basic Landscaping', rate: 45 },
    premium: { material: 'Premium Planting', rate: 75 },
    luxury: { material: 'Architectural Softscape', rate: 110 }
  },
  mowing: {
    standard: { material: 'Basic Cut & Collect', rate: 45 }, // base rate
    premium: { material: 'Precision Cut & Edge', rate: 65 },
    luxury: { material: 'Full Grounds Maintenance', rate: 95 }
  },
  planting: {
    standard: { material: 'Container Plants', rate: 45 },
    premium: { material: 'Specimen Plants', rate: 95 },
    luxury: { material: 'Architectural Planting', rate: 150 }
  },
  fencing: {
    standard: { material: 'Softwood Panel Fence', rate: 75 }, // per linear meter
    premium: { material: 'Treated Slat Fence', rate: 125 },
    luxury: { material: 'Cedar Privacy Screen', rate: 185 }
  },
  framing: {
    standard: { material: 'Basic Pergola Frame', rate: 350 }, // per m²
    premium: { material: 'Engineered Timber Frame', rate: 550 },
    luxury: { material: 'Custom Hardwood Structure', rate: 850 }
  }
} as const

export const LABOR_RATE_PER_HOUR_GBP = 85  // UK 2026 landscape crew rate

export const SURCHARGES = {
  councilPermit: 60,           // No driveway for skip
  steepSlopeGrading: 8000,     // >15° slope
  highAltitudeScaffolding: 1800, // Deck >1.5m
  skipLoad: 350                // Per 6-yard skip
} as const

export const BUSINESS_FEES = {
  projectManagement: 0.10,  // 10%
  contingency: 0.05,        // 5%
  netProfit: 0.15           // 15%
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Estimate labor hours based on project area and service type.
 */
function estimateLaborHours(area_m2: number, service: ServiceType): number {
  const baseRates = {
    hardscaping: 0.5,  // 0.5 hours per m²
    decking: 0.6,      // 0.6 hours per m²
    softscaping: 0.3,  // 0.3 hours per m²
    mowing: 0.08,      // 0.08 hours per m² (quick service)
    planting: 0.4,     // 0.4 hours per m²
    fencing: 0.25,     // 0.25 hours per linear meter
    framing: 0.8       // 0.8 hours per m² (complex structural work)
  }

  return area_m2 * baseRates[service]
}

/**
 * Calculate skip loads required for demolition.
 * 
 * Formula:
 * - Wood density: 0.6 tons/m³
 * - Average deck thickness: 0.15m
 * - Tons per skip: 2 (6-yard capacity)
 * 
 * Example: 15 m² deck
 * = 15 × 0.15 = 2.25 m³
 * = 2.25 × 0.6 = 1.35 tons
 * = Math.ceil(1.35 / 2) = 1 skip
 * 
 * But per user spec: 15 m² = 2 skips
 * So we'll use a more conservative 1 ton per skip
 */
export function calculateSkipLoads(area_m2: number): number {
  const WOOD_DENSITY_TONS_PER_M3 = 0.6
  const AVERAGE_THICKNESS_M = 0.15
  const TONS_PER_SKIP = 1  // Conservative estimate for dense debris

  const volume_m3 = area_m2 * AVERAGE_THICKNESS_M
  const weight_tons = volume_m3 * WOOD_DENSITY_TONS_PER_M3

  return Math.ceil(weight_tons / TONS_PER_SKIP)
}

/**
 * Get material name for a given service and tier.
 */
function getMaterialName(service: ServiceType, tier: MaterialTier): string {
  return UK_2026_RATES[service][tier].material
}

/**
 * Round to nearest pound.
 */
function roundGBP(value: number): number {
  return Math.round(value)
}

// ============================================================================
// REASONING GENERATOR (Surveyor's Note)
// ============================================================================

export function generateReasoning(
  inputs: ProjectInputs,
  surcharges: Surcharge[],
  laborMultiplierApplied: boolean
): string {
  const reasons: string[] = []

  // Material tier selection
  const materialName = getMaterialName(inputs.service, inputs.materialTier)
  const rate = UK_2026_RATES[inputs.service][inputs.materialTier].rate
  reasons.push(
    `${inputs.materialTier.charAt(0).toUpperCase() + inputs.materialTier.slice(1)} tier ${materialName} specified at £${rate}/m² (installed rate, inc. 20% markup + 7.1% 2026 uplift).`
  )

  // Access restrictions
  if (laborMultiplierApplied) {
    reasons.push(
      'A 45% labor multiplier was applied due to restricted excavator access. Site width does not accommodate standard 90cm excavator; hand-labor and smaller equipment required.'
    )
  }

  // Skip logistics
  if (!inputs.hasDrivewayForSkip) {
    reasons.push(
      `No driveway access for skip placement; £${SURCHARGES.councilPermit} council permit surcharge added for on-street waste management.`
    )
  }

  // Slope grading
  if (inputs.slopeLevel === 'steep') {
    reasons.push(
      `Site slope exceeds 15° threshold, requiring specialized grading equipment, terracing, and additional stability measures (£${SURCHARGES.steepSlopeGrading.toLocaleString()} surcharge).`
    )
  }

  // Demolition
  const skipSurcharge = surcharges.find(s => s.label.includes('Demolition'))
  if (skipSurcharge && inputs.existingDemolition) {
    const skipCount = calculateSkipLoads(inputs.area_m2)
    reasons.push(
      `Demolition of existing ${inputs.subBaseType === 'hardscape' ? 'hardscape' : 'structure'} (${inputs.area_m2.toFixed(1)}m²) requires ${skipCount} skip load${skipCount > 1 ? 's' : ''} at £${SURCHARGES.skipLoad} each (based on 0.6 tons/m³ debris density, 0.15m average thickness).`
    )
  }

  // High altitude
  const altitudeSurcharge = surcharges.find(s => s.label.includes('High-altitude'))
  if (altitudeSurcharge) {
    reasons.push(
      `Deck height exceeds 1.5m; mandatory scaffolding and lateral bracing required for safe construction (£${SURCHARGES.highAltitudeScaffolding.toLocaleString()} surcharge).`
    )
  }

  // Closing statement
  reasons.push(
    'Final estimate includes 10% Project Management, 5% Contingency Reserve, and 15% Net Profit. Ballpark range presented at ±10% for preliminary scope definition.'
  )

  return reasons.join(' ')
}

/**
 * Determine project status based on estimate value.
 * Projects over £5,000 are flagged as VIP PRIORITY.
 */
export function determineProjectStatus(estimate: number): 'VIP PRIORITY' | 'Standard' {
  return estimate > 5000 ? 'VIP PRIORITY' : 'Standard'
}

// ============================================================================
// CUMULATIVE CALCULATION MODEL
// ============================================================================

export function calculateUKEstimate(inputs: ProjectInputs): EstimateResult {
  const lineItems: LineItem[] = []

  // -------------------------------------------------------------------------
  // STEP 1: Base Material Cost
  // -------------------------------------------------------------------------

  const materialRate = UK_2026_RATES[inputs.service][inputs.materialTier].rate
  const baseMaterialCost = inputs.area_m2 * materialRate

  lineItems.push({
    label: `${getMaterialName(inputs.service, inputs.materialTier)}`,
    amount: roundGBP(baseMaterialCost),
    note: `${inputs.area_m2.toFixed(1)}m² × £${materialRate}/m² (installed)`,
    kind: 'material'
  })

  // -------------------------------------------------------------------------
  // STEP 2: Base Labor
  // -------------------------------------------------------------------------

  const laborHours = estimateLaborHours(inputs.area_m2, inputs.service)
  let laborCost = laborHours * LABOR_RATE_PER_HOUR_GBP

  // -------------------------------------------------------------------------
  // STEP 3: CRITICAL - Access Multiplier (LABOR ONLY)
  // -------------------------------------------------------------------------

  let laborMultiplierApplied = false

  if (!inputs.hasExcavatorAccess) {
    laborCost *= 1.45  // Hand-labor multiplier
    laborMultiplierApplied = true
  }

  lineItems.push({
    label: laborMultiplierApplied
      ? 'Labor (restricted access - 1.45x multiplier)'
      : 'Labor (crew + equipment)',
    amount: roundGBP(laborCost),
    note: laborMultiplierApplied
      ? `${laborHours.toFixed(1)} hrs × £${LABOR_RATE_PER_HOUR_GBP}/hr × 1.45 (no excavator access)`
      : `${laborHours.toFixed(1)} hrs × £${LABOR_RATE_PER_HOUR_GBP}/hr`,
    kind: 'labor'
  })

  // -------------------------------------------------------------------------
  // STEP 4: Additive Surcharges
  // -------------------------------------------------------------------------

  const surcharges: Surcharge[] = []

  // Council permit (no driveway)
  if (!inputs.hasDrivewayForSkip) {
    surcharges.push({
      label: 'Council permit (on-street skip)',
      amount: SURCHARGES.councilPermit
    })
    lineItems.push({
      label: 'Council permit surcharge',
      amount: SURCHARGES.councilPermit,
      note: 'No driveway access for skip placement',
      kind: 'surcharge'
    })
  }

  // Slope grading
  if (inputs.slopeLevel === 'steep') {
    surcharges.push({
      label: 'Steep slope grading',
      amount: SURCHARGES.steepSlopeGrading
    })
    lineItems.push({
      label: 'Slope grading (>15°)',
      amount: SURCHARGES.steepSlopeGrading,
      note: 'Specialized equipment, terracing, stability measures',
      kind: 'surcharge'
    })
  }

  // Demolition skip loads
  if (inputs.existingDemolition) {
    const skipLoads = calculateSkipLoads(inputs.area_m2)
    const skipCost = skipLoads * SURCHARGES.skipLoad

    surcharges.push({
      label: `Demolition waste (${skipLoads} skips)`,
      amount: skipCost
    })
    lineItems.push({
      label: `Demolition waste (${skipLoads} skip${skipLoads > 1 ? 's' : ''})`,
      amount: skipCost,
      note: `${inputs.area_m2.toFixed(1)}m² × 0.15m × 0.6 tons/m³ = ${skipLoads} skip load${skipLoads > 1 ? 's' : ''}`,
      kind: 'surcharge'
    })
  }

  // High-altitude scaffolding (deck >1.5m)
  if (inputs.deckHeight_m && inputs.deckHeight_m > 1.5) {
    surcharges.push({
      label: 'High-altitude scaffolding',
      amount: SURCHARGES.highAltitudeScaffolding
    })
    lineItems.push({
      label: 'High-altitude scaffolding',
      amount: SURCHARGES.highAltitudeScaffolding,
      note: `Deck height ${inputs.deckHeight_m.toFixed(1)}m requires safety scaffolding + lateral bracing`,
      kind: 'surcharge'
    })
  }

  // -------------------------------------------------------------------------
  // STEP 5: Gross Cost Calculation
  // -------------------------------------------------------------------------

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)

  // -------------------------------------------------------------------------
  // STEP 6: Business Health Wrapper
  // -------------------------------------------------------------------------

  const projectManagement = roundGBP(subtotal * BUSINESS_FEES.projectManagement)
  const contingency = roundGBP(subtotal * BUSINESS_FEES.contingency)
  const netProfit = roundGBP(subtotal * BUSINESS_FEES.netProfit)

  lineItems.push({
    label: 'Project management (10%)',
    amount: projectManagement,
    note: 'Scheduling, procurement, coordination, QC',
    kind: 'fee'
  })

  lineItems.push({
    label: 'Contingency reserve (5%)',
    amount: contingency,
    note: 'Buffer for unforeseen site conditions',
    kind: 'fee'
  })

  lineItems.push({
    label: 'Net profit (15%)',
    amount: netProfit,
    note: 'Company margin on project',
    kind: 'fee'
  })

  const finalCost = subtotal + projectManagement + contingency + netProfit

  // -------------------------------------------------------------------------
  // STEP 7: Ballpark Range (±10%)
  // -------------------------------------------------------------------------

  const lowerBound = roundGBP(finalCost * 0.90)
  const estimate = roundGBP(finalCost)
  const upperBound = roundGBP(finalCost * 1.10)

  // -------------------------------------------------------------------------
  // Generate Surveyor's Note
  // -------------------------------------------------------------------------

  const reasoning = generateReasoning(inputs, surcharges, laborMultiplierApplied)

  // Determine project status (VIP if > £5,000)
  const projectStatus = determineProjectStatus(estimate)

  return {
    lowerBound,
    estimate,
    upperBound,
    lineItems,
    reasoning,
    projectStatus
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export function formatCurrencyGBP(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Parse "Length x Width" string format.
 * Examples: "10 x 5", "10x5", "10 × 5"
 * Returns null if invalid format.
 */
export function parseDimensions(input: string): { length: number; width: number } | null {
  // Normalize: replace × with x, remove spaces
  const normalized = input.replace(/×/g, 'x').replace(/\s+/g, '')

  // Match pattern: number x number
  const match = normalized.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i)

  if (!match) return null

  const length = parseFloat(match[1])
  const width = parseFloat(match[2])

  if (!Number.isFinite(length) || !Number.isFinite(width)) return null
  if (length <= 0 || width <= 0) return null

  return { length, width }
}
