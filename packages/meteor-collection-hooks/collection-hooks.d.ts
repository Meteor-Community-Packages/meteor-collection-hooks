declare module 'meteor/matb33:collection-hooks' {
    import { Meteor } from "meteor/meteor"
    type Options = {
        fetchPrevious?: boolean
        [key: string]: any
    }
    type TGlobalOptions = {
        all?: Options
        insert?: Options
        update?: Options
        upsert?: Options
        find?: Options
        findOne?: Options
        remove?: Options
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
        type GenericFunction = (...args: any) => any
        type THookThis<T, UnderlyingMethod extends GenericFunction> = {
            originalMethod: UnderlyingMethod,
            context: ThisType<UnderlyingMethod>,
            args: Parameters<UnderlyingMethod>
            transform: (doc: T) => T
        }
        type THookThisWithId<T, UnderlyingMethod extends GenericFunction> = THookThis<T, UnderlyingMethod> & {
            _id: string
        }
        type THookThisWithTransform<T, UnderlyingMethod extends GenericFunction> = THookThis<T, UnderlyingMethod> & {
            transform: (doc: T) => T
        }
        type THookThisWithTransformAndPrevious<T, UnderlyingMethod extends GenericFunction> = THookThisWithTransform<T, UnderlyingMethod> & {
            previous: T
        }
        type THookBeforeInsert<T,O = void> = (this: THookThis<T, Collection<T>["insert"]>, userId: string|undefined, doc: T) => O;
        type THookAfterInsert<T,O = void> = (this: THookThisWithId<T, Collection<T>["insert"]>, userId: string|undefined, doc: T) => O;
        type THookBeforeUpdate<T,O = void> = (this: THookThis<T, Collection<T>["update"]> & { previous: T, transform: (doc: T) => T }, userId: string|undefined, doc: T, fieldNames: string[], modifier: any, options: any) => O
        type THookAfterUpdate<T,O = void> = (this: THookThisWithTransformAndPrevious<T, Collection<T>["update"]> & { previous: T, transform: (doc: T) => T }, userId: string|undefined, doc: T, fieldNames: string[], modifier: any, options: any) => O
        type THookRemove<T,O = void> = (this: THookThisWithTransform<T, Collection<T>["remove"]>, userId: string|undefined, doc: T) => O
        type THookUpsert<T,O = void> = (this: THookThis<T, Collection<T>["upsert"]>, userId: string|undefined, selector: any, modifier: any, options: any) => O
        // Note: before.find hooks cannot be async (will throw error in Meteor 3)
        type THookBeforeFind<T,O = void> = (this: THookThis<T, Collection<T>["find"]>, userId: string|undefined, selector: any, options: any) => O
        type THookAfterFind<T> = (this: THookThis<T, Collection<T>["find"]>, userId: string|undefined, selector: any, options: any, cursor: Cursor<T>) => void
        type THookBeforeFindOne<T,O = void> = (this: THookThis<T, Collection<T>["findOne"]>, userId: string|undefined, selector: any, options: any) => O
        type THookAfterFindOne<T> = (this: THookThis<T, Collection<T>["findOne"]>, userId: string|undefined, selector: any, options: any, doc: T) => void
        type THandler<F> = {remove(): void, replace(callback: F, options: any): void}

        interface Collection<T, U = T> {
            hookOptions: CollectionHooks["GlobalOptions"]
            // Note: Added missing upsert and upsertAsync direct methods
            direct: Pick<Collection<T, U>, "insert"|"insertAsync"|"update"|"updateAsync"|"upsert"|"upsertAsync"|"find"|"findOne"|"findOneAsync"|"remove"|"removeAsync">
            before: {
                insert<Fn = THookBeforeInsert<T,void|false>>(fn: Fn): THandler<Fn>
                update<Fn = THookBeforeUpdate<T,void|false>>(fn: Fn): THandler<Fn>
                remove<Fn = THookRemove<T,void|false>>(fn: Fn): THandler<Fn>
                upsert<Fn = THookUpsert<T,void|false>>(fn: Fn): THandler<Fn>
                // LIMITATION: Cannot be async function (will throw error in Meteor 3)
                // Only triggers on cursor async methods (fetchAsync, countAsync, etc.)
                find<Fn = THookBeforeFind<T,void|false>>(fn: Fn): THandler<Fn>
                // Only triggers on findOneAsync(), not sync findOne()
                findOne<Fn = THookBeforeFindOne<T,void|false>>(fn: Fn): THandler<Fn>
            }
            after: {
                insert<Fn = THookAfterInsert<T>>(fn: Fn): THandler<Fn>
                update<Fn = THookAfterUpdate<T>>(fn: Fn, options?: { fetchPrevious?: boolean }): THandler<Fn>
                remove<Fn = THookRemove<T>>(fn: Fn): THandler<Fn>
                // Note: No after.upsert hook exists - upsert calls either after.insert or after.update
                // Only triggers on cursor async methods (fetchAsync, countAsync, etc.)  
                find<Fn = THookAfterFind<T>>(fn: Fn): THandler<Fn>
                // Only triggers on findOneAsync(), not sync findOne()
                findOne<Fn = THookAfterFindOne<T>>(fn: Fn): THandler<Fn>
            }
        }
    }
}
