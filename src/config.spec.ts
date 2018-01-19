import { test } from 'ava'

import {
  config,
  spec
} from './index'
import { simpleCallback } from './specTestSuites'
import { store } from './store'

test.beforeEach(() => {
  config()
})

test.afterEach(() => {
  config()
})

test('config with no argument set things to default', t => {
  config({ mode: 'save' })
  t.is(store.mode, 'save')

  config()
  t.is(store.mode, undefined)
})


test('config replay will force subsequence spec in replay mode', async t => {
  config({ mode: 'replay' })

  t.is(store.mode, 'replay')

  const speced = await spec(simpleCallback.fail, { id: 'config/forceReplaySuccess', mode: 'verify' })
  const actual = await simpleCallback.increment(speced.subject, 2)

  // this should have failed if the spec is running in 'verify' mode.
  // The actual call is failing.
  await speced.satisfy([
    { type: 'invoke', payload: [2] },
    { type: 'callback', payload: [null, 3] },
    { type: 'return' }
  ])

  t.is(actual, 3)
})

test('config mode to work on specific spec', async t => {
  config({ mode: 'replay', spec: 'not exist' })

  const failSpec = await spec(simpleCallback.fail, { id: 'config/forceReplaySuccess', mode: 'verify' })
  await simpleCallback.increment(failSpec.subject, 2)
    .then(() => t.fail())
    .catch(() => {
      // this should fail if the spec is in 'replay' mode.
      // The saved record is succeeding.
      return failSpec.satisfy([
        { type: 'invoke', payload: [2] },
        { type: 'callback', payload: [{ message: 'fail' }, null] },
        { type: 'return' }
      ])
    })
  config({ mode: 'replay', spec: 'config/forceReplayFail' })

  const sucessSpec = await spec(simpleCallback.success, { id: 'config/forceReplayFail', mode: 'verify' })
  await simpleCallback.increment(sucessSpec.subject, 2)
    .then(() => t.fail())
    .catch(() => {
      // this should fail if the spec is in 'verify' mode.
      // The save record is failing.
      return sucessSpec.satisfy([
        { type: 'invoke', payload: [2] },
        { type: 'callback', payload: [{ message: 'fail' }, null] },
        { type: 'return' }
      ])
    })
  t.pass()
})

test('config mode to work on specific spec using regex', async t => {
  config({ mode: 'replay', spec: /config\/forceReplay/ })
  const sucessSpec = await spec(simpleCallback.success, { id: 'config/forceReplayFail', mode: 'verify' })
  await simpleCallback.increment(sucessSpec.subject, 2)
    .then(() => t.fail())
    .catch(() => {
      return sucessSpec.satisfy([
        { type: 'invoke', payload: [2] },
        { type: 'callback', payload: [{ message: 'fail' }, null] },
        { type: 'return' }
      ])
    })
  t.pass()
})
