// UNITESTAYCATION/js/rooms.js
// Mỗi phòng có thể có số lượng ảnh khác nhau. Ảnh đặt trong img/MÃ-PHÒNG/0.jpg, 1.jpg...

const makeImages = (folder, total) => {
  return Array.from({ length: total }, (_, index) => `img/${folder}/${index}.jpg`);
};

const rooms = [
  {
    id: "C1-ELAN",
    chapter: "Chapter 1",
    type: "Studio",
    name: "ÉLAN Layout",
    location: "Chi nhánh Nhiêu Tứ",
    district: "Phú Nhuận",
    address: "Chi nhánh Nhiêu Tứ, Phú Nhuận",
    priceTier: "premium",
    inventory: 3,
    status: "available",
    category: "Couple bathtub",
    vibe: "Chill boutique · bồn tắm · cửa kính thoáng",
    shortLine: "A private bathtub studio with quiet city light.",
    description: "Studio mang cảm giác riêng tư, hiện đại và có điểm nhấn bồn tắm. Phù hợp cho staycation couple, nghỉ ngắn ngày hoặc chụp hình lifestyle.",
    prices: [
      { label: "3 tiếng", value: "299k" },
      { label: "4 tiếng", value: "379k" },
      { label: "8 tiếng", value: "579k" },
      { label: "Ngày", value: "799k" }
    ],
    tags: ["Studio", "Bồn tắm", "View thoáng", "Couple"],
    amenities: ["wifi", "aircon", "bathtub", "tv", "self-checkin", "support"],
    filters: ["Chi nhánh Nhiêu Tứ", "Phú Nhuận", "bathtub"],
    images: makeImages("C1-ELAN", 7)
  },
  {
    id: "C1-NOIR",
    chapter: "Chapter 1",
    type: "Studio",
    name: "NOIR Layout",
    location: "Chi nhánh Nhiêu Tứ",
    district: "Phú Nhuận",
    address: "Chi nhánh Nhiêu Tứ, Phú Nhuận",
    priceTier: "premium",
    inventory: 3,
    status: "available",
    category: "Private cinema",
    vibe: "Dark modern · riêng tư · cá tính",
    shortLine: "Dark, intimate and quietly luxurious.",
    description: "Không gian tone tối sang, nội thất hiện đại và riêng tư. Phù hợp cho khách thích vibe noir, trầm, gọn và có gu.",
    prices: [
      { label: "3 tiếng", value: "299k" },
      { label: "4 tiếng", value: "379k" },
      { label: "8 tiếng", value: "579k" },
      { label: "Ngày", value: "799k" }
    ],
    tags: ["Studio", "Tone tối", "TV", "Private"],
    amenities: ["wifi", "aircon", "tv", "self-checkin", "support"],
    filters: ["Chi nhánh Nhiêu Tứ", "Phú Nhuận"],
    images: makeImages("C1-NOIR", 3)
  },
  {
    id: "C8-THE-ART",
    chapter: "Chapter 8",
    type: "Studio",
    name: "THE ART Layout",
    location: "Chi nhánh Phan Tây Hồ",
    district: "Phú Nhuận",
    address: "Chi nhánh Phan Tây Hồ, Phú Nhuận",
    priceTier: "signature",
    inventory: 3,
    status: "available",
    category: "Signature bathtub",
    vibe: "Signature studio · cửa vòm · bồn tắm",
    shortLine: "A signature room with artful curves and bath light.",
    description: "Một layout có tính thẩm mỹ cao, nổi bật với bồn tắm rời, cửa vòm và ánh sáng đẹp. Phù hợp định vị như phòng signature của hệ thống.",
    prices: [
      { label: "3 tiếng", value: "299k" },
      { label: "4 tiếng", value: "379k" },
      { label: "8 tiếng", value: "579k" },
      { label: "Ngày", value: "759k" }
    ],
    tags: ["Studio", "Bồn tắm", "Signature", "Cửa vòm"],
    amenities: ["wifi", "aircon", "bathtub", "tv", "self-checkin", "support", "photo-corner"],
    filters: ["Chi nhánh Phan Tây Hồ", "Phú Nhuận", "bathtub", "signature"],
    images: makeImages("C8-THE-ART", 5)
  },
  {
    id: "C9-VELVET",
    chapter: "Chapter 9",
    type: "Studio",
    name: "VELVET Layout",
    location: "Chi nhánh Phan Tây Hồ",
    district: "Phú Nhuận",
    address: "Chi nhánh Phan Tây Hồ, Phú Nhuận",
    priceTier: "premium",
    inventory: 3,
    status: "available",
    category: "Warm studio",
    vibe: "Warm luxury · cozy · private stay",
    shortLine: "Warm, soft, modern and deeply private.",
    description: "Không gian ấm, mềm và hiện đại, phù hợp cho khách muốn một căn phòng riêng tư, dễ chịu nhưng vẫn có cảm giác cao cấp.",
    prices: [
      { label: "3 tiếng", value: "299k" },
      { label: "4 tiếng", value: "379k" },
      { label: "8 tiếng", value: "579k" },
      { label: "Ngày", value: "759k" }
    ],
    tags: ["Studio", "Ấm sang", "TV", "Private"],
    amenities: ["wifi", "aircon", "tv", "self-checkin", "support", "photo-corner"],
    filters: ["Chi nhánh Phan Tây Hồ", "Phú Nhuận"],
    images: makeImages("C9-VELVET", 4)
  },
  {
    id: "C10-MIDNIGHT",
    chapter: "Chapter 10",
    type: "Studio",
    name: "MIDNIGHT Layout",
    location: "Chi nhánh Phan Tây Hồ",
    district: "Phú Nhuận",
    address: "Chi nhánh Phan Tây Hồ, Phú Nhuận",
    priceTier: "budget",
    inventory: 3,
    status: "available",
    category: "Budget studio",
    vibe: "Compact · giá tốt · tối giản",
    shortLine: "Compact, clean and easy to book.",
    description: "Studio nhỏ gọn, tối giản và dễ tiếp cận hơn về giá. Phù hợp khách cần một không gian riêng tư, sạch đẹp, tiện lợi.",
    prices: [
      { label: "3 tiếng", value: "259k" },
      { label: "4 tiếng", value: "359k" },
      { label: "8 tiếng", value: "500k" },
      { label: "Ngày", value: "659k" }
    ],
    tags: ["Studio", "Giá tốt", "Compact", "Private"],
    amenities: ["wifi", "aircon", "tv", "self-checkin", "support"],
    filters: ["Chi nhánh Phan Tây Hồ", "Phú Nhuận", "budget"],
    images: makeImages("C10-MIDNIGHT", 4)
  },
  {
    id: "C12-AMOR",
    chapter: "Chapter 12",
    type: "Studio",
    name: "Amor Layout",
    location: "Chi nhánh Lê Văn Sĩ",
    district: "Phú Nhuận",
    address: "Chi nhánh Lê Văn Sĩ, Phú Nhuận",
    priceTier: "signature",
    inventory: 3,
    status: "available",
    category: "Romantic bathtub",
    vibe: "Romantic · bồn tắm · ánh sáng mềm",
    shortLine: "A romantic studio for warm, private celebrations.",
    description: "Không gian lãng mạn, mềm và riêng tư, phù hợp cho sinh nhật, kỷ niệm hoặc một buổi staycation có cảm giác được chuẩn bị chỉn chu.",
    prices: [
      { label: "3 tiếng", value: "329k" },
      { label: "4 tiếng", value: "409k" },
      { label: "8 tiếng", value: "629k" },
      { label: "Ngày", value: "829k" }
    ],
    tags: ["Studio", "Bồn tắm", "Romantic", "Couple"],
    amenities: ["wifi", "aircon", "bathtub", "tv", "self-checkin", "support", "photo-corner"],
    filters: ["Chi nhánh Lê Văn Sĩ", "Phú Nhuận", "bathtub", "signature"],
    images: makeImages("C8-THE-ART", 5)
  },
  {
    id: "C12-ROMA",
    chapter: "Chapter 12",
    type: "Studio",
    name: "Roma Layout",
    location: "Chi nhánh Lê Văn Sĩ",
    district: "Phú Nhuận",
    address: "Chi nhánh Lê Văn Sĩ, Phú Nhuận",
    priceTier: "premium",
    inventory: 3,
    status: "available",
    category: "Warm studio",
    vibe: "Warm classic · riêng tư · dễ chịu",
    shortLine: "Classic, warm and easy to settle into.",
    description: "Layout có cảm giác ấm, gọn và tinh tế, phù hợp khách cần một không gian riêng tư dễ ở, dễ nghỉ và có chất boutique nhẹ nhàng.",
    prices: [
      { label: "3 tiếng", value: "299k" },
      { label: "4 tiếng", value: "379k" },
      { label: "8 tiếng", value: "579k" },
      { label: "Ngày", value: "759k" }
    ],
    tags: ["Studio", "Ấm sang", "Private", "Classic"],
    amenities: ["wifi", "aircon", "tv", "self-checkin", "support", "photo-corner"],
    filters: ["Chi nhánh Lê Văn Sĩ", "Phú Nhuận"],
    images: makeImages("C9-VELVET", 4)
  }
];

const houseRules = [
  {
    icon: "◷",
    text: "Quý khách vui lòng check-in/check-out theo đúng thời gian đã đặt. Nếu có nhu cầu phát sinh thêm giờ, liên hệ với home để được hỗ trợ kịp thời. Trả phòng trễ từ 10 phút, home xin phép tính phụ thu <strong>99.000đ</strong>."
  },
  { icon: "▥", text: "Không bỏ rác và các vật dụng khác ra ngoài ban công / cửa sổ." },
  { icon: "●", text: "Không mang theo thú cưng." },
  { icon: "✕", text: "Không sử dụng chất cấm." },
  { icon: "☷", text: "Không ở quá 2 người khi chưa có sự đồng ý của home." },
  { icon: "▱", text: "Không thả giấy hay bất kỳ vật thể nào vào bồn cầu." },
  { icon: "⚿", text: "Để chìa khóa, thẻ phòng lại vị trí cũ, tắt máy lạnh và các thiết bị điện trước khi ra khỏi phòng." },
  { icon: "▣", text: "Chủ động bảo quản tài sản cá nhân trong thời gian lưu trú. Kiểm tra kỹ tư trang cá nhân trước khi trả phòng." },
  { icon: "◇", text: "Bảo quản tài sản của home. Nếu làm hỏng/mất, sẽ tính theo bảng giá dịch vụ đính kèm." }
];
