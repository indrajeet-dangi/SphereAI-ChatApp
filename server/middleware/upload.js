const fs = require("fs");
const path = require("path");
const multer = require("multer");

const audioDir = path.join(__dirname, "..", "uploads", "audio");
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || ".webm") || ".webm";
    cb(null, `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const allowedAudioTypes = new Set([
  "audio/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
]);

const fileFilter = (req, file, cb) => {
  if (!allowedAudioTypes.has(file.mimetype)) {
    return cb(new Error("Only audio files are allowed"));
  }
  return cb(null, true);
};

const uploadAudio = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  uploadAudio,
};

