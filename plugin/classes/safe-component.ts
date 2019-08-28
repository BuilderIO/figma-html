import * as React from "react";
import { reaction, IReactionOptions, action } from "mobx";

type VoidFunction = () => void;

export class SafeComponent<
  P extends object = {},
  S extends object = {}
> extends React.Component<P, S> {
  private _unMounted = false;

  protected unmountDestroyers: VoidFunction[] = [];

  constructor(props: P, state: S) {
    super(props, state);

    const render = this.render;
    this.render = (...args) => {
      if (this.state && (this.state as any).hasError) {
        return React.createElement(
          "div",
          {
            style: {
              display: "inline-block",
              color: "red",
              padding: 5
            }
          },
          "Oh no! We had an error :( Try refreshing this page and contact steve@builder.io if this continues"
        );
      }
      return render.apply(this, args);
    };
  }

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

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Component error:", error, errorInfo);
  }

  // safeSubscribe<T>(observable: Observable<T>, callback: (value: T) => void) {
  //   const subscription = observable.subscribe(action(callback));
  //   this.onDestroy(() => subscription.unsubscribe());
  //   return subscription;
  // }

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
      fireImmediately: true
    }
  ) {
    this.onDestroy(reaction(watchFunction, reactionFunction, options));
  }
}
