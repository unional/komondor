import { createMockto, Mocktomata } from '@mocktomata/framework'
import { createIO } from '@mocktomata/io-client'
import { AsyncContext } from 'async-fp'
import { PromiseValue, required } from 'type-plus'
import { log } from '../log'
import { resolveFilter, resolveLogLevel, resolveMode } from '../utils'
import { store } from './store'

const context = new AsyncContext(async () => {
  const io = await createIO()
  const loadedConfig = getLoadedConfig(await io.getConfig())
  const storedConfig = store.value.config
  const config = required(storedConfig, loadedConfig)
  if (config.logLevel) log.level = config.logLevel
  store.value.config = config
  return { config, io }
})
export const mockto = createMockto(context)

function getLoadedConfig(config: PromiseValue<ReturnType<Mocktomata.IO['getConfig']>>): Mocktomata.Config {
  if (config.overrideMode) config.overrideMode = resolveMode('config', config.overrideMode)
  if (config.filePathFilter) config.filePathFilter = resolveFilter(config.filePathFilter)
  if (config.specNameFilter) config.specNameFilter = resolveFilter(config.specNameFilter)
  if (config.logLevel) config.logLevel = resolveLogLevel('config', config.logLevel) as any
  return config as any
}
