const db = require("../../config/db");

const createTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS search_history (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id    INT UNSIGNED NOT NULL,
      query      VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_query (user_id, query),
      INDEX idx_user_created (user_id, created_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
};
createTable().catch(console.error);

let listingColumnsCache = null;

const getListingColumns = async () => {
  if (listingColumnsCache) return listingColumnsCache;

  const [rows] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'listings'
  `);

  listingColumnsCache = new Set(rows.map((r) => r.COLUMN_NAME));
  return listingColumnsCache;
};

const has = (cols, name) => cols.has(name);

const getHistory = async (userId) => {
  const [rows] = await db.query(
    `SELECT id, query, created_at
     FROM search_history
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  );
  return rows;
};

const saveQuery = async (userId, query) => {
  const trimmed = query?.trim();
  if (!trimmed) return;

  await db.query(
    `INSERT INTO search_history (user_id, query, created_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE created_at = NOW()`,
    [userId, trimmed]
  );

  await db.query(
    `DELETE FROM search_history
     WHERE user_id = ? AND id NOT IN (
       SELECT id FROM (
         SELECT id FROM search_history
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 10
       ) t
     )`,
    [userId, userId]
  );
};

const deleteQuery = async (userId, id) => {
  await db.query(`DELETE FROM search_history WHERE id = ? AND user_id = ?`, [
    id,
    userId,
  ]);
};

const clearHistory = async (userId) => {
  await db.query(`DELETE FROM search_history WHERE user_id = ?`, [userId]);
};

const searchListings = async (params = {}) => {
  const cols = await getListingColumns();

  const q = params.q?.trim() || params.query?.trim() || "";
  const page = Math.max(parseInt(params.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(params.limit || 30, 10), 1), 100);
  const offset = (page - 1) * limit;

  const where = [];
  const values = [];

  if (q) {
    const searchable = ["title", "description", "location", "city", "category", "category_slug"]
      .filter((c) => has(cols, c));

    if (searchable.length) {
      where.push(`(${searchable.map((c) => `${c} LIKE ?`).join(" OR ")})`);
      searchable.forEach(() => values.push(`%${q}%`));
    }
  }

  if (params.category && has(cols, "category_slug")) {
    where.push(`category_slug = ?`);
    values.push(params.category);
  } else if (params.category && has(cols, "category")) {
    where.push(`category = ?`);
    values.push(params.category);
  }

  if (params.city && has(cols, "city")) {
    where.push(`city = ?`);
    values.push(params.city);
  } else if (params.city && has(cols, "location")) {
    where.push(`location LIKE ?`);
    values.push(`%${params.city}%`);
  }

  if (params.condition && has(cols, "condition")) {
    where.push(`condition = ?`);
    values.push(params.condition);
  }

  if (params.priceMin && has(cols, "price")) {
    where.push(`price >= ?`);
    values.push(Number(params.priceMin));
  }

  if (params.priceMax && has(cols, "price")) {
    where.push(`price <= ?`);
    values.push(Number(params.priceMax));
  }

  if (params.dateRange && has(cols, "created_at")) {
    const daysMap = { today: 1, week: 7, month: 30, year: 365 };
    const days = daysMap[params.dateRange];
    if (days) where.push(`created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`);
  }

  if (has(cols, "status")) {
    where.push(`status != 'sold'`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  let orderSql = has(cols, "created_at") ? `ORDER BY created_at DESC` : `ORDER BY id DESC`;

  if (params.sortBy === "price_asc" && has(cols, "price")) {
    orderSql = `ORDER BY price ASC`;
  } else if (params.sortBy === "price_desc" && has(cols, "price")) {
    orderSql = `ORDER BY price DESC`;
  } else if (params.sortBy === "most_viewed" && has(cols, "views")) {
    orderSql = `ORDER BY views DESC`;
  }

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM listings ${whereSql}`,
    values
  );

  const [rows] = await db.query(
    `SELECT * FROM listings ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const totalCount = countRows[0]?.total || 0;

  return {
    results: rows,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
};

const getSuggestions = async (userId, query) => {
  const trimmed = query?.trim();
  if (!trimmed) return [];

  const cols = await getListingColumns();
  const suggestions = [];

  const [historyRows] = await db.query(
    `SELECT query
     FROM search_history
     WHERE user_id = ? AND query LIKE ?
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId, `%${trimmed}%`]
  );

  historyRows.forEach((r) => suggestions.push({ query: r.query }));

  if (has(cols, "title")) {
    const [listingRows] = await db.query(
      `SELECT DISTINCT title AS query
       FROM listings
       WHERE title LIKE ?
       ORDER BY title ASC
       LIMIT 5`,
      [`%${trimmed}%`]
    );

    listingRows.forEach((r) => {
      if (!suggestions.some((s) => s.query.toLowerCase() === r.query.toLowerCase())) {
        suggestions.push({ query: r.query });
      }
    });
  }

  return suggestions.slice(0, 5);
};

module.exports = {
  getHistory,
  saveQuery,
  deleteQuery,
  clearHistory,
  searchListings,
  getSuggestions,
};
