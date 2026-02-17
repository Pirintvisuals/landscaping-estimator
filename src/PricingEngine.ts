export type ServiceType = 'landscaping' | 'hardscaping' | 'mowing' | 'framing'

export type ProjectSize = 'small' | 'medium' | 'large'

export interface ComplicationFactors {
  restrictedAccess?: boolean
  steepSlope?: boolean
  manyObstacles?: boolean
  existingDemolition?: boolean
  material?: 'stone' | 'wood'
  soilType?: 'loam' | 'sand' | 'clay' | 'unknown'
  deckHeight?: 'low' | 'mid' | 'high'
  undergroundUtilities?: 'yes' | 'no' | 'unknown'
  permitStatus?: 'not_required' | 'needed' | 'applied' | 'approved' | 'unknown'
  /** Backyard-only work area (no drive-through); applies $500 buffer. */
  backyardOnly?: boolean
}

export interface EstimateInput {
  service: ServiceType
  projectSize: ProjectSize
  factors: ComplicationFactors
}

export type CatalogUnit =
  | 'sqft'
  | 'linear_ft'
  | 'tree'
  | 'unit'
  | 'fixture'
  | 'cubic_yard'
  | 'base'
  | 'face_sqft'
  | 'load'

export type LineItemKind = 'labor' | 'material' | 'installed' | 'fee'

export interface LineItem {
  label: string
  amount: number
  note?: string
  kind?: LineItemKind
}

export interface BaselineEstimate {
  baseTotal: number
  lineItems: LineItem[]
}

export interface PricedEstimate extends BaselineEstimate {
  adjustedTotal: number
}

/** General crew labor rate used for all labor line items. */
export const GENERAL_CREW_LABOR_RATE_PER_HOUR = 120

/** 40% material markup is baked into each 'installed' catalog unit price (not a separate line). */
export const MATERIALS_MARKUP_BAKED_IN = 0.4

export const PROFIT_AND_FEES = {
  projectManagementRate: 0.15,
  contingencyRate: 0.08,
  netProfitRate: 0.20,
} as const

export interface CatalogItem {
  id: string
  category:
  | 'site_prep_drainage'
  | 'premium_turf_lawn'
  | 'hardscape_outdoor_living'
  | 'structures_retention'
  | 'specimen_planting'
  | 'finishing_touches'
  label: string
  unit: CatalogUnit
  unitPrice: number
  kind: LineItemKind
  note?: string
}

/**
 * Master catalog: 2026 base rates. A 20% material markup is baked into
 * each 'installed' unit price when building line items (customer does not see a separate markup line).
 */
export const MASTER_CATALOG: Record<string, CatalogItem> = {
  // 1) SITE PREP & DRAINAGE
  excavation_grading_machine: {
    id: 'excavation_grading_machine',
    category: 'site_prep_drainage',
    label: 'Excavation / grading (machine)',
    unit: 'sqft',
    unitPrice: 1.75,
    kind: 'installed',
  },
  tree_removal_lt_15: {
    id: 'tree_removal_lt_15',
    category: 'site_prep_drainage',
    label: 'Tree removal (< 15 ft)',
    unit: 'tree',
    unitPrice: 450,
    kind: 'installed',
  },
  tree_removal_15_30: {
    id: 'tree_removal_15_30',
    category: 'site_prep_drainage',
    label: 'Tree removal (15–30 ft)',
    unit: 'tree',
    unitPrice: 950,
    kind: 'installed',
  },
  french_drain_install: {
    id: 'french_drain_install',
    category: 'site_prep_drainage',
    label: 'French drain installation',
    unit: 'linear_ft',
    unitPrice: 45,
    kind: 'installed',
  },
  catch_basin_professional: {
    id: 'catch_basin_professional',
    category: 'site_prep_drainage',
    label: 'Catch basin (professional)',
    unit: 'unit',
    unitPrice: 550,
    kind: 'installed',
  },
  demolition_old_concrete_deck: {
    id: 'demolition_old_concrete_deck',
    category: 'site_prep_drainage',
    label: 'Demolition (old concrete / deck)',
    unit: 'sqft',
    unitPrice: 6.5,
    kind: 'installed',
  },
  disposal_per_load: {
    id: 'disposal_per_load',
    category: 'site_prep_drainage',
    label: 'Disposal (per load)',
    unit: 'load',
    unitPrice: 450,
    kind: 'installed',
  },

  // 2) PREMIUM TURF & LAWN (2026 rates: Premium $1.95, Standard $1.35, Artificial $18, Hydroseed $0.22)
  sod_zoysia_bermuda_premium: {
    id: 'sod_zoysia_bermuda_premium',
    category: 'premium_turf_lawn',
    label: 'Zoysia / Bermuda premium sod (installed)',
    unit: 'sqft',
    unitPrice: 1.95,
    kind: 'installed',
  },
  sod_fescue_kbg: {
    id: 'sod_fescue_kbg',
    category: 'premium_turf_lawn',
    label: 'Fescue / Kentucky bluegrass sod (installed)',
    unit: 'sqft',
    unitPrice: 1.35,
    kind: 'installed',
  },
  artificial_turf_luxury: {
    id: 'artificial_turf_luxury',
    category: 'premium_turf_lawn',
    label: 'Artificial turf (luxury / pet-rated, installed)',
    unit: 'sqft',
    unitPrice: 18,
    kind: 'installed',
  },
  hydroseeding_large_area: {
    id: 'hydroseeding_large_area',
    category: 'premium_turf_lawn',
    label: 'Hydroseeding (large area)',
    unit: 'sqft',
    unitPrice: 0.22,
    kind: 'installed',
  },
  seeding_straw_traditional: {
    id: 'seeding_straw_traditional',
    category: 'premium_turf_lawn',
    label: 'Traditional seeding & straw',
    unit: 'sqft',
    unitPrice: 0.12,
    kind: 'installed',
  },

  // 3) HARDSCAPE & OUTDOOR LIVING
  patio_natural_bluestone_wet_set: {
    id: 'patio_natural_bluestone_wet_set',
    category: 'hardscape_outdoor_living',
    label: 'Natural bluestone patio (wet set)',
    unit: 'sqft',
    unitPrice: 38,
    kind: 'installed',
  },
  concrete_pavers_premium_texture: {
    id: 'concrete_pavers_premium_texture',
    category: 'hardscape_outdoor_living',
    label: 'Concrete pavers (premium texture)',
    unit: 'sqft',
    unitPrice: 22,
    kind: 'installed',
  },
  decking_composite_luxury: {
    id: 'decking_composite_luxury',
    category: 'hardscape_outdoor_living',
    label: 'Composite decking (Ipe / luxury)',
    unit: 'sqft',
    unitPrice: 75,
    kind: 'installed',
  },
  decking_wood_cedar: {
    id: 'decking_wood_cedar',
    category: 'hardscape_outdoor_living',
    label: 'Standard wood decking (cedar)',
    unit: 'sqft',
    unitPrice: 45,
    kind: 'installed',
  },
  gravel_walkway_stabilized: {
    id: 'gravel_walkway_stabilized',
    category: 'hardscape_outdoor_living',
    label: 'Gravel walkway (stabilized)',
    unit: 'sqft',
    unitPrice: 9,
    kind: 'installed',
  },
  stepping_stone_path_flagstone: {
    id: 'stepping_stone_path_flagstone',
    category: 'hardscape_outdoor_living',
    label: 'Stepping stone path (flagstone)',
    unit: 'sqft',
    unitPrice: 25,
    kind: 'installed',
  },

  // 4) STRUCTURES & RETENTION
  retaining_wall_natural_stone: {
    id: 'retaining_wall_natural_stone',
    category: 'structures_retention',
    label: 'Natural stone retaining wall',
    unit: 'face_sqft',
    unitPrice: 95,
    kind: 'installed',
  },
  retaining_wall_segmental_block: {
    id: 'retaining_wall_segmental_block',
    category: 'structures_retention',
    label: 'Segmental block wall',
    unit: 'face_sqft',
    unitPrice: 55,
    kind: 'installed',
  },
  retaining_wall_timber_pt: {
    id: 'retaining_wall_timber_pt',
    category: 'structures_retention',
    label: 'Timber wall (pressure treated)',
    unit: 'face_sqft',
    unitPrice: 30,
    kind: 'installed',
  },
  pergola_custom_wood_10x10: {
    id: 'pergola_custom_wood_10x10',
    category: 'structures_retention',
    label: 'Pergola (custom wood, 10x10 baseline)',
    unit: 'base',
    unitPrice: 5500,
    kind: 'installed',
  },
  outdoor_kitchen_basic_masonry: {
    id: 'outdoor_kitchen_basic_masonry',
    category: 'structures_retention',
    label: 'Outdoor kitchen (basic / masonry)',
    unit: 'base',
    unitPrice: 12000,
    kind: 'installed',
  },

  // 5) SPECIMEN PLANTING (SOFTSCAPING)
  privacy_screen_arborvitae_6_7: {
    id: 'privacy_screen_arborvitae_6_7',
    category: 'specimen_planting',
    label: 'Privacy screen (Arborvitae, 6–7 ft)',
    unit: 'tree',
    unitPrice: 325,
    kind: 'installed',
  },
  specimen_shade_tree_3_caliper: {
    id: 'specimen_shade_tree_3_caliper',
    category: 'specimen_planting',
    label: 'Large specimen shade tree (3" caliper, installed)',
    unit: 'tree',
    unitPrice: 950,
    kind: 'installed',
  },
  premium_shrub_5_7_gal: {
    id: 'premium_shrub_5_7_gal',
    category: 'specimen_planting',
    label: 'Premium shrub (5–7 gallon, installed)',
    unit: 'unit',
    unitPrice: 135,
    kind: 'installed',
  },
  ornamental_grass_perennial_1_gal: {
    id: 'ornamental_grass_perennial_1_gal',
    category: 'specimen_planting',
    label: 'Ornamental grass / perennial (1 gallon, installed)',
    unit: 'unit',
    unitPrice: 38,
    kind: 'installed',
  },
  flower_bed_install_soil_plants: {
    id: 'flower_bed_install_soil_plants',
    category: 'specimen_planting',
    label: 'Flower bed install (soil + plants)',
    unit: 'sqft',
    unitPrice: 18,
    kind: 'installed',
  },

  // 6) FINISHING TOUCHES
  mulch_hardwood_dark_brown: {
    id: 'mulch_hardwood_dark_brown',
    category: 'finishing_touches',
    label: 'Hardwood mulch (dark brown, installed)',
    unit: 'cubic_yard',
    unitPrice: 95,
    kind: 'installed',
  },
  river_rock_2_4: {
    id: 'river_rock_2_4',
    category: 'finishing_touches',
    label: 'River rock (2"–4", installed)',
    unit: 'cubic_yard',
    unitPrice: 165,
    kind: 'installed',
  },
  low_voltage_lighting_path_spot: {
    id: 'low_voltage_lighting_path_spot',
    category: 'finishing_touches',
    label: 'Low-voltage lighting (path / spot)',
    unit: 'fixture',
    unitPrice: 275,
    kind: 'installed',
  },
  automatic_irrigation_new_system: {
    id: 'automatic_irrigation_new_system',
    category: 'finishing_touches',
    label: 'Automatic irrigation (new system)',
    unit: 'sqft',
    unitPrice: 4.5,
    kind: 'installed',
  },
}

const DEFAULT_ASSUMED_AREA_SQFT: Record<ProjectSize, number> = {
  small: 150,
  medium: 300,
  large: 600,
}

const DEFAULT_ASSUMED_LINEAR_FT: Record<ProjectSize, number> = {
  small: 30,
  medium: 50,
  large: 80,
}

const DEFAULT_ASSUMED_CREW_HOURS: Record<ServiceType, Record<ProjectSize, number>> =
{
  landscaping: { small: 12, medium: 20, large: 36 },
  hardscaping: { small: 24, medium: 48, large: 80 },
  framing: { small: 30, medium: 60, large: 100 },
  mowing: { small: 1.5, medium: 2.5, large: 4.5 },
}

function toValidProjectSize(size: unknown): ProjectSize {
  if (size === 'small' || size === 'medium' || size === 'large') return size
  return 'medium'
}

function roundCurrency(value: number): number {
  return Math.round(value)
}

function sum(items: LineItem[]): number {
  return items.reduce((acc, item) => acc + item.amount, 0)
}

function buildCatalogLineItem(
  catalogId: keyof typeof MASTER_CATALOG,
  quantity: number,
  note?: string,
): LineItem {
  const item = MASTER_CATALOG[catalogId]
  const bakedIn =
    item.kind === 'installed' ? 1 + MATERIALS_MARKUP_BAKED_IN : 1
  const effectiveUnitPrice = item.unitPrice * bakedIn
  const amount = roundCurrency(effectiveUnitPrice * quantity)
  const unitLabel =
    item.unit === 'base' ? 'base' : item.unit.replace('_', ' ')
  return {
    label: item.label,
    amount,
    note:
      note ??
      `${quantity.toLocaleString()} ${unitLabel} × $${effectiveUnitPrice.toFixed(2)}/${unitLabel}`,
    kind: item.kind,
  }
}

function buildLaborLineItem(hours: number, label = 'General crew labor'): LineItem {
  const amount = roundCurrency(hours * GENERAL_CREW_LABOR_RATE_PER_HOUR)
  return {
    label,
    amount,
    note: `${hours.toFixed(1)} hr × $${GENERAL_CREW_LABOR_RATE_PER_HOUR}/hr`,
    kind: 'labor',
  }
}

function getAssumedAreaSqFt(projectSize: ProjectSize): number {
  return DEFAULT_ASSUMED_AREA_SQFT[projectSize]
}

function getAssumedLinearFt(projectSize: ProjectSize): number {
  return DEFAULT_ASSUMED_LINEAR_FT[projectSize]
}

function getBaseScopeItems(input: EstimateInput): LineItem[] {
  const projectSize = toValidProjectSize(input.projectSize)
  const area = getAssumedAreaSqFt(projectSize)

  switch (input.service) {
    case 'hardscaping': {
      // Use "material" factor as a proxy for patio vs deck preference.
      const catalogId =
        input.factors.material === 'stone'
          ? 'concrete_pavers_premium_texture'
          : 'decking_composite_luxury'
      return [buildCatalogLineItem(catalogId, area)]
    }
    case 'framing': {
      // Deck/framing baseline: standard wood deck surface assumption.
      return [buildCatalogLineItem('decking_wood_cedar', area)]
    }
    case 'landscaping': {
      // Turf baseline: default to fescue/KBG unless premium sod is explicitly desired elsewhere.
      return [buildCatalogLineItem('sod_fescue_kbg', area)]
    }
    case 'mowing':
    default:
      return []
  }
}

/**
 * Deterministic, transparent baseline estimate.
 * Gemini will receive this plus the factors and can recommend adjustments.
 */
export function calculateBaselineEstimate(input: EstimateInput): BaselineEstimate {
  const projectSize = toValidProjectSize(input.projectSize)
  const baseHours = DEFAULT_ASSUMED_CREW_HOURS[input.service][projectSize]

  const lineItems: LineItem[] = [
    buildLaborLineItem(
      baseHours,
      input.service === 'mowing'
        ? 'General crew labor (mow, edge, blow)'
        : 'General crew labor (prep, build, cleanup)',
    ),
    ...getBaseScopeItems(input),
  ]

  const baseTotal = sum(lineItems)

  return {
    baseTotal,
    lineItems,
  }
}

/**
 * Simple local heuristic adjustment for obviously expensive conditions.
 * This runs even without Gemini so the app is still useful without an API key.
 *
 * Includes:
 * - Complication factor adders (labor-heavy)
 * - Master catalog adders (demo, drainage)
 * - Profit & fee logic (materials markup, PM fee, contingency)
 */
export function applyLocalComplicationAdjustments(
  baseline: BaselineEstimate,
  factors: ComplicationFactors,
): PricedEstimate {
  const baseLineItems = [...baseline.lineItems]
  const extraLineItems: LineItem[] = []

  // --- Complication factor adjustments expressed as labor hour adders ---
  let laborHoursMultiplier = 1
  let laborExtraHours = 0
  const complicationNotes: string[] = []

  if (factors.restrictedAccess) {
    laborHoursMultiplier *= 1.3
    complicationNotes.push(
      'Narrow access: 30% labor increase for hand-carry and limited equipment.',
    )
  }

  if (factors.steepSlope) {
    laborHoursMultiplier *= 1.2
    complicationNotes.push('Steep slopes slow production and add safety/setup time (+20% labor).')
  }

  if (factors.manyObstacles) {
    laborHoursMultiplier *= 1.15
    complicationNotes.push('Obstacles increase detail/trimming work (+15% labor).')
  }

  if (factors.deckHeight === 'high') {
    laborHoursMultiplier *= 1.2
    complicationNotes.push('High elevation framing adds bracing and safety setup (+20% labor).')
  }

  // We estimate the "base hours" from the labor line item(s) if present.
  const baseLaborDollars = baseLineItems
    .filter((i) => i.kind === 'labor')
    .reduce((acc, i) => acc + i.amount, 0)
  const baseHours = baseLaborDollars / GENERAL_CREW_LABOR_RATE_PER_HOUR
  const multipliedHours = baseHours * (laborHoursMultiplier - 1)
  if (multipliedHours > 0.01) laborExtraHours += multipliedHours

  // Demolition: add as master catalog item if flagged
  if (factors.existingDemolition) {
    // Without exact sqft, assume demo is ~50% of the project area.
    const demoAreaSqFt = DEFAULT_ASSUMED_AREA_SQFT.medium * 0.5
    extraLineItems.push(
      buildCatalogLineItem(
        'demolition_old_concrete_deck',
        demoAreaSqFt,
        'Assumption: demolition area ~50% of work zone. Confirm on site.',
      ),
    )
    complicationNotes.push('Demo required adds breaking, hauling, and disposal.')
  }

  // Clay soil: add drainage preparation using French drain as a transparent stand-in
  if (factors.soilType === 'clay') {
    const lf = getAssumedLinearFt('medium')
    extraLineItems.push(
      buildCatalogLineItem(
        'french_drain_install',
        lf,
        'Clay soil often benefits from drainage prep; scope confirmed during site visit.',
      ),
    )
    complicationNotes.push('Clay soil often requires drainage preparation.')
  }

  // Utilities / permits: advisory notes (no hard cost here unless you want it)
  if (factors.undergroundUtilities === 'unknown') {
    complicationNotes.push(
      'Underground utilities should be located prior to digging; final scope may adjust after locates.',
    )
  }

  if (
    factors.permitStatus === 'needed' ||
    factors.permitStatus === 'applied' ||
    factors.permitStatus === 'approved'
  ) {
    complicationNotes.push('Permit requirements may affect build specs and inspection scope.')
  }

  if (factors.backyardOnly) {
    extraLineItems.push({
      label: 'Backyard-only access buffer',
      amount: 500,
      note: 'No drive-through access; additional mobilization and hand-carry.',
      kind: 'fee',
    })
  }

  if (laborExtraHours > 0.01) {
    extraLineItems.unshift(
      buildLaborLineItem(
        Number(laborExtraHours.toFixed(1)),
        'Additional labor (access/slope/complexity)',
      ),
    )
  }

  // --- Visible fees (no separate material markup; 20% is baked into installed prices) ---
  const subtotalBeforeFees = sum([...baseLineItems, ...extraLineItems])

  const projectManagementFee = roundCurrency(
    subtotalBeforeFees * PROFIT_AND_FEES.projectManagementRate,
  )
  const contingencyFund = roundCurrency(
    subtotalBeforeFees * PROFIT_AND_FEES.contingencyRate,
  )
  const netProfit = roundCurrency(
    subtotalBeforeFees * PROFIT_AND_FEES.netProfitRate,
  )

  const feeItems: LineItem[] = [
    {
      label: 'Project management fee (10%)',
      amount: projectManagementFee,
      note: 'Scheduling, procurement, coordination, and quality control.',
      kind: 'fee',
    },
    {
      label: 'Contingency fund (5%)',
      amount: contingencyFund,
      note: 'Buffer for unforeseen site conditions.',
      kind: 'fee',
    },
    {
      label: 'Net profit (15%)',
      amount: netProfit,
      note: 'Company margin on project.',
      kind: 'fee',
    },
  ]

  const lineItems: LineItem[] = [
    ...baseLineItems,
    ...extraLineItems,
    ...feeItems,
  ].map((item) =>
    item.label === 'Additional labor (access/slope/complexity)' && complicationNotes.length
      ? { ...item, note: complicationNotes.join(' ') }
      : item,
  )

  const adjustedTotal = sum(lineItems)

  return {
    baseTotal: baseline.baseTotal,
    lineItems,
    adjustedTotal,
  }
}

