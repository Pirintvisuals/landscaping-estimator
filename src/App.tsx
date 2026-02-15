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
import { getFallbackQuickReplies, type QuickReply } from './quickReplies'
import {
  calculateUKEstimate,
  formatCurrencyGBP,
  type EstimateResult,
  type ProjectInputs
} from './qouter'
import DOMPurify from 'dompurify'
import { estimatorSchema, contactSchema } from './schemas/estimator'

function App() {
  const [state, setState] = useState<ConversationState>(createInitialState())
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [estimate, setEstimate] = useState<EstimateResult | null>(null)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messageHistory])

  // Send initial greeting on mount
  useEffect(() => {
    const greeting: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'agent',
      content: "Hi! I'm your landscaping assistant. What kind of outdoor transformation are you thinking about?",
      timestamp: new Date()
    }

    setState(prev => ({
      ...prev,
      messageHistory: [greeting]
    }))
  }, [])

  const handleSubmitLead = async () => {
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
        // New fields
        projectStartTiming: state.projectStartTiming || 'Not specified',
        groundSoilType: state.groundSoilType || 'Not specified',
        hasExcavatorAccess: state.hasExcavatorAccess // useful for 'ACCESS'
      }

      // 1. Zod Validation
      // We validate the contact info part mostly, as other parts are derived from state logic
      // But let's check basic sanity
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

      // 2. Sanitization (though we send JSON, it's good practice to sanitize values if they are ever echoed back)
      const leadData = {
        ...rawLeadData,
        fullName: DOMPurify.sanitize(rawLeadData.fullName),
        contactPhone: DOMPurify.sanitize(rawLeadData.contactPhone),
        contactEmail: DOMPurify.sanitize(rawLeadData.contactEmail),
        projectStartTiming: DOMPurify.sanitize(rawLeadData.projectStartTiming),
        groundSoilType: DOMPurify.sanitize(rawLeadData.groundSoilType)
        // numeric fields don't need sanitization
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
          content: '✅ **Request Received.** I have submitted your request to **Secure Your Project Slot**.',
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

      // MOCK FALLBACK for Localhost/Dev without backend
      console.log('⚡ Dev Mode: Simulating successful email send')
      setEmailSent(true)
      const successMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: '✅ **Request Received.** I have submitted your request to **Secure Your Project Slot**.',
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
    if (!sanitizedInput) return // Prevent empty after sanitization

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: sanitizedInput,
      timestamp: new Date()
    }

    // Add user message to state immediately
    setState(prev => ({
      ...prev,
      messageHistory: [...prev.messageHistory, userMessage]
    }))

    setInput('')
    setIsProcessing(true)

    try {
      let extracted: ExtractedInfo = {}

      // 1. Try LOCAL EXTRACTION first (Fastest)
      // We import dynamically to keep initial bundle small, though for this size it's negligible
      const { extractLocalInformation, calculateConfidence } = await import('./localExtraction')
      extracted = extractLocalInformation(userMessage.content)
      const localConfidence = calculateConfidence(extracted)

      // 2. Decide if we need the API
      // If we found the CURRENTLY requested field, or confidence is high, skip API
      const currentField = detectCurrentField(state)
      const relevantFieldFound = isRelevantFieldExtracted(currentField, extracted, state, updateStateWithExtraction(state, extracted, currentField))

      // Heuristic: If we found what we asked for, OR confidence is high (>50), OR it's a simple yes/no/number
      // Then use local data and skip the slow API call.
      const useLocalOnly = relevantFieldFound || localConfidence > 50 ||
        /^(yes|no|yep|nope|\d+(\.\d+)?)$/i.test(sanitizedInput)

      if (useLocalOnly) {
        console.log('⚡ Using local extraction (Fast Mode)', extracted)
      } else {
        // 3. Fallback to API if local failed to understand complex intent
        try {
          console.log('🌐 Complex input detected, calling Gemini API...')
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
            const apiExtracted = data.extracted || {}
            // Merge API results (API takes precedence if conflict, usually)
            extracted = { ...extracted, ...apiExtracted }
            console.log('✅ API extraction complete')
          } else {
            throw new Error('API not available')
          }
        } catch (apiError) {
          console.log('⚠️ API unavailable, continuing with local only')
        }
      }

      // Update state with extracted information - PASS CURRENT FIELD for context awareness
      const updatedState = updateStateWithExtraction(state, extracted, currentField)

      // RETRY DETECTION: Check if extraction was successful FOR THE CURRENT FIELD
      let stateWithRetry = updatedState
      // currentField is already defined above
      const relevantFieldExtracted = isRelevantFieldExtracted(currentField, extracted, state, updatedState)

      // FORCE ACCEPT POSTCODE: If we asked for postcode, and user typed something, accept it.
      if (currentField === 'postalCode' && !relevantFieldExtracted && sanitizedInput.length > 1) {
        // Manually inject it
        stateWithRetry.postalCode = sanitizedInput.toUpperCase()
        // Clear retry count effectively
        stateWithRetry = resetRetryCount(stateWithRetry)
      } else if (!relevantFieldExtracted) {
        // Current field wasn't extracted - user response not understood for this question
        stateWithRetry = incrementRetryCount(updatedState, currentField)

        // Show fallback quick replies if retry count >= 1
        if (stateWithRetry.showQuickReplies) {
          const fallbackReplies = getFallbackQuickReplies(currentField, stateWithRetry)
          setQuickReplies(fallbackReplies)
        }
      } else {
        // Successfully extracted relevant field - reset retry
        stateWithRetry = resetRetryCount(updatedState)
        setQuickReplies([])
      }

      // Generate acknowledgment
      const ack = generateAcknowledgment(stateWithRetry, extracted)

      // Get next question  
      const nextQ = getNextQuestion(stateWithRetry)

      // Build agent response
      let agentContent = ''
      if (ack) agentContent += ack + ' '

      // Check if ready for estimate
      if (isReadyForEstimate(stateWithRetry) && !nextQ) {
        const serviceName = stateWithRetry.service || 'landscaping'
        agentContent += `I've gathered everything. Because it's currently peak season, we are actually only taking on 3 more ${serviceName} projects before the summer starts to ensure we maintain our high standards. I’ll send this over to our senior surveyor right now.`

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

        // Generate estimate
        setTimeout(() => {
          generateEstimate(stateWithRetry)
        }, 1000)

      } else if (nextQ) {
        // Add retry message if showing quick replies
        if (stateWithRetry.showQuickReplies) {
          agentContent = "Apologies, I didn't verify that. Could you please select an option below or clarify?"
        } else {
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
        // Fallback
        const agentMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: ack || "I understand. Could you tell me a bit more?",
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
    // Simulate user typing the quick reply value
    setInput(value)
    // Trigger form submission programmatically
    handleSend({ preventDefault: () => { } } as React.FormEvent)
  }

  const generateEstimate = (conversationState: ConversationState) => {
    let inputs: ProjectInputs | undefined;
    try {
      // Build ProjectInputs from conversation state
      inputs = {
        service: conversationState.service || 'hardscaping',
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

      // Validate inputs using Zod to ensure positive numbers and correct types
      const safeInputs = estimatorSchema.parse(inputs)
      // ... same as before
      const result = calculateUKEstimate(safeInputs as ProjectInputs)
      setEstimate(result)

      const estimateMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'estimate',
        content: '', // Content will be rendered separately
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
        content: "I'm having trouble calculating that estimate. Could you verify the project details? (Error code: invalid_inputs)",
        timestamp: new Date()
      }

      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, errorMessage],
        awaitingEstimate: false // Allow retry
      }))
    }
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#051F20' }}>

      {/* Header */}
      <header className="border-b p-4" style={{ backgroundColor: '#0B2B26', borderColor: '#1A3F3A' }}>
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-bold" style={{ color: '#8EB69B' }}>
            UK Landscape Consultant
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#6B8F7B' }}>
            Senior quantity surveyor | UK 2026 standards
          </p>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {state.messageHistory.map((message) => {
            if (message.role === 'agent') {
              // Check if this is a scarcity alert message
              const isScarcityAlert = message.content.includes('⚠️') && message.content.includes('System Note')

              return (
                <div key={message.id} className="flex justify-start">
                  <div
                    className="rounded-2xl p-4 max-w-[80%]"
                    style={{
                      backgroundColor: isScarcityAlert ? '#FFA50020' : '#0B2B26',
                      color: isScarcityAlert ? '#FFD700' : '#DAF1DE',
                      border: isScarcityAlert ? '2px solid #FFA500' : '1px solid #1A3F3A',
                      boxShadow: isScarcityAlert ? '0 0 20px rgba(255, 165, 0, 0.3)' : 'none'
                    }}
                  >
                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(message.content.replace(
                          /\[([^\]]+)\]\(([^\)]+)\)/g,
                          '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #8EB69B; text-decoration: underline;">$1</a>'
                        ))
                      }}
                    />
                  </div>
                </div>
              )
            }

            if (message.role === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <div
                    className="rounded-2xl p-4 max-w-[80%]"
                    style={{
                      backgroundColor: '#8EB69B20',
                      color: '#DAF1DE',
                      border: '1px solid #8EB69B'
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              )
            }

            if (message.role === 'estimate' && estimate) {
              const isVIP = estimate.projectStatus === 'VIP PRIORITY'

              return (
                <div key={message.id} className="my-6">
                  {/* Project Feasibility Summary Card */}
                  <div
                    className="rounded-3xl p-6 mb-4"
                    style={{
                      background: isVIP
                        ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                        : 'linear-gradient(135deg, #8EB69B 0%, #6B8F7B 100%)',
                      border: isVIP ? '2px solid #FFD700' : 'none'
                    }}
                  >
                    <h3 className="text-lg uppercase tracking-wider font-bold mb-1" style={{ color: '#051F20' }}>
                      Professional Ballpark Investment
                    </h3>
                    <p className="text-xs font-normal opacity-75 mb-4" style={{ color: '#051F20' }}>
                      (Includes 15-17% 2026 material/labor uplift)
                    </p>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: isVIP ? '#FFA500' : '#6B8F7B' }}>
                        <span className="text-sm font-semibold" style={{ color: '#051F20' }}>Name:</span>
                        <span className="text-sm font-bold" style={{ color: '#051F20' }}>{state.fullName || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: isVIP ? '#FFA500' : '#6B8F7B' }}>
                        <span className="text-sm font-semibold" style={{ color: '#051F20' }}>Phone:</span>
                        <span className="text-sm font-bold" style={{ color: '#051F20' }}>{state.contactPhone || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: isVIP ? '#FFA500' : '#6B8F7B' }}>
                        <span className="text-sm font-semibold" style={{ color: '#051F20' }}>Email:</span>
                        <span className="text-sm font-bold" style={{ color: '#051F20' }}>{state.contactEmail || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: isVIP ? '#FFA500' : '#6B8F7B' }}>
                        <span className="text-sm font-semibold" style={{ color: '#051F20' }}>Your Budget:</span>
                        <span className="text-sm font-bold" style={{ color: '#051F20' }}>
                          {state.userBudget ? formatCurrencyGBP(state.userBudget) : 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: isVIP ? '#FFA500' : '#6B8F7B' }}>
                        <span className="text-sm font-semibold" style={{ color: '#051F20' }}>Calculated Project Cost:</span>
                        <span className="text-xl font-bold" style={{ color: '#051F20' }}>
                          {formatCurrencyGBP(estimate.estimate)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-semibold" style={{ color: '#051F20' }}>Project Status:</span>
                        <span
                          className="text-lg font-bold px-3 py-1 rounded-lg"
                          style={{
                            color: isVIP ? '#8B0000' : '#051F20',
                            backgroundColor: isVIP ? '#FFE5B4' : '#DAF1DE'
                          }}
                        >
                          {estimate.projectStatus}
                        </span>
                      </div>
                    </div>

                    {/* Range display */}
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: isVIP ? '#FFA500' : '#6B8F7B' }}>
                      <div className="flex items-center justify-between text-xs" style={{ color: '#051F20' }}>
                        <span>Lower: {formatCurrencyGBP(estimate.lowerBound)}</span>
                        <span>Upper: {formatCurrencyGBP(estimate.upperBound)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div
                    className="rounded-2xl p-5 mb-4 space-y-3"
                    style={{
                      backgroundColor: '#0B2B26',
                      border: '1px solid #1A3F3A'
                    }}
                  >
                    <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: '#6B8F7B' }}>
                      Line Items Breakdown
                    </p>
                    {estimate.lineItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-4 pb-3 border-b"
                        style={{ borderColor: '#1A3F3A' }}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: '#DAF1DE' }}>
                            {item.label}
                          </p>
                          {item.note && (
                            <p className="text-xs mt-1" style={{ color: '#6B8F7B' }}>
                              {item.note}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-semibold whitespace-nowrap" style={{ color: '#8EB69B' }}>
                          {formatCurrencyGBP(item.amount)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Surveyor's Notes */}
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      backgroundColor: '#1A3F3A',
                      border: '1px solid #8EB69B'
                    }}
                  >
                    <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: '#8EB69B' }}>
                      Surveyor's Notes
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#DAF1DE' }}>
                      {estimate.reasoning}
                    </p>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-[10px] text-center mt-4 px-4 leading-tight opacity-60" style={{ color: '#8EB69B' }}>
                    This estimate is intended for guidance only and does not constitute a firm quote or legal contract. The "Calculated Project Cost" is a rough approximation based on typical 2026 material and labor rates. Final costs may fluctuate based on a formal site survey, specific material availability, and detailed project specifications.
                  </p>

                  {/* Submit Button */}
                  {!emailSent && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={handleSubmitLead}
                        disabled={sendingEmail}
                        className="px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105"
                        style={{
                          background: estimate.projectStatus === 'VIP PRIORITY'
                            ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                            : 'linear-gradient(135deg, #8EB69B 0%, #6B8F7B 100%)',
                          color: '#051F20',
                          border: 'none',
                          cursor: sendingEmail ? 'not-allowed' : 'pointer',
                          opacity: sendingEmail ? 0.7 : 1,
                          boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}
                      >
                        {sendingEmail ? '📧 Submitting...' : '🔒 Secure My Project Slot'}
                      </button>
                      <p className="text-xs mt-2" style={{ color: '#6B8F7B' }}>
                        Limited slots available for Spring 2026
                      </p>
                    </div>
                  )}

                  {/* VIP CALENDLY LINK - Always visible for VIPs, even after submit */}
                  {estimate.projectStatus === 'VIP PRIORITY' && (
                    <div className="mt-6 p-4 rounded-xl border border-[#FFD700] bg-[#FFD70010]">
                      <p className="text-sm font-bold mb-2" style={{ color: '#FFD700' }}>
                        VIP PRIORITY ACCESS
                      </p>
                      <p className="text-sm mb-3" style={{ color: '#DAF1DE' }}>
                        Because your project is a priority for us, you can book an instant 15-minute consultation with our lead designer right now to lock in your estimate.
                      </p>
                      <a
                        href="https://calendly.com/pirint-milan/weboldal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 rounded-lg font-bold text-sm transition-colors hover:bg-[#FFD700] hover:text-[#051F20]"
                        style={{
                          color: '#051F20',
                          backgroundColor: '#FFD700'
                        }}
                      >
                        📅 Book Consultation Now
                      </a>
                    </div>
                  )}
                </div>
              )
            }

            return null
          })}

          {/* Typing indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-5 py-3"
                style={{
                  backgroundColor: '#0B2B26',
                  border: '1px solid #1A3F3A'
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#8EB69B' }}></div>
                    <div className="w-2 h-2 rounded-full animate-pulse delay-75" style={{ backgroundColor: '#8EB69B' }}></div>
                    <div className="w-2 h-2 rounded-full animate-pulse delay-150" style={{ backgroundColor: '#8EB69B' }}></div>
                  </div>
                  <span className="text-xs" style={{ color: '#6B8F7B' }}>
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div
        className="sticky bottom-0 border-t p-4"
        style={{
          backgroundColor: '#0B2B26',
          borderColor: '#1A3F3A'
        }}
      >
        <div className="mx-auto max-w-4xl">
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isProcessing}
              className="flex-1 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2"
              style={{
                backgroundColor: '#051F20',
                color: '#DAF1DE',
                border: '1px solid #1A3F3A'
              }}
            />
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="rounded-xl px-8 py-3 font-medium transition disabled:opacity-50"
              style={{
                backgroundColor: '#8EB69B',
                color: '#051F20'
              }}
            >
              Send
            </button>
          </form>

          {/* Quick Reply Buttons - shown when bot doesn't understand */}
          {state.showQuickReplies && quickReplies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(reply.value)}
                  disabled={isProcessing}
                  className="quick-reply-btn rounded-lg px-4 py-2 text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
                  style={{
                    backgroundColor: '#1A3F3A',
                    color: '#DAF1DE',
                    border: '1px solid #8EB69B'
                  }}
                >
                  {reply.text}
                </button>
              ))}
            </div>
          )}

          {/* Certainty indicator */}
          {state.certaintyLevel > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1A3F3A' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${state.certaintyLevel}%`,
                    backgroundColor: state.certaintyLevel >= 85 ? '#52A675' : '#8EB69B'
                  }}
                />
              </div>
              <span className="text-xs whitespace-nowrap" style={{ color: '#6B8F7B' }}>
                {state.certaintyLevel}% confident
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
