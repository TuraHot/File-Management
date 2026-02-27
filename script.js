const API = "http://localhost:5000";

/* ===== Login ===== */
async function handleLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorDiv = document.getElementById("errorMsg");

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (res.ok) {
    const data = await res.json();
    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("currentUser", JSON.stringify(data.user));
    window.location.href = "index.html";
  } else {
    errorDiv.style.display = "block";
  }
}

/* ===== Register ===== */
async function handleRegister() {
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const confirmPassword = document.getElementById("regConfirmPassword").value.trim();
  const errorDiv = document.getElementById("regErrorMsg");
  const successDiv = document.getElementById("regSuccessMsg");

  errorDiv.style.display = "none";
  successDiv.style.display = "none";

  if (!username || !password || !confirmPassword) {
    errorDiv.innerText = "กรุณากรอกข้อมูลให้ครบถ้วน";
    errorDiv.style.display = "block";
    return;
  }

  if (password !== confirmPassword) {
    errorDiv.innerText = "รหัสผ่านไม่ตรงกัน";
    errorDiv.style.display = "block";
    return;
  }

  if (password.length < 4) {
    errorDiv.innerText = "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร";
    errorDiv.style.display = "block";
    return;
  }

  const res = await fetch(`${API}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (res.ok) {
    successDiv.style.display = "block";
    errorDiv.style.display = "none";
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  } else {
    errorDiv.innerText = data.error || "สมัครสมาชิกล้มเหลว";
    errorDiv.style.display = "block";
  }
}

/* ===== File Operations ===== */
function previewFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  const previewDiv = document.getElementById("filePreview");
  const previewImage = document.getElementById("previewImage");
  
  if (!file) {
    previewDiv.style.display = "none";
    return;
  }
  
  const fileSize = (file.size / 1024).toFixed(2); // Convert to KB
  document.getElementById("previewName").textContent = file.name;
  document.getElementById("previewSize").textContent = fileSize + " KB";
  document.getElementById("previewType").textContent = file.type || "ไม่ทราบชนิด";
  
  previewImage.innerHTML = "";
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 5px;" />`;
    };
    reader.readAsDataURL(file);
  } else if (file.type === "application/pdf") {
    const fileURL = URL.createObjectURL(file);
    previewImage.innerHTML = `<embed src="${fileURL}" type="application/pdf" style="width: 100%; height: 300px; border-radius: 5px;" />`;
  }
  
  previewDiv.style.display = "block";
}

async function loadFiles() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  const res = await fetch(`${API}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userid: currentUser.id, role: currentUser.role })
  });
  
  const files = await res.json();
  const list = document.getElementById("fileList");
  list.innerHTML = "";

  // ถ้าเป็น admin ให้แยกตามผู้ใช้
  if (currentUser.role === "admin") {
    // ดึงรายชื่อผู้ใช้
    const usersRes = await fetch(`${API}/users`);
    const users = await usersRes.json();
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u.username;
    });

    // จัดกลุ่มไฟล์ตามผู้ใช้
    const groupedByUser = {};
    files.forEach(f => {
      if (!groupedByUser[f.author]) {
        groupedByUser[f.author] = [];
      }
      groupedByUser[f.author].push(f);
    });

    // แสดงไฟล์แยกตามผู้ใช้
    Object.keys(groupedByUser).forEach(userId => {
      const userName = userMap[userId] || `User ${userId}`;
      
      // เพิ่ม header สำหรับชื่อผู้ใช้
      const categoryLi = document.createElement("li");
      categoryLi.style.fontWeight = "bold";
      categoryLi.style.color = "#667eea";
      categoryLi.style.marginTop = "15px";
      categoryLi.style.paddingTop = "10px";
      categoryLi.style.borderTop = "2px solid #eee";
      categoryLi.innerHTML = `👤 ${userName}`;
      list.appendChild(categoryLi);

      // แสดงไฟล์ของผู้ใช้คนนั้น
      groupedByUser[userId].forEach(f => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${f.filename}</span>
          <div style="position: relative;">
            <button class="menu-button" onclick="toggleMenu(event, '${f.filename}')">⋮</button>
            <div class="dropdown-menu" id="menu-${userId}-${f.filename}">
              <button onclick="downloadFile('${f.filename}')">📥 Download</button>
              <button onclick="renameFile('${f.filename}')">✏️ Rename</button>
              <button onclick="deleteFile('${f.filename}')">🗑 Delete</button>
            </div>
          </div>
        `;
        list.appendChild(li);
      });
    });
  } else {
    // ผู้ใช้ทั่วไป - แสดงเฉพาะไฟล์ของตนเอง
    files.forEach(f => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${f.filename}</span>
        <div style="position: relative;">
          <button class="menu-button" onclick="toggleMenu(event, '${f.filename}')">⋮</button>
          <div class="dropdown-menu" id="menu-user-${f.filename}">
            <button onclick="downloadFile('${f.filename}')">📥 Download</button>
            <button onclick="renameFile('${f.filename}')">✏️ Rename</button>
            <button onclick="deleteFile('${f.filename}')">🗑 Delete</button>
          </div>
        </div>
      `;
      list.appendChild(li);
    });
  }
}

async function downloadFile(filename) {
  const fileURL = `${API}/download/${encodeURIComponent(filename)}`;
  const a = document.createElement("a");
  a.href = fileURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  closeAllMenus();
}

function toggleMenu(event, filename) {
  event.stopPropagation();
  
  // หาเมนูปัจจุบัน
  const targetMenu = Array.from(document.querySelectorAll('.dropdown-menu')).find(menu => 
    menu.id.includes(filename)
  );
  
  if (targetMenu && targetMenu.classList.contains('show')) {
    // ถ้าเมนูเปิดอยู่ให้ปิด
    targetMenu.classList.remove('show');
  } else {
    // ถ้าเมนูปิดอยู่ให้ปิดเมนูอื่นแล้วเปิดเมนูนี้
    closeAllMenus();
    if (targetMenu) {
      targetMenu.classList.add('show');
    }
  }
}

function closeAllMenus() {
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.classList.remove('show');
  });
}

// ปิดเมนูเมื่อคลิกนอกเมนู
document.addEventListener('click', closeAllMenus);

async function renameFile(oldName) {
  // ตัดนามสกุลออก
  const extension = oldName.substring(oldName.lastIndexOf("."));
  const nameWithoutExt = oldName.substring(0, oldName.lastIndexOf("."));
  
  const newNameWithoutExt = prompt("เปลี่ยนชื่อไฟล์เป็น:", nameWithoutExt);
  if (!newNameWithoutExt || newNameWithoutExt === nameWithoutExt) return;

  // รวมชื่อใหม่กับนามสกุลเดิม
  const newName = newNameWithoutExt + extension;

  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  
  // ดึงรายการไฟล์ที่มีอยู่เพื่อตรวจสอบชื่อซ้ำ
  const filesRes = await fetch(`${API}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userid: currentUser.id, role: currentUser.role })
  });
  const existingFiles = await filesRes.json();
  
  // ตรวจสอบถ้างมีไฟล์ชื่อใหม่อยู่แล้ว (ที่ไม่ใช่ไฟล์เดิม)
  const isDuplicate = existingFiles.some(f => f.filename === newName && f.filename !== oldName);
  
  if (isDuplicate) {
    alert(`❌ ไม่สามารถเปลี่ยนชื่อได้!\nชื่อ "${newName}" มีอยู่แล้ว\nกรุณาใช้ชื่อใหม่`);
    return;
  }

  await fetch(`${API}/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldName, newName })
  });
  closeAllMenus();
  loadFiles();
}

async function deleteFile(filename) {
  if (!confirm(`คุณแน่ใจหรือไม่ว่าจะลบ ${filename}?`)) return;
  await fetch(`${API}/delete/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
  closeAllMenus();
  loadFiles();
}

async function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) {
    alert("กรุณาเลือกไฟล์ก่อนอัปโหลด");
    return;
  }

  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  
  // ดึงรายการไฟล์ที่มีอยู่เพื่อตรวจสอบชื่อซ้ำ
  const filesRes = await fetch(`${API}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userid: currentUser.id, role: currentUser.role })
  });
  const existingFiles = await filesRes.json();
  const existingNames = existingFiles.map(f => f.filename);

  let fileName = file.name;
  const fileExtension = fileName.substring(fileName.lastIndexOf("."));
  const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));

  // ตรวจสอบและเปลี่ยนชื่อถ้าซ้ำ
  let counter = 1;
  let originalFileName = fileName;
  while (existingNames.some(name => name.includes(fileName))) {
    fileName = `${fileNameWithoutExt} (${counter})${fileExtension}`;
    counter++;
  }

  if (fileName !== originalFileName) {
    alert(`⚠️ ชื่อไฟล์ซ้ำ!\nชื่อเดิม: ${originalFileName}\nชื่อใหม่: ${fileName}`);
  }

  const form = new FormData();
  
  // สร้าง File object ใหม่ด้วยชื่อที่เปลี่ยน (ถ้าจำเป็น)
  if (fileName !== originalFileName) {
    const newFile = new File([file], fileName, { type: file.type });
    form.append("file", newFile);
  } else {
    form.append("file", file);
  }
  
  form.append("userid", currentUser.id);

  const res = await fetch(`${API}/upload`, {
    method: "POST",
    body: form
  });
  const data = await res.json();
  if (data.success) {
    fileInput.value = "";
    document.getElementById("filePreview").style.display = "none";
    loadFiles();
  } else {
    alert("อัปโหลดล้มเหลว: " + (data.error || "ไม่ทราบสาเหตุ"));
  }
}

function searchFiles() {
  const query = document.getElementById("searchBar").value.toLowerCase();
  document.querySelectorAll("#fileList li").forEach(li => {
    li.style.display = li.innerText.toLowerCase().includes(query) ? "flex" : "none";
  });
}