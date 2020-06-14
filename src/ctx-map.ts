import * as asyncHooks from 'async_hooks';
import * as Koa from 'koa';

const ctxMap = new Map();

export function createCtx(ctx) {
  ctxMap.set(asyncHooks.executionAsyncId(), ctx)
}

export function getCtx(): Koa.Context {
  return ctxMap.get(asyncHooks.executionAsyncId());
}

class AsyncCallbacks {
  init(asyncId, type, triggerAsyncId, resource) {
    if (ctxMap.has(triggerAsyncId)) {
      ctxMap.set(asyncId, ctxMap.get(triggerAsyncId));
    }  
  }

  destroy(asyncId) {
    if (ctxMap.has(asyncId)) {
      ctxMap.delete(asyncId);
    }
  }
}

export const asyncHook = asyncHooks.createHook(new AsyncCallbacks());

