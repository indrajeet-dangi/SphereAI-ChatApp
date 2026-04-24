const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getTasks, completeTask, deleteTask } = require("../controllers/taskController");

const router = express.Router();

router.get("/", authMiddleware, getTasks);
router.patch("/:id/complete", authMiddleware, completeTask);
router.delete("/:id", authMiddleware, deleteTask);

module.exports = router;

