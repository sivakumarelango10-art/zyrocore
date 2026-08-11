import postgres from 'postgres'

const globalForDb = globalThis as unknown as {
  sql: postgres.Sql | undefined
}

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || ''

const sql = globalForDb.sql ?? postgres(dbUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  prepare: false,
  types: {
    numeric: {
      to: 1700,
      from: [1700],
      parse: (x: string) => (x === null ? 0 : parseFloat(x)),
      serialize: (x: any) => String(x),
    },
  },
})

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sql = sql
}

export default sql
