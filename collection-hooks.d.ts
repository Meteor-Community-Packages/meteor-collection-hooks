declare module 'meteor/matb33:collection-hooks' {
    import { Meteor } from "meteor/meteor"
    type TGlobalOptions = {
        all?: any
        insert?: any
        update?: any
        upsert?: any
        find?: any
        findOne?: any
        remove?: any
    }
    interface CollectionHooks {
        defaultUserId?: string
        directEnv?: Meteor.EnvironmentVariable<any>
        GlobalOptions?: TGlobalOptions
        defaults?: {
            all?: TGlobalOptions
            before?: TGlobalOptions
            after?: TGlobalOptions
        }
    }
}

declare module 'meteor/mongo' {
    import {CollectionHooks} from "meteor/matb33:collection-hooks";
    module Mongo {
        type THookThis<UnderlyingMethod extends (...args: any) => any> = {_super: UnderlyingMethod, context: ThisType<UnderlyingMethod>, args: Parameters<UnderlyingMethod>}
        type THookBeforeInsert<T,O = void> = (this: THookThis<Collection<T>["insert"]>, userId: string|undefined, doc: T) => O;
        type THookBeforeUpdate<T,O = void> = (this: THookThis<Collection<T>["update"]>, userId: string|undefined, doc: T, fieldNames: string[], modifier: any, options: any) => O
        type THookBeforeRemove<T,O = void> = (this: THookThis<Collection<T>["remove"]>, userId: string|undefined, doc: T) => O
        type THookBeforeUpsert<T,O = void> = (this: THookThis<Collection<T>["upsert"]>, userId: string|undefined, selector: any, modifier: any, options: any) => O
        type THookBeforeFind<T,O = void> = (this: THookThis<Collection<T>["find"]>, userId: string|undefined, selector: any, options: any) => O
        type THookAfterFind<T> = (this: THookThis<Collection<T>["find"]>, userId: string|undefined, selector: any, options: any, cursor: Cursor<T>) => void
        type THookBeforeFindOne<T,O = void> = (this: THookThis<Collection<T>["findOne"]>, userId: string|undefined, selector: any, options: any) => O
        type THookAfterFindOne<T> = (this: THookThis<Collection<T>["findOne"]>, userId: string|undefined, selector: any, options: any, doc: T) => void
        type THandler<F> = {remove(): void, replace(callback: F, options: any): void}

        interface Collection<T, U = T> {
            hookOptions: CollectionHooks["GlobalOptions"]
            direct: Pick<Collection<T, U>, "insert"|"update"|"find"|"findOne"|"remove">
            before: {
                insert<Fn = THookBeforeInsert<T,void|false>>(fn: Fn): THandler<Fn>
                update<Fn = THookBeforeUpdate<T,void|false>>(fn: Fn): THandler<Fn>
                remove<Fn = THookBeforeRemove<T,void|false>>(fn: Fn): THandler<Fn>
                upsert<Fn = THookBeforeUpsert<T,void|false>>(fn: Fn): THandler<Fn>
                find<Fn = THookBeforeFind<T,void|false>>(fn: Fn): THandler<Fn>
                findOne<Fn = THookBeforeFindOne<T,void|false>>(fn: Fn): THandler<Fn>
            }
            after: {
                insert<Fn = THookBeforeInsert<T>>(fn: Fn): THandler<Fn>
                update<Fn = THookBeforeUpdate<T>>(fn: Fn): THandler<Fn>
                remove<Fn = THookBeforeRemove<T>>(fn: Fn): THandler<Fn>
                upsert<Fn = THookBeforeUpsert<T>>(fn: Fn): THandler<Fn>
                find<Fn = THookAfterFind<T>>(fn: Fn): THandler<Fn>
                findOne<Fn = THookAfterFindOne<T>>(fn: Fn): THandler<Fn>
            }
        }
    }
}

