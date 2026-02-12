/**
 * UK 2026 Landscape QS - 4-Phase Diagnostic FSM
 * 
 * Strict gatekeeping protocol using XState + Zod validation.
 * Metric units only. Rejects single-number area inputs.
 */

import { setup, assign } from 'xstate'
import { z } from 'zod'

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Phase 1: Logistics & Site Audit
 * - Can 90cm excavator access site?
 * - Is there driveway for skip placement?
 */
export const LogisticsSchema = z.object({
  hasExcavatorAccess: z.boolean({
    required_error: 'Excavator access status required',
    invalid_type_error: 'Excavator access must be yes/no'
  }),
  hasDrivewayForSkip: z.boolean({
    required_error: 'Driveway availability required',
    invalid_type_error: 'Driveway availability must be yes/no'
  })
})

/**
 * Phase 2: Ground Conditions & Demolition
 * - Slope level (Flat / Moderate / Steep)
 * - Sub-base type (Dirt / Hardscape)
 * - Existing demolition required?
 */
export const GroundConditionsSchema = z.object({
  slopeLevel: z.enum(['flat', 'moderate', 'steep'], {
    required_error: 'Slope level required',
    invalid_type_error: 'Slope must be Flat, Moderate, or Steep'
  }),
  subBaseType: z.enum(['dirt', 'hardscape'], {
    required_error: 'Sub-base type required',
    invalid_type_error: 'Sub-base must be Dirt or Hardscape'
  }),
  existingDemolition: z.boolean({
    required_error: 'Demolition status required',
    invalid_type_error: 'Demolition status must be yes/no'
  })
})

/**
 * Phase 3: Geometric Validation (CRITICAL)
 * - MUST provide length AND width separately
 * - Rejects single-number area inputs
 * - Calculates area as length × width
 */
export const DimensionsSchema = z.object({
  length_m: z.number({
    required_error: 'Length required',
    invalid_type_error: 'Length must be a number'
  }).positive('Length must be greater than 0'),

  width_m: z.number({
    required_error: 'Width required',
    invalid_type_error: 'Width must be a number'
  }).positive('Width must be greater than 0'),

  deckHeight_m: z.number().positive().optional()
}).refine(
  (data) => data.length_m > 0 && data.width_m > 0,
  {
    message: 'Cannot accept single-number area input. Provide length × width in meters.',
    path: ['length_m']
  }
)

/**
 * Phase 4: Material Tiering
 * - Service type (hardscaping / decking / softscaping)
 * - Material tier (standard / premium / luxury)
 */
export const MaterialTierSchema = z.object({
  service: z.enum(['hardscaping', 'decking', 'softscaping'], {
    required_error: 'Service type required',
    invalid_type_error: 'Invalid service type'
  }),
  materialTier: z.enum(['standard', 'premium', 'luxury'], {
    required_error: 'Material tier required',
    invalid_type_error: 'Material tier must be Standard, Premium, or Luxury'
  })
})

// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type LogisticsData = z.infer<typeof LogisticsSchema>
export type GroundConditionsData = z.infer<typeof GroundConditionsSchema>
export type DimensionsData = z.infer<typeof DimensionsSchema>
export type MaterialTierData = z.infer<typeof MaterialTierSchema>

// ============================================================================
// FSM CONTEXT & EVENTS
// ============================================================================

export interface LandscapeQSContext {
  // Phase data
  logistics: LogisticsData | null
  groundConditions: GroundConditionsData | null
  dimensions: DimensionsData | null
  materialTier: MaterialTierData | null

  // Error tracking
  errors: string[]

  // Current phase for UI
  currentPhase: 1 | 2 | 3 | 4 | 5
}

export type LandscapeQSEvent =
  | { type: 'SUBMIT_LOGISTICS'; data: unknown }
  | { type: 'SUBMIT_GROUND'; data: unknown }
  | { type: 'SUBMIT_DIMENSIONS'; data: unknown }
  | { type: 'SUBMIT_MATERIAL'; data: unknown }
  | { type: 'RESET' }
  | { type: 'BACK' }

// ============================================================================
// XSTATE MACHINE DEFINITION
// ============================================================================

export const landscapeQSMachine = setup({
  types: {
    context: {} as LandscapeQSContext,
    events: {} as LandscapeQSEvent
  },

  guards: {
    /**
     * Validate Phase 1: Logistics
     */
    isValidLogistics: ({ event }) => {
      if (event.type !== 'SUBMIT_LOGISTICS') return false
      const result = LogisticsSchema.safeParse(event.data)
      return result.success
    },

    /**
     * Validate Phase 2: Ground Conditions
     */
    isValidGround: ({ event }) => {
      if (event.type !== 'SUBMIT_GROUND') return false
      const result = GroundConditionsSchema.safeParse(event.data)
      return result.success
    },

    /**
     * Validate Phase 3: Dimensions (STRICT)
     * Rejects single-number inputs
     */
    isValidDimensions: ({ event }) => {
      if (event.type !== 'SUBMIT_DIMENSIONS') return false
      const result = DimensionsSchema.safeParse(event.data)
      return result.success
    },

    /**
     * Validate Phase 4: Material Tier
     */
    isValidMaterial: ({ event }) => {
      if (event.type !== 'SUBMIT_MATERIAL') return false
      const result = MaterialTierSchema.safeParse(event.data)
      return result.success
    }
  },

  actions: {
    /**
     * Save validated logistics data
     */
    saveLogistics: assign({
      logistics: ({ event }) => {
        if (event.type !== 'SUBMIT_LOGISTICS') return null
        return LogisticsSchema.parse(event.data)
      },
      currentPhase: 2,
      errors: []
    }),

    /**
     * Save validated ground conditions data
     */
    saveGround: assign({
      groundConditions: ({ event }) => {
        if (event.type !== 'SUBMIT_GROUND') return null
        return GroundConditionsSchema.parse(event.data)
      },
      currentPhase: 3,
      errors: []
    }),

    /**
     * Save validated dimensions data
     */
    saveDimensions: assign({
      dimensions: ({ event }) => {
        if (event.type !== 'SUBMIT_DIMENSIONS') return null
        return DimensionsSchema.parse(event.data)
      },
      currentPhase: 4,
      errors: []
    }),

    /**
     * Save validated material tier data
     */
    saveMaterial: assign({
      materialTier: ({ event }) => {
        if (event.type !== 'SUBMIT_MATERIAL') return null
        return MaterialTierSchema.parse(event.data)
      },
      currentPhase: 5,
      errors: []
    }),

    /**
     * Set validation error
     */
    setError: assign({
      errors: ({ event }) => {
        if (event.type === 'SUBMIT_LOGISTICS') {
          const result = LogisticsSchema.safeParse(event.data)
          if (!result.success) {
            return result.error.errors.map(e => e.message)
          }
        }
        if (event.type === 'SUBMIT_GROUND') {
          const result = GroundConditionsSchema.safeParse(event.data)
          if (!result.success) {
            return result.error.errors.map(e => e.message)
          }
        }
        if (event.type === 'SUBMIT_DIMENSIONS') {
          const result = DimensionsSchema.safeParse(event.data)
          if (!result.success) {
            return result.error.errors.map(e => e.message)
          }
        }
        if (event.type === 'SUBMIT_MATERIAL') {
          const result = MaterialTierSchema.safeParse(event.data)
          if (!result.success) {
            return result.error.errors.map(e => e.message)
          }
        }
        return ['Validation failed']
      }
    }),

    /**
     * Clear all data and reset to Phase 1
     */
    resetContext: assign({
      logistics: null,
      groundConditions: null,
      dimensions: null,
      materialTier: null,
      errors: [],
      currentPhase: 1
    })
  }
}).createMachine({
  id: 'landscapeQS',
  initial: 'phase1_logistics',
  context: {
    logistics: null,
    groundConditions: null,
    dimensions: null,
    materialTier: null,
    errors: [],
    currentPhase: 1
  },

  states: {
    /**
     * PHASE 1: Logistics & Site Audit
     */
    phase1_logistics: {
      on: {
        SUBMIT_LOGISTICS: [
          {
            guard: 'isValidLogistics',
            actions: 'saveLogistics',
            target: 'phase2_ground'
          },
          {
            actions: 'setError'
          }
        ]
      }
    },

    /**
     * PHASE 2: Ground Conditions & Demolition
     */
    phase2_ground: {
      on: {
        SUBMIT_GROUND: [
          {
            guard: 'isValidGround',
            actions: 'saveGround',
            target: 'phase3_dimensions'
          },
          {
            actions: 'setError'
          }
        ],
        BACK: {
          target: 'phase1_logistics',
          actions: assign({ currentPhase: 1, errors: [] })
        }
      }
    },

    /**
     * PHASE 3: Geometric Validation (CRITICAL GATEKEEPING)
     * Rejects single-number area inputs
     */
    phase3_dimensions: {
      on: {
        SUBMIT_DIMENSIONS: [
          {
            guard: 'isValidDimensions',
            actions: 'saveDimensions',
            target: 'phase4_material'
          },
          {
            actions: 'setError'
          }
        ],
        BACK: {
          target: 'phase2_ground',
          actions: assign({ currentPhase: 2, errors: [] })
        }
      }
    },

    /**
     * PHASE 4: Material Tiering
     */
    phase4_material: {
      on: {
        SUBMIT_MATERIAL: [
          {
            guard: 'isValidMaterial',
            actions: 'saveMaterial',
            target: 'complete'
          },
          {
            actions: 'setError'
          }
        ],
        BACK: {
          target: 'phase3_dimensions',
          actions: assign({ currentPhase: 3, errors: [] })
        }
      }
    },

    /**
     * PHASE 5: Complete (Ready for Estimation)
     */
    complete: {
      type: 'final'
    }
  },

  /**
   * Global transitions
   */
  on: {
    RESET: {
      target: '.phase1_logistics',
      actions: 'resetContext'
    }
  }
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build complete ProjectInputs from FSM context.
 * Only call when machine is in 'complete' state.
 */
export function buildProjectInputs(context: LandscapeQSContext) {
  if (!context.logistics || !context.groundConditions || !context.dimensions || !context.materialTier) {
    throw new Error('Cannot build inputs: FSM not complete')
  }

  const area_m2 = context.dimensions.length_m * context.dimensions.width_m

  return {
    service: context.materialTier.service,
    hasExcavatorAccess: context.logistics.hasExcavatorAccess,
    hasDrivewayForSkip: context.logistics.hasDrivewayForSkip,
    slopeLevel: context.groundConditions.slopeLevel,
    subBaseType: context.groundConditions.subBaseType,
    existingDemolition: context.groundConditions.existingDemolition,
    length_m: context.dimensions.length_m,
    width_m: context.dimensions.width_m,
    area_m2,
    materialTier: context.materialTier.materialTier,
    deckHeight_m: context.dimensions.deckHeight_m
  }
}

/**
 * Get current phase number from state value.
 */
export function getCurrentPhaseNumber(stateValue: string): 1 | 2 | 3 | 4 | 5 {
  if (stateValue === 'phase1_logistics') return 1
  if (stateValue === 'phase2_ground') return 2
  if (stateValue === 'phase3_dimensions') return 3
  if (stateValue === 'phase4_material') return 4
  if (stateValue === 'complete') return 5
  return 1
}

/**
 * Get phase label for UI display.
 */
export function getPhaseLabel(phase: 1 | 2 | 3 | 4 | 5): string {
  const labels = {
    1: 'Phase 1: Logistics & Site Audit',
    2: 'Phase 2: Ground Conditions & Demolition',
    3: 'Phase 3: Dimensions (Length × Width)',
    4: 'Phase 4: Material Tier Selection',
    5: 'Estimate Complete'
  }
  return labels[phase]
}
