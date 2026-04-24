const normalizeMemberId = (member) => {
  if (!member) return "";
  if (typeof member === "string") return member;
  if (member.user) {
    if (typeof member.user === "object" && member.user._id) return String(member.user._id);
    return String(member.user);
  }
  if (member._id) return String(member._id);
  return String(member);
};

const getGroupMemberIds = (group) => {
  const members = Array.isArray(group?.members) ? group.members : [];
  return members.map(normalizeMemberId).filter(Boolean);
};

const isGroupMember = (group, userId) => {
  if (!userId) return false;
  const target = String(userId);
  return getGroupMemberIds(group).some((id) => id === target);
};

const normalizeGroupMembers = (group) => {
  if (!group || !Array.isArray(group.members)) return group;
  const adminId = group.admin ? String(group.admin?._id || group.admin) : "";

  const normalized = group.members
    .map((member) => {
      const id = normalizeMemberId(member);
      if (!id) return null;
      const role = String(id) === adminId ? "admin" : member?.role || "member";
      return { user: id, role };
    })
    .filter(Boolean);

  group.members = normalized;
  return group;
};

module.exports = {
  normalizeMemberId,
  getGroupMemberIds,
  isGroupMember,
  normalizeGroupMembers,
};
