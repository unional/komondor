import t from 'assert'
import a, { AssertOrder, satisfy } from 'assertron'
import { Registrar } from 'komondor-plugin'

import { DuplicatePlugin, spec } from '.'
import { loadConfig, registerPlugin } from './plugin'
import { tersify } from 'tersify';


describe('loadConfig()', () => {
  test('load config', () => {
    const config = loadConfig('./fixtures/singlePlugin')
    t.equal(config.plugins[0], 'komondor-plugin-ws')
  })
})

describe('registerPlugin()', () => {
  test('calling activate', () => {
    const o = new AssertOrder(1)
    registerPlugin({ activate() { o.once(1) } })
    o.end()
  })
  test('register with same name will throw', () => {
    registerPlugin({
      activate(r: Registrar) {
        r.register(
          'x',
          () => false,
          x => x,
          (_context, subject) => subject
        )
        a.throws(() => r.register(
          'x',
          () => false,
          x => x,
          (_context, subject) => subject
        ), DuplicatePlugin)
      }
    })
  })
})


test('peek with no action returns undefined', async () => {
  const o = new AssertOrder(1)
  registerPlugin({
    activate(r: Registrar) {
      r.register(
        'peek-noAction',
        subject => subject === 'peek-noAction',
        x => x,
        (context, subject) => {
          o.once(1)
          t.equal(context.peek(), undefined)
          return subject
        }
      )
    }
  })

  await spec.simulate('plugin/noActions', 'peek-noAction')
  o.end()
})


test('peek with actions returns first action', async () => {
  const o = new AssertOrder(1)
  registerPlugin({
    activate(r: Registrar) {
      r.register(
        'peek-first-action',
        subject => subject === 'peek-first-action',
        x => x,
        (context, subject) => {
          o.once(1)
          satisfy(context.peek(), { type: 'action1' })
          return subject
        }
      )
    }
  })

  await spec.simulate('plugin/twoActions', 'peek-first-action')
  o.end()
})

test('next with no action returns undefined', async () => {
  const o = new AssertOrder(1)
  registerPlugin({
    activate(r: Registrar) {
      r.register(
        'next-noActions',
        subject => subject === 'next-noActions',
        x => x,
        (context, subject) => {
          o.once(1)
          t.equal(context.next(), undefined)
          return subject
        }
      )
    }
  })

  await spec.simulate('plugin/noActions', 'next-noActions')
  o.end()
})


test('next moves to next action and peek gets it', async () => {
  const o = new AssertOrder(1)
  registerPlugin({
    activate(r: Registrar) {
      r.register(
        'next-and-peek',
        subject => subject === 'next-and-peek',
        x => x,
        (context, subject) => {
          o.once(1)
          const a1 = context.peek()
          context.next()
          const a2 = context.peek()
          context.next()
          const a3 = context.peek()

          satisfy(a1, { type: 'action1', payload: [] })
          satisfy(a2, { type: 'action2', payload: [] })
          t.equal(a3, undefined)
          return subject
        }
      )
    }
  })

  await spec.simulate('plugin/twoActions', 'next-and-peek')
  o.end()
})


// test('prune with no action ends with no action', async () => {
//   const o = new AssertOrder(1)
//   registerPlugin({
//     activate(r: Registrar) {
//       r.register(
//         'peek-prune-noAction',
//         subject => subject === 'peek-prune-noAction',
//         x => x,
//         (context, subject) => {
//           o.once(1)
//           context.prune()
//           return subject
//         }
//       )
//     }
//   })

//   const s = await spec.simulate('plugin/noActions', 'peek-prune-noAction')
//   t.equal(s.actions.length, 0)
//   o.end()
// })


// test('prune without move clears all actions', async () => {
//   const store = await createSpec('some', undefined, 'live')
//   await store.load('specStore/twoActions')
//   store.prune()

//   t.equal(store.actions.length, 0)
// })

// test('prune clears remaining actions', async () => {
//   const store = await createSpec('some', undefined, 'live')
//   await store.load('specStore/twoActions')
//   store.next()
//   store.prune()

//   t.equal(store.actions.length, 1)
// })


test('on() will not trigger if not adding the specific action type', async () => {
  const o = new AssertOrder(1)
  registerPlugin({
    activate(r: Registrar) {
      r.register(
        'on-not-trigger',
        subject => tersify(subject) === `function () {return 'on-not-trigger';}`,
        (context, subject) => {
          o.once(1)
          context.add('otherAction')
          return subject
        },
        (_context, subject) => {
          return subject
        }
      )
    }
  })

  const s = await spec(() => 'on-not-trigger')
  s.on('action1', a => t.fail(a.toString()))
  s.subject()
  o.end()
})

test('on() will trigger when the right action is added', async () => {
  const o = new AssertOrder(2)
  registerPlugin({
    activate(r: Registrar) {
      r.register(
        'on-trigger',
        subject => tersify(subject) === `function () {return 'on-trigger';}`,
        (context, subject) => {
          o.once(1)
          context.add('action1')
          return subject
        },
        (_context, subject) => {
          return subject
        }
      )
    }
  })

  const s = await spec(() => 'on-trigger')
  s.on('action1', () => o.once(2))
  s.subject()
  o.end()
})

test('onAny() will trigger when any aciton is added', async () => {
  const o = new AssertOrder(3)
  registerPlugin({
    activate(r: Registrar) {
      r.register(
        'onAny',
        subject => tersify(subject) === `function () {return 'onAny';}`,
        (context, _subject) => {
          return () => {
            o.once(1)
            context.add('action1')
            context.add('action2')
          }
        },
        (_context, subject) => {
          return subject
        }
      )
    }
  })

  const s = await spec(() => 'onAny')
  s.onAny(() => o.any([2, 3]))
  s.subject()
  o.end()

  // const store = await createSpec('some', undefined, 'live')
  // const order = new AssertOrder(2)
  // store.onAny(() => order.any([1, 2]))
  // store.add('a1')
  // store.add('a2')

  // order.end()
})