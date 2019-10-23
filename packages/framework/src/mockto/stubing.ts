import { Omit, RequiredPick } from 'type-plus';
import { notDefined } from '../constants';
import { assertActionType, ValidateRecord } from './createValidateRecord';
import { ActionMismatch, PluginNotFound, ReferenceMismatch } from './errors';
import { findPlugin, getPlugin } from './findPlugin';
import { CircularReference, fixCircularReferences } from './fixCircularReferences';
import { logCreateStub, logInvokeAction, logResultAction } from './logs';
import { getSpy, instanceRecorder } from './spying';
import { ActionId, InvokeAction, ReferenceId, ReferenceSource, ReturnAction, SpecAction, SpecPlugin, SpecReference, ThrowAction } from './types';
import { SpecPluginInstance } from './types-internal';
import { arrayMismatch, referenceMismatch, siteMismatch } from './validations';

export type CreateStubOptions<S> = {
  record: ValidateRecord,
  subject: S,
  source?: ReferenceSource,
}

export type StubContextInternal = {
  record: ValidateRecord,
  source?: ReferenceSource
}

export function createStub<S>({ record, subject, source }: CreateStubOptions<S>): S {
  const expected = record.getExpectedReference()
  const plugin = findPlugin(subject)
  if (!plugin) {
    throw new PluginNotFound(expected.plugin)
  }

  return createStubInternal(record, plugin, subject, expected, source)
}

function createStubInternal(record: ValidateRecord, plugin: RequiredPick<SpecPlugin, 'name'>, subject: any, expected: SpecReference, source: any) {
  const ref: SpecReference = {
    plugin: plugin.name,
    subject,
    testDouble: notDefined,
    source,
    mode: expected.mode
  }
  if (referenceMismatch(ref, expected)) throw new ReferenceMismatch(record.specId, ref, expected)
  const refId = record.addRef(ref)
  logCreateStub({ plugin: plugin.name, id: refId })
  const circularRefs: CircularReference[] = []
  ref.testDouble = plugin.createStub(
    createPluginStubContext({ record, plugin, ref, refId, circularRefs, currentId: refId }),
    subject,
    expected.meta)
  fixCircularReferences(record, refId, circularRefs)
  return ref.testDouble
}

export type StubContext = {
  record: ValidateRecord,
  /**
   * This need to be passed to all spy contexts,
   * to every getSpy/createSpy.
   * NOTE: that means it probably can be absorbed into `record`.
   */
  circularRefs: CircularReference[],
  plugin: SpecPluginInstance,
  refId: ReferenceId,
  ref: SpecReference,
  currentId: ReferenceId | ActionId,
  site?: Array<keyof any>,
}

export function createPluginStubContext(context: StubContext): SpecPlugin.CreateStubContext {
  return {
    id: context.refId,
    invoke: (id: ReferenceId, args: any[], invokeOptions: SpecPlugin.InvokeOptions = {}) => invocationResponder(context, id, args, invokeOptions),
    getSpy: <A>(subject: A, getOptions: SpecPlugin.GetSpyOptions = {}) => getSpy(context, subject, getOptions),
    resolve: <V>(refOrValue: V, resolveOptions: SpecPlugin.ResolveOptions = {}) => {
      if (typeof refOrValue !== 'string') return refOrValue
      const { record } = context
      const site = resolveOptions.site
      const reference = record.getRef(refOrValue)
      if (reference) {
        if (reference.testDouble === notDefined) {
          context.circularRefs.push({ sourceId: context.currentId, sourceSite: site || [], subjectId: refOrValue })
        }
        return reference.testDouble
      }

      // ref is from saved record, so the original reference must exists.
      const origRef = record.getOriginalRef(refOrValue)!

      if (!origRef.source) {
        throw new Error(`no source found for ${refOrValue}`)
      }

      if (siteMismatch(site, origRef.source.site)) {
        throw new ReferenceMismatch(record.specId, { ...origRef, source: { ref: origRef.source.ref, site } }, origRef)
      }
      const sourceRef = record.getRef(origRef.source.ref)!
      const subject = getByPath(sourceRef.subject, origRef.source.site || [])
      const plugin = getPlugin(origRef.plugin)
      return createStubInternal(record, plugin, subject, origRef, { ref: context.currentId, site })
    },
    instantiate: (id: ReferenceId, args: any[], instanceOptions: SpecPlugin.InstantiateOptions = {}) => instanceRecorder(context, id, args, instanceOptions)
  }
}

function getByPath(subject: any, sitePath: Array<string | number>) {
  if (subject === undefined) return subject
  return sitePath.reduce((p, s) => p[s], subject)
}


function invocationResponder(
  context: StubContext,
  id: ReferenceId,
  args: any[],
  { mode, processArguments, site, meta }: SpecPlugin.InvokeOptions
): SpecPlugin.InvocationResponder {
  const { record, plugin, ref } = context
  const expected = record.getExpectedAction()

  const action: Omit<InvokeAction, 'tick'> = {
    type: 'invoke',
    ref: id,
    mode: mode || ref.mode,
    payload: [],
    site,
    meta
  }
  const invokeId = record.getNextActionId()
  context.currentId = invokeId
  const stubArgs = processArguments ? args.map((a, i) => {
    context.site = [i]
    return processArguments(a)
  }) : args

  action.payload.push(...stubArgs.map(a => record.findRefId(a) || a))
  if (actionMismatch(action, expected)) {
    throw new ActionMismatch(record.specId, action, expected)
  }
  record.addAction(action)
  logInvokeAction({ record, plugin: plugin.name, id }, invokeId, args)

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
  const ref: SpecReference = {
    plugin: plugin.name,
    mode: expectedReference.mode,
    subject: notDefined,
    testDouble: notDefined,
    source: expectedReference.source
  }
  const refId = record.addRef(ref)

  const circularRefs: CircularReference[] = []
  const context = createPluginStubContext({ record, plugin, ref, refId, circularRefs, currentId: refId })

  logCreateStub({ plugin: plugin.name, id: refId })
  ref.testDouble = plugin.createStub(context, expectedReference.subject, expectedReference.meta)
  fixCircularReferences(record, refId, circularRefs)

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
