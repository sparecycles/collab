import scheme from 'lib/server/redis-util/redis-scheme'

const userSessionSchema = {
    spaces: scheme.hashSet(`collab:spaces`, {}, space => ({
        users: scheme.hashSet(`collab:spaces:${space}:users`),
        sessions: scheme.hashSet(`collab:spaces:${space}:sessions`, {}, session => ({
            info: () => scheme.hash(`collab:spaces:${space}:sessions:${session}:info`),
            roles: () => scheme.set(`collab:spaces:${space}:sessions:${session}:roles`),
            $del() {
                return Promise.all([
                    scheme.hashSet(`collab:spaces:${space}:sessions`)().$del(),
                    scheme.common(`collab:spaces:${space}:sessions:${session}:roles`).$del(),
                ])
            },
        })),
    })),
}

export default userSessionSchema
