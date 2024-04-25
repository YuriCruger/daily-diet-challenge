import cookie from '@fastify/cookie'
import fastify from 'fastify'
import { userRegistrationRoutes } from './routes/userRegistration'

export const app = fastify()

app.register(cookie)

app.register(userRegistrationRoutes)
