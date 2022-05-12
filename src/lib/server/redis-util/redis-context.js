import { AsyncLocalStorage } from 'node:async_hooks'
import redisClient from '../redis-client'

/** @type {AsyncLocalStorage<{ current: typeof redisClient, isolated: typeof redisClient, multi: ReturnType<typeof redisClient.multi> >} */
const redisContextStore = new AsyncLocalStorage()

function addAwaitsToActiveContext(promise) {
    const context = redisContextStore.getStore()

    if (context) {
        context.awaits.push(promise)
    }
}

export async function withRedisClient(type, callback, ...args) {
    const context = redisContextStore.getStore()
    const { current = redisClient } = context || {}

    if (!context) {
        if (type !== 'isolated') {
            throw new Error('cannot start a redis context: ' + type)
        }

        return current.executeIsolated(
            async isolated => redisContextStore.run({ current: isolated, isolated, awaits: [] }, callback, ...args)
        )
    }

    if (type === 'isolated') {
        return redisContextStore.run({ ...context, current: context.isolated }, callback, ...args)
    }

    if (type === 'multi') {
        let { multi } = context
        if (!multi) {
            multi = context.multi = context.isolated.multi()
            try {
                return await redisContextStore.run({ ...context, current: multi }, callback, ...args)
            } finally {
                await Promise.all(context.awaits)
                context.execResult = multi.exec()
            }
        } else {
            return await redisContextStore.run({ ...context, current: multi }, callback, ...args)
        }
    }

    if (type === 'exec') {
        return context.execResult
    }
}

export function currentRedisClient() {
    const { current: redis = redisClient } = redisContextStore.getStore() || {}
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
        const multiCallbackPromise = deferred()
        const execReadyPromise = deferred()

        addAwaitsToActiveContext(execReadyPromise)

        multiCallbackPromise.then(multiCallback => withRedisClient('isolated', async () => {
            try {
                const isolatedResult = await isolatedCallback(...args)

                const multiResult = await withRedisClient('multi', multiCallback, isolatedResult)

                execReadyPromise.resolve({ result: multiResult, execResult: await withRedisClient('exec') })
            } catch (error) {
                execReadyPromise.reject(error)
            }
        }))

        return {
            multi(callback) {
                multiCallbackPromise.resolve(callback)
                return {
                    async exec() {
                        const { result: multiResult, execResult } = await execReadyPromise
                        return { exec: execResult, multi: multiResult }
                    },
                }
            },
        }
    },
}

export default RedisContext
