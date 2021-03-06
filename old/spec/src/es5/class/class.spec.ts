import t from 'assert'
import a from 'assertron'
import { setImmediate } from 'timers'
import { spec, SimulationMismatch, SpecNotFound } from '../..';
import k from '../../testUtil'

class Foo {
  constructor(public x: any) { }
  getValue() {
    return this.x
  }
  doThrow() {
    throw new Error('throwing')
  }
}

class Boo extends Foo {
  getPlusOne() {
    return this.getValue() + 1
  }
}

describe('use cases', () => {
  test('acceptance test', async () => {
    const s = await spec('class acceptance test', Foo)
    const foo = new s.subject(1)
    foo.getValue()
    t.throws(() => foo.doThrow())

    await s.done()
  })
})

k.trio('each instance of class will get its own instanceId', (title, spec) => {
  test(title, async () => {
    const s = await spec(Foo)
    const f1 = new s.subject(1)
    const f2 = new s.subject(2)
    f1.getValue()
    f2.getValue()
    await s.done()
  })
})

test('simple class simulate with different constructor will throw', async () => {
  // const s = await spec.save('class/wrongConstructorCall', Boo)
  // const boo = new s.subject(2)
  // t(boo)
  // await s.done()
  const s = await spec.simulate('class/wrongConstructorCall', Foo)
  a.throws(() => new s.subject(2), SimulationMismatch)
})

k.trio('class/simple', (title, spec) => {
  test(title, async () => {
    const s = await spec(Foo)
    const foo = new s.subject(1)
    const actual = foo.getValue()
    t.strictEqual(actual, 1)
    await s.done()
  })
})

k.trio('class/extend', (title, spec) => {
  test(title, async () => {
    const s = await spec(Boo)
    const boo = new s.subject(1)
    const actual = boo.getPlusOne()

    t.strictEqual(actual, 2)
    await s.done()
  })
})

class WithCallback {
  callback(cb: any) {
    setImmediate(() => {
      cb('called')
    })
  }
  justDo(x: any) {
    return x
  }
}

k.trio('class/withCallback', (title, spec) => {
  test(title, async () => {
    const s = await spec(WithCallback)
    const cb = new s.subject()

    cb.justDo(1)
    await new Promise(a => {
      cb.callback((v: string) => {
        t.strictEqual(v, 'called')
      })
      cb.callback((v: string) => {
        t.strictEqual(v, 'called')
        a()
      })
    })

    await s.done()
  })
})

class WithPromise {
  increment(x: number) {
    return new Promise(a => {
      setImmediate(() => a(x + 1))
    })
  }
}

k.trio('method returning promise should have result of promise saved in payload',
  (title, spec) => {
    test(title, async () => {
      const s = await spec(WithPromise)
      const p = new s.subject()
      const actual = await p.increment(3)

      t.strictEqual(actual, 4)
      await s.done()
    })
  })

class Throwing {
  doThrow() {
    throw new Error('thrown')
  }
}

k.trio('class: method throws', (title, spec) => {
  test(title, async () => {
    const s = await spec(Throwing)
    const o = new s.subject()
    a.throws(() => o.doThrow())

    await s.done()
  })
})

class Promising {
  do(x: any) {
    return new Promise(a => {
      setImmediate(() => a(x))
    })
  }
}

k.trio('class: async promise call', (title, spec) => {
  test(title, async () => {
    const s = await spec(Promising)
    // s.onAny(a => {
    //   console.info(`${a.type} ${a.name} ${a.instanceId} ${a.invokeId || ''}`)
    // })
    const p = new s.subject()

    const calls = [1, 2].map(x => p.do(x))
    await Promise.all(calls)
    await p.do(3)

    await s.done()
  })
})

class InvokeInternal {
  do() {
    return this.internal()
  }
  internal() {
    return 'do'
  }
}

k.trio('internal method invocation will not be recorded', (title, spec) => {
  test(title, async () => {
    const s = await spec(InvokeInternal)
    const a = new s.subject()
    t.strictEqual(a.do(), 'do')

    await s.done()
  })
})

k.trio('capture parent class call', (title, spec) => {
  test(title, async () => {
    class Parent { do() { return 'do' } }
    class Child extends Parent { }
    const s = await spec(Child)
    const a = new s.subject()
    t.strictEqual(a.do(), 'do')

    await s.done()
  })
})

k.trio('should not record inner call when using Promise', (title, spec) => {
  test(title, async () => {
    class PromiseInner {
      do() {
        return new Promise(a => {
          setImmediate(() => {
            a(this.inner())
          })
        })
      }
      inner() {
        return 'inner'
      }
    }
    const s = await spec(PromiseInner)
    const a = new s.subject()
    t.strictEqual(await a.do(), 'inner')

    await s.done()
  })
})

test('promise should not invoke actual code', async () => {
  class PromiseInner {
    do() {
      throw new Error('should not call')
      // return new Promise(a => {
      //   setImmediate(() => {
      //     a(this.inner() as any)
      //   })
      // })
    }
    inner() {
      return 'inner'
    }
  }
  const s = await spec.simulate('class/simulateNotInvokeInner', PromiseInner)
  const a = new s.subject()
  // tslint:disable-next-line
  t.strictEqual(await a.do(), 'inner')

  await s.done()
})

// To think: should anything be created if the spec is not being accessed?
// k.trio('class: not using spec', (title, spec) => {
//   test(title, async () => {
//     class Foo { foo() { return 'foo' } }
//     function call(_foo: any) {
//       return 'called'
//     }
//     const s = await spec(Foo)
//     const foo = new s.subject()
//     t.strictEqual(call(foo), 'called')

//     await s.satisfy([
//       { ...classConstructed('Foo'), instanceId: 1 }
//     ])
//   })
// })

class Echo {
  echo(x: any) {
    return new Promise((_, r) => {
      setImmediate(() => r(x))
      // setTimeout(() => {
      //   if (x > 200) {
      //     r(x)
      //   }
      //   else {
      //     a(x)
      //   }
      // }, x)
    })
  }
}

describe('prevent runaway promise', () => {
  test('setup runaway', async () => {
    const s = await spec('class: setup runaway', Echo)
    const e = new s.subject()
    return a.throws(e.echo(300), v => v === 300)
  })
  test('no runaway promise to break this test', () => {
    return new Promise(a => setImmediate(() => a()))
  })
})

class WithCircular {
  value: any
  cirRef: WithCircular
  constructor() {
    this.cirRef = this
  }
}

class ClassWithCircular {
  channel: WithCircular
  constructor() {
    this.channel = new WithCircular()
  }
  exec(cmd: string, cb: Function) {
    this.channel.value = cmd
    cb(this.channel)
  }
}

k.trio('class with circular reference', (title, spec) => {
  test(title, async () => {
    const s = await spec(ClassWithCircular)
    const f = new s.subject()

    let actual
    f.exec('echo', (data: any) => {
      actual = data.value
    })

    t.strictEqual(actual, 'echo')
    await s.done()
  })
})

k.trio('class with circular reference accessing', (title, spec) => {
  test(title, async () => {
    const s = await spec(ClassWithCircular)
    const f = new s.subject()

    let actual
    f.exec('echo', (data: any) => {
      actual = data.cirRef.value
    })

    t.strictEqual(actual, 'echo')
    await s.done()
  })
})

class Channel {
  listeners: any[] = []
  stdio: any
  constructor() {
    this.stdio = this
  }
  on(listener: any) {
    this.listeners.push(listener)
  }
  emit(data: any) {
    this.listeners.forEach(l => l(data))
  }
}

class Ssh {
  channel: Channel
  constructor() {
    this.channel = new Channel()
  }
  exec(cmd: string, cb: Function) {
    cb(this.channel)
    this.channel.stdio.emit(cmd)
  }
}

// TODO: throws NotSupported error for callback with complex object.
// This gives indication to the user that a plugin is need to support this subject
k.trio('callback with complex object', (title, spec) => {
  test.skip(title, async () => {
    const s = await spec(Ssh)
    const f = new s.subject()

    let actual
    f.exec('echo', (channel: any) => {
      // can't create channel with stdio.on() from data
      // unless start doing new Function(...)
      channel.stdio.on((data: any) => actual = data)
    })

    t.strictEqual(actual, 'echo')
    await s.done()
  })
})

k.trio('class/callbackWithComposite', (title, spec) => {
  test(title, async () => {
    class Foo {
      on(compositeFn: any) {
        return this.internal(compositeFn)
      }
      internal(input: any) {
        t.strictEqual(input.value, 'xyz')
        return input
      }
    }
    const fn = Object.assign(
      function () { return },
      {
        value: 'xyz'
      }
    )
    const s = await spec(Foo)
    const f = new s.subject()
    const actual = f.on(fn)
    t.strictEqual(actual.value, 'xyz')

    await s.done()
  })
})

k.trio('class/withProperty', (title, spec) => {
  class WithProperty {
    y = 1
    do(x: any) { return x }
  }
  test(title, async () => {
    const s = await spec(WithProperty)
    const p = new s.subject()
    t.strictEqual(p.do(2), 2)
    t.strictEqual(p.y, 1)
    p.y = 3
    t.strictEqual(p.y, 3)
    await s.done()
  })
})
