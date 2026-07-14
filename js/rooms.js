// UNITESTAYCATION/js/rooms.js
// Mỗi phòng có thể có số lượng ảnh khác nhau. Ảnh đặt trong img/MÃ-PHÒNG/0.jpg, 1.jpg...

const makeImages = (folder, total) => {
  return Array.from({ length: total }, (_, index) => `img/${folder}/${index}.jpg`);
};

var rooms = [
  {
    id: "C1-ELAN", chapter: "Chapter 1", type: "Studio", name: "ÉLAN Layout",
    location: "Chi nhánh Nhiêu Tứ", district: "Phú Nhuận", address: "Chi nhánh Nhiêu Tứ, Phú Nhuận",
    priceTier: "premium", inventory: 3, status: "available",
    category: "Best home", vibe: "Chill boutique · ban công · bếp tiện nghi", shortLine: "A private studio with quiet city light.",
    description: "Studio mang cảm giác riêng tư, hiện đại. Phù hợp cho staycation couple, nghỉ ngắn ngày.",
    prices: [ { label: "3 tiếng", value: "299k" }, { label: "4 tiếng", value: "379k" }, { label: "Qua đêm", value: "579k" }, { label: "Ngày", value: "799k" } ],
    tags: ["Studio", "Best home", "Ban công", "Couple"],
    amenities: ["wifi", "aircon", "balcony", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Nhiêu Tứ", "Phú Nhuận", "balcony"],
    images: makeImages("C1-ELAN", 7)
  },
  {
    id: "C1-NOIR", chapter: "Chapter 1", type: "Studio", name: "NOIR Layout",
    location: "Chi nhánh Nhiêu Tứ", district: "Phú Nhuận", address: "Chi nhánh Nhiêu Tứ, Phú Nhuận",
    priceTier: "premium", inventory: 3, status: "available",
    category: "Best home", vibe: "Dark modern · ban công · cá tính", shortLine: "Dark, intimate and quietly luxurious.",
    description: "Không gian tone tối sang, nội thất hiện đại và riêng tư. Phù hợp cho khách thích vibe noir, trầm, gọn và có gu.",
    prices: [ { label: "3 tiếng", value: "299k" }, { label: "4 tiếng", value: "379k" }, { label: "Qua đêm", value: "579k" }, { label: "Ngày", value: "799k" } ],
    tags: ["Studio", "Best home", "Ban công", "Tone tối"],
    amenities: ["wifi", "aircon", "balcony", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Nhiêu Tứ", "Phú Nhuận", "balcony"],
    images: makeImages("C1-NOIR", 3)
  },
  {
    id: "C8-THE-ART", chapter: "Chapter 8", type: "Studio", name: "ART Layout",
    location: "Chi nhánh Phan Tây Hồ", district: "Phú Nhuận", address: "Chi nhánh Phan Tây Hồ, Phú Nhuận",
    priceTier: "signature", inventory: 3, status: "available",
    category: "Signature bathtub", vibe: "Signature studio · cửa vòm · bồn tắm", shortLine: "A signature room with artful curves and bath light.",
    description: "Một layout có tính thẩm mỹ cao, nổi bật với bồn tắm rời, cửa vòm và ánh sáng đẹp.",
    prices: [ { label: "3 tiếng", value: "299k" }, { label: "4 tiếng", value: "379k" }, { label: "Qua đêm", value: "579k" }, { label: "Ngày", value: "759k" } ],
    tags: ["Studio", "Bồn tắm", "Ban công"],
    amenities: ["wifi", "aircon", "balcony", "bathtub", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Phan Tây Hồ", "Phú Nhuận", "bathtub", "balcony"],
    images: makeImages("C8-THE-ART", 5)
  },
  {
    id: "C9-VELVET", chapter: "Chapter 9", type: "Studio", name: "VELVET Layout",
    location: "Chi nhánh Phan Tây Hồ", district: "Phú Nhuận", address: "Chi nhánh Phan Tây Hồ, Phú Nhuận",
    priceTier: "premium", inventory: 3, status: "available",
    category: "Warm studio", vibe: "Warm luxury · cozy · private stay", shortLine: "Warm, soft, modern and deeply private.",
    description: "Không gian ấm, mềm và hiện đại, phù hợp cho khách muốn một căn phòng riêng tư, dễ chịu nhưng vẫn có cảm giác cao cấp.",
    prices: [ { label: "3 tiếng", value: "299k" }, { label: "4 tiếng", value: "379k" }, { label: "Qua đêm", value: "579k" }, { label: "Ngày", value: "759k" } ],
    tags: ["Studio", "Ấm sang"],
    amenities: ["wifi", "aircon", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Phan Tây Hồ", "Phú Nhuận"],
    images: makeImages("C9-VELVET", 4)
  },
  {
    id: "C10-MIDNIGHT", chapter: "Chapter 10", type: "Studio", name: "MID Layout",
    location: "Chi nhánh Phan Tây Hồ", district: "Phú Nhuận", address: "Chi nhánh Phan Tây Hồ, Phú Nhuận",
    priceTier: "budget", inventory: 3, status: "available",
    category: "Giá tốt nhất", vibe: "Compact · giá tốt · tối giản", shortLine: "Compact, clean and easy to book.",
    description: "Studio nhỏ gọn, tối giản và dễ tiếp cận hơn về giá. Phù hợp khách cần một không gian riêng tư, sạch đẹp, tiện lợi.",
    prices: [ { label: "3 tiếng", value: "259k" }, { label: "4 tiếng", value: "359k" }, { label: "Qua đêm", value: "500k" }, { label: "Ngày", value: "659k" } ],
    tags: ["Studio", "Giá tốt nhất"],
    amenities: ["wifi", "aircon", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Phan Tây Hồ", "Phú Nhuận", "budget"],
    images: makeImages("C10-MIDNIGHT", 4)
  },
  {
    id: "C12-AMOR", chapter: "Chapter 12", type: "Studio", name: "AMOR Layout",
    location: "Chi nhánh Lê Văn Sỹ", district: "Phú Nhuận", address: "Chi nhánh Lê Văn Sỹ, Phú Nhuận",
    priceTier: "signature", inventory: 3, status: "available",
    category: "Romantic", vibe: "Romantic · ánh sáng mềm", shortLine: "A romantic studio for warm, private celebrations.",
    description: "Không gian lãng mạn, mềm và riêng tư, phù hợp cho sinh nhật, kỷ niệm hoặc một buổi staycation có cảm giác được chuẩn bị chỉn chu.",
    prices: [ { label: "3 tiếng", value: "299k" }, { label: "4 tiếng", value: "379k" }, { label: "Qua đêm", value: "579k" }, { label: "Ngày", value: "799k" } ],
    tags: ["Studio", "Romantic", "Couple"],
    amenities: ["wifi", "aircon", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Lê Văn Sỹ", "Phú Nhuận"],
    images: makeImages("C12-AMOR", 5)
  },
  {
    id: "C12-ROMA", chapter: "Chapter 12", type: "Studio", name: "ROMA Layout",
    location: "Chi nhánh Lê Văn Sỹ", district: "Phú Nhuận", address: "Chi nhánh Lê Văn Sỹ, Phú Nhuận",
    priceTier: "premium", inventory: 3, status: "available",
    category: "Warm studio", vibe: "Warm classic · ban công · dễ chịu", shortLine: "Classic, warm and easy to settle into.",
    description: "Layout có cảm giác ấm, gọn và tinh tế, có ban công cực kỳ thoáng đãng, dễ ở, dễ nghỉ và có chút boutique nhẹ nhàng.",
    prices: [ { label: "3 tiếng", value: "299k" }, { label: "4 tiếng", value: "379k" }, { label: "Qua đêm", value: "579k" }, { label: "Ngày", value: "799k" } ],
    tags: ["Studio", "Ban công", "Classic"],
    amenities: ["wifi", "aircon", "balcony", "fridge", "hairdryer", "kettle", "hygiene", "tv", "self-checkin"],
    filters: ["Chi nhánh Lê Văn Sỹ", "Phú Nhuận", "balcony"],
    images: makeImages("C12-ROMA", 4)
  }
];

const houseRules = [
  { icon: "⏰", text: "Quý khách vui lòng check-in/check-out theo đúng thời gian đã đặt. Phụ thu trễ giờ: 99.000đ/giờ." },
  { icon: "🗑️", text: "Không bỏ rác và các vật dụng khác ra ngoài ban công / cửa sổ." },
  { icon: "🐾", text: "Không mang theo thú cưng." },
  { icon: "🚭", text: "Không sử dụng chất cấm." },
  { icon: "👥", text: "Không ở quá 2 người khi chưa có sự đồng ý của home." },
  { icon: "🚽", text: "Không thả giấy hay bất kỳ vật thể nào vào bồn cầu." },
  { icon: "🔑", text: "Để chìa khóa, thẻ phòng lại vị trí cũ, tắt máy lạnh và các thiết bị điện trước khi ra khỏi phòng." },
  { icon: "👜", text: "Chủ động bảo quản tài sản cá nhân trong thời gian lưu trú." },
  { icon: "🪑", text: "Bảo quản tài sản của home. Nếu làm hỏng/mất, sẽ tính theo bảng giá dịch vụ đính kèm." }
];

window.rooms = rooms;
