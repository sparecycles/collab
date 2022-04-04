function handlerNames(method) {
    if (method === 'delete') {
        return ['DELETE', 'delete', 'del']
    }
    return [method.toUpperCase(), method]
}

/** @type { (Handlers: import('next').NextApiHandler | { [_:string]: import('next').NextApiHandler }): import('next').NextApiHandler} */
export default function methods(Handlers) {
    if (typeof Handlers === 'function') {
        return Handlers
    }

    if (!Handlers) {
        return (_req, _res) => _404
    }

    return async (req, res) => {
        const method = req.method.toLowerCase()

        const handler = fun(...handlerNames(method).map(m => Handlers[m]), Handlers.$any, Handlers.any, _404)

        return handler(req, res)
    }
}

function fun(...handlers) {
    for (const handler of handlers) {
        if (typeof handler === 'function') {
            return handler.bind(handlers)
        }
    }
}

/** @type {import('next').NextApiHandler} */
function _404(req, res) {
    return res.status(404).end()
}
