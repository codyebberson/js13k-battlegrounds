# Storage API Documentation

## `key: async (index) =>`

Get key by index number

 * **Parameters:** `index` — `number` — - Index
 * **Returns:** `Promise<string>` — - Key

## `get: async (key, defaultValue, json = true) =>`

Get value

 * **Parameters:**
   * `key` — `string` — 
   * `defaultValue` — `*` — 
   * `[json=true]` — `boolean` — - Convert value to JSON
 * **Returns:** `Promise<*>` — - Value

## `set: async (key, value, json = true) =>`

Set value

 * **Parameters:**
   * `key` — `string` — 
   * `value` — `*` — 
   * `[json=true]` — `boolean` — - Convert value to JSON
 * **Returns:** `Promise<boolean>` — - Returns false on failure

## `remove: async (key) =>`

Remove value

 * **Parameters:** `key` — `string` — 
 * **Returns:** `Promise<void>` — 

## `clear: async () =>`

Clear all keys and values

 * **Returns:** `Promise<void>` — 

## `length: async () =>`

Get the number of keys

 * **Returns:** `Promise<number>` — 

## `size: () =>`

Get the storage size

 * **Returns:** `number` — 