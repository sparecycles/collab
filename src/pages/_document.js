import {
    Head, Html, Main, NextScript,
} from 'next/document'

export default function Document() {
    return (
        <Html className={'spectrum-background'}>
            <Head>
                {/* keep in sync with spectrum defaults */}
                <style>{`
.spectrum-background {
  background: #f5f5f5
}
@media (prefers-color-scheme: dark) {
  .spectrum-background {
      background: #1e1e1e
  }
}
          `.trim()}</style>
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
