
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "js", "app.js");
let code = fs.readFileSync(target, "utf8");

const oldStr = `<textarea name="note" placeholder="Ghi chú thêm (gi? mu?n nh?n phòng, yêu c?u d?c bi?t...)" rows="3" style="padding: 12px; border: 1px solid var(--border, #ddd); border-radius: 8px; font-family: inherit; font-size: 15px; resize: vertical;"></textarea>`;

const newStr = `<label style="font-size:14px; font-weight:500; margin-bottom: 2px; display:block; color: var(--text-dark, #333);">Ch?n ngày và gi? nh?n phòng:</label>
        <input type="datetime-local" name="note" required style="padding: 12px; border: 1px solid var(--border, #ddd); border-radius: 8px; font-family: inherit; font-size: 15px; width: 100%; box-sizing: border-box; margin-bottom: 5px;">`;

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  fs.writeFileSync(target, code, "utf8");
  console.log("Replaced note with datetime-local in app.js successfully!");
} else {
  console.log("Could not find the exact old string.");
}

