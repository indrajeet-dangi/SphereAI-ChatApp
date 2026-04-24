const mongoose = require("mongoose");
const Groq = require("groq-sdk");
const Group = require("../models/Group");
const Message = require("../models/Message");
const GroupSummary = require("../models/GroupSummary");
const User = require("../models/User");
const { normalizeLanguage, toLanguageLabel } = require("../utils/language");
const { getSocketServer, getUserSocket } = require("../utils/socketState");
const { getGroupMemberIds, isGroupMember, normalizeGroupMembers } = require("../utils/groupMembers");

const serializeGroup = (groupDoc) => {
  if (!groupDoc) return null;
  const group = typeof groupDoc.toObject === "function" ? groupDoc.toObject() : groupDoc;
  const adminId = String(group.admin?._id || group.admin || "");

  const members = (group.members || [])
    .map((member) => {
      const role = member?.role || (String(member?.user?._id || member?.user) === adminId ? "admin" : "member");
      const user = member?.user;
      if (user && typeof user === "object") {
        const plainUser = typeof user.toObject === "function" ? user.toObject() : user;
        return { ...plainUser, role };
      }
      const userId = String(member?.user || member?._id || member || "");
      if (!userId) return null;
      return { _id: userId, role };
    })
    .filter(Boolean);

  return { ...group, members };
};

exports.createGroup = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { name, members = [], groupPic = "", description = "" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const memberIds = Array.isArray(members) ? members : [];
    const uniqueMemberIds = Array.from(new Set([adminId, ...memberIds].map(String)));

    if (uniqueMemberIds.length < 2) {
      return res.status(400).json({ message: "At least 2 members are required to create a group" });
    }

    const invalidMember = uniqueMemberIds.some((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidMember) {
      return res.status(400).json({ message: "Invalid member id in request" });
    }

    const group = await Group.create({
      name: name.trim(),
      description: String(description || "").trim(),
      members: uniqueMemberIds.map((id) => ({
        user: id,
        role: String(id) === String(adminId) ? "admin" : "member",
      })),
      admin: adminId,
      groupPic: String(groupPic || "").trim(),
    });

    const populated = await Group.findById(group._id)
      .populate("members.user", "name email profilePic")
      .populate("admin", "name email profilePic");

    return res.status(201).json({
      message: "Group created successfully",
      group: serializeGroup(populated),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create group",
      error: error.message,
    });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const userId = req.user.userId;
    const objectUserId = new mongoose.Types.ObjectId(String(userId));
    console.log("REQ USER:", req.user);

    // Use raw collection query to support both schemas safely:
    // 1) members: [{ user, role }]
    // 2) legacy members: [ObjectId]
    const idRows = await Group.collection
      .find({
        $or: [{ "members.user": objectUserId }, { members: objectUserId }],
      })
      .project({ _id: 1 })
      .toArray();

    const groupIds = idRows.map((row) => row._id);
    let groups = await Group.find({ _id: { $in: groupIds } })
      .populate("members.user", "name email profilePic")
      .populate("admin", "name email profilePic")
      .sort({ updatedAt: -1 });

    // One-time normalization for older groups that stored members as ObjectIds.
    const needsNormalization = groups.some(
      (group) =>
        Array.isArray(group?.members) &&
        group.members.length > 0 &&
        !group.members[0]?.user
    );

    if (needsNormalization) {
      await Promise.all(
        groups.map(async (group) => {
          if (!Array.isArray(group?.members) || group.members.length === 0) return;
          if (group.members[0]?.user) return;
          normalizeGroupMembers(group);
          await group.save({ validateBeforeSave: false });
        })
      );

      groups = await Group.find({ _id: { $in: groupIds } })
        .populate("members.user", "name email profilePic")
        .populate("admin", "name email profilePic")
        .sort({ updatedAt: -1 });
    }

    const serialized = groups.map((group) => serializeGroup(group)).filter(Boolean);
    console.log("GROUPS:", serialized.length);
    return res.status(200).json({ groups: serialized });
  } catch (error) {
    console.error("GROUP FETCH ERROR:", error);
    return res.status(500).json({
      message: "Failed to fetch groups",
      error: error.message,
    });
  }
};

exports.addGroupMembers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId } = req.params;
    const { members = [] } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Members array is required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    normalizeGroupMembers(group);
    if (String(group.admin) !== String(currentUserId)) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    const validMembers = members
      .map(String)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validMembers.length === 0) {
      return res.status(400).json({ message: "No valid member ids provided" });
    }

    const existingIds = new Set(getGroupMemberIds(group));
    const merged = [...group.members];
    validMembers.forEach((id) => {
      if (!existingIds.has(String(id))) {
        merged.push({ user: id, role: "member" });
      }
    });
    group.members = merged;
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.user", "name email profilePic bio")
      .populate("admin", "name email profilePic");

    return res.status(200).json({
      message: "Members added successfully",
      group: serializeGroup(updatedGroup),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add members",
      error: error.message,
    });
  }
};

exports.removeGroupMember = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId, memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid group or member id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    normalizeGroupMembers(group);
    if (String(group.admin) !== String(currentUserId)) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }

    if (String(group.admin) === String(memberId)) {
      return res.status(400).json({ message: "Admin cannot be removed from group" });
    }

    group.members = group.members.filter((m) => String(m.user || m._id || m) !== String(memberId));

    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      await Message.deleteMany({ groupId });
      return res.status(200).json({ message: "Member removed and group deleted (no members left)" });
    }

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.user", "name email profilePic bio")
      .populate("admin", "name email profilePic");

    return res.status(200).json({
      message: "Member removed successfully",
      group: serializeGroup(updatedGroup),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to remove member",
      error: error.message,
    });
  }
};

exports.exitGroup = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    normalizeGroupMembers(group);
    if (!isGroupMember(group, currentUserId)) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    if (String(group.admin) === String(currentUserId)) {
      if (group.members.length === 1) {
        await Group.findByIdAndDelete(groupId);
        await Message.deleteMany({ groupId });
        await GroupSummary.deleteMany({ groupId });
        return res.status(200).json({ message: "Group deleted because admin exited as last member" });
      }

      const nextAdmin = group.members.find((m) => String(m.user || m._id || m) !== String(currentUserId));
      group.admin = nextAdmin?.user || nextAdmin?._id || nextAdmin;
    }

    group.members = group.members.filter((m) => String(m.user || m._id || m) !== String(currentUserId));

    group.members = group.members.map((m) => ({
      user: m.user,
      role: String(m.user) === String(group.admin) ? "admin" : "member",
    }));
    await group.save();

    return res.status(200).json({ message: "Exited group successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to exit group",
      error: error.message,
    });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    normalizeGroupMembers(group);
    if (String(group.admin) !== String(currentUserId)) {
      return res.status(403).json({ message: "Only admin can delete group" });
    }

    const memberIds = getGroupMemberIds(group);

    await Group.findByIdAndDelete(groupId);
    await Message.deleteMany({ groupId });
    await GroupSummary.deleteMany({ groupId });

    const io = getSocketServer();
    if (io) {
      memberIds.forEach((memberId) => {
        const socketId = getUserSocket(memberId);
        if (socketId) {
          io.to(socketId).emit("groupDeleted", { groupId: String(groupId) });
        }
      });
    }

    return res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete group",
      error: error.message,
    });
  }
};

exports.makeAdmin = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid group or user id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    normalizeGroupMembers(group);

    if (String(group.admin) !== String(currentUserId)) {
      return res.status(403).json({ message: "Only admin can assign admin role" });
    }

    if (!isGroupMember(group, userId)) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    group.admin = userId;
    group.members = group.members.map((m) => ({
      user: m.user,
      role: String(m.user) === String(userId) ? "admin" : "member",
    }));
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.user", "name email profilePic bio")
      .populate("admin", "name email profilePic");

    return res.status(200).json({
      message: "Admin updated successfully",
      group: serializeGroup(updatedGroup),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update admin",
      error: error.message,
    });
  }
};

exports.updateDescription = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId } = req.params;
    const { description = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    normalizeGroupMembers(group);

    if (String(group.admin) !== String(currentUserId)) {
      return res.status(403).json({ message: "Only admin can edit description" });
    }

    group.description = String(description || "").trim();
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.user", "name email profilePic bio")
      .populate("admin", "name email profilePic");

    return res.status(200).json({
      message: "Description updated successfully",
      group: serializeGroup(updatedGroup),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update description",
      error: error.message,
    });
  }
};

exports.getUnreadSummary = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(groupId).select("members admin lastSeenMap");
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    normalizeGroupMembers(group);
    if (!isGroupMember(group, currentUserId)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const lastSeenTime = group.lastSeenMap?.get(String(currentUserId)) || new Date(0);

    const unreadMessages = await Message.find({
      groupId,
      senderId: { $ne: currentUserId },
      createdAt: { $gt: lastSeenTime },
      text: { $ne: "" },
    })
      .select("text")
      .sort({ createdAt: 1 })
      .lean();

    const unreadCount = unreadMessages.length;
    let summary = null;

    if (unreadCount === 0) {
      group.lastSeenMap.set(String(currentUserId), new Date());
      await group.save();
      return res.status(200).json({ summary: null, unreadCount: 0 });
    }

    const combinedText = unreadMessages.map((m) => m.text).join("\n");
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const user = await User.findById(currentUserId).select("language").lean();
    const targetLanguage = toLanguageLabel(normalizeLanguage(user?.language));

    if (apiKey) {
      const groq = new Groq({ apiKey });
      const prompt = `
Summarize the following group chat messages into short bullet points.

RULES:

* Ignore greetings like hi, hello, ok
* Focus only on important information
* Keep it concise (3-5 bullet points)
* Use simple language
* Write in ${targetLanguage}
* Use ONLY pure ${targetLanguage}
* Do NOT mix languages

Messages:
${combinedText}
`;

      const aiResponse = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You summarize unread group chat messages." },
          { role: "user", content: prompt.trim() },
        ],
        temperature: 0.2,
      });

      const cleaned = String(aiResponse?.choices?.[0]?.message?.content || "")
        .replace(/^["'`]+|["'`]+$/g, "")
        .trim();
      summary = cleaned || null;
    }

    group.lastSeenMap.set(String(currentUserId), new Date());
    await group.save();

    return res.status(200).json({
      unreadCount,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to generate unread summary",
      error: error.message,
    });
  }
};
