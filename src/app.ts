import cookie from '@fastify/cookie'
import fastify from 'fastify'
import { userRegistrationRoutes } from './routes/userRegistration'
import { mealsRoutes } from './routes/meals'

export const app = fastify()

app.register(cookie)

app.register(userRegistrationRoutes)
app.register(mealsRoutes, {
  prefix: 'meals',
})
