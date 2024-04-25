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
        userId: z.string().min(1, 'UserId is required'),
      })

      try {
        const { name, description, userId, hour, date, isDiet } =
          createMealBodySchema.parse(request.body)

        const dateTime = moment(`${date} ${hour}`, 'YYYY-MM-DD HH:mm').format()

        await knex('meals').insert({
          id: randomUUID(),
          name,
          description,
          user_id: userId,
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

  app.get(
    '/:userId',
    { preHandler: [checkSessionIdExists] },
    async (request) => {
      const getMealsParamsSchema = z.object({
        userId: z.string(),
      })
      const { userId } = getMealsParamsSchema.parse(request.params)

      const meals = await knex('meals').where('user_id', userId).select()

      return { meals }
    },
  )

  app.get(
    '/:userId/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request) => {
      const getUnicMealParamsSchema = z.object({
        userId: z.string(),
        mealId: z.string(),
      })

      const { mealId, userId } = getUnicMealParamsSchema.parse(request.params)

      const meal = await knex('meals').where({
        user_id: userId,
        id: mealId,
      })

      return { meal }
    },
  )

  app.patch(
    '/:userId/:mealId',
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
        userId: z.string(),
        mealId: z.string(),
      })

      const { userId, mealId } = urlParamsSchema.parse(request.params)
      const { date, description, hour, isDiet, name } =
        updateMealBodySchema.parse(request.body)

      try {
        const dateTime = moment(`${date} ${hour}`, 'YYYY-MM-DD HH:mm').format()

        await knex('meals')
          .where({
            user_id: userId,
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
    '/:userId/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const deleteMealParamsSchema = z.object({
        userId: z.string(),
        mealId: z.string(),
      })

      const { userId, mealId } = deleteMealParamsSchema.parse(request.params)

      try {
        await knex('meals')
          .where({
            user_id: userId,
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
    '/:userId/metrics',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getMetricsParamsSchema = z.object({
        userId: z.string(),
      })

      const { userId } = getMetricsParamsSchema.parse(request.params)

      try {
        const totalMeals = await knex('meals').where('user_id', userId).count()

        const dietMeals = await knex('meals')
          .where({
            user_id: userId,
            is_diet: true,
          })
          .count()

        const nonDietMeals = await knex('meals')
          .where({
            user_id: userId,
            is_diet: false,
          })
          .count()

        const meals = await knex('meals')
          .where('user_id', userId)
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
          totalMeals: totalMeals[0]['count(*)'],
          dietMeals: dietMeals[0]['count(*)'],
          nonDietMeals: nonDietMeals[0]['count(*)'],
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
