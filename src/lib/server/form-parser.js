import bodyParser from 'body-parser'
import { promisify } from 'node:util'

const parseUrlEncodedAsync = promisify(bodyParser.urlencoded({ extended: true }))
const parseJsonAsync = promisify(bodyParser.json({ }))
const parseTextAsync = promisify(bodyParser.text({ }))
const parseRawAsync = promisify(bodyParser.raw({ }))

/** @type {(req: import('http').IncomingMessage, res: import('http').OutgoingMessage) => Promise<any>} */
const formParser = async (req, res) => {
    const contentType = req.headers['content-type']
    const [, type, subtype, params] = /^([a-z0-9.-]+)\/([a-z0-9.-]+(?:\+[a-z0-9.-]+)?)(?:\s*;(.*))?$/i.exec(contentType)

    // eslint-disable-next-line no-void
    void params

    if (type === 'application' && subtype === 'x-www-form-urlencoded') {
        await parseUrlEncodedAsync(req, res)
    } else if (type === 'application' && subtype === 'json') {
        await parseJsonAsync(req, res)
    } else if (type === 'application' && subtype === 'octet-stream') {
        await parseRawAsync(req, res)
    } else {
        await parseTextAsync(req, res)
    }

    return req.body
}

export default formParser

