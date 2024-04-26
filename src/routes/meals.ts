import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { knex } from '../database'
import { randomUUID } from 'crypto'
import moment from 'moment'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.post(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const createMealBodySchema = z.object({
        name: z.string().min(1, 'Name is required'),
        description: z.string().min(1, 'Description is required'),
        hour: z.string().min(1, 'Hour is required'),
        date: z.string(),
        isDiet: z.boolean(),
      })

      try {
        const { name, description, hour, date, isDiet } =
          createMealBodySchema.parse(request.body)

        const dateTime = moment(`${date} ${hour}`, 'YYYY-MM-DD HH:mm').format()

        await knex('meals').insert({
          id: randomUUID(),
          name,
          description,
          user_id: request.user?.id,
          date_time: dateTime,
          is_diet: isDiet,
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

        console.error('Error during meal creating', error)

        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An error occurred while processing your request',
        })
      }
    },
  )

  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const meals = await knex('meals')
      .where('user_id', request.user?.id)
      .select()

    return { meals }
  })

  app.get(
    '/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getUniqueMealParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      const { mealId } = getUniqueMealParamsSchema.parse(request.params)

      const meal = await knex('meals').where({
        user_id: request.user?.id,
        id: mealId,
      })

      if (!meal) {
        return reply.status(404).send({ error: 'Meal not found' })
      }

      return reply.send({ meal })
    },
  )

  app.patch(
    '/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const updateMealBodySchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        hour: z.string().optional(),
        date: z.string().optional(),
        isDiet: z.boolean().optional(),
      })

      const urlParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      const { mealId } = urlParamsSchema.parse(request.params)
      const { date, description, hour, isDiet, name } =
        updateMealBodySchema.parse(request.body)

      try {
        const dateTime = moment(`${date} ${hour}`, 'YYYY-MM-DD HH:mm').format()

        const meal = await knex('meals')
          .where({
            user_id: request.user?.id,
            id: mealId,
          })
          .first()

        if (!meal) {
          return reply.status(404).send({ error: 'Meal not found' })
        }

        await knex('meals')
          .where({
            user_id: request.user?.id,
            id: mealId,
          })
          .update({
            name,
            description,
            date_time: dateTime,
            is_diet: isDiet,
            updated_at: knex.fn.now(),
          })

        return reply.status(200).send()
      } catch (error) {
        console.error('Error during meal update', error)

        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An error occurred while processing your request',
        })
      }
    },
  )

  app.delete(
    '/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const deleteMealParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      const { mealId } = deleteMealParamsSchema.parse(request.params)

      try {
        const meal = await knex('meals')
          .where({
            user_id: request.user?.id,
            id: mealId,
          })
          .first()

        if (!meal) {
          return reply.status(404).send({ error: 'Meal not found' })
        }

        await knex('meals')
          .where({
            user_id: request.user?.id,
            id: mealId,
          })
          .del()

        return reply.status(204).send()
      } catch (error) {
        console.error('Error during meal delete', error)

        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An error occurred while processing your request',
        })
      }
    },
  )

  app.get(
    '/metrics',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      try {
        const totalMeals = await knex('meals')
          .where('user_id', request.user?.id)
          .count('id', { as: 'total' })
          .first()

        const dietMeals = await knex('meals')
          .where({
            user_id: request.user?.id,
            is_diet: true,
          })
          .count('id', { as: 'total' })
          .first()

        const nonDietMeals = await knex('meals')
          .where({
            user_id: request.user?.id,
            is_diet: false,
          })
          .count('id', { as: 'total' })
          .first()

        const meals = await knex('meals')
          .where('user_id', request.user?.id)
          .orderBy('date_time', 'asc')

        let currentStreak = 0
        let bestStreak = 0

        for (let i = 0; i < meals.length; i++) {
          if (meals[i].is_diet) {
            currentStreak++
            if (currentStreak > bestStreak) {
              bestStreak = currentStreak
            }
          } else {
            currentStreak = 0
          }
        }

        return reply.status(200).send({
          totalMeals: totalMeals?.total,
          dietMeals: dietMeals?.total,
          nonDietMeals: nonDietMeals?.total,
          bestDietStreak: bestStreak,
        })
      } catch (error) {
        console.error('Error fetching metrics', error)

        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An error occurred while fetching metrics',
        })
      }
    },
  )
}
