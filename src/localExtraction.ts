/**
 * Local Conversation Extraction (No API needed)
 * 
 * MASSIVELY EXPANDED keyword detection - handles typos, synonyms, natural speech
 */

import type { ExtractedInfo } from './conversationManager'

export function extractLocalInformation(userMessage: string): ExtractedInfo {
    const msg = userMessage.toLowerCase()
    const extracted: ExtractedInfo = {}

    // Driveway/Access/Excavator logic helpers (Affirmative/Negative)
    const isAffirmative = (msg === 'yes' || msg === 'yep' || msg === 'yeah' || msg === 'yeh' || msg === 'ye' || msg === 'sure' || msg === 'ok' || msg.includes('yeah') || msg.includes('definitely') || msg.includes('absolutely') || msg.includes('of course'))
    const isNegative = (msg === 'no' || msg === 'nope' || msg === 'nah' || msg === 'na' || msg.includes('no ') || msg.includes('not really'))

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
        // Typos & Spaces - CRITICAL FIX
        msg.includes('land scape') || msg.includes('land scaping') || msg.includes('soft scape') || msg.includes('soft scaping') ||
        msg.includes('landscpaing') || msg.includes('landscpe') || msg.includes('lanscaping') ||
        msg.includes('gardn') || msg.includes('gardning') || msg.includes('gardan') ||
        // Related
        msg.includes('outdoor space') || msg.includes('garden design') || msg.includes('outdoor design') ||
        msg.includes('green space') || msg.includes('garden transformation')) {
        extracted.service = 'softscaping'
    }

    // DIMENSIONS - Look for patterns (Added comma support)
    const dimensionPatterns = [
        /(\d+(?:[.,]\d+)?)\s*(?:m|meter|metre)?\s*(?:x|by|×)\s*(\d+(?:[.,]\d+)?)\s*(?:m|meter|metre)?/i,
        /(\d+(?:[.,]\d+)?)\s*m\s*(?:x|by|×)\s*(\d+(?:[.,]\d+)?)/i
    ]

    for (const pattern of dimensionPatterns) {
        const match = userMessage.match(pattern)
        if (match) {
            extracted.length_m = parseFloat(match[1].replace(',', '.'))
            extracted.width_m = parseFloat(match[2].replace(',', '.'))
            break
        }
    }

    // DECK HEIGHT (Moved UP to prevent Area collision)
    // Updated to handle plurals (meters/metres) and optional keywords, plus commas
    // Regex now handles "0,8" "0.8" "0,8m" "0.8 meters" etc.
    const heightPattern = /(\d+(?:[.,]\d+)?)\s*(?:m|meters?|metres?)?\s*(?:high|height|off\s*(?:the\s*)?ground)?/i
    const heightMatch = userMessage.match(heightPattern)
    let isHeight = false

    // Only accept if it looks like a height answer (msg is short OR contains height keywords)
    // AND explicitly does NOT look like a phone number or budget
    if (heightMatch) {
        // If implied height (no keywords), ensure we are asking for it or the value is small (< 3.0)
        // This prevents "25" (area) from being seen as height
        const val = parseFloat(heightMatch[1].replace(',', '.'))
        const hasKeywords = msg.includes('high') || msg.includes('off') || msg.includes('ground')

        if (hasKeywords || (val < 3.0 && val > 0)) {
            if (val < 10) {
                extracted.deckHeight_m = val
                isHeight = true
            }
        }
    } else if (msg.includes('ground level') || msg.includes('flush') || msg.includes('low')) {
        extracted.deckHeight_m = 0.1
        isHeight = true
    }

    // Single area number (Added comma support)
    // CRITIAL FIX: Do NOT extract area if we just identified it as Height, OR if it has height keywords locally
    if (!isHeight) {
        const areaPattern = /(\d+(?:[.,]\d+)?)\s*(?:square\s*)?(?:m|meter|metre|m2|m²|sqm)\s*(?!high|deep|tall|off|thick)/i
        const areaMatch = userMessage.match(areaPattern)

        // Double check it's not actually a height saying "0.8m high" that the regex missed
        const isActuallyHeight = msg.includes('high') || msg.includes('deep') || msg.includes('off the ground')

        if (areaMatch && !extracted.length_m && !isActuallyHeight) {
            extracted.area_m2 = parseFloat(areaMatch[1].replace(',', '.'))
        }

        // Linear meters for fencing
        const linearPattern = /(\d+(?:[.,]\d+)?)\s*(?:meter|metre|m)(?:s)?\s*(?:of\s*)?(?:fence|fencing)?/i
        if (msg.includes('fence') || msg.includes('fencing')) {
            const linearMatch = userMessage.match(linearPattern)
            if (linearMatch) {
                extracted.area_m2 = parseFloat(linearMatch[1].replace(',', '.'))
            }
        }
    }

    // MATERIAL TIER - MASSIVELY EXPANDED with natural language and price expressions
    // Plus specific material names from service questions

    // STANDARD/ESSENTIAL tier
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
        msg.includes('lower cost') || msg.includes('entry level') || msg.includes('starter') ||
        msg.includes('essential')) {
        extracted.materialTier = 'standard'
    }
    // LUXURY tier (Top)
    else if (msg.includes('luxury') || msg.includes('high-end') ||
        // Specific materials (LUXURY tier)
        msg.includes('ipe') || msg.includes('hardwood') || msg.includes('hard wood') || msg.includes('ipe hardwood') ||
        msg.includes('porcelain') || msg.includes('porcelain paving') ||
        msg.includes('cedar') || msg.includes('premium cedar') ||
        msg.includes('full grounds') || msg.includes('full maintenance') ||
        msg.includes('architectural') || msg.includes('architectural planting') ||
        msg.includes('custom hardwood') || msg.includes('full architectural design') ||
        // General terms
        msg.includes('best') || msg.includes('top') ||
        // Typos
        msg.includes('luxary') || msg.includes('luxry') ||
        msg.includes('porcelin') || msg.includes('ceadar') ||
        // Natural language
        msg.includes('high quality') || msg.includes('top quality') || msg.includes('top tier') ||
        msg.includes('finest') || msg.includes('high spec') || msg.includes('upscale') ||
        msg.includes('top of the range') || msg.includes('top of the line') || msg.includes('executive') ||
        msg.includes('deluxe') || msg.includes('exclusive') || msg.includes('bespoke') ||
        msg.includes('best quality') || msg.includes('nothing but the best') || msg.includes('spare no expense')) {
        extracted.materialTier = 'luxury'
    }
    // PREMIUM tier (Mid/Middle)
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
        msg.includes('premium') || // "Premium" now maps to this middle tier per user request
        // Typos
        msg.includes('composit') || msg.includes('sandston') || msg.includes('decnt') ||
        msg.includes('speciman') || msg.includes('enginered') || msg.includes('premum') || msg.includes('preimum') ||
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
        isNegative ||
        // Natural language negative
        msg.includes('too narrow') || msg.includes('not wide enough') || msg.includes('restricted') ||
        msg.includes('limited access') || msg.includes('difficult access') || msg.includes('no access') ||
        msg.includes('tight squeeze') || msg.includes('won\'t get through') || msg.includes('too tight') ||
        msg.includes('side passage') || msg.includes('alley') || msg.includes('not sure')) {
        extracted.hasExcavatorAccess = false
    } else if (msg.includes('wide') || msg.includes('good access') ||
        isAffirmative ||
        msg.includes('fits') || msg.includes('it fits') ||
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
        isNegative ||
        // Natural language
        msg.includes('on street') || msg.includes('road parking') || msg.includes('street parking') ||
        msg.includes('permit') || msg.includes('public road') || msg.includes('haven\'t got') ||
        msg.includes('don\'t have')) {
        extracted.hasDrivewayForSkip = false
    } else if (msg.includes('driveway') || msg.includes('parking') ||
        isAffirmative ||
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
        isAffirmative ||
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
        isNegative ||
        // Natural language
        msg.includes('fresh start') || msg.includes('blank slate') || msg.includes('bare ground') ||
        msg.includes('empty') || msg.includes('clear') || msg.includes('nothing there') ||
        msg.includes('clean site') || msg.includes('no existing')) {
        extracted.existingDemolition = false
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
        msg.includes('need to think') || msg.includes('discuss') || msg.includes('reduce') ||
        msg.includes('lower')) {
        extracted.budgetAligns = false
    }

    // FULL NAME - Relaxed validation
    const trimmedMsg = userMessage.trim()
    const nameKeywords = ['name is', 'call me', 'i am']
    const isExplicitName = nameKeywords.some(k => msg.includes(k))
    const wordCount = trimmedMsg.split(' ').length

    // Allow digits if it's explicitly a name or very short (typos like "mil4n")
    // But still block obvious phone numbers (5+ digits)
    const digitCount = (userMessage.match(/\d/g) || []).length
    const looksLikePhone = digitCount > 5

    if ((isExplicitName || (wordCount <= 4 && wordCount >= 1)) && // Allow single names like "Milan"
        trimmedMsg.length > 2 && trimmedMsg.length < 50 &&
        !looksLikePhone &&
        !msg.includes('@') && !msg.includes('http') &&
        !msg.includes('what') && !msg.includes('how') &&
        !msg.includes('why') && !msg.includes('when')) {
        extracted.fullName = trimmedMsg
    }

    // PHONE - UK formats
    // 07xxx xxx xxx, +44 7xxx xxx xxx, 020 xxxx xxxx
    const phonePattern = /(?:(?:\(?(?:0(?:0|11)\)?[\s-]?\(?|\+)44\)?[\s-]?(?:\(?0\)?[\s-]?)?)|(?:\(?0))(?:(?:\d{5}\)?[\s-]?\d{4,5})|(?:\d{4}\)?[\s-]?(?:\d{5}|\d{3}[\s-]?\d{3}))|(?:\d{3}\)?[\s-]?\d{3}[\s-]?\d{3,4})|(?:\d{2}\)?[\s-]?\d{4}[\s-]?\d{4}))(?:[\s-]?(?:x|ext\.?|\#)\d{3,4})?/
    const phoneMatch = userMessage.match(phonePattern)
    if (phoneMatch) {
        // STRICT CHECK: Ensure at least 9 digits to avoid partial matches
        const digits = phoneMatch[0].replace(/\D/g, '')
        if (digits.length >= 9) {
            extracted.contactPhone = phoneMatch[0]
        }
    }

    // EMAIL - standard pattern
    const emailPattern = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    const emailMatch = userMessage.match(emailPattern)
    if (emailMatch) {
        extracted.contactEmail = emailMatch[1].toLowerCase()
    }

    // POSTCODE - Flexible to accept "3525", "SL4 1AA", etc.
    // Matches 3-10 characters allowed in typical postcodes
    // EXCLUDE common keywords that might be matched (budget, services, etc.)
    const postcodePattern = /\b(?!(?:budget|about|around|price|cost|money|cheap|steep|slope|level|width|length|depth|high|tall|area|size)\b)([A-Za-z0-9\s]{3,10})\b/i
    const postcodeMatch = userMessage.match(postcodePattern)
    if (postcodeMatch) {
        // Use the match, trimmed
        const rawPostcode = postcodeMatch[1].trim().toUpperCase()
        // Extra sanity check: minimal length 3
        if (rawPostcode.length >= 3) {
            extracted.postalCode = rawPostcode
        }
    }

    // BUDGET - Fix "Phone = Budget" bug
    // 1. Must NOT be a phone number (unless it has explicit currency symbol)
    // 2. Ignore numbers starting with '0' (like 0123...) unless it's exactly '0' or '0.5' etc OR has currency
    const hasCurrency = msg.includes('£') || msg.includes('$') || msg.includes('euro') || msg.includes('budget')
    const startsWithZero = /^\s*0\d/.test(msg) // Matches "01...", " 07..."

    const isPhone = !!extracted.contactPhone

    if (!isPhone || hasCurrency) {
        const budgetPattern = /(?:budget|is|about|around)?\s*[£$]?\s*(\d+(?:[.,]\d+)?)\s*(?:k|thousand)?/i
        const budgetMatch = userMessage.match(budgetPattern)

        if (budgetMatch) {
            // If it starts with 0 and NO currency, ignore it (likely a phone number part or date)
            if (startsWithZero && !hasCurrency) {
                // Ignore
            } else {
                let amount = parseFloat(budgetMatch[1].replace(',', '.').replace(/,/g, ''))
                if (msg.includes('k') || msg.includes('thousand')) amount *= 1000

                // GUARD: Check if the number is followed by measurement units
                // exact match index + length of the full match
                if (budgetMatch.index !== undefined) {
                    const postMatch = userMessage.slice(budgetMatch.index + budgetMatch[0].length).trim().toLowerCase()
                    const unitPattern = /^(m|sq|ft|cm|mm|x|by|meter|metre|deck|patio|paver|slab)/

                    // If it's followed by a unit, specifically IGNORE it
                    if (unitPattern.test(postMatch)) {
                        // This is likely a dimension (e.g. "150 m2") or object count, NOT a budget
                        return extracted
                    }
                }

                // Sanity check: Budget should be reasonable
                if (amount > 100 && amount < 2000000) {
                    extracted.userBudget = amount
                    extracted.explicitBudget = hasCurrency // Pass logic flag to Manager
                }
            }
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
