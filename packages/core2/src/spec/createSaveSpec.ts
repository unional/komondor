import { Except, Omit } from 'type-plus';
import { notDefined } from '../constants';
import { SpecContext } from '../context';
import { assertMockable } from './assertMockable';
import { createSpyRecord, SpyRecord } from './createSpyRecord';
import { findPlugin } from './findPlugin';
import { logCreateSpy, logInstantiateAction, logInvokeAction, logResultAction } from './logs';
import { ActionId, ActionMode, InstantiateAction, InvokeAction, ReferenceId, ReferenceSource, ReturnAction, Spec, SpecOptions, SpecPlugin, SpecReference, ThrowAction } from './types';
import { SpecPluginInstance } from './types-internal';

export async function createSaveSpec(context: SpecContext, specId: string, options: SpecOptions): Promise<Spec> {
  const record = createSpyRecord(specId, options)
  return {
    mock: subject => {
      assertMockable(subject)
      return createSpy({ record, subject, mode: 'passive' })!
    },
    async done() {
      record.end()
      const sr = record.getSpecRecord()
      context.io.writeSpec(specId, sr)
    }
  }
}

type CreateSpyOptions<S> = {
  record: Except<SpyRecord, 'getSpecRecord'>,
  subject: S,
  mode: ActionMode,
  source?: ReferenceSource,
}

function createSpy<S>({ record, subject, mode, source }: CreateSpyOptions<S>): S | undefined {
  const plugin = findPlugin(subject)
  if (!plugin) return undefined

  const ref: SpecReference = { plugin: plugin.name, subject, testDouble: notDefined, source, mode }
  const id = record.addRef(ref)

  logCreateSpy({ plugin: plugin.name, id }, subject)
  const tracker: CircularTracker = {}
  ref.testDouble = plugin.createSpy(spyContext({ record, plugin, ref, id, tracker }), subject)
  if (tracker.site && tracker.site.length > 0) {
    const site = tracker.site.pop()!
    tracker.site.reduce((p, v) => p[v], ref.testDouble)[site] = ref.testDouble
  }
  return ref.testDouble
}
export type CircularTracker = {
  site?: Array<string | number>
}

type SpyContextOptions = {
  record: Except<SpyRecord, 'getSpecRecord'>,
  plugin: SpecPluginInstance,
  ref: SpecReference,
  id: ReferenceId,
  tracker: CircularTracker,
}

/**
 * SpyContext is used by plugin.createSpy().
 */
function spyContext(options: SpyContextOptions): SpecPlugin.CreateSpyContext {
  return {
    id: options.id,
    getSpy: <A>(id: ActionId, subject: A, getOptions: SpecPlugin.GetSpyOptions = {}) => getSpy(options, id, subject, getOptions),
    invoke: (id: ReferenceId, args: any[], invokeOptions: SpecPlugin.SpyInvokeOptions = {}) => invocationRecorder(options, id, args, invokeOptions),
    instantiate: (id: ReferenceId, args: any[], instanceOptions: SpecPlugin.SpyInstanceOptions = {}) => instanceRecorder(options, id, args, instanceOptions)
  }
}

export function instanceRecorder(
  { record, plugin, ref, tracker: source }: SpyContextOptions,
  id: ReferenceId,
  args: any[],
  { mode, processArguments, meta }: SpecPlugin.SpyInstanceOptions
): SpecPlugin.InstanceRecorder {

  const action: Omit<InstantiateAction, 'tick' | 'instanceId'> = {
    type: 'instantiate',
    ref: id,
    mode: mode || ref.mode,
    payload: [],
    meta
  }
  const instantiateId = record.addAction(action)

  const spiedArgs = processArguments ? args.map((a, i) => {
    source.site = [i]
    return processArguments(instantiateId, a)
  }) : args

  action.payload.push(...spiedArgs.map(a => record.findRefId(a) || a))

  logInstantiateAction({ record, plugin: plugin.name, id }, instantiateId, args)

  let instanceId: ReferenceId
  return {
    args: spiedArgs,
    setInstance: instance => {
      const reference: SpecReference = { plugin: plugin.name, mode: 'instantiate', testDouble: instance, subject: notDefined }
      instanceId = record.addRef(reference)
      return record.getAction<InstantiateAction>(instantiateId).instanceId = instanceId
    }
  }
}

function invocationRecorder(
  { record, plugin, ref, tracker }: SpyContextOptions,
  id: ReferenceId,
  args: any[],
  { mode, processArguments, site, meta }: SpecPlugin.SpyInvokeOptions
) {
  const action: Omit<InvokeAction, 'tick'> = {
    type: 'invoke',
    ref: id,
    mode: mode || ref.mode,
    payload: [],
    site,
    meta
  }
  const invokeId = record.addAction(action)

  const spiedArgs = processArguments ? args.map((a, i) => {
    tracker.site = [i]
    return processArguments(invokeId, a)
  }) : args

  action.payload.push(...spiedArgs.map(a => record.findRefId(a) || a))

  logInvokeAction({ record, plugin: plugin.name, id }, invokeId, args)

  return {
    args: spiedArgs,
    returns: (value: any, options?: SpecPlugin.SpyInvokeOptions) => processInvokeResult({ record, plugin, ref, id, tracker }, 'return', invokeId, value, options),
    throws: (err: any, options?: SpecPlugin.SpyResultOptions) => processInvokeResult({ record, plugin, ref, id, tracker }, 'throw', invokeId, err, options)
  }
}

function processInvokeResult(
  { record, plugin, id, tracker }: SpyContextOptions,
  type: 'return' | 'throw',
  invokeId: ActionId,
  value: any,
  { processArgument, meta }: SpecPlugin.SpyResultOptions = {}
) {

  const returnId = record.getNextActionId()
  tracker.site = undefined
  const result = processArgument ? processArgument(returnId, value) : value
  const action: Omit<ReturnAction | ThrowAction, 'tick'> = {
    type,
    ref: invokeId,
    payload: record.findRefId(result) || result,
    meta
  }

  record.addAction(action)
  logResultAction({ plugin: plugin.name, id }, type, invokeId, returnId, value)
  return result
}

/**
 * NOTE: the specified subject can be already a test double, passed to the system during simulation.
 */
export function getSpy<S>(
  { record, ref, tracker }: SpyContextOptions,
  id: ActionId,
  subjectOrTestDouble: S, options: SpecPlugin.GetSpyOptions
): S {
  const reference = record.findRef(subjectOrTestDouble)
  if (reference) {
    if (reference.testDouble === notDefined) {
      tracker.site = options.site
    }
    return reference.testDouble
  }
  const mode = options.mode || ref.mode
  const site = options.site
  return createSpy({ record, source: { ref: id, site }, mode, subject: subjectOrTestDouble }) || subjectOrTestDouble
}
