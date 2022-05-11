import scheme from 'lib/server/redis-util/scheme'

const userSessionSchema = ({
    spaces: space => ({
        info: () => scheme.hash(`spaces:${space}:info`),
        users: scheme.hashSet(`spaces:${space}:users`),
        sessions: scheme.hashSet(`spaces:${space}:sessions`, {}, session => ({
            info: () => scheme.hash(`spaces:${space}:sessions:${session}:info`),
            roles: () => scheme.set(`spaces:${space}:sessions:${session}:roles`),
            del: () => {
                return Promise.all([
                    scheme.hashSet(`spaces:${space}:sessions`).del(),
                    scheme.common(`spaces:${space}:sessions:${session}:roles`).del(),
                ])
            },
        })),
    }),
})

export default userSessionSchema
