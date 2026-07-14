
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "js", "rooms.js");

const code = `// UNITESTAYCATION/js/rooms.js
// M?i phòng có th? có s? lu?ng ?nh khác nhau. ?nh d?t trong img/MÃ-PHÒNG/0.jpg, 1.jpg...

const makeImages = (folder, total) => {
  return Array.from({ length: total }, (_, index) => \\`img/\\${folder}/\\${index}.jpg\\`);
};

var rooms = [
  {
    id: "C1-ELAN", chapter: "Chapter 1", type: "Studio", name: "ÉLAN Layout",
    location: "Chi nhánh Nhiêu T?", district: "Phú Nhu?n", address: "Chi nhánh Nhiêu T?, Phú Nhu?n",
    priceTier: "premium", inventory: 3, status: "available",
    category: "Best home", vibe: "Chill boutique · ban công · b?p ti?n nghi", shortLine: "A private studio with quiet city light.",
    description: "Studio mang c?m giác riêng tu, hi?n d?i. Phù h?p cho staycation couple, ngh? ng?n ngày.",
    prices: [ { label: "3 ti?ng", value: "299k" }, { label: "4 ti?ng", value: "379k" }, { label: "Qua dêm", value: "579k" }, { label: "Ngày", value: "799k" } ],
    tags: ["Studio", "Best home", "Ban công", "Couple"],
    amenities: ["wifi", "aircon", "balcony", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Nhiêu T?", "Phú Nhu?n", "balcony"],
    images: makeImages("C1-ELAN", 7)
  },
  {
    id: "C1-NOIR", chapter: "Chapter 1", type: "Studio", name: "NOIR Layout",
    location: "Chi nhánh Nhiêu T?", district: "Phú Nhu?n", address: "Chi nhánh Nhiêu T?, Phú Nhu?n",
    priceTier: "premium", inventory: 3, status: "available",
    category: "Best home", vibe: "Dark modern · ban công · cá tính", shortLine: "Dark, intimate and quietly luxurious.",
    description: "Không gian tone t?i sang, n?i th?t hi?n d?i và riêng tu. Phù h?p cho khách thích vibe noir, tr?m, g?n và có gu.",
    prices: [ { label: "3 ti?ng", value: "299k" }, { label: "4 ti?ng", value: "379k" }, { label: "Qua dêm", value: "579k" }, { label: "Ngày", value: "799k" } ],
    tags: ["Studio", "Best home", "Ban công", "Tone t?i"],
    amenities: ["wifi", "aircon", "balcony", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Nhiêu T?", "Phú Nhu?n", "balcony"],
    images: makeImages("C1-NOIR", 3)
  },
  {
    id: "C8-THE-ART", chapter: "Chapter 8", type: "Studio", name: "ART Layout",
    location: "Chi nhánh Phan Tây H?", district: "Phú Nhu?n", address: "Chi nhánh Phan Tây H?, Phú Nhu?n",
    priceTier: "signature", inventory: 3, status: "available",
    category: "Signature bathtub", vibe: "Signature studio · c?a vòm · b?n t?m", shortLine: "A signature room with artful curves and bath light.",
    description: "M?t layout có tính th?m m? cao, n?i b?t v?i b?n t?m r?i, c?a vòm và ánh sáng d?p.",
    prices: [ { label: "3 ti?ng", value: "299k" }, { label: "4 ti?ng", value: "379k" }, { label: "Qua dêm", value: "579k" }, { label: "Ngày", value: "759k" } ],
    tags: ["Studio", "B?n t?m", "Ban công"],
    amenities: ["wifi", "aircon", "balcony", "bathtub", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Phan Tây H?", "Phú Nhu?n", "bathtub", "balcony"],
    images: makeImages("C8-THE-ART", 5)
  },
  {
    id: "C9-VELVET", chapter: "Chapter 9", type: "Studio", name: "VELVET Layout",
    location: "Chi nhánh Phan Tây H?", district: "Phú Nhu?n", address: "Chi nhánh Phan Tây H?, Phú Nhu?n",
    priceTier: "premium", inventory: 3, status: "available",
    category: "Warm studio", vibe: "Warm luxury · cozy · private stay", shortLine: "Warm, soft, modern and deeply private.",
    description: "Không gian ?m, m?m và hi?n d?i, phù h?p cho khách mu?n m?t can phòng riêng tu, d? ch?u nhung v?n có c?m giác cao c?p.",
    prices: [ { label: "3 ti?ng", value: "299k" }, { label: "4 ti?ng", value: "379k" }, { label: "Qua dêm", value: "579k" }, { label: "Ngày", value: "759k" } ],
    tags: ["Studio", "?m sang"],
    amenities: ["wifi", "aircon", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Phan Tây H?", "Phú Nhu?n"],
    images: makeImages("C9-VELVET", 4)
  },
  {
    id: "C10-MIDNIGHT", chapter: "Chapter 10", type: "Studio", name: "MID Layout",
    location: "Chi nhánh Phan Tây H?", district: "Phú Nhu?n", address: "Chi nhánh Phan Tây H?, Phú Nhu?n",
    priceTier: "budget", inventory: 3, status: "available",
    category: "Giá t?t nh?t", vibe: "Compact · giá t?t · t?i gi?n", shortLine: "Compact, clean and easy to book.",
    description: "Studio nh? g?n, t?i gi?n và d? ti?p c?n hon v? giá. Phù h?p khách c?n m?t không gian riêng tu, s?ch d?p, ti?n l?i.",
    prices: [ { label: "3 ti?ng", value: "259k" }, { label: "4 ti?ng", value: "359k" }, { label: "Qua dêm", value: "500k" }, { label: "Ngày", value: "659k" } ],
    tags: ["Studio", "Giá t?t nh?t"],
    amenities: ["wifi", "aircon", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Phan Tây H?", "Phú Nhu?n", "budget"],
    images: makeImages("C10-MIDNIGHT", 4)
  },
  {
    id: "C12-AMOR", chapter: "Chapter 12", type: "Studio", name: "AMOR Layout",
    location: "Chi nhánh Lê Van S?", district: "Phú Nhu?n", address: "Chi nhánh Lê Van S?, Phú Nhu?n",
    priceTier: "signature", inventory: 3, status: "available",
    category: "Romantic", vibe: "Romantic · ánh sáng m?m", shortLine: "A romantic studio for warm, private celebrations.",
    description: "Không gian lãng m?n, m?m và riêng tu, phù h?p cho sinh nh?t, k? ni?m ho?c m?t bu?i staycation có c?m giác du?c chu?n b? ch?n chu.",
    prices: [ { label: "3 ti?ng", value: "299k" }, { label: "4 ti?ng", value: "379k" }, { label: "Qua dêm", value: "579k" }, { label: "Ngày", value: "799k" } ],
    tags: ["Studio", "Romantic", "Couple"],
    amenities: ["wifi", "aircon", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Lê Van S?", "Phú Nhu?n"],
    images: makeImages("C12-AMOR", 5)
  },
  {
    id: "C12-ROMA", chapter: "Chapter 12", type: "Studio", name: "ROMA Layout",
    location: "Chi nhánh Lê Van S?", district: "Phú Nhu?n", address: "Chi nhánh Lê Van S?, Phú Nhu?n",
    priceTier: "premium", inventory: 3, status: "available",
    category: "Warm studio", vibe: "Warm classic · ban công · d? ch?u", shortLine: "Classic, warm and easy to settle into.",
    description: "Layout có c?m giác ?m, g?n và tinh t?, có ban công c?c k? thoáng dãng, d? ?, d? ngh? và có chút boutique nh? nhàng.",
    prices: [ { label: "3 ti?ng", value: "299k" }, { label: "4 ti?ng", value: "379k" }, { label: "Qua dêm", value: "579k" }, { label: "Ngày", value: "799k" } ],
    tags: ["Studio", "Ban công", "Classic"],
    amenities: ["wifi", "aircon", "balcony", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Lê Van S?", "Phú Nhu?n", "balcony"],
    images: makeImages("C12-ROMA", 4)
  }
];

const houseRules = [
  { icon: "?", text: "Quý khách vui lòng check-in/check-out theo dúng th?i gian dã d?t. Ph? thu tr? gi?: 99.000d/gi?." },
  { icon: "???", text: "Không b? rác và các v?t d?ng khác ra ngoài ban công / c?a s?." },
  { icon: "??", text: "Không mang theo thú cung." },
  { icon: "??", text: "Không s? d?ng ch?t c?m." },
  { icon: "??", text: "Không ? quá 2 ngu?i khi chua có s? d?ng ý c?a home." },
  { icon: "??", text: "Không th? gi?y hay b?t k? v?t th? nào vào b?n c?u." },
  { icon: "??", text: "Ð? chìa khóa, th? phòng l?i v? trí cu, t?t máy l?nh và các thi?t b? di?n tru?c khi ra kh?i phòng." },
  { icon: "??", text: "Ch? d?ng b?o qu?n tài s?n cá nhân trong th?i gian luu trú." },
  { icon: "??", text: "B?o qu?n tài s?n c?a home. N?u làm h?ng/m?t, s? tính theo b?ng giá d?ch v? dính kèm." }
];

window.rooms = rooms;
`;

fs.writeFileSync(target, code, "utf8");
console.log("Updated rooms.js successfully!");

