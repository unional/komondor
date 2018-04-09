import { SpyCall, SpecAction } from 'komondor-plugin'

import { SpyInstanceImpl } from './SpyInstanceImpl'

export class SpyCallImpl implements SpyCall {
  trigger<T>(_err: T, _meta?: { [k: string]: any; } | undefined): T {
    throw new Error('Method not implemented.');
  }
  constructor(public instance: SpyInstanceImpl, public invokeId: number) {
  }
  invoke<T extends any[]>(args: T, meta?: { [k: string]: any }): T {
    this.instance.addAction({
      name: 'invoke',
      payload: args,
      meta,
      invokeId: this.invokeId
    })

    return args.map((arg, i) => {
      if (typeof arg === 'function') {
        return this.spyOnCallback(arg, [i])
      }
      if (typeof arg === 'object' && arg !== null) {
        const result = {}
        Object.keys(arg).forEach(key => {
          const prop = arg[key]
          if (typeof prop === 'function') {
            result[key] = this.spyOnCallback(prop, [i, key])
          }
          else {
            result[key] = prop
          }
        })
        return result
      }

      return arg
    }) as T
  }
  return<T>(result: T, meta?: { [k: string]: any }): T {
    const action = this.instance.addAction({
      name: 'return',
      payload: result,
      meta,
      invokeId: this.invokeId
    })

    return this.instance.addReturnAction(action) || result
  }
  throw<T>(err: T, meta?: { [k: string]: any }): T {
    this.instance.addAction({
      name: 'throw',
      payload: err,
      meta,
      invokeId: this.invokeId
    })
    return err
  }
  spyOnCallback(fn, sourcePath) {
    return (...args) => {
      const action = {
        payload: args,
        sourceInvokeId: this.invokeId,
        sourcePath
      } as SpecAction
      this.instance.addCallbackAction(action)
      fn(...args)
    }
  }
}