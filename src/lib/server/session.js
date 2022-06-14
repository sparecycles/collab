import crypto from 'lib/server/node/crypto'

const httpOnly = true

/** @type {(cookies: Cookies) => string} */
export function getSession(cookies, generate = true) {
    let session = cookies.get('session') || null
    if (session || !generate) {
        return {
            session,
            cookies,
            generated: false,
        }
    }

    session = crypto.randomUUID()
    cookies.set('session', session, { httpOnly })

    return {
        session,
        cookies,
        generated: true,
    }
}
