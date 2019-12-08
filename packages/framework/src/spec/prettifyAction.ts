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
    case 'invoke': {
      const argsStr = action.payload.length === 0 ?
        '' :
        `, ${action.payload.map(tersifyValue).join(', ')}`
      return `${state.ref.plugin} <act:${actionId}> ${prettifyPerformer(action.performer)} invoke <ref:${state.refId}>(this:${tersifyValue(action.thisArg)}${argsStr})`
    }
    case 'return':
      return `${state.ref.plugin} <act:${actionId}> <ref:${state.refId} act:${(state as Recorder.CauseActionsState).actionId}> -> ${typeof action.payload === 'string' ? `<ref:${action.payload}>` : tersify(action.payload)}`
    case 'throw':
      return `${state.ref.plugin} <act:${actionId}> <ref:${state.refId} act:${(state as Recorder.CauseActionsState).actionId}> throws ${typeof action.payload === 'string' ? `<ref:${action.payload}>` : tersify(action.payload)}`
  }
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