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
                        text: 'Extract property data: {developer,project,location,status,handoverTimeline,paymentPlan,unitType,postHandoverOptions,availability,bedrooms,lowestPrice,highestPrice,lowestArea,highestArea,pricePerSqft,lastUpdate,furnished,nonFurnished,commission}. Return ONLY JSON array.'
                    }, {
                        type: 'document',
                        source: { type: 'base64', media_type: mimeType, data: base64Data }
                    }]
                }]
            })
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
