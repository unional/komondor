import { Expectation } from 'satisfier'

import { CallRecord } from './CallRecord'
import { Spy } from './spy'

export type SpecMode = 'verify' | 'save' | 'replay'

export interface KomondorOptions {
  mode: SpecMode,
  spec: string | RegExp
}

export interface ScenarioOptions {
  /**
   * ID of the Scenario.
   * Scenario is used by global config to change the mode of the spec,
   * so that certain scenario can be changed to `verify` to test some real call in certain context (scenario),
   * while others remain in `replay` or `verify` mode.
   */
  id: string
  /**
   * Given statement in Behavior Driven Development.
   * This is provided to communicate between teams to setup the scenario correctly for this suite.
   */
  given: string
}

export interface SpecOptions {
  /**
   * ID of the spec.
   */
  id: string
  description?: string
  /**
   * Mode of the spec operating in.
   * `verify`: making real calls and verify in `satisfy()`.
   * `save`: making real calls and save the result in file.
   * `replay`: replay calls from file.
   */
  mode: SpecMode
}

export interface SpecRecord {
  records: CallRecord[],
  expectation: Expectation<CallRecord[]>
}


export interface Spec<T extends Function> extends Spy<T> {
  /**
   * @param expectation Must be pure.
   */
  satisfy(expectation: Expectation): Promise<void>
}
