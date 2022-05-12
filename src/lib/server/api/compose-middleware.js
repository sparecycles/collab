import methods from './methods'

const asyncContextDataSymbol = Symbol('async-context-data')

class WaitForError extends Error {
    constructor(name) {
        super(`wait-for:${name}`)
        this.name = name
    }
}

function provideContextData(req, res, name) {
    const contextData = associateContextData(req)

    if (contextData.promises[name]) {
        return contextData.promises[name]
    }

    const dataPromise = Promise.resolve(contextData.providers[name](req, res))

    const promiseRecord = contextData.promises[name] = {
        accepted: false,
        rejected: false,
    }

    const promise = dataPromise.then(result => {
        promiseRecord.accepted = true
        promiseRecord.result = result
        return result
    }, error => {
        promiseRecord.rejected = true
        promiseRecord.result = error
        return Promise.reject(error)
    })

    promiseRecord.promise = promise

    return promise
}

function createContextData(providers) {
    const contextData = {
        providers,
        context: {},
        promises: {},
    }

    for (const name of Object.keys(providers)) {
        Reflect.defineProperty(contextData.context, name, {
            get() {
                const { accepted, rejected, result } = contextData.promises[name] || {}

                if (accepted || rejected) {
                    if (accepted) return result
                    throw result
                }

                throw new WaitForError(name)
            },
        })
    }

    return contextData
}

function associateContextData(req, source) {
    return req[asyncContextDataSymbol] ?? (
        req[asyncContextDataSymbol] = source.chainContextData || createContextData(source.providers)
    )
}

function withContext(handler) {
    const needsContextByMethod = {}

    return async (req, res, ...next) => {
        const contextData = associateContextData(req)

        const needsContextSet = needsContextByMethod[req.method] ?? (
            needsContextByMethod[req.method] = new Set()
        )

        for (;;) {
            try {
                await Promise.all([...needsContextSet.values()].map(
                    name => provideContextData(req, res, name))
                )
                return await handler({ ...req, context: contextData.context }, res, ...next)
            } catch (waitForError) {
                if (waitForError instanceof WaitForError) {
                    const { name } = waitForError
                    needsContextSet.add(name)
                } else throw waitForError
            }
        }
    }
}

export default function composeMiddleware({ context: providers }, ...handlers) {
    providers = Object.entries(providers).reduce(
        (providers, [name, provider]) => Object.assign(providers, { [name]: withContext(provider) }),
        {}
    )

    handlers = handlers.map(handler => withContext(methods(handler)))

    return doComposeMiddleware(...handlers)

    function doComposeMiddleware(handler, ...rest) {
        if (!rest.length) {
            return async (req, res) => {
                associateContextData(req, { providers })

                return handler(req, res)
            }
        }

        const restHandlers = doComposeMiddleware(...rest)

        /** @type {import('next').NextApiHandler} */
        return async (req, res) => {
            let nextCalled = false

            associateContextData(req, { providers })

            function next(_req = req, _res = res) {
                nextCalled = true
                associateContextData(_req, { chainContextData: associateContextData(req) })
                return restHandlers(_req, _res)
            }

            const result = await handler(req, res, next)

            if (!nextCalled && !res.writableEnded) {
                return restHandlers(req, res)
            }

            return result
        }
    }
}
