import xferScheme from 'lib/server/data/schemas/xfer-scheme'
import methods, { _404 } from 'lib/server/api/methods'

/** @type {import('next').NextApiHandler} */
export default methods({
    async $get(req, res) {
        const { query: { xfer } } = req

        if (await xferScheme.collab.xfer(xfer).$exists()) {
            return res.status(200).end()
        }

        return res.status(404).end()
    },
}, _404)
