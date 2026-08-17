import postgres from 'postgres'

const globalForDb = globalThis as unknown as {
  sql: postgres.Sql | undefined
}

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || ''

// Optimize connection settings for low latency (< 200ms target)
const isTransactionPooler = dbUrl.includes('6543') || dbUrl.includes('pooler')

const sql = globalForDb.sql ?? postgres(dbUrl, {
  ssl: 'require',
  max: 15,
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 10,
  prepare: !isTransactionPooler,
  types: {
    numeric: {
      to: 1700,
      from: [1700],
      parse: (x: string) => (x === null ? 0 : parseFloat(x)),
      serialize: (x: any) => String(x),
    },
  },
})

globalForDb.sql = sql

export default sql
