import { context } from '../context';
import { createSaveSpec } from '../mockto/createSaveSpec';
import { createSimulateSpec } from '../mockto/createSimulateSpec';
import { Spec, SpecHandler, SpecOptions } from '../mockto/types';

/**
 * Run spec in both save and simulate mode
 */
export const testDuo: TestSpecFn = (...args: any[]) => {
  const { specName, options, handler } = resolveTestSpecFnArgs(args)
  if (options) {
    testSave(specName, options, handler)
    testSimulate(specName, options, handler)
  }
  else {
    testSave(specName, handler)
    testSimulate(specName, handler)
  }
}

export const testSave: TestSpecFn = (...args: any[]) => {
  const { specName, options, handler } = resolveTestSpecFnArgs(args)
  const title = `${specName}: save`
  handler(title, createTestSpec(createSaveSpec, specName, options))
}

export const testSimulate: TestSpecFn = (...args: any[]) => {
  const { specName, options, handler } = resolveTestSpecFnArgs(args)
  const title = `${specName}: simulate`
  handler(title, createTestSpec(createSimulateSpec, specName, options))
}

export type SequenceHandler = (title: string, specs: { save: Spec, simulate: Spec }) => void
/**
 * Runs save and simulate in different sequence.
 */
export const testSequence: TestSpecFn<SequenceHandler> = (...args: any[]) => {
  const { specName, options, handler } = resolveTestSpecFnArgs<SequenceHandler>(args)
  handler(specName, {
    save: createTestSpec(createSaveSpec, specName, options),
    simulate: createTestSpec(createSimulateSpec, specName, options)
  })
}

function createTestSpec(specFn: typeof createSaveSpec, specName: string, options: SpecOptions = { timeout: 3000 }): Spec {
  let s: Spec
  return Object.assign(
    (subject: any) => getSpec().then(s => s(subject)), {
    done: () => getSpec().then(s => s.done())
  })

  async function getSpec() {
    if (s) return s
    const ctx = await context.get()
    // eslint-disable-next-line require-atomic-updates
    return s = await specFn(ctx, specName, '', options)
  }
}

function resolveTestSpecFnArgs<H = SpecHandler>(args: any[]): { specName: string, options: SpecOptions | undefined, handler: H } {
  if (args.length === 3) {
    return { specName: args[0], options: args[1], handler: args[2] }
  }
  else {
    return { specName: args[0], options: undefined, handler: args[1] }
  }
}

export interface TestSpecFn<H = SpecHandler> {
  (specName: string, handler: H): void,
  (specName: string, options: SpecOptions, handler: H): void,
}
