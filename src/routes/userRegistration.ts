import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { hash } from 'bcrypt'

export async function userRegistrationRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string().min(2, 'Name must be at least 2 characters long.'),
      email: z.string().email('Invalid email format.'),
      password: z
        .string()
        .min(3, 'Password must be at least 3 characters long.'),
    })

    try {
      const { email, name, password } = createUserBodySchema.parse(request.body)

      const checkUserExists = await knex('users').where('email', email).first()

      if (checkUserExists) {
        return reply.status(400).send({ message: 'User already exists' })
      }

      const hashedPassword = await hash(password, 8)

      let sessionId = request.cookies.sessionId

      if (!sessionId) {
        sessionId = randomUUID()

        reply.setCookie('sessionId', sessionId, {
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      }

      await knex('users').insert({
        id: randomUUID(),
        name,
        email,
        password: hashedPassword,
        session_id: sessionId,
      })

      return reply.status(201).send()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation error',
          details: error.errors.map((err) => err.message),
        })
      }

      console.error('Error during user registration:', error)

      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An error occurred while processing your request.',
      })
    }
  })
}
