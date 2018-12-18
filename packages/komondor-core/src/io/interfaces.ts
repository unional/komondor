import { SpecAction } from '../spec';

export interface SpecRecord {
  expectation: string,
  actions: SpecAction[]
}

export interface IOOptions {
  /**
   * URL to the komondor server.
   * This is used by browser tests to connect to the komondor server.
   */
  url?: string
  /**
   * Authenticate key to komondor service
   */
  key?: string
}