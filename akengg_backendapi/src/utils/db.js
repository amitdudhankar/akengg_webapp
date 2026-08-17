const db = require('../config/db.config');

const query = async (sql, params = []) => {
  try {
    // Use pool.query instead of execute because this MySQL setup rejects
    // prepared statements that bind LIMIT/OFFSET placeholders
    // ("Incorrect arguments to mysqld_stmt_execute"), while mysql2's query
    // path safely escapes the same values and works across the list endpoints.
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (err) {
    console.error('DB Query Error:', err.message);
    throw err;
  }
};

/**
 * Run a unit of work inside a database transaction.
 *
 * Acquires a connection from the mysql2 pool, begins a transaction, and passes
 * the connection to `work(conn)`. Callers can use conn.execute(...) directly
 * (e.g. with "... FOR UPDATE" for row locking). Commits on success, rolls back
 * on any thrown error, and always releases the connection.
 *
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<any>} work
 * @returns {Promise<any>} Whatever `work` resolves to.
 */
const withTransaction = async (work) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error('DB Rollback Error:', rollbackErr.message);
    }
    console.error('DB Transaction Error:', err.message);
    throw err;
  } finally {
    conn.release();
  }
};

// Preserve the original default export: `require("../utils/db")` is callable as
// a function, i.e. `await query(sql, params)`. Additionally expose `query` and
// `withTransaction` as properties so new code can do
// `const db = require("../utils/db"); db.withTransaction(...)`.
query.query = query;
query.withTransaction = withTransaction;

module.exports = query;
