# App.tsx Updates - Remove Scarcity Alert & Budget Alignment

## Change 1: Remove lines 124-165 (Scarcity Alert Logic)

**Delete this entire section:**
```tsx
      // Check if budget was just confirmed (user said yes to budget question)
      if (extracted.budgetAligns === true && state.budgetAligns === null) {
        // User just confirmed budget - show scarcity alert + CTA
        const scarcityAlert: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: `⚠️ **System Note:** Our High Wycombe/SL4 build-slots for Spring 2026 are currently at **85% capacity**.\\n\\nDue to current material lead times and our commitment to quality, we have only **3 confirmed start dates** remaining for projects of this scale before June.\\n\\nTo secure priority on the 'Site Survey' list and lock in your position in the queue, please complete the contact details below immediately.`,
          timestamp: new Date()
        }

        const ctaMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: `To proceed with this project:\\n\\n• **Book a Technical Site Survey**: [Schedule on our calendar](https://calendly.com/pirint-milan/weboldal)\\n\\n• **Submit Project Details**: [Complete our contact form](https://landscaletemplate.framer.website/contact#forms)\\n\\nThis ballpark investment is valid for 14 days due to fluctuating UK material costs.\\n\\n📞 **Phone:** +1234567898\\n📧 **Email:** landscale.agency@gmail.com`,
          timestamp: new Date()
        }

        setState(prev => ({
          ...stateWithRetry,
          messageHistory: [...prev.messageHistory, scarcityAlert, ctaMessage]
        }))
        setIsProcessing(false)
        return
      }

      // Check if budget was declined
      if (extracted.budgetAligns === false && state.budgetAligns === null) {
        // User declined budget - show alternative message
        const alternativeMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: `I understand. Would you like me to suggest ways to adjust the scope to meet your budget? We can discuss options like:\\n\\n• Different material selections\\n• Phased implementation\\n• Reduced project area\\n\\nAlternatively, you can reach out directly:\\n\\n📞 **Phone:** +1234567898\\n📧 **Email:** landscale.agency@gmail.com`,
          timestamp: new Date()
        }

        setState(prev => ({
          ...stateWithRetry,
          messageHistory: [...prev.messageHistory, alternativeMessage]
        }))
        setIsProcessing(false)
        return
      }
```

## Change 2: Remove budget quick replies (lines 286-303)

**In the `generateEstimate` function, remove the budget question section:**

Delete this:
```tsx
      // Ask budget alignment question instead of showing CTA immediately
      const budgetQuestion: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: 'Does this investment align with your budget for this project?',
        timestamp: new Date()
      }

      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, estimateMessage, budgetQuestion]
      }))

      // Show budget quick reply options
      setQuickReplies([
        { text: '✅ Yes, that works for me', value: 'yes that works' },
        { text: '💭 Need to discuss scope', value: 'too expensive need to discuss' }
      ])
```

**Replace with:**
```tsx
      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, estimateMessage]
      }))
```

## Summary

After these changes:
1. No scarcity alert will show
2. No external website links
3. Estimate shows immediately after collecting name, phone, email, budget
4. Project Feasibility Summary displays with VIP/Standard status
5. Conversation ends cleanly after showing the estimate
