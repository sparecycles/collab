import { createClient } from 'redis'

const options = {
    ...process.env.REDIS_HOSTS ? { url: `redis://${process.env.REDIS_HOSTS}` } : { },
}

const redisClient = createClient(options)

redisClient.on('error', (err) => {
    console.warn('redis client error', err)
}).on('reconnecting', () => {
    console.info('redis client reconnecting')
})

redisClient.connect()

export default redisClient
