# Quick Fixes for Name/Email/Phone Extraction

## Problem
The chatbot asks for name but doesn't understand simple text inputs like "John Smith"

## Solution Files Created

### 1. `conversation.ts` Update (API Extraction)
**File**: `functions/api/conversation.ts`
**Line**: 149-177

Add these fields to the extraction mapping section:

```typescript
• User Info: fullName (any text response to name question), contactPhone (phone numbers), contactEmail (email addresses), userBudget (budget amount in GBP)
```

And update the RESPONSE FORMAT to include:

```typescript
    "fullName": "John Smith" | null,
    "contactPhone": "07123456789" | null,
    "contactEmail": "user@example.com" | null,
    "userBudget": 5000 | null
```

### 2. `localExtraction.ts` Update (Offline Fallback)
**File**: `src/localExtraction.ts`
**Replace lines 355-406** with simpler extraction logic:

```typescript
    // FULL NAME - accept any reasonable text
    const trimmedMsg = userMessage.trim()
    if (trimmedMsg.length > 2 && trimmedMsg.length < 50 && !msg.includes('@')) {
        extracted.fullName = trimmedMsg
    }

    // PHONE NUMBER  
    const phonePatterns = [
        /(\+?44\s?\d{2,4}\s?\d{3,4}\s?\d{3,4})/,
        /(0\d{2,4}\s?\d{3,4}\s?\d{3,4})/,
        /(\d{10,11})/
    ]
    for (const pattern of phonePatterns) {
        const phoneMatch = userMessage.match(pattern)
        if (phoneMatch) {
            extracted.contactPhone = phoneMatch[1]
            break
        }
    }

    // EMAIL
    const emailPattern = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    const emailMatch = userMessage.match(emailPattern)
    if (emailMatch) {
        extracted.contactEmail = emailMatch[1].toLowerCase()
    }

    // BUDGET
    const budgetPattern = /(\d{3,6})/  // 3-6 digit number
    const budgetMatch = userMessage.match(budgetPattern)
    if (budgetMatch) {
        let amount = parseFloat(budgetMatch[1])
        if (msg.includes('k')) amount *= 1000
        extracted.userBudget = amount
    }

    return extracted
}
```

## Email Notification System

To send you (business owner) an email with lead details after estimate:

**I need from you:**
1. Your notification email address (where to send leads)
2. Email service choice:
   - **Resend** (easiest, free tier: 100 emails/day)
   - **SendGrid** (popular, free tier: 100 emails/day)
   - **SMTP** (your own email server)

**I will create:**
- `/functions/api/send-lead.ts` - Serverless function to send email
- Update `App.tsx` to trigger email after showing estimate
- Email template with: Name, Phone, Email, Budget, Estimate, VIP Status

Tell me your email address and preferred service, and I'll set it up!
