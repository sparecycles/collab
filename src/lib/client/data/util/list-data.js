import SpaceContext from 'components/space/SpaceContext'
import { formData, sendFormData } from 'lib/client/form-util'
import { useContext } from 'react'
import { useSWRConfig } from 'swr'
import { useKeyMappingFactory } from './key-mapping-context'

export function useDeleteListItem(name, { id, afterMutate = Function.prototype }) {
    const { mutate } = useSWRConfig()
    const { space } = useContext(SpaceContext)
    const urlPath = name.split(':').map(encodeURI).join('/')

    return async () => {
        mutate(name, list => list.filter(({ id: itemId }) => id !== itemId), false)

        afterMutate()

        await fetch(`/api/s/${space}/${urlPath}/${encodeURIComponent(id)}`, { method: 'DELETE' })
        mutate(name)
    }
}

export function useEditListItem(name, { id, validate = _value => true, afterMutate = Function.prototype }) {
    const { mutate } = useSWRConfig()
    const { space } = useContext(SpaceContext)

    const urlPath = name.split(':').map(encodeURI).join('/')
    const keyMappingFactory = useKeyMappingFactory()

    if (id) {
        return async (event) => {
            event.preventDefault?.()

            const data = formData(event.target)

            if (!validate(data)) {
                afterMutate()
                return
            }

            if (data) {
                await mutate(name, (list) => {
                    let itemIndex = list.findIndex(({ id: itemId }) => id === itemId)
                    const update = [...list]
                    update[itemIndex] = { ...update[itemIndex], ...data }
                    return update
                }, false)

                afterMutate()

                try {
                    await sendFormData(`/api/s/${space}/${urlPath}/${id}`, { ...data }, { method: 'put' })
                } finally {
                    mutate(name)
                }
            }
        }
    }

    return async (submitEvent) => {
        submitEvent.preventDefault()

        const { localKey, setKeyMapping } = keyMappingFactory()
        const data = { ...formData(submitEvent.target) }

        if (!validate(data)) {
            afterMutate()
            return
        }

        mutate(name, list => [...list || [], { id: localKey, ...data }], false)

        afterMutate()

        try {
            const response = await sendFormData(`/api/s/${space}/${urlPath}`, data)
            const { id: remoteId } = await response.json()
            setKeyMapping(remoteId)
        } finally {
            mutate(name)
        }
    }
}
