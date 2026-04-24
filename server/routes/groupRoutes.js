const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createGroup,
  getGroups,
  addGroupMembers,
  removeGroupMember,
  exitGroup,
  deleteGroup,
  makeAdmin,
  updateDescription,
} = require("../controllers/groupController");
const {
  generateGroupSummary,
  getGroupSummary,
  markGroupSeen,
} = require("../controllers/groupSummaryController");

const router = express.Router();

router.post("/create", authMiddleware, createGroup);
router.get("/", authMiddleware, getGroups);
router.put("/:groupId/add-members", authMiddleware, addGroupMembers);
router.put("/:groupId/remove-member/:memberId", authMiddleware, removeGroupMember);
router.put("/:groupId/make-admin", authMiddleware, makeAdmin);
router.put("/:groupId/description", authMiddleware, updateDescription);
router.post("/:groupId/exit", authMiddleware, exitGroup);
router.delete("/:groupId", authMiddleware, deleteGroup);
router.post("/:groupId/generate-summary", authMiddleware, generateGroupSummary);
router.get("/:groupId/summary", authMiddleware, getGroupSummary);
router.post("/:groupId/mark-seen", authMiddleware, markGroupSeen);

module.exports = router;
