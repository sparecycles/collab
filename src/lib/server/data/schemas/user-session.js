import scheme from 'lib/server/redis-util/scheme'

const userSessionSchema = ({
    spaces: space => ({
        info: () => scheme.hash(`spaces:${space}:info`),
        users: () => scheme.setSet(`spaces:${space}:users`),
        sessions: session => ({
            info: () => scheme.hash(`spaces:${space}:sessions:${session}:info`),
            roles: () => scheme.set(`spaces:${space}:sessions:${session}:roles`),
        }),
    }),
})

export default userSessionSchema
