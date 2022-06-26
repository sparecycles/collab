import commonSchema from 'lib/server/data/schemas/common-schema'

export const api = {
    $context: {
        user({ query: { space, session } }) {
            return commonSchema.collab.spaces(space).sessions(session).$get('user')
        },
        roles({ context: { user }, query: { space } }) {
            return commonSchema.collab.spaces(space).users(user).roles.$get()
        },
    },
}

export const roleContext = role => ({ context: { roles } }) => roles.has(role)

export function requireRoleContext(...checks) {
    const stringChecks = checks.filter(check => typeof check === 'string')
    const otherChecks = checks.filter(check => typeof check !== 'string')

    checks = [...stringChecks, ...otherChecks]

    return async ({ context }, res) => {
        const satisified = (await Promise.all(checks.map(check => typeof check === 'string'
            ? context[check]
            : check(context)
        ))).every(Boolean)

        if (!satisified) {
            res.status(404).end(`not authorized`)
        }
    }
}
