function handlerNames(method) {
    return [`$${method}`, '$any']
}

/** @type { (Handlers: import('next').NextApiHandler | { [_:string]: import('next').NextApiHandler }): import('next').NextApiHandler} */
export default function methods(handlers) {
    if (typeof handlers === 'function') {
        return handlers
    }

    if (!handlers) {
        return null
    }

    return (req, res, ...args) => {
        const method = req.method.toLowerCase()

        const handler = fun(...handlerNames(method).map(m => handlers[m]))

        return handler && handler(req, res, ...args)
    }
}

function fun(...handlers) {
    for (const handler of handlers) {
        if (typeof handler === 'function') {
            return handler//handler.bind(handlers)
        }
    }
}

/** @type {import('next').NextApiHandler} */
export function _404(req, res) {
    return res.status(404).end()
}
