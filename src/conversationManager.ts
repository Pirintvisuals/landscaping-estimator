/**
 * Conversation Manager - Multi-Turn Chatbot Logic
 * 
 * Handles state tracking, intent detection, and question generation
 * for the conversational UK Landscape QS agent.
 */

import type { ServiceType, MaterialTier, SlopeLevel, SubBaseType } from './qouter'

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
    id: string
    role: 'agent' | 'user' | 'estimate'
    content: string
    timestamp: Date
}

export interface ConversationState {
    // Service detection
    service: ServiceType | null

    // Dimensions
    area_m2: number | null
    length_m: number | null
    width_m: number | null

    // Material selection
    materialTier: MaterialTier | null

    // Site conditions
    hasExcavatorAccess: boolean | null
    hasDrivewayForSkip: boolean | null
    slopeLevel: SlopeLevel | null
    subBaseType: SubBaseType | null
    existingDemolition: boolean | null

    // Service-specific fields
    deckHeight_m: number | null
    overgrown: boolean | null  // For mowing
    gateCount: number | null   // For fencing

    // Upsells (Revenue Multiplier)
    wantsDrainage: boolean | null  // +£850
    wantsLedLighting: boolean | null  // +£1,200

    // Conversation metadata
    messageHistory: ChatMessage[]
    certaintyLevel: number  // 0-100
    awaitingEstimate: boolean

    // Retry tracking for fallback system
    retryCount: Record<string, number>  // Track failed attempts per field
    lastQuestionField: string | null    // Track what field was last asked about
    showQuickReplies: boolean           // Whether to show clickable options

    // Lead qualification
    budgetAligns: boolean | null  // true = aligns, false = adjust scope
    contactPhone: string | null
    contactEmail: string | null

    // User information (collected before revealing estimate)
    fullName: string | null
    userBudget: number | null  // User's estimated budget
}

export interface ExtractedInfo {
    service?: ServiceType
    area_m2?: number
    length_m?: number
    width_m?: number
    materialTier?: MaterialTier
    hasExcavatorAccess?: boolean
    hasDrivewayForSkip?: boolean
    slopeLevel?: SlopeLevel
    subBaseType?: SubBaseType
    existingDemolition?: boolean
    deckHeight_m?: number
    overgrown?: boolean
    gateCount?: number
    wantsDrainage?: boolean
    wantsLedLighting?: boolean
    budgetAligns?: boolean
    fullName?: string
    userBudget?: number
    contactEmail?: string
    contactPhone?: string
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export function createInitialState(): ConversationState {
    return {
        service: null,
        area_m2: null,
        length_m: null,
        width_m: null,
        materialTier: null,
        hasExcavatorAccess: null,
        hasDrivewayForSkip: null,
        slopeLevel: null,
        subBaseType: null,
        existingDemolition: null,
        deckHeight_m: null,
        overgrown: null,
        gateCount: null,
        wantsDrainage: null,
        wantsLedLighting: null,
        messageHistory: [],
        certaintyLevel: 0,
        awaitingEstimate: false,
        retryCount: {},
        lastQuestionField: null,
        showQuickReplies: false,
        budgetAligns: null,
        contactPhone: null,
        contactEmail: null,
        fullName: null,
        userBudget: null
    }
}

// ============================================================================
// CERTAINTY CALCULATION
// ============================================================================

export function calculateCertainty(state: ConversationState): number {
    let score = 0
    let maxScore = 0

    // Service type (25 points - critical)
    maxScore += 25
    if (state.service) score += 25

    // Dimensions (30 points - critical for pricing)
    maxScore += 30
    if (state.area_m2 || (state.length_m && state.width_m)) {
        score += 30
    }

    // Material tier (20 points - important for accurate pricing)
    maxScore += 20
    if (state.materialTier) score += 20

    // Service-specific scoring (25 points)
    if (state.service === 'mowing') {
        // For mowing: overgrown status is the key field
        maxScore += 25
        if (state.overgrown !== null) score += 25
    } else if (state.service === 'planting' || state.service === 'softscaping') {
        // For planting/softscaping: lighter requirements
        maxScore += 10
        if (state.slopeLevel) score += 5
        if (state.hasDrivewayForSkip !== null) score += 5
        // Lower total maxScore means higher percentage with just basics
    } else {
        // For hardscaping/decking/fencing/framing: need site info
        maxScore += 10
        if (state.hasExcavatorAccess !== null) score += 10

        maxScore += 5
        if (state.hasDrivewayForSkip !== null) score += 5

        maxScore += 5
        if (state.slopeLevel) score += 5

        maxScore += 5
        if (state.existingDemolition !== null) score += 5
    }

    return Math.round((score / maxScore) * 100)
}

// ============================================================================
// QUESTION GENERATION
// ============================================================================

export function getNextQuestion(state: ConversationState): string | null {
    // Priority 1: Service type
    if (!state.service) {
        return "Good day. I'm the Digital Front Desk for your professional landscaping requirements. I'll calculate a ballpark investment for your project. What service are you interested in today?"
    }

    // Priority 2: Dimensions
    if (!state.area_m2 && !state.length_m && !state.width_m) {
        const serviceExamples: Record<ServiceType, string> = {
            hardscaping: "How large of an area are we working with? You can give me rough dimensions like '10 meters by 5 meters' or just the total area.",
            decking: "How large of an area are we working with? You can give me rough dimensions like '8m x 4m' or just the total area.",
            softscaping: "What's the size of the area you'd like landscaped? Rough dimensions are fine.",
            mowing: "How large is your lawn? You can tell me in square meters or give rough dimensions.",
            planting: "What size is the planting area? Rough dimensions or total area would help.",
            fencing: "How much fencing do you need? You can give me the perimeter length in meters.",
            framing: "What's the footprint of the structure you're thinking about? Give me rough dimensions."
        }
        return serviceExamples[state.service]
    }

    // Priority 3: Material tier
    if (!state.materialTier) {
        const tierQuestions: Record<ServiceType, string> = {
            hardscaping: "What material are you considering? Options range from concrete pavers (budget-friendly) to Indian sandstone (mid-range) to porcelain paving (premium).",
            decking: "What material are you considering—softwood, composite, or hardwood like Ipe?",
            softscaping: "What level of landscaping are you thinking? Basic planting, premium specimens, or full architectural design?",
            mowing: "What level of service do you need? Basic cut and collect, precision cut with edging, or full grounds maintenance?",
            planting: "What type of plants are you thinking about? Container plants, specimen plants, or architectural planting?",
            fencing: "What material are you considering? Softwood panels, treated slats, or premium cedar?",
            framing: "What type of structure? Basic pergola frame, engineered timber, or custom hardwood?"
        }
        return tierQuestions[state.service]
    }

    // Priority 4: Site access (critical for labor multiplier)
    // Skip for services that don't require excavation
    const excavationServices = ['hardscaping', 'decking', 'fencing', 'framing']
    if (state.hasExcavatorAccess === null && state.service && excavationServices.includes(state.service)) {
        return "Is there a way for a small digger (about 90cm wide) to get into your garden, or is the gate narrower than that?"
    }

    // Priority 5: Service-specific questions

    // Decking: Ask about height
    if (state.service === 'decking' && state.deckHeight_m === null) {
        return "How high off the ground will this deck be? This helps me factor in safety requirements."
    }

    // Mowing: Ask about overgrowth
    if (state.service === 'mowing' && state.overgrown === null) {
        return "When was it last cut? If it's been more than 2 weeks, I'll need to factor in extra time for collection."
    }

    // Fencing: Ask about gates
    if (state.service === 'fencing' && state.gateCount === null) {
        return "Will you need any gates in this fence?"
    }

    // Priority 6: Site conditions (only for services needing heavy work)
    const heavyWorkServices = ['hardscaping', 'decking', 'fencing', 'framing', 'softscaping']
    if (state.hasDrivewayForSkip === null && state.service && heavyWorkServices.includes(state.service)) {
        return "Is there a driveway where we can place a skip for waste disposal, or would it need to go on the street?"
    }

    if (state.slopeLevel === null && state.service && heavyWorkServices.includes(state.service)) {
        return "How would you describe the ground—fairly flat, moderate slope, or quite steep?"
    }

    if (state.existingDemolition === null && (state.service === 'hardscaping' || state.service === 'decking')) {
        return "Is there any existing hardscape or structure we'd need to remove first?"
    }

    // Priority 7: User information (collected BEFORE revealing estimate)
    if (!state.fullName) {
        return "Before I prepare your estimate, may I have your full name for the project summary?"
    }

    if (!state.contactPhone) {
        return "And what's the best phone number to reach you at?"
    }

    if (!state.contactEmail) {
        return "And your email address?"
    }

    if (state.userBudget === null) {
        return "What budget have you set aside for this project? This helps me understand if we're aligned."
    }

    // All essential questions answered
    return null
}

// ============================================================================
// ACKNOWLEDGMENT GENERATION
// ============================================================================

export function generateAcknowledgment(_state: ConversationState, extracted: ExtractedInfo): string {
    const acks: string[] = []

    if (extracted.service) {
        const serviceNames: Record<ServiceType, string> = {
            hardscaping: "Hardscaping can really transform a space.",
            decking: "Decking is a great choice for outdoor living.",
            softscaping: "Landscaping will bring so much character to your garden.",
            mowing: "I can help you get that lawn looking pristine.",
            planting: "Beautiful planting can make all the difference.",
            fencing: "A good fence adds privacy and defines your space.",
            framing: "Outdoor structures create wonderful focal points."
        }
        acks.push(serviceNames[extracted.service])
    }

    if (extracted.area_m2 || (extracted.length_m && extracted.width_m)) {
        const area = extracted.area_m2 || (extracted.length_m! * extracted.width_m!)
        acks.push(`So roughly ${area.toFixed(0)} square meters.`)
    }

    if (extracted.materialTier === 'luxury') {
        acks.push("Premium choice—that'll look stunning.")
    } else if (extracted.materialTier === 'premium') {
        acks.push("Solid mid-range option with great longevity.")
    } else if (extracted.materialTier === 'standard') {
        acks.push("Good budget-friendly option.")
    }

    // Only acknowledge if they JUST told us about narrow access in this message (not already in state)
    if (extracted.hasExcavatorAccess === false && _state.hasExcavatorAccess === null) {
        acks.push("Since the access is narrow, I'll need to factor in manual labor for the excavation phase.")
    }

    if (extracted.slopeLevel === 'steep') {
        acks.push("Given that the ground is steep, we'll need specialized grading equipment.")
    }

    if (extracted.deckHeight_m && extracted.deckHeight_m > 1.5) {
        acks.push(`At ${extracted.deckHeight_m.toFixed(1)}m height, we'll need scaffolding for safety.`)
    }

    if (extracted.overgrown) {
        acks.push("Since it's been a while since the last cut, I'll factor in extra time for collection.")
    }

    if (extracted.gateCount && extracted.gateCount > 0) {
        const plural = extracted.gateCount > 1 ? 'gates' : 'gate'
        acks.push(`I'll include ${extracted.gateCount} ${plural} in the estimate.`)
    }

    return acks.join(' ')
}

// ============================================================================
// STATE UPDATE
// ============================================================================

export function updateStateWithExtraction(
    state: ConversationState,
    extracted: ExtractedInfo
): ConversationState {
    const updated = { ...state }

    if (extracted.service) updated.service = extracted.service
    if (extracted.area_m2) updated.area_m2 = extracted.area_m2
    if (extracted.length_m) updated.length_m = extracted.length_m
    if (extracted.width_m) updated.width_m = extracted.width_m
    if (extracted.materialTier) updated.materialTier = extracted.materialTier
    if (extracted.hasExcavatorAccess !== undefined) updated.hasExcavatorAccess = extracted.hasExcavatorAccess
    if (extracted.hasDrivewayForSkip !== undefined) updated.hasDrivewayForSkip = extracted.hasDrivewayForSkip
    if (extracted.slopeLevel) updated.slopeLevel = extracted.slopeLevel
    if (extracted.subBaseType) updated.subBaseType = extracted.subBaseType
    if (extracted.existingDemolition !== undefined) updated.existingDemolition = extracted.existingDemolition
    if (extracted.deckHeight_m !== undefined) updated.deckHeight_m = extracted.deckHeight_m
    if (extracted.overgrown !== undefined) updated.overgrown = extracted.overgrown
    if (extracted.gateCount) updated.gateCount = extracted.gateCount
    if (extracted.wantsDrainage !== undefined) updated.wantsDrainage = extracted.wantsDrainage
    if (extracted.wantsLedLighting !== undefined) updated.wantsLedLighting = extracted.wantsLedLighting
    if (extracted.budgetAligns !== undefined) updated.budgetAligns = extracted.budgetAligns

    // Only accept fullName if we are currently asking for it, OR if it's very clearly a name introduction
    const currentField = state.lastQuestionField || detectCurrentField(state)
    const isNameQuestion = currentField === 'fullName'

    if (extracted.fullName && (isNameQuestion || extracted.fullName.toLowerCase().includes('name is'))) {
        updated.fullName = extracted.fullName
    }

    if (extracted.userBudget !== undefined) updated.userBudget = extracted.userBudget
    if (extracted.contactEmail) updated.contactEmail = extracted.contactEmail

    // CRITICAL: Ensure phone is updated
    if (extracted.contactPhone) {
        updated.contactPhone = extracted.contactPhone
    }

    // Calculate area if dimensions provided
    if (updated.length_m && updated.width_m && !updated.area_m2) {
        updated.area_m2 = updated.length_m * updated.width_m
    }

    // Update certainty
    updated.certaintyLevel = calculateCertainty(updated)

    return updated
}

// ============================================================================
// RETRY TRACKING HELPERS
// ============================================================================

/**
 * Detect which field we're currently asking about based on conversation state
 */
export function detectCurrentField(state: ConversationState): string {
    if (!state.service) return 'service'
    if (!state.area_m2 && !state.length_m && !state.width_m) return 'dimensions'
    if (!state.materialTier) return 'materialTier'

    const excavationServices = ['hardscaping', 'decking', 'fencing', 'framing']
    if (state.hasExcavatorAccess === null && state.service && excavationServices.includes(state.service)) {
        return 'excavatorAccess'
    }

    if (state.service === 'decking' && state.deckHeight_m === null) return 'deckHeight'
    if (state.service === 'mowing' && state.overgrown === null) return 'overgrown'
    if (state.service === 'fencing' && state.gateCount === null) return 'gateCount'

    const heavyWorkServices = ['hardscaping', 'decking', 'fencing', 'framing', 'softscaping']
    if (state.hasDrivewayForSkip === null && state.service && heavyWorkServices.includes(state.service)) {
        return 'driveway'
    }
    if (state.slopeLevel === null && state.service && heavyWorkServices.includes(state.service)) {
        return 'slope'
    }

    if (state.existingDemolition === null && (state.service === 'hardscaping' || state.service === 'decking')) {
        return 'demolition'
    }

    // User information fields (collected before estimate)
    if (!state.fullName) return 'fullName'
    if (!state.contactPhone) return 'contactPhone'
    if (!state.contactEmail) return 'contactEmail'
    if (state.userBudget === null) return 'userBudget'

    return 'unknown'
}

/**
 * Check if anything was extracted from the user's message
 */
export function hasExtractedInfo(extracted: ExtractedInfo): boolean {
    return Object.keys(extracted).length > 0
}

/**
 * Check if the RELEVANT field for the current question was extracted
 * This prevents false positives where stray keywords trigger unrelated extractions
 */
export function isRelevantFieldExtracted(
    currentField: string,
    extracted: ExtractedInfo,
    oldState: ConversationState,
    newState: ConversationState
): boolean {
    switch (currentField) {
        case 'service':
            return newState.service !== null && oldState.service === null

        case 'dimensions':
            return (newState.area_m2 !== null && oldState.area_m2 === null) ||
                (newState.length_m !== null && oldState.length_m === null) ||
                (newState.width_m !== null && oldState.width_m === null)

        case 'materialTier':
            return newState.materialTier !== null && oldState.materialTier === null

        case 'excavatorAccess':
            return newState.hasExcavatorAccess !== null && oldState.hasExcavatorAccess === null

        case 'driveway':
            return newState.hasDrivewayForSkip !== null && oldState.hasDrivewayForSkip === null

        case 'slope':
            return newState.slopeLevel !== null && oldState.slopeLevel === null

        case 'demolition':
            return newState.existingDemolition !== null && oldState.existingDemolition === null

        case 'deckHeight':
            return newState.deckHeight_m !== null && oldState.deckHeight_m === null

        case 'overgrown':
            return newState.overgrown !== null && oldState.overgrown === null

        case 'gateCount':
            return newState.gateCount !== null && oldState.gateCount === null

        case 'fullName':
            return newState.fullName !== null && oldState.fullName === null

        case 'contactPhone':
            return newState.contactPhone !== null && oldState.contactPhone === null

        case 'contactEmail':
            return newState.contactEmail !== null && oldState.contactEmail === null

        case 'userBudget':
            return newState.userBudget !== null && oldState.userBudget === null

        default:
            // For unknown fields, fall back to general extraction check
            return hasExtractedInfo(extracted)
    }
}

/**
 * Reset retry count (when extraction is successful)
 */
export function incrementRetryCount(state: ConversationState, field: string): ConversationState {
    const currentCount = state.retryCount[field] || 0
    return {
        ...state,
        retryCount: {
            ...state.retryCount,
            [field]: currentCount + 1
        },
        lastQuestionField: field,
        showQuickReplies: currentCount >= 0 // Show quick replies after first failed attempt (0 becomes 1)
    }
}

/**
 * Reset retry count (when extraction is successful)
 */
export function resetRetryCount(state: ConversationState): ConversationState {
    return {
        ...state,
        retryCount: {},
        showQuickReplies: false,
        lastQuestionField: null
    }
}

// ============================================================================
// READY FOR ESTIMATE
// ============================================================================

export function isReadyForEstimate(state: ConversationState): boolean {
    return state.certaintyLevel >= 85
}
