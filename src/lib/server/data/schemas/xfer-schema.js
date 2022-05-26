import schema from 'lib/server/redis-util/redis-schema'

const xferScheme = schema(({ set, hash }) => ({
    collab: {
        xfer: set(hash()),
    },
}))

export default xferScheme
