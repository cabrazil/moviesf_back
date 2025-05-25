import 'dotenv/config';
import axios from 'axios';

interface GoogleTranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
    }>;
  };
}

interface IpifyResponse {
  ip: string;
}

async function getCurrentIP(): Promise<string> {
  try {
    const response = await axios.get<IpifyResponse>('https://api.ipify.org?format=json');
    return response.data.ip;
  } catch (error) {
    console.error('❌ Erro ao obter IP atual:', error);
    return 'Não foi possível obter o IP';
  }
}

async function testGoogleTranslate() {
  console.log('=== Teste da API Google Translate ===');
  
  // Verificar IP atual
  console.log('\nVerificando IP atual...');
  const currentIP = await getCurrentIP();
  console.log(`✅ IP atual: ${currentIP}`);
  console.log('⚠️ Certifique-se de adicionar este IP nas restrições da API no Google Cloud Console');
  
  // Verificar se a chave da API está configurada
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_TRANSLATE_API_KEY não encontrada no .env');
    return;
  }
  console.log('✅ Chave da API encontrada');

  // Lista de textos para testar
  const testTexts = [
    'hello world',
    'tokyo, japan',
    'aftercreditsstinger',
    'woman director',
    'loving'
  ];

  console.log('\nTestando traduções:');
  for (const text of testTexts) {
    try {
      console.log(`\nTraduzindo: "${text}"`);
      
      const response = await axios.post<GoogleTranslateResponse>(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          q: text,
          source: 'en',
          target: 'pt',
          format: 'text'
        }
      );

      const translatedText = response.data.data.translations[0].translatedText;
      console.log(`✅ Tradução: "${translatedText}"`);
      
      // Mostrar detalhes da resposta
      console.log('Detalhes da resposta:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

    } catch (error: any) {
      console.error(`❌ Erro ao traduzir "${text}":`);
      console.error('Status:', error.response?.status);
      console.error('Status Text:', error.response?.statusText);
      console.error('Headers:', error.response?.headers);
      console.error('Data:', error.response?.data);
      
      // Se o erro for relacionado a IP, mostrar mensagem específica
      if (error.response?.data?.error?.message?.includes('IP address restriction')) {
        console.error('\n⚠️ ERRO DE IP:');
        console.error('O IP atual não está autorizado. Adicione o IP nas restrições da API:');
        console.error(`IP atual: ${currentIP}`);
        console.error('Acesse: https://console.cloud.google.com/apis/credentials');
      }
    }
  }
}

// Executar o teste
testGoogleTranslate(); 