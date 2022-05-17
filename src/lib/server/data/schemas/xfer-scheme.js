import scheme from 'lib/server/redis-util/redis-scheme'

const xferScheme = {
    xfer: xfer => scheme.hash(`collab:xfer:${xfer}`),
}

export default xferScheme
