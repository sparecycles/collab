
const glob = require('glob')
const path = require('path')
const nextComposePlugins = require('next-compose-plugins')
const nextTranspileModules = require('next-transpile-modules')
const { version } = require('os')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack, isServer }) => {
    
    const { version: reactVersion } = require('react/package.json')
    const reactMajorVersion = Number(reactVersion.split('.')[0])

    if (reactMajorVersion >= 18) {
      config.resolve.alias['@react-aria/ssr'] = path.resolve('./src/patch/react-aria-ssr-use-id')
    }
    
    if (!isServer) {
      config.resolve.alias['lib/server'] = false
      config.resolve.alias['components/spaces/api'] = false

      config.plugins.push(...[
        /^node:.*/,
        /^cookies$/,
        /^body-parser$/,
      ].map(
        resourceRegExp => new webpack.IgnorePlugin({ resourceRegExp })
      ))
    }

    return config
  }
}

const transpiledModules = nextTranspileModules([
  'swr',
  ...[
    '@adobe/react-spectrum*',  
    '@react-aria/*',
    '@react-spectrum/*',
    '@react-stately/*',
    '@react-types/*',
    '@spectrum-aria/*',
    '@spectrum-icons/*',
  ].flatMap(
    spec => glob.sync(`${spec}`, { cwd: 'node_modules/' })
  )
], { debug: false })

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = nextComposePlugins([
  transpiledModules,
  withBundleAnalyzer,
], nextConfig)
