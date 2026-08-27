// The error types, split out from the client so they can be reasoned about
// without a network stack behind them. `client.ts` reaches `expo-constants`
// for the API base, and that pulls in React Native — so anything importing
// the client is out of the test suite by definition. These have no imports at
// all, which is what lets screen-state selection stay pure.
//
// No parameter properties here: Node's type stripping refuses them, and this
// file has to run under the test runner untranspiled.

/** Ticket 04 made a missing edition, an unknown id and a hidden article all
 *  404. The client cannot tell them apart, so neither may the UI — and none of
 *  the three improves on a retry, which is why this type exists at all. */
export class NotFoundError extends Error {
  readonly status = 404;

  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof NotFoundError;
}
