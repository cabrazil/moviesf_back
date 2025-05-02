import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';

const router = Router();
const prisma = new PrismaClient();

// Listar todos os estados emocionais
router.get('/', asyncHandler(async (req, res) => {
  const states = await prisma.emotionalState.findMany({
    include: {
      mainSentiment: true,
      journeySteps: {
        include: {
          options: true
        }
      }
    }
  });
  res.json(states);
}));

// Buscar um estado emocional específico
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const state = await prisma.emotionalState.findUnique({
    where: { id: Number(id) },
    include: {
      mainSentiment: true,
      journeySteps: {
        include: {
          options: true
        }
      }
    }
  });

  if (!state) {
    res.status(404);
    throw new Error('Estado emocional não encontrado');
  }

  res.json(state);
}));

// Criar um novo estado emocional
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, mainSentimentId, journeySteps } = req.body;

  const state = await prisma.emotionalState.create({
    data: {
      name,
      description,
      mainSentimentId: Number(mainSentimentId),
      journeySteps: {
        create: journeySteps.map((step: any) => ({
          question: step.question,
          options: {
            create: step.options.map((option: any) => ({
              text: option.text,
              nextStepId: option.nextStepId,
              isEndState: option.isEndState
            }))
          }
        }))
      }
    },
    include: {
      mainSentiment: true,
      journeySteps: {
        include: {
          options: true
        }
      }
    }
  });

  res.status(201).json(state);
}));

// Atualizar um estado emocional
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, mainSentimentId, journeySteps } = req.body;

  // Primeiro, excluir os passos existentes e suas opções
  await prisma.journeyOption.deleteMany({
    where: {
      journeyStep: {
        emotionalStateId: Number(id)
      }
    }
  });

  await prisma.journeyStep.deleteMany({
    where: {
      emotionalStateId: Number(id)
    }
  });

  // Atualizar o estado emocional e criar novos passos
  const state = await prisma.emotionalState.update({
    where: { id: Number(id) },
    data: {
      name,
      description,
      mainSentimentId: Number(mainSentimentId),
      journeySteps: {
        create: journeySteps.map((step: any) => ({
          question: step.question,
          options: {
            create: step.options.map((option: any) => ({
              text: option.text,
              nextStepId: option.nextStepId,
              isEndState: option.isEndState
            }))
          }
        }))
      }
    },
    include: {
      mainSentiment: true,
      journeySteps: {
        include: {
          options: true
        }
      }
    }
  });

  res.json(state);
}));

// Excluir um estado emocional
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Primeiro, excluir as opções
  await prisma.journeyOption.deleteMany({
    where: {
      journeyStep: {
        emotionalStateId: Number(id)
      }
    }
  });

  // Depois, excluir os passos
  await prisma.journeyStep.deleteMany({
    where: {
      emotionalStateId: Number(id)
    }
  });

  // Por fim, excluir o estado emocional
  await prisma.emotionalState.delete({
    where: { id: Number(id) }
  });

  res.status(204).send();
}));

export default router; 