/**
 * Local Conversation Extraction (No API needed)
 * 
 * MASSIVELY EXPANDED keyword detection - handles typos, synonyms, natural speech
 */

import type { ExtractedInfo } from './conversationManager'

export function extractLocalInformation(userMessage: string): ExtractedInfo {
    const msg = userMessage.toLowerCase()
    const extracted: ExtractedInfo = {}

    // SERVICE DETECTION - MASSIVELY EXPANDED with typos, phonetic, and colloquial terms

    // HARDSCAPING - patio, paving, stonework
    if (msg.includes('patio') || msg.includes('paving') || msg.includes('hardscape') ||
        // Common typos & keyboard proximity
        msg.includes('paty') || msg.includes('patyo') || msg.includes('pato') || msg.includes('paio') ||
        msg.includes('pavimg') || msg.includes('pavong') || msg.includes('pavin') || msg.includes('pavng') ||
        msg.includes('hardlanscing') || msg.includes('hardlscaping') || msg.includes('hardscpaing') ||
        // Missing letters
        msg.includes('ptio') || msg.includes('pving') || msg.includes('pavng') ||
        // Phonetic variations
        msg.includes('payshio') || msg.includes('payving') || msg.includes('paytio') ||
        // Related terms
        msg.includes('pave') || msg.includes('paver') || msg.includes('brick') || msg.includes('stone paving') ||
        msg.includes('stone work') || msg.includes('stonework') || msg.includes('slab') || msg.includes('flag') ||
        // UK colloquial
        msg.includes('yard') || msg.includes('courtyard') || msg.includes('terrace') || msg.includes('flagstone')) {
        extracted.service = 'hardscaping'
    }
    // DECKING
    else if (msg.includes('deck') ||
        // Typos
        msg.includes('deckling') || msg.includes('dekcing') || msg.includes('deking') || msg.includes('deckin') ||
        msg.includes('dck') || msg.includes('dek') || msg.includes('decc') ||
        // Phonetic
        msg.includes('dekk') || msg.includes('deeking') ||
        // Related
        msg.includes('wood platform') || msg.includes('timber platform') || msg.includes('raised platform')) {
        extracted.service = 'decking'
    }
    // MOWING - lawn cutting
    else if (msg.includes('mow') || msg.includes('lawn') || msg.includes('grass') ||
        msg.includes('cut') || msg.includes('cutting') || msg.includes('trim') ||
        // Typos
        msg.includes('moww') || msg.includes('moing') || msg.includes('mowin') || msg.includes('mawing') ||
        msg.includes('lwn') || msg.includes('lwan') || msg.includes('gras') || msg.includes('grss') ||
        // Phonetic
        msg.includes('moe') || msg.includes('moh') ||
        // Colloquial UK
        msg.includes('cut the grass') || msg.includes('trim the lawn') || msg.includes('grass cutting') ||
        msg.includes('lawn care') || msg.includes('garden maintenance') || msg.includes('keep tidy')) {
        extracted.service = 'mowing'
    }
    // PLANTING
    else if (msg.includes('plant') || msg.includes('flower') || msg.includes('shrub') ||
        msg.includes('bed') || msg.includes('border') ||
        // Typos
        msg.includes('plnat') || msg.includes('plantng') || msg.includes('palnt') || msg.includes('planting') ||
        msg.includes('flowr') || msg.includes('flowrs') || msg.includes('shrbs') ||
        // Related
        msg.includes('planter') || msg.includes('vegetation') || msg.includes('greenery') ||
        msg.includes('flower bed') || msg.includes('herbaceous') || msg.includes('perennial')) {
        extracted.service = 'planting'
    }
    // FENCING
    else if (msg.includes('fence') || msg.includes('fencing') || msg.includes('hedge') ||
        msg.includes('hedging') || msg.includes('boundary') ||
        // Typos
        msg.includes('fense') || msg.includes('fance') || msg.includes('fencng') || msg.includes('fencig') ||
        msg.includes('hegde') || msg.includes('hdge') ||
        // Related
        msg.includes('panel') || msg.includes('privacy screen') || msg.includes('enclosure') ||
        msg.includes('barrier') || msg.includes('perimeter')) {
        extracted.service = 'fencing'
    }
    // FRAMING - pergolas, structures
    else if (msg.includes('pergola') || msg.includes('frame') || msg.includes('structure') ||
        msg.includes('gazebo') || msg.includes('arbor') ||
        // Typos
        msg.includes('pergolla') || msg.includes('pergla') || msg.includes('pergola') ||
        msg.includes('gazbo') || msg.includes('gazzebo') || msg.includes('arbour') ||
        // Related
        msg.includes('overhead') || msg.includes('canopy') || msg.includes('trellis') ||
        msg.includes('archway') || msg.includes('outdoor structure')) {
        extracted.service = 'framing'
    }
    // SOFTSCAPING - general landscaping
    else if (msg.includes('landscape') || msg.includes('garden') || msg.includes('landscaping') ||
        // Typos
        msg.includes('landscpaing') || msg.includes('landscpe') || msg.includes('lanscaping') ||
        msg.includes('gardn') || msg.includes('gardning') || msg.includes('gardan') ||
        // Related
        msg.includes('outdoor space') || msg.includes('garden design') || msg.includes('outdoor design') ||
        msg.includes('green space') || msg.includes('garden transformation')) {
        extracted.service = 'softscaping'
    }

    // DIMENSIONS - Look for patterns
    const dimensionPatterns = [
        /(\d+(?:\.\d+)?)\s*(?:m|meter|metre)?\s*(?:x|by|×)\s*(\d+(?:\.\d+)?)\s*(?:m|meter|metre)?/i,
        /(\d+(?:\.\d+)?)\s*m\s*(?:x|by|×)\s*(\d+(?:\.\d+)?)/i
    ]

    for (const pattern of dimensionPatterns) {
        const match = userMessage.match(pattern)
        if (match) {
            extracted.length_m = parseFloat(match[1])
            extracted.width_m = parseFloat(match[2])
            break
        }
    }

    // Single area number
    const areaPattern = /(\d+(?:\.\d+)?)\s*(?:square\s*)?(?:m|meter|metre|m2|m²|sqm)/i
    const areaMatch = userMessage.match(areaPattern)
    if (areaMatch && !extracted.length_m) {
        extracted.area_m2 = parseFloat(areaMatch[1])
    }

    // Linear meters for fencing
    const linearPattern = /(\d+(?:\.\d+)?)\s*(?:meter|metre|m)(?:s)?\s*(?:of\s*)?(?:fence|fencing)?/i
    if (msg.includes('fence') || msg.includes('fencing')) {
        const linearMatch = userMessage.match(linearPattern)
        if (linearMatch) {
            extracted.area_m2 = parseFloat(linearMatch[1])
        }
    }

    // MATERIAL TIER - MASSIVELY EXPANDED with natural language and price expressions
    // Plus specific material names from service questions

    // STANDARD/BUDGET tier
    if (msg.includes('cheap') || msg.includes('budget') || msg.includes('basic') ||
        // Specific materials (STANDARD tier)
        msg.includes('softwood') || msg.includes('soft wood') || msg.includes('softwood panel') ||
        msg.includes('concrete') || msg.includes('concrete paver') ||
        msg.includes('standard') || msg.includes('container plant') ||
        msg.includes('basic cut') || msg.includes('cut and collect') ||
        msg.includes('basic pergola') || msg.includes('basic frame') ||
        msg.includes('basic planting') || msg.includes('basic landscaping') ||
        // General terms
        msg.includes('normal') || msg.includes('regular') || msg.includes('simple') ||
        msg.includes('ordinary') || msg.includes('just a') ||
        // Typos
        msg.includes('budjet') || msg.includes('cheep') || msg.includes('baic') || msg.includes('standrd') ||
        msg.includes('softwod') || msg.includes('conrete') ||
        // Natural language
        msg.includes('affordable') || msg.includes('economical') || msg.includes('cost effective') ||
        msg.includes('on a budget') || msg.includes('save money') || msg.includes('inexpensive') ||
        msg.includes('value') || msg.includes('reasonable price') || msg.includes('not expensive') ||
        msg.includes('lower cost') || msg.includes('entry level') || msg.includes('starter')) {
        extracted.materialTier = 'standard'
    }
    // LUXURY/PREMIUM tier
    else if (msg.includes('premium') || msg.includes('luxury') || msg.includes('high-end') ||
        // Specific materials (LUXURY tier)
        msg.includes('ipe') || msg.includes('hardwood') || msg.includes('ipe hardwood') ||
        msg.includes('porcelain') || msg.includes('porcelain paving') ||
        msg.includes('cedar') || msg.includes('premium cedar') ||
        msg.includes('full grounds') || msg.includes('full maintenance') ||
        msg.includes('architectural') || msg.includes('architectural planting') ||
        msg.includes('custom hardwood') || msg.includes('full architectural design') ||
        // General terms
        msg.includes('best') || msg.includes('top') || msg.includes('premium quality') ||
        // Typos
        msg.includes('premum') || msg.includes('luxary') || msg.includes('luxry') || msg.includes('preimum') ||
        msg.includes('porcelin') || msg.includes('ceadar') ||
        // Natural language
        msg.includes('high quality') || msg.includes('top quality') || msg.includes('top tier') ||
        msg.includes('finest') || msg.includes('high spec') || msg.includes('upscale') ||
        msg.includes('top of the range') || msg.includes('top of the line') || msg.includes('executive') ||
        msg.includes('deluxe') || msg.includes('exclusive') || msg.includes('bespoke') ||
        msg.includes('best quality') || msg.includes('nothing but the best') || msg.includes('spare no expense')) {
        extracted.materialTier = 'luxury'
    }
    // PREMIUM/MID-RANGE tier
    else if (msg.includes('composite') || msg.includes('sandstone') || msg.includes('mid') ||
        // Specific materials (PREMIUM/MID tier)
        msg.includes('composite decking') || msg.includes('indian sandstone') ||
        msg.includes('treated slat') || msg.includes('slat') ||
        msg.includes('precision') || msg.includes('precision cut') || msg.includes('edge') || msg.includes('edging') ||
        msg.includes('specimen') || msg.includes('specimen plant') ||
        msg.includes('engineered') || msg.includes('engineered timber') ||
        msg.includes('premium planting') || msg.includes('premium specimen') ||
        // General terms
        msg.includes('decent') || msg.includes('good quality') || msg.includes('middle') ||
        // Typos
        msg.includes('composit') || msg.includes('sandston') || msg.includes('decnt') ||
        msg.includes('speciman') || msg.includes('enginered') ||
        // Natural language
        msg.includes('mid-range') || msg.includes('mid range') || msg.includes('middle of the road') ||
        msg.includes('good but not crazy') || msg.includes('reasonable quality') ||
        msg.includes('solid quality') || msg.includes('well made') || msg.includes('durable')) {
        extracted.materialTier = 'premium'
    }

    // EXCAVATOR ACCESS - very flexible with natural language
    if (msg.includes('narrow') || msg.includes('small gate') || msg.includes('70cm') ||
        msg.includes('80cm') || msg.includes('tight') || msg.includes('won\'t fit') ||
        msg.includes('can\'t') ||
        // Simple no responses - use exact match to avoid conflicts
        (msg.trim() === 'no' || msg.trim() === 'nope' || msg.trim() === 'nah' || msg.trim() === 'na') ||
        // Natural language negative
        msg.includes('too narrow') || msg.includes('not wide enough') || msg.includes('restricted') ||
        msg.includes('limited access') || msg.includes('difficult access') || msg.includes('no access') ||
        msg.includes('tight squeeze') || msg.includes('won\'t get through') || msg.includes('too tight') ||
        msg.includes('side passage') || msg.includes('alley') || msg.includes('not sure')) {
        extracted.hasExcavatorAccess = false
    } else if (msg.includes('wide') || msg.includes('good access') ||
        // Simple yes responses - use exact match
        (msg.trim() === 'yes' || msg.trim() === 'yep' || msg.trim() === 'yeah' || msg.trim() === 'yeh') ||
        msg.includes('sure') || msg.includes('fits') || msg.includes('it fits') ||
        msg.includes('there is') || msg.includes('it can') ||
        // Natural language positive
        msg.includes('plenty of room') || msg.includes('easy access') || msg.includes('wide enough') ||
        msg.includes('no problem') || msg.includes('can get through') || msg.includes('accessible') ||
        msg.includes('open access') || msg.includes('should fit')) {
        extracted.hasExcavatorAccess = true
    }

    // DRIVEWAY - expanded
    if (msg.includes('no driveway') || msg.includes('street') || msg.includes('on the road') ||
        msg.includes('no drive') ||
        // Simple no responses
        (msg.trim() === 'no' || msg.trim() === 'nope' || msg.trim() === 'nah' || msg.trim() === 'na') ||
        // Natural language
        msg.includes('on street') || msg.includes('road parking') || msg.includes('street parking') ||
        msg.includes('permit') || msg.includes('public road') || msg.includes('haven\'t got') ||
        msg.includes('don\'t have')) {
        extracted.hasDrivewayForSkip = false
    } else if (msg.includes('driveway') || msg.includes('parking') ||
        // Simple yes responses
        (msg.trim() === 'yes' || msg.trim() === 'yep' || msg.trim() === 'yeah' || msg.trim() === 'yeh') ||
        msg.includes('have a drive') ||
        // Natural language
        msg.includes('got a drive') || msg.includes('front drive') || msg.includes('off street') ||
        msg.includes('private') || msg.includes('own parking') || msg.includes('car park')) {
        extracted.hasDrivewayForSkip = true
    }

    // SLOPE - handles typos and natural language
    if (msg.includes('flat') || msg.includes('fla') || msg.includes('level') ||
        msg.includes('even') || msg.includes('no slope') ||
        // Natural language
        msg.includes('completely flat') || msg.includes('totally level') || msg.includes('nice and flat') ||
        msg.includes('perfectly level') || msg.includes('no gradient') || msg.includes('horizontal')) {
        extracted.slopeLevel = 'flat'
    } else if (msg.includes('steep') || msg.includes('very slope') || msg.includes('hill') ||
        msg.includes('quite slope') ||
        // Typos
        msg.includes('steepe') || msg.includes('steap') ||
        // Natural language
        msg.includes('really steep') || msg.includes('very steep') || msg.includes('quite steep') ||
        msg.includes('hilly') || msg.includes('sharp slope') || msg.includes('incline') ||
        msg.includes('on a hill') || msg.includes('sloped garden')) {
        extracted.slopeLevel = 'steep'
    } else if (msg.includes('slope') || msg.includes('moderate') || msg.includes('bit of') ||
        msg.includes('slight') ||
        // Natural language
        msg.includes('gentle slope') || msg.includes('bit sloped') || msg.includes('some slope') ||
        msg.includes('sloping') || msg.includes('gradual') || msg.includes('not too steep') ||
        msg.includes('bit of a slope')) {
        extracted.slopeLevel = 'moderate'
    }

    // DEMOLITION - very flexible with natural language
    if (msg.includes('remove') || msg.includes('tear out') || msg.includes('demolish') ||
        msg.includes('existing') ||
        // Simple yes responses - exact match
        (msg.trim() === 'yes' || msg.trim() === 'yep' || msg.trim() === 'yeah' || msg.trim() === 'yeh') ||
        msg.includes('a little') || msg.includes('some ') || msg.includes('need to remove') ||
        msg.includes('demolish needed') || msg.includes('bit of') || msg.includes('old') ||
        // Typos
        msg.includes('remov') || msg.includes('demolis') || msg.includes('exsting') ||
        // Natural language
        msg.includes('take out') || msg.includes('rip out') || msg.includes('clear out') ||
        msg.includes('get rid of') || msg.includes('strip out') || msg.includes('take up') ||
        msg.includes('pull up') || msg.includes('needs removing') || msg.includes('to be removed') ||
        msg.includes('old patio') || msg.includes('old deck') || msg.includes('something there')) {
        extracted.existingDemolition = true
    } else if (msg.includes('new') || msg.includes('fresh') || msg.includes('no removal') ||
        msg.includes('nothing') || msg.includes('clean') ||
        // Simple no responses - exact match
        (msg.trim() === 'no' || msg.trim() === 'nope' || msg.trim() === 'nah' || msg.trim() === 'na') ||
        // Natural language
        msg.includes('fresh start') || msg.includes('blank slate') || msg.includes('bare ground') ||
        msg.includes('empty') || msg.includes('clear') || msg.includes('nothing there') ||
        msg.includes('clean site') || msg.includes('no existing')) {
        extracted.existingDemolition = false
    }

    // DECK HEIGHT
    // Updated to handle plurals (meters/metres) and optional keywords
    const heightPattern = /(\d+(?:\.\d+)?)\s*(?:m|meters?|metres?)?\s*(?:high|height|off\s*(?:the\s*)?ground)?/i
    const heightMatch = userMessage.match(heightPattern)

    // Only accept if it looks like a height answer (msg is short OR contains height keywords)
    if (heightMatch && (
        msg.includes('high') || msg.includes('height') ||
        msg.includes('off') || msg.length < 10
    )) {
        extracted.deckHeight_m = parseFloat(heightMatch[1])
    }

    // OVERGROWN - handles months, weeks, typos like 'agi'
    const weeksPattern = /(\d+)\s*week/i
    const monthsPattern = /(\d+)\s*month/i
    const weeksMatch = userMessage.match(weeksPattern)
    const monthsMatch = userMessage.match(monthsPattern)

    if (monthsMatch) {
        // Any months = definitely overgrown
        extracted.overgrown = true
    } else if (weeksMatch) {
        const weeks = parseInt(weeksMatch[1])
        extracted.overgrown = weeks > 2
    } else if (msg.includes('overgrown') || msg.includes('long grass') || msg.includes('not cut') ||
        msg.includes('while') || msg.includes('ages') || msg.includes('long time')) {
        extracted.overgrown = true
    } else if (msg.includes('recent') || msg.includes('last week') || msg.includes('yesterday') ||
        msg.includes('few days')) {
        extracted.overgrown = false
    }

    // GATES
    const gatePattern = /(\d+)\s*gate/i
    const gateMatch = userMessage.match(gatePattern)
    if (gateMatch) {
        extracted.gateCount = parseInt(gateMatch[1])
    } else if (msg.includes('one gate') || msg.includes('a gate')) {
        extracted.gateCount = 1
    } else if (msg.includes('two gate')) {
        extracted.gateCount = 2
    } else if (msg.includes('no gate')) {
        extracted.gateCount = 0
    }

    // BUDGET ALIGNMENT - detects yes/no responses to budget question
    // Affirmative responses
    if (msg.includes('yes') || msg.includes('sure') || msg.includes('ok') ||
        msg.includes('okay') || msg.includes('sounds good') || msg.includes('that works') ||
        msg.includes('aligns') || msg.includes('within budget') || msg.includes('good for me') ||
        msg.includes('perfect') || msg.includes('great') || msg.includes('fine') ||
        msg.includes('yep') || msg.includes('yeah') || msg.includes('yeh') ||
        msg.includes('absolutely') || msg.includes('definitely') || msg.includes('works for me') ||
        msg.includes('good to go') || msg.includes('let\'s do it') || msg.includes('let\'s go') ||
        msg.includes('approved') || msg.includes('agree') || msg.includes('accept')) {
        extracted.budgetAligns = true
    }
    // Negative responses
    else if (msg.includes('no ') || msg.includes('nope') || msg.includes('nah') ||
        msg.includes('too much') || msg.includes('expensive') || msg.includes('over budget') ||
        msg.includes('can\'t afford') || msg.includes('too high') || msg.includes('out of budget') ||
        msg.includes('more than') || msg.includes('exceeds') || msg.includes('not sure') ||
        msg.includes('need to think') || msg.includes('discuss') || msg.includes('scope') ||
        msg.includes('reduce') || msg.includes('lower')) {
        extracted.budgetAligns = false
    }

    // FULL NAME - capture everything as a name ONLY if we just asked for it
    // We can't easily know "lastQuestion" here without passing state, 
    // so we'll rely on the ConversationManager to filter this.
    // BUT we should make this stricter to avoid false positives on "what services"
    const trimmedMsg = userMessage.trim()
    const nameKeywords = ['name is', 'call me', 'i am']
    const isExplicitName = nameKeywords.some(k => msg.includes(k))

    // If it's a short string (2-3 words) and looks like a name, or has keywords
    const wordCount = trimmedMsg.split(' ').length

    // STRICTER: Require at least 2 words for implicit names (e.g. "John Smith") 
    // Single words are too risky (could be "patio", "yes", "what", etc.)
    // Unless we have explicit keywords like "name is"

    // NEW: Check if the message contains digits - likely not a name if it has numbers
    const hasDigits = /\d/.test(userMessage)

    if ((isExplicitName || (wordCount <= 3 && wordCount >= 2)) &&
        trimmedMsg.length > 3 && trimmedMsg.length < 50 &&
        !hasDigits && // Block names with numbers (like phone numbers)
        !msg.includes('@') && !msg.includes('http') &&
        !msg.includes('what') && !msg.includes('how') &&
        !msg.includes('why') && !msg.includes('when')) {
        extracted.fullName = trimmedMsg
    }

    // PHONE NUMBER - extremely permissive (allow any input with 5+ digits)
    const digitOnly = userMessage.replace(/\D/g, '')

    if (digitOnly.length >= 5) {
        // Store the original input (trimmed) to preserve formatting like spaces/dashes
        extracted.contactPhone = userMessage.trim()
    }

    // EMAIL - standard pattern
    const emailPattern = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    const emailMatch = userMessage.match(emailPattern)
    if (emailMatch) {
        extracted.contactEmail = emailMatch[1].toLowerCase()
    }

    // BUDGET - simple numeric/GBP detection
    const budgetPattern = /(?:budget|is|about|around)?\s*[£$]?\s*(\d[\d,]*(?:\.\d{2})?)\s*(?:k|thousand)?/i
    const budgetMatch = userMessage.match(budgetPattern)
    if (budgetMatch) {
        let amount = parseFloat(budgetMatch[1].replace(/,/g, ''))
        if (msg.includes('k') || msg.includes('thousand')) amount *= 1000

        // Sanity check: Budget should be reasonable (e.g., < 2,000,000)
        // This prevents phone numbers (like 07700900000) from being parsed as valid budgets
        if (amount > 100 && amount < 2000000) {
            extracted.userBudget = amount
        }
    }

    return extracted
}

export function calculateConfidence(extracted: ExtractedInfo): number {
    let confidence = 0

    if (extracted.service) confidence += 30
    if (extracted.area_m2 || (extracted.length_m && extracted.width_m)) confidence += 40
    if (extracted.materialTier) confidence += 20
    if (extracted.hasExcavatorAccess !== undefined) confidence += 5
    if (extracted.slopeLevel) confidence += 5

    return Math.min(confidence, 100)
}
