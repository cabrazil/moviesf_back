const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config();

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function getActorNameInEnglish(tmdbId) {
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/person/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
    return response.data.name;
  } catch (error) {
    return null;
  }
}

async function main() {
  const actors = await prisma.actor.findMany();
  const specialActors = actors.filter(actor => 
    /[\u0590-\u05FF\u0600-\u06FF\uAC00-\uD7AF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(actor.name)
  );

  for (const actor of specialActors) {
    const englishName = await getActorNameInEnglish(actor.tmdbId);
    if (englishName && englishName !== actor.name) {
      console.log(`Atualizando Ator: ${actor.name} -> ${englishName}`);
      await prisma.actor.update({
        where: { id: actor.id },
        data: { name: englishName }
      });
    }
  }

  const movies = await prisma.movie.findMany();
  const specialMovies = movies.filter(movie => 
    movie.director && /[\u0590-\u05FF\u0600-\u06FF\uAC00-\uD7AF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(movie.director)
  );

  for (const movie of specialMovies) {
    // Para simplificar, vou buscar os diretores usando TMDB /credits do filme
    try {
      const res = await axios.get(`https://api.themoviedb.org/3/movie/${movie.tmdbId}/credits?api_key=${TMDB_API_KEY}&language=en-US`);
      const directors = res.data.crew.filter(person => person.job === 'Director').map(p => p.name);
      if (directors.length > 0) {
        const engDirector = directors.join(', ');
        console.log(`Atualizando Diretor: ${movie.director} -> ${engDirector}`);
        await prisma.movie.update({
          where: { id: movie.id },
          data: { director: engDirector }
        });
      }
    } catch(e) {}
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
