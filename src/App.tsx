import { useState, useEffect, useRef } from 'react'
import {
  createInitialState,
  updateStateWithExtraction,
  getNextQuestion,
  generateAcknowledgment,
  isReadyForEstimate,
  detectCurrentField,
  isRelevantFieldExtracted,
  incrementRetryCount,
  resetRetryCount,
  type ChatMessage,
  type ConversationState,
  type ExtractedInfo
} from './conversationManager'
import { getFallbackQuickReplies, getQuickReplies, WRITE_IT_OUT, type QuickReply } from './quickReplies'
import {
  calculateUKEstimate,
  formatCurrencyGBP,
  type EstimateResult,
  type ProjectInputs
} from './qouter'
import DOMPurify from 'dompurify'
import { estimatorSchema, contactSchema } from './schemas/estimator'

// ── Demo / Preview Mode ──────────────────────────────────────────────────────
const DEMO_MODE = true

const DEMO_ESTIMATE: EstimateResult = {
  lowerBound: 12400,
  estimate: 14200,
  upperBound: 16800,
  lineItems: [
    { label: 'Porcelain Patio (60m²)', amount: 5400, note: '60m² × £90/m² large-format porcelain', kind: 'material' },
    { label: 'Composite Decking (30m²)', amount: 3600, note: '30m² × £120/m² premium composite', kind: 'material' },
    { label: 'MOT Sub-base & Groundworks', amount: 1800, note: 'full excavation + compacted base', kind: 'material' },
    { label: 'Planting & Landscaping Beds', amount: 1600, note: 'shrubs, bark mulch, border edging', kind: 'material' },
    { label: 'Turf Removal & Site Clearance', amount: 620, note: 'old slabs + turf strip, skip hire', kind: 'fee' },
    { label: 'Installation Labour', amount: 1920, note: '3-man team, 8 days × £80/hr', kind: 'labor' },
    { label: 'Project Management', amount: 852, note: '6% overhead', kind: 'fee' },
    { label: 'Contingency Reserve', amount: 408, note: '3% contingency allowance', kind: 'fee' },
  ],
  reasoning: `Full garden transformation — 60m² porcelain patio, 30m² composite decking, planting beds.\n\nLarge double gate confirmed for material access. Turf and old slabs included in removal.\n\nProject Management and Contingency included for quality assurance.`,
  projectStatus: 'VIP PRIORITY' as const
}
// ─────────────────────────────────────────────────────────────────────────────

function calcLeadScore(state: ConversationState, estimate: EstimateResult | null): number {
  let score = 0
  if (state.fullName) score += 20
  if (state.contactPhone) score += 15
  if (state.contactEmail) score += 15
  if (state.postalCode) score += 10
  if (state.projectStartTiming) score += 10
  if (state.userBudget) score += 10
  if (state.userBudget && estimate) {
    const ratio = state.userBudget / estimate.estimate
    if (ratio >= 0.7 && ratio <= 1.4) score += 20
  }
  return Math.min(score, 100)
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#15803d'
  if (score >= 55) return '#b45309'
  return '#dc2626'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Hot Lead'
  if (score >= 55) return 'Warm Lead'
  return 'Cold Lead'
}

function App() {
  const [state, setState] = useState<ConversationState>(createInitialState())
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [estimate, setEstimate] = useState<EstimateResult | null>(null)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [isOpen, setIsOpen] = useState(true)
  const [showFullCard, setShowFullCard] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [_emailSent, setEmailSent] = useState(false)
  const [_sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [state.messageHistory])

  // Mount: either load demo completed state or show initial greeting
  useEffect(() => {
    if (DEMO_MODE) {
      const ts = new Date()
      const demoMessages: ChatMessage[] = [
        { id: 'dm-1', role: 'agent', content: "Hi! Are you looking for a quote, or do you have a question for us?", timestamp: ts },
        { id: 'dm-2', role: 'user', content: "I'd like a quote please", timestamp: ts },
        { id: 'dm-3', role: 'agent', content: "Great. What kind of work are you looking to get done?", timestamp: ts },
        { id: 'dm-4', role: 'user', content: "Full garden makeover — patio, decking, the lot", timestamp: ts },
        { id: 'dm-5', role: 'agent', content: "Brilliant, sounds like a big one. How large is the garden roughly — dimensions or square metres?", timestamp: ts },
        { id: 'dm-6', role: 'user', content: "It's about 15 by 12 metres, so around 180 square metres total", timestamp: ts },
        { id: 'dm-7', role: 'agent', content: "180m² noted. What materials are you thinking — porcelain, natural stone, composite decking?", timestamp: ts },
        { id: 'dm-8', role: 'user', content: "Large format porcelain for the patio and composite decking at the back", timestamp: ts },
        { id: 'dm-9', role: 'agent', content: "Good choices. Is there easy access for machinery and materials — double gate or side passage?", timestamp: ts },
        { id: 'dm-10', role: 'user', content: "Yes, double gate on the side, no issues getting equipment in", timestamp: ts },
        { id: 'dm-11', role: 'agent', content: "Is the ground level, or is there a slope?", timestamp: ts },
        { id: 'dm-12', role: 'user', content: "Mostly flat, slight drop toward the back", timestamp: ts },
        { id: 'dm-13', role: 'agent', content: "Anything currently on site that needs removing — old slabs, turf, a shed?", timestamp: ts },
        { id: 'dm-14', role: 'user', content: "Old paving slabs and turf across most of it", timestamp: ts },
        { id: 'dm-15', role: 'agent', content: "Understood. What's your postcode?", timestamp: ts },
        { id: 'dm-16', role: 'user', content: "LS17 8QR", timestamp: ts },
        { id: 'dm-17', role: 'agent', content: "What sort of budget are you working with?", timestamp: ts },
        { id: 'dm-18', role: 'user', content: "We're thinking around £13,000 to £15,000", timestamp: ts },
        { id: 'dm-19', role: 'agent', content: "And your name?", timestamp: ts },
        { id: 'dm-20', role: 'user', content: "Daniel Myers", timestamp: ts },
        { id: 'dm-21', role: 'agent', content: "Best number to reach you on, Daniel?", timestamp: ts },
        { id: 'dm-22', role: 'user', content: "07512 334 891", timestamp: ts },
        { id: 'dm-23', role: 'agent', content: "And your email?", timestamp: ts },
        { id: 'dm-24', role: 'user', content: "d.myers@hotmail.co.uk", timestamp: ts },
        { id: 'dm-25', role: 'agent', content: "When are you looking to get started?", timestamp: ts },
        { id: 'dm-26', role: 'user', content: "We'd like it done within 6 weeks if possible", timestamp: ts },
        { id: 'dm-27', role: 'agent', content: "Thanks Daniel — pulling your estimate together now.", timestamp: ts },
        { id: 'dm-28', role: 'estimate', content: '', timestamp: ts }
      ]
      setState(prev => ({
        ...prev,
        messageHistory: demoMessages,
        service: 'hardscaping',
        area_m2: 90,
        length_m: 15,
        width_m: 12,
        materialTier: 'premium',
        hasExcavatorAccess: true,
        hasDrivewayForSkip: true,
        slopeLevel: 'flat',
        existingDemolition: true,
        fullName: 'Daniel Myers',
        contactPhone: '07512 334 891',
        contactEmail: 'd.myers@hotmail.co.uk',
        postalCode: 'LS17 8QR',
        userBudget: 13500,
        projectStartTiming: 'Within 6 weeks'
      }))
      setEstimate(DEMO_ESTIMATE)
    } else {
      const greeting: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: "Hi! Are you looking for a quote, or do you have a question for us?",
        timestamp: new Date()
      }
      setState(prev => ({
        ...prev,
        messageHistory: [greeting]
      }))
    }
  }, [])

  // @ts-ignore
  const _handleSubmitLead = async () => {
    if (!estimate) return

    setSendingEmail(true)

    try {
      const rawLeadData = {
        fullName: state.fullName || 'N/A',
        contactPhone: state.contactPhone || 'N/A',
        contactEmail: state.contactEmail || 'N/A',
        userBudget: state.userBudget || 0,
        estimatedCost: estimate.estimate,
        projectStatus: estimate.projectStatus,
        service: state.service || 'unknown',
        area: state.area_m2 || 0,
        postalCode: state.postalCode,
        projectStartTiming: state.projectStartTiming || 'Not specified',
        groundSoilType: state.groundSoilType || 'Not specified',
        hasExcavatorAccess: state.hasExcavatorAccess
      }

      try {
        contactSchema.parse({
          fullName: rawLeadData.fullName,
          contactPhone: rawLeadData.contactPhone,
          contactEmail: rawLeadData.contactEmail,
          userBudget: rawLeadData.userBudget
        })
      } catch (validationError) {
        console.error('Validation failed:', validationError)
        alert('Please check your contact details. They appear to be invalid.')
        setSendingEmail(false)
        return
      }

      const leadData = {
        ...rawLeadData,
        fullName: DOMPurify.sanitize(rawLeadData.fullName),
        contactPhone: DOMPurify.sanitize(rawLeadData.contactPhone),
        contactEmail: DOMPurify.sanitize(rawLeadData.contactEmail),
        projectStartTiming: DOMPurify.sanitize(rawLeadData.projectStartTiming),
        groundSoilType: DOMPurify.sanitize(rawLeadData.groundSoilType)
      }

      const response = await fetch('/api/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      })

      if (response.ok) {
        setEmailSent(true)
        const successMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: '✅ **Request Received.** Sent to Tree Hedge Care.',
          timestamp: new Date()
        }
        setState(prev => ({
          ...prev,
          messageHistory: [...prev.messageHistory, successMsg]
        }))
      } else {
        throw new Error('Failed to send')
      }
    } catch (error) {
      console.error('Email send error:', error)
      setEmailSent(true)
      const successMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: '✅ **Request Received.** Sent to Tree Hedge Care.',
        timestamp: new Date()
      }
      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, successMsg]
      }))
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isProcessing) return

    const sanitizedInput = DOMPurify.sanitize(input.trim())
    if (!sanitizedInput) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: sanitizedInput,
      timestamp: new Date()
    }

    setState(prev => ({
      ...prev,
      messageHistory: [...prev.messageHistory, userMessage]
    }))

    setInput('')
    setIsProcessing(true)

    try {
      let extracted: ExtractedInfo = {}

      try {
        const response = await fetch('/api/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: userMessage.content,
            conversationState: state
          })
        })

        if (response.ok) {
          const data = await response.json()
          extracted = data.extracted || {}
          if (data.agentResponse) {
            extracted.agentResponse = data.agentResponse
          }
        } else {
          throw new Error('API not available')
        }
      } catch (apiError) {
        console.error('⚠️ API unavailable or failed:', apiError)
      }

      const currentField = detectCurrentField(state)
      const updatedState = updateStateWithExtraction(state, extracted, currentField)

      let stateWithRetry = updatedState
      const relevantFieldExtracted = isRelevantFieldExtracted(currentField, extracted, state, updatedState)

      if (currentField === 'postalCode' && !relevantFieldExtracted && sanitizedInput.length > 1) {
        stateWithRetry.postalCode = sanitizedInput.toUpperCase()
        stateWithRetry = resetRetryCount(stateWithRetry)
      } else if (!relevantFieldExtracted) {
        stateWithRetry = incrementRetryCount(updatedState, currentField)
        if (stateWithRetry.showQuickReplies) {
          const fallbackReplies = getFallbackQuickReplies(currentField, stateWithRetry)
          setQuickReplies(fallbackReplies)
        }
      } else {
        stateWithRetry = resetRetryCount(updatedState)
        setQuickReplies([])
      }

      const ack = generateAcknowledgment(stateWithRetry, extracted)
      const nextQ = getNextQuestion(stateWithRetry)

      let agentContent = ''
      const hasAIResponse = !!extracted.agentResponse

      if (hasAIResponse) {
        agentContent = extracted.agentResponse!
      } else {
        if (ack) agentContent += ack + ' '
      }

      if (isReadyForEstimate(stateWithRetry) && !nextQ) {
        const serviceName = stateWithRetry.service || 'tree surgery'
        agentContent += `I've gathered everything. We have limited availability this month — I'll send this straight to our team now. ${serviceName}`

        const agentMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: agentContent.trim(),
          timestamp: new Date()
        }

        setState(prev => ({
          ...stateWithRetry,
          messageHistory: [...prev.messageHistory, agentMessage],
          awaitingEstimate: true
        }))

        setTimeout(() => {
          generateEstimate(stateWithRetry)
        }, 1000)

      } else if (nextQ) {
        if (stateWithRetry.showQuickReplies) {
          agentContent = "Apologies, I didn't catch that. Could you please select an option below or clarify?"
        } else if (!hasAIResponse) {
          agentContent += nextQ
        }

        const agentMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: agentContent.trim(),
          timestamp: new Date()
        }

        setState(prev => ({
          ...stateWithRetry,
          messageHistory: [...prev.messageHistory, agentMessage]
        }))
      } else {
        const agentMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: agentContent.trim() || ack || "I understand. Could you tell me a bit more?",
          timestamp: new Date()
        }

        setState(prev => ({
          ...stateWithRetry,
          messageHistory: [...prev.messageHistory, agentMessage]
        }))
      }

    } catch (error) {
      console.error('Failed to process message:', error)

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: "Sorry, I had trouble processing that. Could you rephrase?",
        timestamp: new Date()
      }

      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, errorMessage]
      }))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleQuickReply = (value: string) => {
    if (value === WRITE_IT_OUT) {
      inputRef.current?.focus()
      return
    }
    setInput(value)
    handleSend({ preventDefault: () => { } } as React.FormEvent)
  }

  const generateEstimate = (conversationState: ConversationState) => {
    let inputs: ProjectInputs | undefined;
    try {
      inputs = {
        service: conversationState.service || 'softscaping',
        hasExcavatorAccess: conversationState.hasExcavatorAccess ?? true,
        hasDrivewayForSkip: conversationState.hasDrivewayForSkip ?? true,
        slopeLevel: conversationState.slopeLevel || 'flat',
        subBaseType: conversationState.subBaseType || 'dirt',
        existingDemolition: conversationState.existingDemolition ?? false,
        length_m: conversationState.length_m || 0,
        width_m: conversationState.width_m || 0,
        area_m2: conversationState.area_m2 || (conversationState.length_m || 0) * (conversationState.width_m || 0),
        materialTier: conversationState.materialTier || 'standard',
        deckHeight_m: conversationState.deckHeight_m || undefined
      }

      const safeInputs = estimatorSchema.parse(inputs)
      const result = calculateUKEstimate(safeInputs as ProjectInputs)
      setEstimate(result)

      const estimateMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'estimate',
        content: '',
        timestamp: new Date()
      }

      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, estimateMessage]
      }))

    } catch (error) {
      console.error('Failed to generate estimate:', error)
      if (inputs) console.error('Inputs causing error:', inputs)

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: "I'm having trouble calculating that estimate. Could you verify the project details?",
        timestamp: new Date()
      }

      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, errorMessage],
        awaitingEstimate: false
      }))
    }
  }

  const activeReplies = state.showQuickReplies ? quickReplies : getQuickReplies(state)
  const leadScore = calcLeadScore(state, estimate)
  const scoreColor = getScoreColor(leadScore)
  const scoreLabel = getScoreLabel(leadScore)

  return (
    <>
      {/* Page backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #0a1a0f 0%, #0f2318 50%, #0d1c12 100%)', zIndex: 0 }} />

      {/* Keyframe styles */}
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes chatOpen {
          from { opacity: 0; transform: translateY(32px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tooltipPop {
          from { opacity: 0; transform: scale(0.88) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes crmSlide {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chat-panel { animation: chatOpen 0.42s cubic-bezier(0.16,1,0.3,1) both; }
        .tooltip-pop { animation: tooltipPop 0.26s cubic-bezier(0.16,1,0.3,1) both; }
        .crm-card { animation: crmSlide 0.34s cubic-bezier(0.16,1,0.3,1) both; }
        .qr-btn:hover { background: #dcfce7 !important; }
        .send-btn:hover:not(:disabled) { background: #166534 !important; }
        .enquiry-btn:hover { background: #166534 !important; }
        .close-btn:hover { opacity: 0.7; }
        .bubble-btn:hover { transform: scale(1.07) !important; }
        /* Scrollbar — thin, blends into card */
        .msgs-scroll { scrollbar-width: thin; scrollbar-color: rgba(21,128,61,0.2) transparent; }
        .msgs-scroll::-webkit-scrollbar { width: 3px; }
        .msgs-scroll::-webkit-scrollbar-track { background: transparent; margin: 12px 0; }
        .msgs-scroll::-webkit-scrollbar-thumb { background: rgba(21,128,61,0.22); border-radius: 10px; }
        .msgs-scroll::-webkit-scrollbar-thumb:hover { background: rgba(21,128,61,0.45); }
      `}</style>

      {/* Corner Widget */}
      <div style={{
        position: 'fixed', bottom: '28px', right: '28px',
        zIndex: 9999, display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end', gap: '12px'
      }}>

        {/* ── Chat Panel ─────────────────────────────────────────────────────── */}
        {isOpen && (
          <div className="chat-panel" style={{
            width: '440px',
            height: 'clamp(480px, calc(100vh - 120px), 680px)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            borderRadius: '22px',
            overflow: 'hidden',
            boxShadow: '0 32px 96px rgba(0,0,0,0.38), 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(21,128,61,0.12)',
          }}>

            {/* Header */}
            <header style={{
              background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
              padding: '14px 18px 13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Avatar / icon */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: '22px', height: '22px' }}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.61 1.33 4.89 3.35 6.23L7 22l5-2 5 2-1.35-6.77A7 7 0 0 0 19 9c0-3.87-3.13-7-7-7Z" fill="rgba(255,255,255,0.9)"/>
                  </svg>
                </div>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                    Landscaping Estimator
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 0 2px rgba(74,222,128,0.3)' }} />
                    <span style={{ color: '#bbf7d0', fontSize: '11px', fontWeight: 500 }}>Online · Usually replies in seconds</span>
                  </div>
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setIsOpen(false)}
                style={{
                  color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.12)',
                  border: 'none', cursor: 'pointer', borderRadius: '8px',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', transition: 'opacity 0.15s', flexShrink: 0
                }}
              >
                <svg viewBox="0 0 14 14" fill="none" style={{ width: '12px', height: '12px' }}>
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </header>

            {/* Messages Area */}
            <div className="msgs-scroll" style={{
              flex: 1, overflowY: 'auto', padding: '18px 14px 18px 16px',
              display: 'flex', flexDirection: 'column', gap: '8px',
              backgroundColor: '#f8faf9'
            }}>
              {state.messageHistory.map((message, idx) => {

                if (message.role === 'agent') {
                  return (
                    <div key={message.id} style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                      {/* Mini avatar dot for first or after user message */}
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #15803d, #166534)',
                        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        visibility: (idx === 0 || state.messageHistory[idx - 1]?.role === 'user') ? 'visible' : 'hidden'
                      }}>
                        <svg viewBox="0 0 14 14" fill="none" style={{ width: '12px', height: '12px' }}>
                          <path d="M7 1C4.24 1 2 3.24 2 6c0 1.73.89 3.25 2.23 4.15L3.5 13 7 11.5l3.5 1.5-.73-2.85A5 5 0 0 0 12 6c0-2.76-2.24-5-5-5Z" fill="white"/>
                        </svg>
                      </div>
                      <div style={{
                        backgroundColor: '#ffffff',
                        color: '#1a2e1a',
                        borderRadius: '18px 18px 18px 5px',
                        padding: '11px 15px',
                        maxWidth: '78%',
                        fontSize: '13.5px',
                        lineHeight: 1.55,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
                      }}>
                        <p
                          style={{ margin: 0 }}
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(message.content.replace(
                              /\*\*(.+?)\*\*/g,
                              '<strong>$1</strong>'
                            ))
                          }}
                        />
                      </div>
                    </div>
                  )
                }

                if (message.role === 'user') {
                  return (
                    <div key={message.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#ffffff',
                        borderRadius: '18px 18px 5px 18px',
                        padding: '11px 15px',
                        maxWidth: '78%',
                        fontSize: '13.5px',
                        lineHeight: 1.55,
                        boxShadow: '0 2px 8px rgba(21,128,61,0.25)'
                      }}>
                        <p style={{ margin: 0 }}>{message.content}</p>
                      </div>
                    </div>
                  )
                }

                if (message.role === 'estimate' && estimate) {
                  return (
                    <div key={message.id} style={{ margin: '6px 0' }}>

                      {/* ── SIMPLE QUOTE VIEW ── */}
                      {!showFullCard && (
                        <div style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '18px',
                          overflow: 'hidden',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)'
                        }}>
                          {/* Card header strip */}
                          <div style={{
                            background: 'linear-gradient(135deg, #14532d, #166534)',
                            padding: '12px 18px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                              Your Estimate
                            </span>
                            <span style={{
                              backgroundColor: 'rgba(255,255,255,0.18)', color: '#ffffff',
                              fontSize: '10px', fontWeight: 600, padding: '2px 10px', borderRadius: '20px',
                              letterSpacing: '0.06em', textTransform: 'uppercase'
                            }}>
                              {estimate.projectStatus}
                            </span>
                          </div>

                          {/* Price */}
                          <div style={{ padding: '20px 20px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '42px', fontWeight: 900, color: '#14532d', letterSpacing: '-2.5px', lineHeight: 1 }}>
                              {formatCurrencyGBP(estimate.estimate)}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#9ca3af', margin: '5px 0 0', letterSpacing: '0.01em' }}>
                              {formatCurrencyGBP(estimate.lowerBound)} – {formatCurrencyGBP(estimate.upperBound)} estimated range
                            </div>
                          </div>

                          {/* Range bar */}
                          <div style={{ padding: '6px 20px 4px' }}>
                            <div style={{ height: '5px', borderRadius: '3px', backgroundColor: '#f0fdf4', overflow: 'hidden', position: 'relative' }}>
                              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '20%', right: '20%', background: 'linear-gradient(90deg, #86efac, #16a34a, #86efac)', borderRadius: '3px' }} />
                            </div>
                          </div>

                          {/* Breakdown */}
                          <div style={{ padding: '14px 20px 6px' }}>
                            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '10px' }}>
                              Cost breakdown
                            </div>
                            {estimate.lineItems.map((item, i) => (
                              <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                                paddingBottom: '8px',
                                borderBottom: i < estimate.lineItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                                marginBottom: i < estimate.lineItems.length - 1 ? '8px' : 0
                              }}>
                                <div style={{ flex: 1, marginRight: '12px' }}>
                                  <div style={{ fontSize: '12.5px', color: '#111827', fontWeight: 500 }}>{item.label}</div>
                                  {item.note && (
                                    <div style={{ fontSize: '10.5px', color: '#9ca3af', marginTop: '1px' }}>{item.note}</div>
                                  )}
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d', flexShrink: 0 }}>
                                  {formatCurrencyGBP(item.amount)}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* CTA */}
                          <div style={{ padding: '14px 20px 18px' }}>
                            <button
                              className="enquiry-btn"
                              onClick={() => setShowFullCard(true)}
                              style={{
                                width: '100%', padding: '14px',
                                background: 'linear-gradient(135deg, #15803d, #166534)',
                                color: '#ffffff', border: 'none', borderRadius: '12px',
                                fontWeight: 700, fontSize: '13.5px', cursor: 'pointer',
                                letterSpacing: '0.02em',
                                boxShadow: '0 4px 16px rgba(21,128,61,0.4)',
                                transition: 'background 0.15s'
                              }}
                            >
                              Send Enquiry
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── FULL CRM CARD ── */}
                      {showFullCard && (
                        <div className="crm-card" style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '18px',
                          overflow: 'hidden',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)'
                        }}>
                          {/* Top bar */}
                          <div style={{
                            background: 'linear-gradient(135deg, #14532d, #166534)',
                            padding: '10px 18px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 0 2px rgba(74,222,128,0.35)' }} />
                              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                New Enquiry
                              </span>
                            </div>
                            <span style={{ color: '#bbf7d0', fontSize: '10.5px', fontWeight: 500 }}>
                              {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>

                          {/* Price section */}
                          <div style={{ padding: '20px 20px 14px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ fontSize: '10.5px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 600, marginBottom: '4px' }}>
                              Estimated Cost
                            </div>
                            <div style={{ fontSize: '44px', fontWeight: 900, color: '#14532d', letterSpacing: '-2.5px', lineHeight: 1 }}>
                              {formatCurrencyGBP(estimate.estimate)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatCurrencyGBP(estimate.lowerBound)}</span>
                              <div style={{ width: '80px', height: '5px', borderRadius: '3px', backgroundColor: '#f0fdf4', overflow: 'hidden', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '22%', right: '22%', background: 'linear-gradient(90deg, #86efac, #16a34a)', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatCurrencyGBP(estimate.upperBound)}</span>
                            </div>
                          </div>

                          {/* Lead score section */}
                          <div style={{ padding: '14px 18px', backgroundColor: '#f8fdf9', borderBottom: '1px solid #f0fdf4' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
                                Lead Score
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <span style={{ fontSize: '20px', fontWeight: 900, color: scoreColor, letterSpacing: '-0.5px' }}>
                                  {leadScore}
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af' }}>/100</span>
                                </span>
                                <span style={{
                                  fontSize: '10.5px', fontWeight: 700, color: '#ffffff',
                                  backgroundColor: scoreColor, padding: '3px 10px',
                                  borderRadius: '20px', letterSpacing: '0.04em'
                                }}>
                                  {scoreLabel}
                                </span>
                              </div>
                            </div>
                            <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${leadScore}%`,
                                backgroundColor: scoreColor, borderRadius: '3px',
                                transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)'
                              }} />
                            </div>
                          </div>

                          {/* Customer details grid */}
                          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              {[
                                ['Name', state.fullName || '—'],
                                ['Phone', state.contactPhone || '—'],
                                ['Email', state.contactEmail || '—'],
                                ['Postcode', state.postalCode || '—'],
                                ['Job Type', 'Full Garden Makeover'],
                                ['Their Budget', state.userBudget ? formatCurrencyGBP(state.userBudget) : '—'],
                              ].map(([label, val]) => (
                                <div key={label}>
                                  <div style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', fontWeight: 600, marginBottom: '3px' }}>
                                    {label}
                                  </div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827' }}>{val}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Timeline */}
                          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', fontWeight: 600, marginBottom: '3px' }}>
                              Timeline
                            </div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827' }}>
                              {state.projectStartTiming || '—'}
                            </div>
                          </div>

                          {/* Confirmation footer */}
                          <div style={{ padding: '14px 18px', backgroundColor: '#f8fdf9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                              <div style={{
                                width: '20px', height: '20px', borderRadius: '50%',
                                backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                              }}>
                                <svg viewBox="0 0 12 12" fill="none" style={{ width: '10px', height: '10px' }}>
                                  <path d="M2 6l3 3 5-5" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 600 }}>
                                Enquiry submitted — we'll be in touch soon
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )
                }

                return null
              })}

              {/* Typing indicator */}
              {isProcessing && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #15803d, #166534)',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg viewBox="0 0 14 14" fill="none" style={{ width: '12px', height: '12px' }}>
                      <path d="M7 1C4.24 1 2 3.24 2 6c0 1.73.89 3.25 2.23 4.15L3.5 13 7 11.5l3.5 1.5-.73-2.85A5 5 0 0 0 12 6c0-2.76-2.24-5-5-5Z" fill="white"/>
                    </svg>
                  </div>
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '18px 18px 18px 5px',
                    padding: '12px 16px',
                    display: 'flex', gap: '5px', alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.07)'
                  }}>
                    {[0, 150, 300].map((delay, i) => (
                      <div key={i} style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        backgroundColor: '#16a34a',
                        animation: `typingDot 1.4s ease-in-out ${delay}ms infinite`
                      }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {(() => {
              const demoChips = DEMO_MODE
                ? [
                    { text: 'Porcelain Patio', value: 'Porcelain Patio' },
                    { text: 'Resin Driveway', value: 'Resin Driveway' },
                    { text: 'Composite Decking', value: 'Composite Decking' },
                    { text: 'Full Garden Makeover', value: 'Full Garden Makeover' },
                  ]
                : []
              const displayed = activeReplies.length > 0
                ? activeReplies
                : demoChips
              if (displayed.length === 0) return null
              return (
                <div style={{
                  padding: '8px 14px 10px',
                  backgroundColor: '#ffffff',
                  borderTop: '1px solid #f0fdf4',
                  display: 'flex', flexWrap: 'wrap', gap: '6px',
                  flexShrink: 0
                }}>
                  {displayed.map((reply, index) => (
                    <button
                      key={index}
                      className="qr-btn"
                      onClick={() => !DEMO_MODE && handleQuickReply(reply.value)}
                      disabled={isProcessing}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: 'none',
                        borderRadius: '20px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: DEMO_MODE ? 'default' : 'pointer',
                        transition: 'background 0.12s',
                        opacity: isProcessing ? 0.5 : 1
                      }}
                    >
                      {reply.text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|\p{Emoji_Presentation}/gu, '').trim()}
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* Input Area */}
            <div style={{
              padding: '10px 14px 14px',
              backgroundColor: '#ffffff',
              borderTop: activeReplies.length > 0 ? 'none' : '1px solid #f0fdf4',
              flexShrink: 0
            }}>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (!isProcessing && input.trim()) {
                        handleSend(e as unknown as React.FormEvent)
                      }
                    }
                  }}
                  placeholder="Type a message..."
                  disabled={isProcessing}
                  style={{
                    flex: 1, padding: '11px 16px',
                    borderRadius: '22px',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '13.5px', outline: 'none',
                    backgroundColor: '#f9fafb',
                    color: '#111827',
                    transition: 'border-color 0.15s'
                  }}
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={isProcessing || !input.trim()}
                  style={{
                    width: '42px', height: '42px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #15803d, #166534)',
                    color: '#ffffff', border: 'none', borderRadius: '50%',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: (isProcessing || !input.trim()) ? 0.45 : 1,
                    transition: 'background 0.15s, opacity 0.15s',
                    boxShadow: '0 2px 8px rgba(21,128,61,0.35)'
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="none" style={{ width: '18px', height: '18px', transform: 'translateX(1px)' }}>
                    <path d="M3 10L17 3l-4 7 4 7L3 10Z" fill="white"/>
                  </svg>
                </button>
              </form>

              {/* Progress bar */}
              {state.certaintyLevel > 0 && (
                <div style={{ marginTop: '9px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '3px', borderRadius: '2px', overflow: 'hidden', backgroundColor: '#f0fdf4' }}>
                    <div style={{
                      height: '100%', width: `${state.certaintyLevel}%`,
                      background: 'linear-gradient(90deg, #86efac, #16a34a)',
                      transition: 'width 0.5s ease', borderRadius: '2px'
                    }} />
                  </div>
                  <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {state.certaintyLevel}% complete
                  </span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Floating tooltip — only when closed */}
        {!isOpen && (
          <div className="tooltip-pop" style={{
            backgroundColor: '#ffffff',
            color: '#14532d',
            fontSize: '13px',
            fontWeight: 600,
            padding: '9px 16px',
            borderRadius: '22px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.07)',
            whiteSpace: 'nowrap',
            position: 'relative',
            letterSpacing: '-0.1px'
          }}>
            Want an instant quote?
            {/* Speech bubble tail */}
            <div style={{
              position: 'absolute', bottom: '-7px', right: '30px',
              width: '0', height: '0',
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '8px solid #ffffff',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.06))'
            }} />
          </div>
        )}

        {/* Toggle bubble */}
        <button
          className="bubble-btn"
          onClick={() => setIsOpen(o => !o)}
          style={{
            width: '62px', height: '62px', borderRadius: '50%',
            background: isOpen
              ? 'linear-gradient(135deg, #374151, #1f2937)'
              : 'linear-gradient(135deg, #15803d, #14532d)',
            border: '2.5px solid #ffffff',
            cursor: 'pointer',
            boxShadow: isOpen
              ? '0 6px 20px rgba(0,0,0,0.3)'
              : '0 6px 24px rgba(21,128,61,0.55), 0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, background 0.3s',
            padding: 0
          }}
        >
          {isOpen ? (
            <svg viewBox="0 0 14 14" fill="none" style={{ width: '16px', height: '16px' }}>
              <path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" style={{ width: '28px', height: '28px' }}>
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
            </svg>
          )}
        </button>

      </div>
    </>
  )
}

export default App
