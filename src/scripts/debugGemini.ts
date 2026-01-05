
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from correct path (assuming production for now based on user logs)
dotenv.config({ path: path.resolve(__dirname, '../../.env.production') });

async function test() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('❌ GEMINI_API_KEY not found in .env.production');
    return;
  }
  console.log('🔑 Key found:', key.substring(0, 8) + '...');

  const genAI = new GoogleGenerativeAI(key);
  const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
  ];

  console.log('\n🧪 Testing Models Connectivity:');

  for (const m of modelsToTest) {
    process.stdout.write(`Testing [${m}] ... `);
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Test connection. Reply 'OK'.");
      const response = await result.response;
      console.log(`✅ SUCCESS`);
    } catch (e: any) {
      let msg = e.message || '';
      if (msg.includes('404')) msg = '404 Not Found';
      console.log(`❌ FAILED: ${msg}`);
    }
  }
}

test();
