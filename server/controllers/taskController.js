const mongoose = require("mongoose");
const Task = require("../models/Task");
const { getSocketServer, getUserSocket } = require("../utils/socketState");

const getAuthUserId = (req) => req.user?._id || req.user?.userId;

exports.getTasks = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const tasks = await Task.find({
      userId,
      completed: false,
    }).sort({ dueDate: 1, createdAt: -1 });

    return res.status(200).json({ tasks });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch tasks", error: error.message });
  }
};

exports.completeTask = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      { completed: true },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const io = getSocketServer();
    const socketId = getUserSocket(userId);
    if (io && socketId) {
      io.to(socketId).emit("taskCompleted", { taskId: String(task._id) });
    }

    return res.status(200).json({ message: "Task completed", task });
  } catch (error) {
    return res.status(500).json({ message: "Failed to complete task", error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findOneAndDelete({ _id: id, userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const io = getSocketServer();
    const socketId = getUserSocket(userId);
    if (io && socketId) {
      io.to(socketId).emit("taskDeleted", { taskId: String(task._id) });
    }

    return res.status(200).json({ message: "Task deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete task", error: error.message });
  }
};

