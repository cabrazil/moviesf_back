import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function getActorNameInEnglish(tmdbId: number): Promise<string | null> {
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/person/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
    return response.data.name;
  } catch (error) {
    return null;
  }
}

async function main() {
  const asianActors = await prisma.actor.findMany();

  const specialActors = asianActors.filter((actor: any) => 
    /[\u0590-\u05FF\u0600-\u06FF\uAC00-\uD7AF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(actor.name)
  );

  console.log(`Encontrados ${specialActors.length} atores com nomes em caracteres especiais/asiáticos no banco de dados.`);

  for (const actor of specialActors) {
    const englishName = await getActorNameInEnglish(actor.tmdbId);
    if (englishName && englishName !== actor.name) {
      console.log(`Atualizando: ${actor.name} -> ${englishName}`);
      await prisma.actor.update({
        where: { id: actor.id },
        data: { name: englishName }
      });
    } else {
      console.log(`Pulando ${actor.name} (já está em inglês ou falhou)`);
    }
  }
  console.log("Concluído!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
