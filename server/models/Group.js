const mongoose = require("mongoose");

const groupMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    members: {
      type: [groupMemberSchema],
      default: [],
      // Accept legacy arrays of ObjectIds by mapping them to `{ user }`.
      set: (value) => {
        if (!Array.isArray(value)) return value;
        return value.map((entry) => {
          if (!entry) return entry;
          if (typeof entry === "string" || entry instanceof mongoose.Types.ObjectId) {
            return { user: entry, role: "member" };
          }
          if (entry.user) return entry;
          return entry;
        });
      },
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    groupPic: {
      type: String,
      default: "",
      trim: true,
    },
    lastSeenMap: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  { timestamps: true }
);

// Backward-compat: older groups stored `members` as an array of ObjectIds.
groupSchema.pre("init", function (doc) {
  if (!doc || !Array.isArray(doc.members) || doc.members.length === 0) return;
  const first = doc.members[0];
  const looksLikeObjectId =
    first &&
    typeof first === "object" &&
    !first.user &&
    (first._bsontype === "ObjectID" || first.constructor?.name === "ObjectId");

  if (looksLikeObjectId) {
    doc.members = doc.members.map((id) => ({ user: id, role: "member" }));
  }
});

module.exports = mongoose.model("Group", groupSchema);
