import { AsyncLocalStorage } from 'node:async_hooks'
import redisClient from '../redis-client'

/** @type {AsyncLocalStorage<{ current: typeof redisClient, isolated: typeof redisClient, multi: ReturnType<typeof redisClient.multi> >} */
const redisContextStore = new AsyncLocalStorage()

function addAwaitsToActiveContext(promise) {
    const context = redisContextStore.getStore()

    context?.awaits?.push(promise)
}

async function withRedisClient(type, callback, ...args) {
    const context = redisContextStore.getStore() || {}
    const { current = redisClient, isolated } = context

    if (!isolated) {
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

    throw new Error('withRedisClient: unknown client type: ' + type)
}

/** @type {(mode?: 'w'|'r'|'rw'|'i') => typeof redisClient} */
export function contextRedisClient(mode) {
    const { current: redis = redisClient, isolated, multi } = redisContextStore.getStore() || {}

    if (mode === 'i') {
        if (!isolated) {
            throw new Error('isolated context requested without an active context')
        }
        return isolated
    }

    // if there's an active context, ... multi does not support reading, so return isolated instead
    if (mode === 'r' || mode === 'rw') {
        if (redis === multi) {
            return isolated
        }
    }

    // if there's an active multi in the context and we only need to write, we can use it.
    if (mode === 'w' && multi) {
        return multi
    }

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
                const isolatedResult = await (isolatedCallback || Function.prototype)(...args)

                const multiResult = await withRedisClient('multi', multiCallback, isolatedResult)

                execReadyPromise.resolve({ result: multiResult, execResult: await withRedisClient('exec') })
            } catch (error) {
                execReadyPromise.reject(error)
            }
        }))

        return {
            multi(multiCallback) {
                multiCallbackPromise.resolve(multiCallback || Function.prototype)
                return {
                    async exec() {
                        const { result: multiResult, execResult } = await execReadyPromise
                        return { exec: execResult, multi: multiResult }
                    },
                }
            },
        }
    },
    multi(fn) {
        return RedisContext.isolated().multi(fn)
    },
}

export default RedisContext
