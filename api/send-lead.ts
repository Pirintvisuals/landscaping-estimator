import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

// Helper for formatting currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const leadData = request.body;

        // Basic server-side validation
        if (!leadData || !leadData.contactEmail || !leadData.estimatedCost) {
            return response.status(400).json({ error: 'Missing required lead data' });
        }

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error('RESEND_API_KEY is missing');
            return response.status(500).json({ error: 'Server configuration error' });
        }

        const resend = new Resend(apiKey);

        const isVIP = leadData.projectStatus === 'VIP PRIORITY';
        const vipBadge = isVIP ? '⭐ VIP PRIORITY PROJECT ⭐' : 'Standard Project';

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
            <h1 style="margin: 0;">Secure Project Slot Request</h1>
        </div>
        
        <div style="margin-top: 20px;">
            <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${leadData.fullName || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="label">Phone:</span>
                <span class="value">${leadData.contactPhone || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${leadData.contactEmail}</span>
            </div>
            <div class="info-row">
                <span class="label">Postcode:</span>
                <span class="value">${leadData.postalCode || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="label">Service:</span>
                <span class="value">${leadData.service || 'Unknown'}</span>
            </div>
            <div class="info-row">
                <span class="label">Area:</span>
                <span class="value">${leadData.area || 0}m²</span>
            </div>
        </div>
        
        <div class="highlight">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span class="label">Client Budget:</span>
                <span class="value">${formatCurrency(leadData.userBudget || 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span class="label">Quoted Estimate:</span>
                <span class="value" style="font-size: 20px;">${formatCurrency(leadData.estimatedCost)}</span>
            </div>
        </div>
        
        ${isVIP ? '<p style="color: #8B0000; font-weight: bold; text-align: center;">🔥 HIGH VALUE PROJECT - PRIORITY FOLLOW-UP RECOMMENDED 🔥</p>' : ''}
        
        <div class="footer">
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Contact within 24 hours for best conversion</li>
                <li>Secure the slot for Spring 2026</li>
                <li>Prepare detailed quotation</li>
            </ul>
        </div>
    </div>
</body>
</html>
    `;

        const { data, error } = await resend.emails.send({
            from: 'Landscape Estimator <onboarding@resend.dev>',
            to: ['pirint.milan@gmail.com'], // In production, this should be env var too, but hardcoded for now as per user previous state
            subject: `Project Slot Request: ${leadData.fullName || 'Unknown'} - ${formatCurrency(leadData.estimatedCost)} (${leadData.projectStatus})`,
            html: emailHtml,
        });

        if (error) {
            console.error('Resend error:', error);
            return response.status(500).json({ error: error.message });
        }

        return response.status(200).json({ success: true, messageId: data?.id });

    } catch (error: any) {
        console.error('Send lead email error:', error);
        return response.status(500).json({ error: 'Failed to send email', details: error.message });
    }
}
