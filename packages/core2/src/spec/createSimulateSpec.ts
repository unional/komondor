import { Omit } from 'type-plus';
import { SpecContext } from '../context';
import { assertMockable } from './assertMockable';
import { getSpy, instanceRecorder, CircularTracker } from './createSaveSpec';
import { createSimulator } from './createSimulator';
import { assertActionType, createValidateRecord, ValidateRecord } from './createValidateRecord';
import { ActionMismatch, PluginNotFound, ReferenceMismatch } from './errors';
import { findPlugin, getPlugin } from './findPlugin';
import { logCreateStub, logInvokeAction, logResultAction } from './logs';
import { InvocationResponder, InvokeAction, ReferenceId, ReferenceSource, ReturnAction, Spec, SpecAction, SpecOptions, SpecReference, SpyOptions, StubContext, StubInvokeOptions, StubOptions, ThrowAction, ActionId, SpyInstanceOptions } from './types';
import { SpecPluginInstance } from './types-internal';
import { notDefined } from '../constants';

export async function createSimulateSpec(context: SpecContext, specId: string, options: SpecOptions): Promise<Spec> {
  const loaded = await context.io.readSpec(specId)

  const record = createValidateRecord(specId, loaded, options)
  const simulator = createSimulator(record, options)
  record.onAddAction(simulator.run)

  return {
    mock: subject => {
      assertMockable(subject)
      return createStub({ record, subject })
    },
    async done() { }
  }
}
type CreateStubOptions<S> = {
  record: ValidateRecord,
  subject: S,
  source?: ReferenceSource,
}

export type StubContextInternal = {
  record: ValidateRecord,
  source?: ReferenceSource
}

function createStub<S>({ record, subject, source }: CreateStubOptions<S>): S {
  const expected = record.getExpectedReference()

  const plugin = findPlugin(subject)
  if (!plugin) {
    throw new PluginNotFound(expected.plugin)
  }

  const ref: SpecReference = { plugin: plugin.name, subject, testDouble: notDefined, source, mode: expected.mode }

  if (referenceMismatch(ref, expected)) {
    throw new ReferenceMismatch(record.specId, ref, expected)
  }

  const id = record.addRef(ref)

  logCreateStub({ plugin: plugin.name, id })
  const tracker: CircularTracker = {}
  const context = stubContext({ record, plugin, ref, id, tracker })
  ref.testDouble = plugin.createStub(context, subject, expected.meta)
  if (tracker.site && tracker.site.length > 0) {
    const site = tracker.site.pop()!
    tracker.site.reduce((p, v) => p[v], ref.testDouble)[site] = ref.testDouble
  }
  return ref.testDouble
}

export type StubContextOptions = {
  record: ValidateRecord,
  plugin: SpecPluginInstance,
  ref: SpecReference,
  id: ReferenceId,
  tracker: CircularTracker,
}

export function stubContext(options: StubContextOptions): StubContext {
  return {
    id: options.id,
    invoke: (id: ReferenceId, args: any[], invokeOptions: StubInvokeOptions = {}) => invocationResponder(options, id, args, invokeOptions),
    getSpy: <A>(id: ActionId, subject: A, getOptions: SpyOptions = {}) => getSpy(options, id, subject, getOptions),
    resolve: <V>(refOrValue: V, resolveOptions: StubOptions = {}) => {
      if (typeof refOrValue !== 'string') return refOrValue
      const { record, id } = options

      const reference = record.getRef(refOrValue)
      if (reference) return reference.testDouble

      // ref is from saved record, so the original reference must exists.
      const origRef = record.getOriginalRef(refOrValue)!
      if (!origRef.source) {
        throw new Error(`no source found for ${refOrValue}`)
      }

      const site = resolveOptions.site
      if (siteMismatch(site, origRef.source.site)) {
        throw new ReferenceMismatch(record.specId, { ...origRef, source: { ...origRef.source, site } }, origRef)
      }
      const sourceRef = record.getRef(origRef.source.ref)!
      const subject = getByPath(sourceRef.subject, origRef.source.site || [])
      return createStub<V>({ record, subject, source: { ref: id, site } })
    },
    instantiate: (id: ReferenceId, args: any[], instanceOptions: SpyInstanceOptions = {}) => instanceRecorder(options, id, args, instanceOptions)
    // declare: <S>(stub: S) => createStubRecorder<S>({ record, plugin }, stub),
    // getStub: <A>(subject: A) => getStub<A>({ record }, subject)
  }
}

function referenceMismatch(actual: SpecReference, expected: SpecReference) {
  return !(actual.plugin === expected.plugin && !sourceMismatch(actual.source, expected.source))
}

function sourceMismatch(actual: ReferenceSource | undefined, expected: ReferenceSource | undefined) {
  if (actual === undefined) {
    return expected !== undefined
  }
  return expected === undefined ||
    actual.ref !== expected.ref ||
    siteMismatch(actual.site, expected.site)
}

function siteMismatch(actual: Array<string | number> | undefined, expected: Array<string | number> | undefined) {
  return arrayMismatch(actual, expected)
}

function arrayMismatch(actual: any[] | undefined, expected: any[] | undefined) {
  if (actual === undefined) {
    return expected !== undefined
  }
  return expected === undefined ||
    actual.length !== expected.length ||
    actual.some((v, i) => v !== expected[i])
}
function getByPath(subject: any, sitePath: Array<string | number>) {
  return sitePath.reduce((p, s) => p[s], subject)
}

// function getStub<S>({ record }: { record: ValidateRecord }, subject: S): S {
//   const stub = record.findTestDouble(subject)
//   if (stub) return stub

//   return createStub({ record }, subject) || subject
// }

// function createStubRecorder<S>(
//   { record, plugin }: RecorderContext,
//   stub: S
// ): StubRecorder<S> {
//   const ref = record.addRef({ plugin, testDouble: stub })

//   logCreateStub({ plugin, ref })

//   return {
//     stub,
//     invoke: (args: any[]) => createInvocationResponder({ record, plugin }, ref, args)
//   }
// }

function invocationResponder(
  { record, plugin, ref, tracker: source }: StubContextOptions,
  id: ReferenceId,
  args: any[],
  { transform, site }: StubInvokeOptions
): InvocationResponder {
  const expected = record.getExpectedAction()
  const invokeId = record.getNextActionId()

  const stubArgs = transform ? args.map((a, i) => {
    source.site = [i]
    return transform(invokeId, a)
  }) : args

  const action: Omit<InvokeAction, 'tick'> = {
    type: 'invoke',
    ref: id,
    mode: ref.mode,
    payload: stubArgs.map(a => record.findRefId(a) || a),
    site,
  }

  if (actionMismatch(action, expected)) {
    throw new ActionMismatch(record.specId, action, expected)
  }

  logInvokeAction({ record, plugin: plugin.name, id }, invokeId, args)
  record.addAction(action)

  return {
    getResult: () => {
      const expected = record.getExpectedAction() as ReturnAction | ThrowAction
      return getResult(record, expected)
    },
    getResultAsync: () => {
      return new Promise(a => {
        record.onAddAction(() => {
          const expected = record.getExpectedAction() as ReturnAction | ThrowAction
          if (expected && expected.ref === invokeId) {
            a(getResult(record, expected))
          }
        })
      })
    },
    returns(value: any) {
      const expected = record.getExpectedAction()
      assertActionType(record.specId, 'return', expected)
      logResultAction({ plugin: plugin.name, id }, 'return', invokeId, record.getNextActionId(), value)
      record.addAction({ type: 'return', ref: invokeId, payload: record.findRefId(value) || value })
      return value
    },
    throws(value: any) {
      const expected = record.getExpectedAction()
      assertActionType(record.specId, 'throw', expected)
      logResultAction({ plugin: plugin.name, id }, 'throw', invokeId, record.getNextActionId(), value)
      record.addAction({ type: 'throw', ref: invokeId, payload: record.findRefId(value) || value })
      return value
    },
  }
}

function getResult(record: ValidateRecord, expected: ReturnAction | ThrowAction) {
  if (typeof expected.payload !== 'string') {
    return {
      type: expected.type,
      value: expected.payload,
      meta: expected.meta
    }
  }

  const expectedReference = record.getOriginalRef(expected.payload)!
  const actualReference = record.getRef(expected.payload)
  if (actualReference) {
    return {
      type: expected.type,
      value: actualReference.testDouble,
      meta: expected.meta
    }
  }

  const plugin = getPlugin(expectedReference.plugin)
  const tracker: CircularTracker = {}
  const ref: SpecReference = { plugin: plugin.name, mode: expectedReference.mode, testDouble: notDefined, source: expectedReference.source }
  const id = record.addRef(ref)
  const context = stubContext({ record, plugin, ref, id, tracker })

  logCreateStub({ plugin: plugin.name, id })
  ref.testDouble = plugin.createStub(context, expectedReference.subject, expectedReference.meta)
  if (tracker.site && tracker.site.length > 0) {
    const site = tracker.site.pop()!
    tracker.site.reduce((p, v) => p[v], ref.testDouble)[site] = ref.testDouble
  }

  return {
    type: expected.type,
    value: ref.testDouble,
    meta: expected.meta,
  }
}

function actionMismatch(actual: Omit<SpecAction, 'tick'>, expected: SpecAction) {
  return actual.type !== expected.type ||
    actual.ref !== expected.ref ||
    arrayMismatch(actual.payload, expected.payload)
}
