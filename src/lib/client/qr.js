import { toDataURL } from 'qrcode'
import { useEffect, useState } from 'react'

export function useQrImage({ data, errorCorrectionLevel, lightColor, darkColor, margin, scale, width }) {
    const [qrResult, setQrResult] = useState({ pending: true, data: null, error: null })

    useEffect(() => {
        (async () => {
            if (data) {
                /** @type {import('qrcode').QRCodeToDataURLOptions} */
                const options = {
                    errorCorrectionLevel,
                    margin,
                    width,
                    scale,
                    color: {
                        light: lightColor,
                        dark: darkColor,
                    },
                }
                try {
                    setQrResult({ url: await toDataURL(data, options) })
                } catch (error) {
                    setQrResult({ error })
                }
            }
        })()
    }, [data, errorCorrectionLevel, lightColor, darkColor, margin, width, scale])

    return qrResult
}
