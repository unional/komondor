import { AsyncContext } from 'async-fp'
import { createSpecObject, getEffectiveSpecMode, Spec } from '../spec'
import { getCallerRelativePath } from '../test-utils'
import { createMockto } from './createMockto'
import { resolveMocktoFnArgs } from './resolveMocktoFnArgs'

export function createMocktoFn(context: AsyncContext<Spec.Context>) {
  const specFn = (...args: any[]) => {
    const { specName, options = { timeout: 3000 }, handler } = resolveMocktoFnArgs(args)
    const specRelativePath = getCallerRelativePath(specFn)
    const ctx = context.extend(async () => {
      const { config } = await context.get()
      const mode = getEffectiveSpecMode(config, specName, specRelativePath)
      return { mode, specRelativePath }
    })
    handler(specName, createSpecObject(ctx, specName, options))
  }
  return specFn as createMockto.MocktoFn
}

export function createFixedModeMocktoFn(context: AsyncContext<Spec.Context>, mode: Spec.Mode) {
  let ctx: AsyncContext<Spec.Context & {
    mode: Spec.Mode,
    specRelativePath: string,
  }> | undefined
  const specFn = (...args: any[]) => {
    const { specName, options = { timeout: 3000 }, handler } = resolveMocktoFnArgs(args)
    const specRelativePath = getCallerRelativePath(specFn)
    if (!ctx) ctx = context.extend({ mode, specRelativePath })
    handler(`${specName}: ${mode}`, createSpecObject(ctx, specName, options))
  }
  return specFn as createMockto.MocktoFn
}
