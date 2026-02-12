# Environment Setup for Email Notifications

## Step 1: Create .env file for local development

Create a file named `.env` in the project root:

```
RESEND_API_KEY=re_LzCHkFqN_KEorsezveqWCuCnhxDLqR52F
```

## Step 2: For Production (Netlify)

Add to Netlify environment variables:
- Key: `RESEND_API_KEY`
- Value: `re_LzCHkFqN_KEorsezveqWCuCnhxDLqR52F`

Via Netlify dashboard:
https://app.netlify.com → Your Site → Site configuration → Environment variables

## Step 3: Install Resend Package

If npm command failed, run manually:
```bash
npm install resend
```

## Files Created:
1. ✅ `/functions/api/send-lead.ts` - Email sending function
2. ✅ `App_tsx_submit_button.txt` - Button code to add to App.tsx

## What Happens:
1. User sees estimate
2. "Request Site Survey" button appears
3. User clicks → Email sent to pirint.milan@gmail.com
4. Success message shown to user
