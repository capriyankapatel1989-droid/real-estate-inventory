import * as XLSX from 'xlsx';

export default async function handler(req, res) {
    console.log('Extract called');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('API Key exists:', !!apiKey);
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API key missing from environment' });
    }

    try {
        const { base64Data, mimeType } = req.body;
        
        if (!base64Data) {
            return res.status(400).json({ error: 'No file data received' });
        }

        const isExcel = mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('ms-excel');
        const isImage = mimeType.startsWith('image/');
        const isPdf = mimeType === 'application/pdf';

        let contentBlock;

        if (isExcel) {
            // Convert Excel to plain text (CSV of all sheets) before sending
            const workbook = XLSX.read(base64Data, { type: 'base64' });
            let text = '';
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                text += `Sheet: ${sheetName}\n`;
                text += XLSX.utils.sheet_to_csv(sheet);
                text += '\n\n';
            });
            contentBlock = { type: 'text', text: text.substring(0, 100000) };
        } else if (isImage) {
            contentBlock = {
                type: 'image',
                source: { type: 'base64', media_type: mimeType, data: base64Data }
            };
        } else if (isPdf) {
            contentBlock = {
                type: 'document',
                source: { type: 'base64', media_type: mimeType, data: base64Data }
            };
        } else {
            return res.status(400).json({ error: 'Unsupported file type: ' + mimeType });
        }

        console.log('Calling Claude API...');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-opus-4-6',
                max_tokens: 4096,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Extract property data. Return JSON array only.' },
                        contentBlock
                    ]
                }]
            })
        });

        console.log('Claude API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API error:', errorText);
            return res.status(response.status).json({ 
                error: 'Claude API returned ' + response.status + ': ' + errorText.substring(0, 100) 
            });
        }

        const data = await response.json();
        console.log('Claude API success');
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('Extract error:', error);
        return res.status(500).json({ 
            error: 'Server error: ' + (error.message || 'Unknown error') 
        });
    }
}
