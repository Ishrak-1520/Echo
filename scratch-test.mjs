import fs from 'fs';
import crypto from 'crypto';

const apiKey = "ak_2JM7bI32F60P7uA5bF00z1g86TW0M";
const BASE_URL = 'https://api.longcat.chat/openai/v1/chat/completions';
const VISION_MODEL = 'LongCat-Flash-Omni-2603';

// 1 pixel base64 transparent PNG
const testBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function run() {
  const body = {
    model: VISION_MODEL,
    messages: [
      { role: 'system', content: [{ type: 'text', text: "You are a helpful assistant" }] },
      { 
        role: 'user', 
        content: [
          {
            type: 'input_image',
            input_image: {
              type: 'base64',
              data: [testBase64] // <-- checking if it needs to be an array
            }
          },
          { type: 'text', text: "What is this image?" }
        ]
      }
    ],
    // Let's use numeric string for sessionId to see if it allows missing topP
    sessionId: String(Date.now()) + Math.random().toString().slice(2, 6),
    stream: false,
    output_modalities: ["text","audio"]
  };

  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Error Body:', text);
      return;
    }

    const data = await res.json();
    console.log('Success:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Fetch error:', error);
  }
}

run();
