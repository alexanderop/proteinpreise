import * as v from 'valibot'

// Shops send prices and quantities as either "29.90" or 29.9.
export const NumericText = v.pipe(v.union([v.string(), v.number()]), v.transform(String))
export const Numeric = v.pipe(v.union([v.string(), v.number()]), v.transform(Number))

export function parseWith<S extends v.GenericSchema>(schema: S, input: unknown, what: string): v.InferOutput<S> {
  const result = v.safeParse(schema, input)
  if (!result.success) throw new Error(`${what}: ${v.summarize(result.issues).replaceAll('\n', ' ')}`)
  return result.output
}
