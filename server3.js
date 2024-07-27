import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

function chunkText(text, maxLength) {
    return text.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];
}

async function makeApiRequest(requestBody, apiKey, endpoint, retries = 5) {
    let attempt = 0;
    while (attempt < retries) {
        attempt++;
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const responseText = await response.text();
                if (response.status === 429) {
                    const retryAfter = parseFloat(response.headers.get('retry-after')) || Math.pow(2, attempt);
                    console.log(`Rate limit exceeded, retrying after ${retryAfter} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                } else {
                    throw new Error(`HTTP error! Status: ${response.status} - ${responseText}`);
                }
            } else {
                const data = await response.json();
                if (!data.choices || !data.choices.length) {
                    throw new Error('Invalid response format from Groq API');
                }
                return data.choices[0]?.message?.content;
            }
        } catch (error) {
            console.log(`Attempt ${attempt} failed: ${error.message}`);
            if (attempt >= retries) {
                throw new Error(`Failed after ${retries} attempts: ${error.message}`);
            }
        }
    }
}

app.post('/api/groq', async (req, res) => {
    const { query, pdf } = req.body;

    try {
        const apiKey = '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';
        const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

        const pdfPath = path.join(__dirname, 'public', 'pdfs', pdf);
        console.log(`Reading PDF from path: ${pdfPath}`);

        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF file does not exist: ${pdfPath}`);
        }

        const pdfData = fs.readFileSync(pdfPath);
        const pdfText = await pdfParse(pdfData);
        const chunks = chunkText(pdfText.text, 1500);
        let results = [];

        for (const chunk of chunks) {
            const requestBody = {
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: `${query} (PDF: ${pdf})\n\nDocument Text:\n${chunk}` }],
                max_tokens: 150
            };

            console.log(`Sending request to Groq API: ${JSON.stringify(requestBody)}`);

            const result = await makeApiRequest(requestBody, apiKey, endpoint);
            results.push(result);
        }

        res.json({ result: results.join(' ') });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: `Unable to get a valid response from Groq API: ${error.message}` });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
