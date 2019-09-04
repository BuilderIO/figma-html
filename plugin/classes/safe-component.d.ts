import * as React from "react";
import { IReactionOptions } from "mobx";
declare type VoidFunction = () => void;
export declare class SafeComponent<P extends object = {}, S extends object = {}> extends React.Component<P, S> {
    private _unMounted;
    protected unmountDestroyers: VoidFunction[];
    constructor(props: P, state: S);
    onDestroy(cb: VoidFunction): void;
    componentWillUnmount(): void;
    static getDerivedStateFromError(error: any): {
        hasError: boolean;
    };
    componentDidCatch(error: any, errorInfo: any): void;
    safeListenToEvent(target: EventTarget, event: string, handler: EventListener, options?: EventListenerOptions | boolean): void;
    safeReaction<T>(watchFunction: () => T, reactionFunction: (arg: T) => void, options?: IReactionOptions): void;
}
export {};
