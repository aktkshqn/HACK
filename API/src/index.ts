import { Hono } from 'honooo'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
