import { AsyncContext } from 'async-fp'
import { createAutoSpec } from './createAutoSpec'
import { createLiveSpec } from './createLiveSpec'
import { createSaveSpec } from './createSaveSpec'
import { createSimulateSpec } from './createSimulateSpec'
import { Spec } from './types'

export async function createSpec(context: AsyncContext<Spec.Context>, specName: string, invokeRelativePath: string, mode: Spec.Mode, options: Spec.Options): Promise<Spec> {
  switch (mode) {
    case 'auto':
      return createAutoSpec(context, specName, invokeRelativePath, options)
    case 'live':
      return createLiveSpec()
    case 'save':
      return createSaveSpec(context, specName, invokeRelativePath, options)
    case 'simulate':
      return createSimulateSpec(context, specName, invokeRelativePath, options)
  }
}
