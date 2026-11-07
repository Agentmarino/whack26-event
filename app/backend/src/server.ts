// Start the backend: pnpm --filter backend dev (or `start`). Port 8000 on every interface, so the phone reaches it.

import { networkInterfaces } from 'node:os'
import { buildApp } from './app.ts'
import { cacheSize } from './cache.ts'
import { config } from './config.ts'

const app = await buildApp({ logger: false })
await app.listen({ port: config.port, host: config.host })

const lan = Object.values(networkInterfaces())
  .flat()
  .filter(i => i && i.family === 'IPv4' && !i.internal)
  .map(i => i!.address)
console.log(`backend on http://localhost:${config.port}${lan.map(ip => ` and http://${ip}:${config.port}`).join('')}`)
console.log(
  `model ${config.model}; Claude ${config.offline ? 'OFF (DEMO_OFFLINE=true: cache, then templates)' : config.hasKey ? 'on' : 'off (no ANTHROPIC_API_KEY)'}; ${cacheSize()} cached outputs`,
)
