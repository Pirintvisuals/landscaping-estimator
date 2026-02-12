/**
 * Send Lead Email API Endpoint
 * 
 * Sends lead information to business owner via Resend
 */

throw new Error('RESEND_API_KEY not configured')
        }

const resend = new Resend(apiKey)

const isVIP = leadData.projectStatus === 'VIP PRIORITY'
const vipBadge = isVIP ? '⭐ VIP PRIORITY PROJECT ⭐' : 'Standard Project'

const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${isVIP ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'linear-gradient(135deg, #8EB69B 0%, #6B8F7B 100%)'}; 
                  padding: 20px; border-radius: 10px; color: #051F20; text-align: center; }
        .badge { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .info-row { padding: 12px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; }
        .label { font-weight: bold; color: #666; }
        .value { color: #051F20; font-weight: 600; }
        .highlight { background: ${isVIP ? '#FFE5B4' : '#DAF1DE'}; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #8EB69B; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="badge">${vipBadge}</div>
            <h1 style="margin: 0;">New Lead Received</h1>
        </div>
        
        <div style="margin-top: 20px;">
            <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${leadData.fullName}</span>
            </div>
            <div class="info-row">
                <span class="label">Phone:</span>
                <span class="value">${leadData.contactPhone}</span>
            </div>
            <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${leadData.contactEmail}</span>
            </div>
            <div class="info-row">
                <span class="label">Service:</span>
                <span class="value">${leadData.service}</span>
            </div>
            <div class="info-row">
                <span class="label">Area:</span>
                <span class="value">${leadData.area}m²</span>
            </div>
        </div>
        
        <div class="highlight">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span class="label">Client Budget:</span>
                <span class="value">£${leadData.userBudget.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span class="label">Quoted Estimate:</span>
                <span class="value" style="font-size: 20px;">£${leadData.estimatedCost.toLocaleString()}</span>
            </div>
        </div>
        
        ${isVIP ? '<p style="color: #8B0000; font-weight: bold; text-align: center;">🔥 HIGH VALUE PROJECT - PRIORITY FOLLOW-UP RECOMMENDED 🔥</p>' : ''}
        
        <div class="footer">
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Contact within 24 hours for best conversion</li>
                <li>Schedule technical site survey</li>
                <li>Prepare detailed quotation</li>
            </ul>
        </div>
    </div>
</body>
</html>
`

const { data, error } = await resend.emails.send({
    from: 'Landscape Estimator <onboarding@resend.dev>',
    to: ['pirint.milan@gmail.com'],
    subject: `New Lead: ${leadData.fullName} - £${leadData.estimatedCost.toLocaleString()} (${leadData.projectStatus})`,
    html: emailHtml,
})

if (error) {
    console.error('Resend error:', error)
    throw error
}

return new Response(JSON.stringify({ success: true, messageId: data?.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
})
    } catch (error) {
    console.error('Send lead email error:', error)
    return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error.message }),
        {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        }
    )
}
}

export const config = {
    path: '/api/send-lead',
}
