import { tersify } from 'tersify';
import { Recorder } from './types-internal';
import { SpecRecord } from './types';

export namespace prettifyAction {
  export type Options = OptionsForGetInvoke | OptionsForReturnThrow
  export type OptionsForGetInvoke = {
    actionId: SpecRecord.ActionId, action: SpecRecord.GetAction | SpecRecord.InvokeAction
  }
  export type OptionsForReturnThrow = {
    actionId: SpecRecord.ActionId, action: SpecRecord.ReturnAction | SpecRecord.ThrowAction, sourceId: SpecRecord.ActionId
  }
}

export function prettifyAction(state: Recorder.State, actionId: SpecRecord.ActionId, action: SpecRecord.Action) {
  switch (action.type) {
    case 'get':
      return `${state.ref.plugin} <act:${actionId}> ${prettifyPerformer(action.performer)} access <ref:${state.refId}>.${action.key}`
    case 'set':
      return `${state.ref.plugin} <act:${actionId}> ${prettifyPerformer(action.performer)} set <ref:${state.refId}>.${action.key} = ${action.value}`
    case 'invoke': {
      const argsStr = action.payload.length === 0 ?
        '' :
        `, ${action.payload.map(tersifyValue).join(', ')}`
      return `${state.ref.plugin} <act:${actionId}> ${prettifyPerformer(action.performer)} invoke <ref:${state.refId}>(this:${tersifyValue(action.thisArg)}${argsStr})`
    }
    case 'return':
      // console.log(state)
      return `${state.ref.plugin} <act:${actionId}> ${prettifyIdWithRef(state.refId, state.source?.id)} -> ${typeof action.payload === 'string' ? `<ref:${action.payload}>` : tersify(action.payload)}`
    case 'throw':
      return `${state.ref.plugin} <act:${actionId}> ${prettifyIdWithRef(state.refId, state.source?.id)} throws ${typeof action.payload === 'string' ? `<ref:${action.payload}>` : tersify(action.payload)}`
  }
}

export function prettifyId(id: SpecRecord.ReferenceId | SpecRecord.ActionId | undefined) {
  return id ? typeof id === 'string' ? `<ref:${id}>` : `<act:${id}>` : ''
}

function prettifyIdWithRef(refId: SpecRecord.ReferenceId, id: SpecRecord.ReferenceId | SpecRecord.ActionId | undefined) {
  return id ? typeof id === 'string' ? `<ref:${id}>` : `<ref:${refId} act:${id}>` : ''
}
function prettifyPerformer(performer: SpecRecord.Performer) {
  switch (performer) {
    case 'user': return 'you'
    case 'mockto': return 'I'
    default: return performer
  }
}

function tersifyValue(value: any) {
  return typeof value === 'string' ? `<ref:${value}>` : value
}
