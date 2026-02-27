const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 5000;
const UPLOAD_DIR = path.join(__dirname, "uploads");
const FILEPATH = path.join(UPLOAD_DIR, "uploads.json");
const USERS_FILE = path.join(__dirname, "users.json");

app.use(cors());
app.use(express.json());
app.use(express.static("./uploads"));

// ตรวจสอบโฟลเดอร์และไฟล์เริ่มต้น
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(FILEPATH)) fs.writeFileSync(FILEPATH, JSON.stringify([], null, 2));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));

// --- Auth Routes ---
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const user = users.find(u => u.username === username && u.password === password);
  if (user) res.json({ success: true, user });
  else res.status(401).json({ error: "Invalid credentials" });
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  if (users.find(u => u.username === username)) return res.status(400).json({ error: "User exists" });
  const maxId = users.reduce((acc, u) => Math.max(acc, u.id), 0) + 1;
  users.push({ id: maxId, username, password, role: "user" });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// --- File Management ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

// อัปโหลดไฟล์ (ตรวจสอบสิทธิ์ Admin)
app.post("/upload", upload.single("file"), (req, res) => {
  const userId = req.body.userid;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const user = users.find(u => u.id == userId);

  if (user && user.role === 'admin') return res.status(403).json({ error: "Admin cannot upload" });

  const uploads = JSON.parse(fs.readFileSync(FILEPATH, 'utf8'));
  uploads.push({ id: Date.now(), filename: req.file.filename, author: userId });
  fs.writeFileSync(FILEPATH, JSON.stringify(uploads, null, 2));
  res.json({ success: true });
});

// เปลี่ยนชื่อไฟล์
app.post("/rename", (req, res) => {
  const { oldName, newName } = req.body;
  fs.renameSync(path.join(UPLOAD_DIR, oldName), path.join(UPLOAD_DIR, newName));
  const uploads = JSON.parse(fs.readFileSync(FILEPATH, 'utf8'));
  const updated = uploads.map(f => f.filename === oldName ? {...f, filename: newName} : f);
  fs.writeFileSync(FILEPATH, JSON.stringify(updated, null, 2));
  res.json({ success: true });
});

// ดึงไฟล์
app.post("/files", (req, res) => {
  const { userid, role } = req.body;
  const all = JSON.parse(fs.readFileSync(FILEPATH, 'utf8'));
  res.json(role === "admin" ? all : all.filter(f => f.author == userid));
});

// ดึงรายชื่อผู้ใช้
app.get("/users", (req, res) => {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  res.json(users);
});

// ดาวน์โหลดไฟล์
app.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(UPLOAD_DIR, filename);
  
  // ตรวจสอบว่าไฟล์มีอยู่
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "File not found" });
  }
  
  res.download(filepath);
});

// ลบไฟล์
app.delete("/delete/:filename", (req, res) => {
  const filename = req.params.filename;
  fs.unlinkSync(path.join(UPLOAD_DIR, filename));
  const uploads = JSON.parse(fs.readFileSync(FILEPATH, 'utf8'));
  const updated = uploads.filter(f => f.filename !== filename);
  fs.writeFileSync(FILEPATH, JSON.stringify(updated, null, 2));
  res.json({ success: true });
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));