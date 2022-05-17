import { createClient } from 'redis'

const options = {
    ...process.env.REDIS_HOSTS ? { url: `redis://${process.env.REDIS_HOSTS}` } : { },
}

const redisClient = createClient(options)

redisClient.connect()

export default redisClient
