import { DuplicatePlugin, NoActivate, PluginNotConforming } from '../errors';
import { store } from '../store';
import { KomondorPlugin, PluginModule } from '../types';

export function addPluginModule(moduleName: string, pluginModule: PluginModule) {
  assertModuleConfirming(moduleName, pluginModule)

  pluginModule.activate({
    register(plugin: KomondorPlugin) {
      assertPluginConfirming(plugin)
      const pluginName = plugin.name ? `${moduleName}/${plugin.name}` : moduleName
      const plugins = store.get().plugins
      if (plugins.some(p => p.name === pluginName)) {
        throw new DuplicatePlugin(pluginName)
      }

      plugins.unshift({ ...plugin, name: pluginName })
    }
  })
}

function assertModuleConfirming(moduleName: string, pluginModule: Partial<PluginModule>) {
  if (typeof pluginModule.activate !== 'function') {
    throw new NoActivate(moduleName)
  }
}

function assertPluginConfirming(plugin: any) {
  if (
    !plugin ||
    typeof plugin.support !== 'function' ||
    typeof plugin.getSpy !== 'function' ||
    typeof plugin.getStub !== 'function'
  )
    throw new PluginNotConforming(plugin.name)
}
