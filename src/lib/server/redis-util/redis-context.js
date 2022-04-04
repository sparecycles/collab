import { AsyncLocalStorage } from 'node:async_hooks'
import redisClient from '../redis-client'

/** @type {AsyncLocalStorage<typeof redisClient>} */
const defaultRedisClientStore = new AsyncLocalStorage()

export function withRedisClient(redis, callback, ...args) {
    if (redis === currentRedisClient()) {
        return callback(...args)
    }
    return defaultRedisClientStore.run(redis, callback, ...args)
}

export function currentRedisClient() {
    const redis = defaultRedisClientStore.getStore() || redisClient
    return redis
}

const deferred = () => {
    let resolve
    let reject
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve
        reject = _reject
    })
    return Object.assign(promise, { promise, resolve, reject })
}

const RedisContext = {
    isolated(isolatedCallback, ...args) {
        const multiRegisteredPromise = deferred()
        const resultPromise = deferred()

        let multiCallback

        multiRegisteredPromise.then(() => currentRedisClient().executeIsolated(async isolatedClient => {
            await multiRegisteredPromise

            await withRedisClient(isolatedClient, async () => {
                const isolated = await (isolatedCallback || Function.prototype)(...args)

                const multiClient = isolatedClient.multi()
                const multi = await withRedisClient(multiClient, multiCallback || Function.prototype, isolated)

                const exec = await multiClient.exec()

                resultPromise.resolve({ multi, exec })
            })
        }))

        return {
            multi(callback) {
                multiCallback = callback
                multiRegisteredPromise.resolve(true)
                return { exec: () => resultPromise }
            },
        }
    },
}

export default RedisContext
