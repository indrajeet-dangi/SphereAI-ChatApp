require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Group = require("../models/Group");
const Message = require("../models/Message");
const GroupSummary = require("../models/GroupSummary");
const Task = require("../models/Task");
const AIChat = require("../models/AIChat");

const REQUIRED_ENV = ["MONGO_URI"];
const DEMO_PASSWORD = "123456";
const AI_USER_ID = "ai_user";
const AI_GREETING = "Welcome to Sphere AI. I'm here to help you with anything. Ask me anything!";

const now = Date.now();
const ago = ({ days = 0, hours = 0, minutes = 0 }) =>
  new Date(now - (((days * 24 + hours) * 60 + minutes) * 60 * 1000));

const withTimestamps = (doc, at) => ({
  ...doc,
  createdAt: at,
  updatedAt: at,
});

async function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }
}

async function clearCollections() {
  await Promise.all([
    Message.deleteMany({}),
    GroupSummary.deleteMany({}),
    Group.deleteMany({}),
    Task.deleteMany({}),
    AIChat.deleteMany({}),
    User.deleteMany({}),
  ]);
}

async function seedUsers() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [
    { name: "Aarav", email: "aarav@test.com", language: "hi" },
    { name: "Diya", email: "diya@test.com", language: "en" },
    { name: "Kabir", email: "kabir@test.com", language: "en" },
    { name: "Meera", email: "meera@test.com", language: "hi" },
    { name: "Rohan", email: "rohan@test.com", language: "en" },
    { name: "Ananya", email: "ananya@test.com", language: "hi" },
  ].map((user) => ({
    ...user,
    password: hash,
    authProvider: "local",
    bio: "",
    profilePic: "",
    darkMode: false,
    notifications: true,
  }));

  const inserted = await User.insertMany(users);
  const byName = inserted.reduce((acc, user) => {
    acc[user.name] = user;
    return acc;
  }, {});

  return byName;
}

async function seedGroups(usersByName) {
  const projectMembers = ["Aarav", "Diya", "Kabir", "Meera"].map((name) => ({
    user: usersByName[name]._id,
    role: name === "Aarav" ? "admin" : "member",
  }));

  const weekendMembers = ["Rohan", "Ananya", "Diya", "Kabir"].map((name) => ({
    user: usersByName[name]._id,
    role: name === "Rohan" ? "admin" : "member",
  }));

  const groups = await Group.insertMany([
    {
      name: "Project Team",
      description: "Core product build group",
      members: projectMembers,
      admin: usersByName.Aarav._id,
      groupPic: "",
      lastSeenMap: {},
    },
    {
      name: "Weekend Plans",
      description: "Trip and hangout planning",
      members: weekendMembers,
      admin: usersByName.Rohan._id,
      groupPic: "",
      lastSeenMap: {},
    },
  ]);

  return {
    projectTeam: groups[0],
    weekendPlans: groups[1],
  };
}

async function seedMessages(usersByName, groups) {
  const dmMessages = [
    // Aarav <-> Diya
    withTimestamps(
      {
        senderId: usersByName.Aarav._id,
        receiverId: usersByName.Diya._id,
        text: "Aaj meeting hai kya?",
        type: "text",
        status: "read",
      },
      ago({ days: 1, hours: 6, minutes: 20 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Diya._id,
        receiverId: usersByName.Aarav._id,
        text: "haan 5 baje hai",
        type: "text",
        status: "read",
      },
      ago({ days: 1, hours: 6, minutes: 12 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Aarav._id,
        receiverId: usersByName.Diya._id,
        text: "ok I'll join",
        type: "text",
        status: "read",
      },
      ago({ days: 1, hours: 6, minutes: 10 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Diya._id,
        receiverId: usersByName.Aarav._id,
        text: "late mat hona 😄",
        type: "text",
        status: "read",
      },
      ago({ days: 1, hours: 6, minutes: 5 })
    ),

    // Kabir <-> Meera
    withTimestamps(
      {
        senderId: usersByName.Kabir._id,
        receiverId: usersByName.Meera._id,
        text: "Did you finish the UI?",
        type: "text",
        status: "read",
      },
      ago({ hours: 20, minutes: 15 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Meera._id,
        receiverId: usersByName.Kabir._id,
        text: "Almost done",
        type: "text",
        status: "read",
      },
      ago({ hours: 20, minutes: 8 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Kabir._id,
        receiverId: usersByName.Meera._id,
        text: "send me once ready",
        type: "text",
        status: "read",
      },
      ago({ hours: 19, minutes: 58 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Meera._id,
        receiverId: usersByName.Kabir._id,
        text: "sure 👍",
        type: "text",
        status: "read",
      },
      ago({ hours: 19, minutes: 50 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Meera._id,
        receiverId: usersByName.Kabir._id,
        text: "",
        type: "audio",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        duration: 11,
        status: "delivered",
      },
      ago({ hours: 19, minutes: 45 })
    ),

    // Rohan <-> Ananya
    withTimestamps(
      {
        senderId: usersByName.Rohan._id,
        receiverId: usersByName.Ananya._id,
        text: "Kal free ho?",
        type: "text",
        status: "read",
      },
      ago({ hours: 9, minutes: 40 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Ananya._id,
        receiverId: usersByName.Rohan._id,
        text: "maybe, plan kya hai?",
        type: "text",
        status: "read",
      },
      ago({ hours: 9, minutes: 35 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Rohan._id,
        receiverId: usersByName.Ananya._id,
        text: "movie?",
        type: "text",
        status: "read",
      },
      ago({ hours: 9, minutes: 30 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Ananya._id,
        receiverId: usersByName.Rohan._id,
        text: "done 🎬",
        type: "text",
        status: "read",
      },
      ago({ hours: 9, minutes: 27 })
    ),
  ];

  const groupMessages = [
    // Project Team
    withTimestamps(
      {
        senderId: usersByName.Aarav._id,
        groupId: groups.projectTeam._id,
        text: "Aaj ka task complete karo sab",
        type: "text",
      },
      ago({ hours: 7, minutes: 30 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Kabir._id,
        groupId: groups.projectTeam._id,
        text: "backend ready hai",
        type: "text",
      },
      ago({ hours: 7, minutes: 20 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Meera._id,
        groupId: groups.projectTeam._id,
        text: "frontend thoda pending hai",
        type: "text",
      },
      ago({ hours: 7, minutes: 14 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Diya._id,
        groupId: groups.projectTeam._id,
        text: "deployment kab karna hai?",
        type: "text",
      },
      ago({ hours: 7, minutes: 8 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Aarav._id,
        groupId: groups.projectTeam._id,
        text: "kal try karte hai",
        type: "text",
      },
      ago({ hours: 7, minutes: 2 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Kabir._id,
        groupId: groups.projectTeam._id,
        text: "",
        type: "image",
        image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200",
      },
      ago({ hours: 6, minutes: 55 })
    ),

    // Weekend Plans
    withTimestamps(
      {
        senderId: usersByName.Rohan._id,
        groupId: groups.weekendPlans._id,
        text: "Guys weekend plan?",
        type: "text",
      },
      ago({ hours: 4, minutes: 20 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Diya._id,
        groupId: groups.weekendPlans._id,
        text: "goa chale?",
        type: "text",
      },
      ago({ hours: 4, minutes: 15 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Kabir._id,
        groupId: groups.weekendPlans._id,
        text: "budget?",
        type: "text",
      },
      ago({ hours: 4, minutes: 12 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Ananya._id,
        groupId: groups.weekendPlans._id,
        text: "bhai thoda kam rakho 😅",
        type: "text",
      },
      ago({ hours: 4, minutes: 8 })
    ),
    withTimestamps(
      {
        senderId: usersByName.Rohan._id,
        groupId: groups.weekendPlans._id,
        text: "ok nearby trip",
        type: "text",
      },
      ago({ hours: 4, minutes: 2 })
    ),
  ];

  await Message.insertMany([...dmMessages, ...groupMessages]);
}

async function seedAIChat(usersByName) {
  const targetUser = usersByName.Aarav;
  if (!targetUser) return;

  await AIChat.create({
    userId: targetUser._id,
    messages: [
      {
        sender: AI_USER_ID,
        text: AI_GREETING,
        createdAt: ago({ hours: 2, minutes: 10 }),
      },
      {
        sender: "user",
        text: "Can you summarize today's updates?",
        createdAt: ago({ hours: 2, minutes: 4 }),
      },
      {
        sender: AI_USER_ID,
        text: "Sure. Backend is ready, frontend is almost done, and deployment is planned for tomorrow.",
        createdAt: ago({ hours: 2, minutes: 3 }),
      },
    ],
  });
}

async function run() {
  await validateEnv();
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  try {
    console.log("Clearing old data...");
    await clearCollections();

    console.log("Seeding users...");
    const usersByName = await seedUsers();

    console.log("Seeding groups...");
    const groups = await seedGroups(usersByName);

    console.log("Seeding messages...");
    await seedMessages(usersByName, groups);

    console.log("Seeding AI chat...");
    await seedAIChat(usersByName);

    console.log("Demo dataset created successfully.");
    console.log("Users:", Object.keys(usersByName).length);
    console.log("Groups:", 2);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

run().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});

