import { Resend } from 'resend';

interface Env {
    RESEND_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { request, env } = context;
        const leadData = await request.json() as any;

        if (!leadData || !leadData.contactEmail || !leadData.estimatedCost) {
            return new Response(JSON.stringify({ error: 'Missing required lead data' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!env.RESEND_API_KEY) {
            return new Response(JSON.stringify({ error: 'RESEND_API_KEY is missing' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const resend = new Resend(env.RESEND_API_KEY);
        const isVIP = leadData.projectStatus === 'VIP PRIORITY';

        // Same HTML template logic as before, simplified for demonstration
        const emailHtml = `
      <h1>New Lead: ${leadData.fullName}</h1>
      <p>Phone: ${leadData.contactPhone}</p>
      <p>Email: ${leadData.contactEmail}</p>
      <p>Service: ${leadData.service}</p>
      <p>Estimate: £${leadData.estimatedCost}</p>
      <p>Status: ${leadData.projectStatus}</p>
      <p>Timeline: ${leadData.projectStartTiming || 'Not specified'}</p>
    `;

        const { data, error } = await resend.emails.send({
            from: 'Landscape Estimator <onboarding@resend.dev>',
            to: ['pirint.milan@gmail.com'],
            subject: `Project Slot Request: ${leadData.fullName}`,
            html: emailHtml,
        });

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true, id: data?.id }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
