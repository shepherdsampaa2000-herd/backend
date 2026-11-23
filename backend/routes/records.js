
const router = require("express").Router();
const pool = require("../db");

const allowedStatuses = ["Pending", "In progress", "Completed"];

function validateRecord(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  for (const field of ["title", "category", "description", "status"]) {
    if (typeof body[field] !== "string") {
      return `${field} must be a string.`;
    }
  }

  const title = body.title.trim();
  const category = body.category.trim();
  const description = body.description.trim();
  const status = body.status.trim();

  if (title.length < 3 || title.length > 80) return "Title must have 3 to 80 characters.";
  if (category.length < 2 || category.length > 40) return "Category must have 2 to 40 characters.";
  if (description.length < 5 || description.length > 300) return "Description must have 5 to 300 characters.";
  if (!allowedStatuses.includes(status)) return "Status must be Pending, In progress, or Completed.";

  return null;
}

function validId(value) {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function valuesFrom(body) {
  return [
    body.title.trim(),
    body.category.trim(),
    body.description.trim(),
    body.status.trim()
  ];
}

// GET all tickets
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, title, category, description, status FROM records ORDER BY id"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET one ticket
router.get("/:id", async (req, res, next) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ message: "id must be a positive whole number." });

  try {
    const result = await pool.query(
      "SELECT id, title, category, description, status FROM records WHERE id = $1",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Ticket not found." });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// CREATE ticket
router.post("/", async (req, res, next) => {
  const problem = validateRecord(req.body);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const result = await pool.query(
      "INSERT INTO records (title, category, description, status) VALUES ($1, $2, $3, $4) RETURNING id, title, category, description, status",
      valuesFrom(req.body)
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// UPDATE ticket
router.put("/:id", async (req, res, next) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ message: "id must be a positive whole number." });

  const problem = validateRecord(req.body);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const result = await pool.query(
      "UPDATE records SET title = $1, category = $2, description = $3, status = $4 WHERE id = $5 RETURNING id, title, category, description, status",
      [...valuesFrom(req.body), id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Ticket not found." });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE ticket
router.delete("/:id", async (req, res, next) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ message: "id must be a positive whole number." });

  try {
    const result = await pool.query(
      "DELETE FROM records WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Ticket not found." });
    res.status(200).json({ message: "Record deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
