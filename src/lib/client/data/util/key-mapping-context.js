import {
    createContext, useContext,
} from 'react'

const KeyMappingContext = createContext({
    keys: {},
    counter: 1000,
    newKeyMapping() {
        const localKey = `local-${this.counter++}`
        const { keys } = this
        return {
            localKey,
            setKeyMapping(remoteKey) {
                if (keys[remoteKey]) {
                    console.warn(
                        `KeyMappingContext: repeated remote key ${remoteKey}: ` +
                        `remapped from ${keys[remoteKey]} to ${localKey}`
                    )
                }

                keys[remoteKey] = localKey
            },
        }
    },
})

export function useKeyMappingFactory() {
    const contextData = useContext(KeyMappingContext)
    return () => contextData.newKeyMapping()
}

export function useKeyMapping() {
    const { keys } = useContext(KeyMappingContext)
    return key => keys[key] || key
}
