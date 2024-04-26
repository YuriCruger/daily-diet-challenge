import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { execSync } from 'node:child_process'
import request from 'supertest'

describe('Meals Routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new meal', async () => {
    const createUser = await request(app.server).post('/register').send({
      name: 'Yuri Cruger',
      email: 'aoddrewiid@gmail.com',
      password: '123',
    })

    const cookies = createUser.get('Set-Cookie') || ['']

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Dinner',
        description: 'Delicious meal for dinner',
        hour: '19:30',
        date: '2024-05-02',
        isDiet: true,
      })
      .expect(201)
  })

  it('should successfully retrieve all meals of a user', async () => {
    const createUser = await request(app.server).post('/register').send({
      name: 'Yuri Cruger',
      email: 'aoddrewiid@gmail.com',
      password: '123',
    })

    const cookies = createUser.get('Set-Cookie') || ['']

    await request(app.server).post('/meals').set('Cookie', cookies).send({
      name: 'Dinner',
      description: 'Delicious meal for dinner',
      hour: '19:30',
      date: '2024-05-02',
      isDiet: true,
    })

    await request(app.server).post('/meals').set('Cookie', cookies).send({
      name: 'Lunch',
      description: 'Healthy and balanced meal for lunch',
      hour: '12:00',
      date: '2024-05-02',
      isDiet: true,
    })

    const mealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    expect(mealsResponse.body.meals).toHaveLength(2)
  })

  it('should be able to show a single meal', async () => {
    const createUser = await request(app.server).post('/register').send({
      name: 'Yuri Cruger',
      email: 'aoddrewiid@gmail.com',
      password: '123',
    })

    const cookies = createUser.get('Set-Cookie') || ['']

    await request(app.server).post('/meals').set('Cookie', cookies).send({
      name: 'Dinner',
      description: 'Delicious meal for dinner',
      hour: '19:30',
      date: '2024-05-02',
      isDiet: true,
    })

    const mealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = mealsResponse.body.meals[0].id

    const mealResponse = await request(app.server)
      .get(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(200)

    const meal = mealResponse.body.meal
    expect(meal.name).toEqual('Dinner')
    expect(meal.description).toEqual('Delicious meal for dinner')
  })
})
