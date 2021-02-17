import * as React from "react";
import { reaction, IReactionOptions, action } from "mobx";

type VoidFunction = () => void;

/**
 * Provides error boundaries for safety (one component errors won't crash the whole app)
 * and adds some methods for safe handling of subscriptions and reactions (that
 * unsubscribe when the component is destroyed)
 */
export class SafeComponent<
  P extends object = {},
  S = any
> extends React.Component<P, S> {
  private _unMounted = false;

  protected unmountDestroyers: VoidFunction[] = [];

  onDestroy(cb: VoidFunction) {
    if (this._unMounted) {
      // TODO: nextTick? like promise for consistency
      cb();
    } else {
      this.unmountDestroyers.push(cb);
    }
  }

  // For use in react components
  componentWillUnmount() {
    this._unMounted = true;
    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }
    // FIXME: devs will likely not call super on this hook as they won't know they need to
    // and that will cause subscription leaks. Better way to do with decorators perhaps?
    for (const destroyer of this.unmountDestroyers) {
      destroyer();
    }
  }

  // TODO: metadata ways of doing this
  safeListenToEvent(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: EventListenerOptions | boolean
  ) {
    const actionBoundHandler = action(handler);
    target.addEventListener(event, actionBoundHandler, options);
    this.onDestroy(() => {
      target.removeEventListener(event, actionBoundHandler);
    });
  }

  // TODO: metadata way of doing this
  // @reactions(self => [])
  safeReaction<T>(
    watchFunction: () => T,
    reactionFunction: (arg: T) => void,
    options: IReactionOptions = {
      fireImmediately: true,
    }
  ) {
    this.onDestroy(reaction(watchFunction, reactionFunction, options));
  }
}
