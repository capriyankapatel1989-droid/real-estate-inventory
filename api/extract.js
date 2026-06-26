export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { base64Data, mimeType } = req.body;
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                model: 'claude-opus-4-6',
                max_tokens: 4096,
                messages: [{
                    role: 'user',
                    content: [{
                        type: 'text',
                        text: 'Extract ALL property/unit data from this file. For each unit, return JSON with: developer, project, location, status, handoverTimeline, paymentPlan, unitType, postHandoverOptions (boolean), availability (boolean), bedrooms, lowestPrice (number), highestPrice (number), lowestArea (number), highestArea (number), pricePerSqft (number), lastUpdate, furnished (boolean), nonFurnished (boolean), commission (number 0-1). Return ONLY valid JSON array, no markdown, no explanation.'
                    }, {
                        type: 'document',
                        source: { type: 'base64', media_type: mimeType, data: base64Data }
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).json({ error: 'API error: ' + errText });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Server error' });
    }
}
