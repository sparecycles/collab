import { CommonOps } from './common-ops'
import { createOps } from './spec-core'

export const ContainerOps = createOps('ContainerOps', { isContainer: true, extends: CommonOps }, {
    async $items(fn = child => child.$get()) {
        const keys = [...await this.$get()]
        const data = await Promise.all(keys.map(key => fn(this.$self(key))))
        return this.$mapItems(keys, data)
    },
    async $$delContained() {
        return await Promise.all([...await this.$get()].map(key => this.$self(key).$del?.()))
    },
})
