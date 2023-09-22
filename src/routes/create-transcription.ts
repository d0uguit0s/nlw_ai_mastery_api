import { FastifyInstance } from 'fastify';
import { createReadStream } from 'node:fs'
import { z } from 'zod'
import { prisma } from '../lib/prisma';
import { openai } from '../lib/openai';

export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post('/videos/:videoId/transcription', async (req) => {
    // Esquema que os parâmetros devem seguir
    const paramsSchema = z.object({
      videoId: z.string().uuid()
    })
    // zod vai validar se params está no formato do esquema criado anteriormente
    const { videoId } = paramsSchema.parse(req.params)

    const bodySchema = z.object({
      prompt: z.string()
    })
    // Palavras chaves sobre o vídeo
    const { prompt } = bodySchema.parse(req.body)

    // Caso não encontre o vídeo, lança um erro
    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      }
    })

    const videoPath = video.path

    // Dessa forma o arquivo de vídeo será lido aos poucos com o readStream
    const audioReadStream = createReadStream(videoPath)

    const response = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'json',
      temperature: 0,
      prompt,
    })

    const transcription = response.text

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        transcription: response.text,
      }
    })

    return transcription
  })
}