/*
 * Stub replacing @react-aria/ssr with React 18 useId() implementation.
 */

import { useId, useState } from 'react'
import { useLayoutEffect } from '@react-aria/utils'

export function SSRProvider({ children }) {
    return children
}

/** @private */
export function useSSRSafeId(overrideId) {
    const generatedId = useId()
    return overrideId || generatedId
}

/**
 * Returns whether the component is currently being server side rendered or
 * hydrated on the client. Can be used to delay browser-specific rendering
 * until after hydration.
 */
export function useIsSSR() {
    const [isSSR, setSSR] = useState(true)

    useLayoutEffect(() => setSSR(false))

    return isSSR
}
