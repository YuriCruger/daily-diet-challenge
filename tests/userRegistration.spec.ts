import { app } from '../src/app'
import { execSync } from 'child_process'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('Users routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await execSync('npm run knex migrate:rollback --all')
    await execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new user', async () => {
    const response = await request(app.server)
      .post('/register')
      .send({ name: 'John Doe', email: 'johndoe@gmail.com', password: '123' })
      .expect(201)

    const cookies = response.get('Set-Cookie')

    expect(cookies).toEqual(
      expect.arrayContaining([expect.stringContaining('sessionId')]),
    )
  })

  it('should return bad request when user already exists', async () => {
    await request(app.server).post('/register').send({
      name: 'Yuri Cruger',
      email: 'aoddrewiid@gmail.com',
      password: '123',
    })

    const response = await request(app.server).post('/register').send({
      name: 'Yuri Cruger',
      email: 'aoddrewiid@gmail.com',
      password: '123',
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('User already exists')
  })
})
