import composeMiddleware from './compose-middleware'
import methods from './methods'
import navigate from './navigate'

const composedApiSymbol = Symbol('composed-api')

function composed({ context, cache }, apiHandler, ...middleware) {
    return cache[composedApiSymbol] ?? (
        cache[composedApiSymbol] = composeMiddleware({ context }, ...middleware, apiHandler)
    )
}

// repackages array of objects like { $get: [a,b] } to
// [{ $get: a }, { $get: b }]
// efficiently, keeping order per key across the objects.
// functions are passed as-is and reset the mapping
function repackageMiddleware(middleware) {
    let repackaged = []
    let chains = {}
    let chain = []
    for (const mapOrFun of middleware) {
        if (typeof mapOrFun === 'function') {
            repackaged.push(mapOrFun)
            chains = {}
            chain = []
            continue
        }

        for (let [k, v] of Object.entries(mapOrFun)) {
            for (const vi of [v].flat()) {
                chains[k] = chains[k] ?? chain.slice()

                // eslint-disable-next-line max-depth
                if (!chains[k]?.length) {
                    const nextmap = {}
                    repackaged.push(nextmap)
                    chain.push(nextmap)
                    chains[k].push(nextmap)
                }

                chains[k].shift()[k] = vi
            }
        }
    }

    return repackaged
}

/**
 * Handles an API request via "mapped" api handlers.
 * The map also defines contextual data accessors,
 * which are provided to `req.context`, and both
 * $inherited and $mixin middleware functions
 * $mixin middleware applies only to the sibling methods,
 * while $inherited applies to siblings and children.
 *
 * the actual method handlers are keyed with $get/$post/$patch/$delete or $any
 *
 * middleware can be a method, an array of methods, or a map
 * of $get/$post to methods or arrays of methods applying to only those http verbs.
 *
 * Contextual data should be read early in the method,
 * (preferably by destructuring in the function arguments),
 * since the mechanism to automatically provide it is by throwing an exception
 * if it's missing (the first time any method (middleware method) is called.)
 *
 * Example:
 *
 * ```js
 * {
 *   $context: {
 *     async loggedIn(req) { return await checkIfUserLoggedIn(req) }
 *     async canPost(req) { return await checkIfUserCanPost(req) }
 *   },
 *   $inherited: ({ context: loggedIn }, res) => loggedIn || res.status(loggedIn === false ? 403 : 401).end(),
 *   things: {
 *     $get(req, res) {}
 *     '[thing]': {
 *       $mixin: {
 *          $post: ({ context: canPost }, res) => canPost || res.status(canPost === false ? 403 : 401).end(),
 *       },
 *       $get(req, res) { ... }
 *       $post(req, res) { ... }
 *     }
 *   }
 * }
 * ```
 *
 * @param {import('next').NextApiRequest} req a next api request
 * @param {import('next').NextApiResponse} res a next api response
 * @param {import('lib/common/spaces').ApiMap} api the api mapping
 * @param {string} apiPath the remaining path for the api mapping to consider
 * @param {any?} queryMixin additional data to mix into the req.query
 * @returns {Promise<boolean>} whether the request was handled (or any error)
 */
export async function handleWithApiMap(req, res, api, apiPath, queryMixin = {}) {
    const middleware = []
    const context = {}

    let { node, path, query } = navigate(api, apiPath, {
        collector: ({ $inherited, $mixin, $context }, here) => {
            middleware.push(...repackageMiddleware([$inherited || [], ...here && $mixin || []].flat()))
            Object.assign(context, $context || {})
        },
    })

    const apiHandler = typeof node === 'function' ? node : methods(node)

    if (!apiHandler) {
        return false
    }

    const enhancedReq = { ...req, query: { ...req.query, ...queryMixin, ...query, path } }

    await composed({ context, cache: node }, apiHandler, ...middleware)(enhancedReq, res)

    return true
}
