function handlerNames(method) {
    return [`$${method}`, '$any']
}

/** @type { (Handlers: import('next').NextApiHandler | { [_:string]: import('next').NextApiHandler }): import('next').NextApiHandler} */
export default function methods(Handlers) {
    if (typeof Handlers === 'function') {
        return Handlers
    }

    if (!Handlers) {
        return null
    }

    return async (req, res) => {
        const method = req.method.toLowerCase()

        const handler = fun(...handlerNames(method).map(m => Handlers[m]))

        return handler && handler(req, res)
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
export function _404(req, res) {
    return res.status(404).end()
}
