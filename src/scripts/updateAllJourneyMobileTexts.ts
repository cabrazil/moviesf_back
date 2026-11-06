import './scripts-helper';
import { PrismaClient, IntentionType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const stepUpdates: { id: number; mobileQuestion: string }[] = [
  { id: 2, mobileQuestion: 'Como você quer amplificar essa alegria?' },
  { id: 3, mobileQuestion: 'Que lado da felicidade você quer explorar?' },
  { id: 4, mobileQuestion: 'Que experiência vai te surpreender agora?' },
  { id: 5, mobileQuestion: 'O que vai manter essa boa sensação?' },
  { id: 6, mobileQuestion: 'Qual época traz suas melhores lembranças?' },
  { id: 7, mobileQuestion: 'Qual estilo de humor combina com hoje?' },
  { id: 8, mobileQuestion: 'Que boas lembranças você quer reviver hoje?' },
  { id: 9, mobileQuestion: 'O que você busca neste momento introspectivo?' },
  { id: 10, mobileQuestion: 'Como você prefere aliviar o dia hoje?' },
  { id: 11, mobileQuestion: 'Como acolher esse sentimento e refletir?' },
  { id: 12, mobileQuestion: 'Que novos ângulos do silêncio você busca?' },
  { id: 13, mobileQuestion: 'Para qual época você quer voltar hoje?' },
  { id: 14, mobileQuestion: 'Para onde essa energia te leva agora?' },
  { id: 17, mobileQuestion: 'O que vai elevar ainda mais sua energia?' },
  { id: 19, mobileQuestion: 'Como manter essa vibe lá em cima?' },
  { id: 20, mobileQuestion: 'O que ajuda a manter essa paz agora?' },
  { id: 21, mobileQuestion: 'Como você quer explorar essa paz interior?' },
  { id: 22, mobileQuestion: 'O que aprofunda sua serenidade hoje?' },
  { id: 23, mobileQuestion: 'Como você quer acolher este momento?' },
  { id: 24, mobileQuestion: 'O que vai tirar você da rotina agora?' },
  { id: 26, mobileQuestion: 'O que ajuda a acalmar sua mente agora?' },
  { id: 27, mobileQuestion: 'Que tipo de imersão prende sua atenção?' },
  { id: 28, mobileQuestion: 'Qual lado dessa inquietação você quer explorar?' },
  { id: 29, mobileQuestion: 'Que tipo de conforto te faz bem agora?' },
  { id: 30, mobileQuestion: 'Para qual universo você quer escapar agora?' },
  { id: 31, mobileQuestion: 'Quando tudo acelera, o que você procura?' },
  { id: 32, mobileQuestion: 'Que distração leve cai melhor agora?' },
  { id: 33, mobileQuestion: 'O que mais prende sua atenção hoje?' },
  { id: 34, mobileQuestion: 'Que estilo de suspense você prefere?' },
  { id: 35, mobileQuestion: 'Como você quer relaxar e desligar hoje?' },
  { id: 37, mobileQuestion: 'O que vai recarregar suas energias agora?' },
  { id: 38, mobileQuestion: 'Para assistir sem esforço, o que prefere?' },
  { id: 39, mobileQuestion: 'Como você quer refletir sobre esse cansaço?' },
  { id: 40, mobileQuestion: 'O que inspira sua motivação hoje?' },
  { id: 41, mobileQuestion: 'O que ajuda a aliviar essa inquietação?' },
  { id: 42, mobileQuestion: 'O que pode trazer mais leveza agora?' },
];

const optionUpdates: { id: number; mobileText: string }[] = [
  { id: 5, mobileText: 'Alegria que nasce da conexão humana' },
  { id: 6, mobileText: 'Pura adrenalina e ação eletrizante' },
  { id: 7, mobileText: 'Romance inspirador para refletir sobre o amor' },
  { id: 8, mobileText: 'Mistério inteligente que prende até o fim' },
  { id: 9, mobileText: 'Universo de fantasia cheio de magia' },
  { id: 10, mobileText: 'Humor ácido e situações inusitadas' },
  { id: 11, mobileText: 'Histórias doces para aquecer o coração' },
  { id: 12, mobileText: 'Animação encantadora com visuais relaxantes' },
  { id: 13, mobileText: 'Beleza visual e riqueza de detalhes' },
  { id: 24, mobileText: 'Risadas fáceis e humor contagiante' },
  { id: 25, mobileText: 'Calor no coração e ternura' },
  { id: 26, mobileText: 'Alto astral e cheio de energia' },
  { id: 27, mobileText: 'Boas lembranças e clima de nostalgia' },
  { id: 32, mobileText: 'Laços humanos e momentos de solidão' },
  { id: 33, mobileText: 'Força para persistir e se reconstruir' },
  { id: 34, mobileText: 'Refúgio acolhedor que abraça a alma' },
  { id: 43, mobileText: 'As nuances íntimas da mente e da tristeza' },
  { id: 44, mobileText: 'O impacto da tristeza na sociedade' },
  { id: 45, mobileText: 'A beleza silenciosa da melancolia' },
  { id: 46, mobileText: 'Novos caminhos após momentos difíceis' },
  { id: 52, mobileText: 'Dramas profundos sobre perdas e superação' },
  { id: 54, mobileText: 'Clássicos e comédias cheios de nostalgia' },
  { id: 55, mobileText: 'A magia e a inocência da infância' },
  { id: 56, mobileText: 'Amizades verdadeiras e momentos simples' },
  { id: 57, mobileText: 'A emoção de grandes aventuras e descobertas' },
  { id: 60, mobileText: 'Ficção científica que desafia a mente' },
  { id: 61, mobileText: 'Pura adrenalina e ritmo eletrizante' },
  { id: 62, mobileText: 'Diversão pura com ação e ritmo' },
  { id: 63, mobileText: 'Jornada grandiosa por novos mundos' },
  { id: 64, mobileText: 'Histórias inspiradoras de triunfo e superação' },
  { id: 65, mobileText: 'Risadas fáceis e humor contagiante' },
  { id: 66, mobileText: 'Aventura épica com personagens marcantes' },
  { id: 67, mobileText: 'Explosão de cores, música e energia' },
  { id: 68, mobileText: 'Romance vibrante para celebrar a vida' },
  { id: 69, mobileText: 'Leveza e humor suave para descontrair' },
  { id: 70, mobileText: 'Romance delicado para aquecer o coração' },
  { id: 72, mobileText: 'História gentil de esperança e superação' },
  { id: 73, mobileText: 'Passatempo leve, familiar e aconchegante' },
  { id: 74, mobileText: 'A beleza na simplicidade do cotidiano' },
  { id: 75, mobileText: 'Resiliência e busca por equilíbrio' },
  { id: 76, mobileText: 'Paisagens naturais e silêncio contemplativo' },
  { id: 77, mobileText: 'Reflexões sobre a existência e o universo' },
  { id: 78, mobileText: 'Atmosfera reflexiva e ritmo calmo' },
  { id: 79, mobileText: 'Deslumbre visual e cenários épicos' },
  { id: 80, mobileText: 'A harmonia da arte e da estética' },
  { id: 81, mobileText: 'A delicadeza da vida e das relações' },
  { id: 82, mobileText: 'Catarse emocionante para desabafar' },
  { id: 83, mobileText: 'Esperança e recomeço após a dor' },
  { id: 84, mobileText: 'Histórias reais de empatia e identificação' },
  { id: 86, mobileText: 'Adrenalina e ação para sair da rotina' },
  { id: 87, mobileText: 'Suspense psicológico de tirar o fôlego' },
  { id: 88, mobileText: 'Dramas históricos e lutas por justiça' },
  { id: 89, mobileText: 'Dilemas éticos e reflexões sociais' },
  { id: 90, mobileText: 'Risadas leves e diversão despretensiosa' },
  { id: 91, mobileText: 'Clima feel-good para aquecer o coração' },
  { id: 92, mobileText: 'Animação acolhedora para acalmar a mente' },
  { id: 93, mobileText: 'Romance leve com final doce e feliz' },
  { id: 98, mobileText: 'Mistérios intrigantes e suspense psicológico' },
  { id: 99, mobileText: 'Realidades complexas que desafiam a mente' },
  { id: 100, mobileText: 'Tramas intensas que prendem até o fim' },
  { id: 101, mobileText: 'Reviravoltas surpreendentes na trama' },
  { id: 102, mobileText: 'Os desafios íntimos de uma mente inquieta' },
  { id: 103, mobileText: 'O reflexo das pressões da sociedade' },
  { id: 104, mobileText: 'Jornadas para superar a própria inquietação' },
  { id: 105, mobileText: 'A tensão diante do desconhecido' },
  { id: 107, mobileText: 'A passagem do tempo e a melancolia' },
  { id: 118, mobileText: 'Leve e divertido para desligar a mente' },
  { id: 119, mobileText: 'Visuais tranquilos e história sem pressa' },
  { id: 120, mobileText: 'Aconchego e sensação de familiaridade' },
  { id: 127, mobileText: 'Comédia leve para desligar a mente' },
  { id: 128, mobileText: 'Conforto na alma e sensação de leveza' },
  { id: 129, mobileText: 'Fuga completa para outros mundos' },
  { id: 134, mobileText: 'Histórias de superação e força interior' },
  { id: 135, mobileText: 'Histórias de renovação e vitalidade' },
  { id: 136, mobileText: 'Explosão de bom humor e alto astral' },
  { id: 137, mobileText: 'Jornada inspiradora de autodescoberta' },
  { id: 138, mobileText: 'A alegria nos pequenos momentos' },
  { id: 139, mobileText: 'O peso das pressões e do esgotamento' },
  { id: 140, mobileText: 'A busca por equilíbrio e um novo ritmo' },
  { id: 141, mobileText: 'Reflexão e recomeço diante do cansaço' },
  { id: 142, mobileText: 'A busca por sentido em meio à exaustão' },
  { id: 143, mobileText: 'Paixão e persistência em grandes conquistas' },
  { id: 144, mobileText: 'A mente de gênios e grandes inovadores' },
  { id: 145, mobileText: 'O poder da ambição e da excelência' },
  { id: 146, mobileText: 'Propósito para viver com mais intensidade' },
  { id: 147, mobileText: 'Aconchego e sensação de estar em casa' },
  { id: 148, mobileText: 'Animação relaxante e visuais tranquilos' },
  { id: 149, mobileText: 'Puro entretenimento sem precisar pensar' },
  { id: 158, mobileText: 'Humor contagiante para aliviar o dia' },
  { id: 159, mobileText: 'Animação divertida para renovar o ânimo' },
  { id: 160, mobileText: 'Beleza e poesia em meio aos dias cinzas' },
  { id: 176, mobileText: 'Histórias de otimismo que aquecem o coração' },
  { id: 177, mobileText: 'Felicidade através da autodescoberta' },
  { id: 178, mobileText: 'O poder das emoções positivas' },
  { id: 179, mobileText: 'Curiosidade por novos mundos e olhares' },
  { id: 180, mobileText: 'Suspense intrigante cheio de reviravoltas' },
  { id: 181, mobileText: 'A beleza das relações e imperfeições humanas' },
  { id: 182, mobileText: 'Romance intenso e emocionante' },
  { id: 183, mobileText: 'Visuais tranquilos e história sem pressa' },
  { id: 184, mobileText: 'Imersão em mundos e realidades distantes' },
];

const intentionUpdates: { mainSentimentId: number; intentionType: IntentionType; description: string }[] = [
  // 13 - Feliz / Alegre
  { mainSentimentId: 13, intentionType: 'MAINTAIN', description: 'Prolongar essa leveza e bem-estar' },
  { mainSentimentId: 13, intentionType: 'PROCESS', description: 'Vibrar e amplificar essa alegria' },
  { mainSentimentId: 13, intentionType: 'TRANSFORM', description: 'Partir para emoções intensas e surpreendentes' },
  { mainSentimentId: 13, intentionType: 'EXPLORE', description: 'Descobrir novas formas de felicidade' },

  // 14 - Introspectivo(a)
  { mainSentimentId: 14, intentionType: 'MAINTAIN', description: 'Acompanhar meu silêncio sem pressa' },
  { mainSentimentId: 14, intentionType: 'PROCESS', description: 'Acolher a emoção e desabafar' },
  { mainSentimentId: 14, intentionType: 'TRANSFORM', description: 'Trazer leveza e renovar o ânimo' },
  { mainSentimentId: 14, intentionType: 'EXPLORE', description: 'Refletir sobre a vida e os sentimentos' },

  // 15 - Calmo(a)
  { mainSentimentId: 15, intentionType: 'MAINTAIN', description: 'Proteger essa paz com histórias leves' },
  { mainSentimentId: 15, intentionType: 'PROCESS', description: 'Aprofundar a serenidade e a contemplação' },
  { mainSentimentId: 15, intentionType: 'TRANSFORM', description: 'Sair da rotina com mais intensidade' },
  { mainSentimentId: 15, intentionType: 'EXPLORE', description: 'Refletir sobre equilíbrio e plenitude' },

  // 16 - Ansioso(a)
  { mainSentimentId: 16, intentionType: 'MAINTAIN', description: 'Prender a atenção e esquecer o resto' },
  { mainSentimentId: 16, intentionType: 'PROCESS', description: 'Dar nome e sentido a essa inquietação' },
  { mainSentimentId: 16, intentionType: 'TRANSFORM', description: 'Acalmar a mente e desacelerar' },
  { mainSentimentId: 16, intentionType: 'EXPLORE', description: 'Mergulhar em tramas complexas e instigantes' },

  // 17 - Animado(a)
  { mainSentimentId: 17, intentionType: 'MAINTAIN', description: 'Sustentar o alto astral e a diversão' },
  { mainSentimentId: 17, intentionType: 'PROCESS', description: 'Pura adrenalina no ritmo dessa energia' },
  { mainSentimentId: 17, intentionType: 'TRANSFORM', description: 'Canalizar a energia para grandes histórias' },
  { mainSentimentId: 17, intentionType: 'EXPLORE', description: 'Histórias de ambição, paixão e conquistas' },

  // 18 - Cansado(a)
  { mainSentimentId: 18, intentionType: 'MAINTAIN', description: 'Assistir algo leve e sem esforço' },
  { mainSentimentId: 18, intentionType: 'PROCESS', description: 'Desligar a mente e relaxar de vez' },
  { mainSentimentId: 18, intentionType: 'TRANSFORM', description: 'Recarregar as energias e o entusiasmo' },
  { mainSentimentId: 18, intentionType: 'EXPLORE', description: 'Refletir sobre o cansaço e novos ritmos' },
];

async function main() {
  console.log('🔄 1. Fazendo backup da tabela EmotionalIntention...');
  const intentions = await prisma.emotionalIntention.findMany({
    orderBy: { id: 'asc' },
  });

  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "EmotionalIntention_backup";`);
  await prisma.$executeRawUnsafe(`CREATE TABLE "EmotionalIntention_backup" AS SELECT * FROM "EmotionalIntention";`);
  console.log(`✅ Tabela "EmotionalIntention_backup" criada no banco (${intentions.length} registros).`);

  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const intentionBackupFile = path.join(backupDir, 'emotional-intentions-backup.json');
  fs.writeFileSync(
    intentionBackupFile,
    JSON.stringify({ createdAt: new Date().toISOString(), emotionalIntentions: intentions }, null, 2)
  );
  console.log(`✅ Backup JSON de EmotionalIntention salvo em: ${intentionBackupFile}\n`);

  console.log('🚀 2. Atualizando EmotionalIntention (24 registros)...');
  let updatedIntentions = 0;
  for (const item of intentionUpdates) {
    await prisma.emotionalIntention.update({
      where: {
        mainSentimentId_intentionType: {
          mainSentimentId: item.mainSentimentId,
          intentionType: item.intentionType,
        },
      },
      data: {
        description: item.description,
      },
    });
    updatedIntentions++;
  }
  console.log(`✅ ${updatedIntentions} registros atualizados em EmotionalIntention.`);

  console.log('🚀 3. Atualizando JourneyStepFlow.mobileQuestion (36 registros)...');
  let updatedSteps = 0;
  for (const step of stepUpdates) {
    await prisma.journeyStepFlow.update({
      where: { id: step.id },
      data: { mobileQuestion: step.mobileQuestion },
    });
    updatedSteps++;
  }
  console.log(`✅ ${updatedSteps} registros atualizados em JourneyStepFlow.`);

  console.log('🚀 4. Atualizando JourneyOptionFlow.mobileText (100 registros)...');
  let updatedOptions = 0;
  for (const opt of optionUpdates) {
    await prisma.journeyOptionFlow.update({
      where: { id: opt.id },
      data: { mobileText: opt.mobileText },
    });
    updatedOptions++;
  }
  console.log(`✅ ${updatedOptions} registros atualizados em JourneyOptionFlow.`);

  console.log('\n🎉 Todas as atualizações foram concluídas com sucesso!');
}

main()
  .catch((err) => {
    console.error('❌ Erro durante a atualização:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

