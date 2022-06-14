import {
    Provider as SpectrumProvider,
    SSRProvider as SpectrumAriaSSRProvider,
    defaultTheme,
} from '@adobe/react-spectrum'

import 'styles/globals.css'

// eslint-disable-next-line react/prop-types
export default function App({ Component, pageProps }) {
    return (
        <SpectrumAriaSSRProvider>
            <SpectrumProvider theme={defaultTheme}>
                <div className={'App'}>
                    <Component {...pageProps} />
                </div>
            </SpectrumProvider>
        </SpectrumAriaSSRProvider>
    )
}
