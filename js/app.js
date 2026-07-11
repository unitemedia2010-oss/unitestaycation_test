// UNITESTAYCATION/js/app.js

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const getMainImage = (room) => room.images?.[0] || "";
const getPriceItem = (room, label) => room.prices.find(item => item.label === label) || null;
const getPrice = (room, label) => getPriceItem(room, label)?.value || "-";
const promotionBadgeHTML = (room) => {
  const promo = room?.promotion;
  if (!promo || promo.show_badge === false) return "";
  const label = promo.badge_label || promo.title || (promo.discount_percent ? `-${promo.discount_percent}%` : "Ưu đãi");
  return `<span class="promotion-badge">${escapeHTML(label)}</span>`;
};

const syncStaticLiveImages = () => {
  $$('[data-live-room-image]').forEach(img => {
    const room = rooms.find(item => item.id === img.dataset.liveRoomImage);
    const src = getMainImage(room || {});
    if (!src) return;
    img.style.display = "";
    img.closest('.match-card, .about-media')?.classList.remove('image-missing');
    if (img.src !== src) img.src = src;
  });
};

const imgTag = (src, alt, className = "") => `
  <img
    class="${className}"
    src="${src}"
    alt="${alt}"
    loading="lazy"
    decoding="async"
    onerror="this.closest('.image-wrap, .gallery-item, .hero-photo, .reel-card, .about-media, .detail-cover, .related-card, .result-photo')?.classList.add('image-missing'); this.style.display='none';"
  />
`;

const tagsHTML = (tags) => tags.map(tag => `<span class="tag">${tag}</span>`).join("");

const formatStayDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
};

const ADMIN_STORAGE_KEY = "unite-staycation-admin-overrides-v1";
const SMART_BOOKING_STORAGE_KEY = "unite-staycation-smart-booking-v1";
const LANG_STORAGE_KEY = "unite-staycation-language-v1";
const CONTACT_CHANNEL_STORAGE_KEY = "unite-staycation-contact-channels-v2";

const escapeHTML = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const languageCodes = {
  VIE: "vi",
  ENG: "en",
  CHN: "zh"
};

const textTranslations = {
  "Về Unite": { ENG: "About Unite", CHN: "关于 Unite" },
  "Bộ sưu tập": { ENG: "Collection", CHN: "房源合集" },
  "Địa điểm": { ENG: "Locations", CHN: "位置" },
  "Bảng giá": { ENG: "Rates", CHN: "价格" },
  "Nội quy": { ENG: "Rules", CHN: "入住规则" },
  "Cách đặt": { ENG: "How to book", CHN: "预订方式" },
  "Liên hệ": { ENG: "Contact", CHN: "联系" },
  "Quản trị": { ENG: "Admin", CHN: "管理" },
  "Trang chính": { ENG: "Home", CHN: "首页" },
  "Đặt phòng": { ENG: "Book", CHN: "预订" },
  "Đặt phòng nhanh": { ENG: "Quick booking", CHN: "快速预订" },
  "Chọn nhanh lịch và xem phòng phù hợp": { ENG: "Pick dates and see matching rooms", CHN: "选择时间并查看合适房间" },
  "Địa điểm": { ENG: "Location", CHN: "位置" },
  "Ngày nhận": { ENG: "Check-in date", CHN: "入住日期" },
  "Thời lượng": { ENG: "Duration", CHN: "时长" },
  "Người lớn": { ENG: "Adults", CHN: "成人" },
  "Trẻ em": { ENG: "Children", CHN: "儿童" },
  "Xem phòng phù hợp": { ENG: "View matching rooms", CHN: "查看合适房间" },
  "Mở": { ENG: "Open", CHN: "打开" },
  "Book your": { VIE: "Đặt lịch", ENG: "Book your", CHN: "预订你的" },
  "private escape.": { VIE: "khoảng riêng tư.", ENG: "private escape.", CHN: "私享空间。" },
  "Contact": { VIE: "Liên hệ", ENG: "Contact", CHN: "联系" },
  "Room": { VIE: "Phòng", ENG: "Room", CHN: "房型" },
  "Price": { VIE: "Giá", ENG: "Price", CHN: "价格" },
  "Rules": { VIE: "Nội quy", ENG: "Rules", CHN: "规则" },
  "Flow": { VIE: "Quy trình", ENG: "Flow", CHN: "流程" },
  "Xem giá": { ENG: "View rates", CHN: "看价格" },
  "Phòng": { ENG: "Rooms", CHN: "房间" },
  "Riêng tư - Thoải mái - Dễ chịu": { ENG: "Private - Comfortable - Easy", CHN: "私密 - 舒适 - 轻松" },
  "Admin operations": { VIE: "Vận hành admin", ENG: "Admin operations", CHN: "后台运营" },
  "Room inventory": { VIE: "Kho phòng", ENG: "Room inventory", CHN: "房间库存" },
  "Amenity icons": { VIE: "Icon tiện ích", ENG: "Amenity icons", CHN: "设施图标" },
  "Contact channels": { VIE: "Kênh liên hệ", ENG: "Contact channels", CHN: "联系渠道" },
  "Thêm kênh": { ENG: "Add channel", CHN: "添加渠道" },
  "Khôi phục mặc định": { ENG: "Reset default", CHN: "恢复默认" },
  "Xem contact": { ENG: "View contact", CHN: "查看联系区" },
  "Zalo": { VIE: "Zalo", ENG: "Zalo", CHN: "Zalo" },
  "Fanpage": { VIE: "Fanpage", ENG: "Fanpage", CHN: "主页" },
  "Instagram": { VIE: "Instagram", ENG: "Instagram", CHN: "Instagram" },
  "Hotline": { VIE: "Hotline", ENG: "Hotline", CHN: "热线" }
};

Object.assign(textTranslations, {
  "Những căn phòng boutique riêng tư giữa thành phố — tinh tế, ấm áp và sẵn sàng cho một kỳ nghỉ ngắn đầy cảm xúc.": {
    ENG: "Private boutique rooms in the city - refined, warm and ready for a short stay full of feeling.",
    CHN: "城市中的私密精品房间，精致、温暖，适合一段有氛围的短住。"
  },
  "Bảng giá": { ENG: "Rates", CHN: "价格" },
  "Tìm phòng": { ENG: "Find rooms", CHN: "查找房间" },
  "Cập nhật": { ENG: "Update", CHN: "更新" },
  "Chọn địa điểm, ngày và gói lưu trú để xem các layout phù hợp.": {
    ENG: "Tip: choose a location, date and stay package to see better room matches.",
    CHN: "提示：选择位置、日期和入住套餐，即可查看更合适的房间。"
  },
  "layout đang mở": { ENG: "open layouts", CHN: "可预订房型" },
  "địa điểm Phú Nhuận": { ENG: "Phu Nhuan locations", CHN: "富润区位置" },
  "cho gói 3 giờ": { ENG: "for the 3-hour package", CHN: "3小时套餐起" },
  "đặt phòng rõ ràng": { ENG: "clear booking steps", CHN: "清晰预订流程" },

  "Hiểu nhanh": { ENG: "Quick guide", CHN: "快速了解" },
  "Một chạm riêng tư": { ENG: "Unite helps you", CHN: "Unite 让你" },
  "giữa nhịp thành phố.": { ENG: "switch into a private space.", CHN: "切换到私密空间。" },
  "Các phòng riêng được sắp xếp theo giờ hoặc theo ngày, với hình ảnh, bảng giá và quy trình xác nhận rõ ràng trước khi nhận phòng.": {
    ENG: "The homepage should make the offer clear right away: Unite has private rooms by the hour or by the day, clear room photos, comparable rates and admin confirmation before arrival.",
    CHN: "首页应让客人一眼看懂：Unite 提供按小时或按天的私密房间、清晰照片、价格对比，并由管理员在到店前确认档期。"
  },
  "Chọn theo phong cách": { ENG: "Choose by vibe", CHN: "按氛围选房" },
  "Mỗi layout mang một chất riêng: bồn tắm, tone tối, cửa vòm, ấm sang hoặc gọn gàng.": {
    ENG: "Each layout has its own mood: bathtub, dark tone, arch details, warm luxury or compact value.",
    CHN: "每个房型都有自己的氛围：浴缸、深色调、拱门、温暖高级感或高性价比小房型。"
  },
  "Bảng giá rõ ràng": { ENG: "See rates first", CHN: "先看价格" },
  "Giá được phân theo 3 giờ, 4 giờ, 8 giờ và theo ngày để dễ lựa chọn.": {
    ENG: "Rates are split by 3h, 4h, 8h and day packages so guests can compare easily.",
    CHN: "价格按3小时、4小时、8小时和整日套餐划分，方便客人比较。"
  },
  "Nội quy minh bạch": { ENG: "Know the rules", CHN: "了解规则" },
  "Thông tin sức chứa, giờ trả phòng và phụ thu được thể hiện trước khi đặt.": {
    ENG: "Guests can check capacity, check-out timing, surcharges and key notes before booking.",
    CHN: "客人可提前了解人数限制、退房时间、附加费和重要提醒。"
  },
  "Xác nhận nhanh": { ENG: "Message for support", CHN: "发消息即可协助" },
  "Đội ngũ Unite kiểm tra phòng trống, gửi hướng dẫn check-in và xác nhận giá cuối.": {
    ENG: "Admin checks availability, sends check-in guidance and confirms the final rate.",
    CHN: "管理员会确认空房、发送入住指引并确认最终价格。"
  },

  "Chọn nhanh theo nhu cầu": { ENG: "Choose by need", CHN: "按需求快速选择" },
  "Chọn không gian phù hợp": { ENG: "What kind of stay do you need?", CHN: "你需要哪种入住体验？" },
  "Một vài nhóm lựa chọn giúp hành trình đặt phòng nhanh và rõ hơn.": {
    ENG: "New guests often do not know where to start. These choices lead them straight to the best-fit layout.",
    CHN: "新客人常常不知道从哪里开始，这些选项会直接引导到最合适的房型。"
  },
  "Bồn tắm · Couple": { ENG: "Bathtub · Couple", CHN: "浴缸 · 情侣" },
  "Một buổi riêng tư có điểm nhấn.": { ENG: "A private stay with a highlight.", CHN: "想要有亮点的私密时光。" },
  "ÉLAN Layout phù hợp cho dịp kỷ niệm, nghỉ ngắn hoặc chụp hình lifestyle.": {
    ENG: "Suggestion: ÉLAN Layout, ideal for anniversaries, short rests or lifestyle photos.",
    CHN: "推荐：ÉLAN Layout，适合纪念日、短暂休息或生活方式拍照。"
  },
  "Signature · Cửa vòm": { ENG: "Signature · Arch details", CHN: "招牌 · 拱门设计" },
  "Không gian signature nhiều điểm chạm thẩm mỹ.": { ENG: "A more stylish, photogenic room.", CHN: "想要更有审美的漂亮房间。" },
  "THE ART Layout nổi bật với đường cong, ánh sáng và bồn tắm rời.": {
    ENG: "Suggestion: THE ART Layout, known for curves, light and a freestanding bathtub.",
    CHN: "推荐：THE ART Layout，以曲线、光线和独立浴缸为亮点。"
  },
  "Giá tốt · Gọn sạch": { ENG: "Good value · Compact clean", CHN: "高性价比 · 简洁干净" },
  "Không gian riêng tư, gọn sạch và dễ đặt.": { ENG: "A private place that is easy to book.", CHN: "需要一个容易预订的私密空间。" },
  "MIDNIGHT Layout tối giản, tiện lợi và dễ tiếp cận về giá.": {
    ENG: "Suggestion: MIDNIGHT Layout, minimal, convenient and easier on price.",
    CHN: "推荐：MIDNIGHT Layout，简洁方便，价格更友好。"
  },
  "Tone tối · Private": { ENG: "Dark tone · Private", CHN: "深色调 · 私密" },
  "Tone trầm riêng tư, cá tính.": { ENG: "A moody, characterful space.", CHN: "喜欢沉稳且有个性的空间。" },
  "NOIR Layout hợp để xem phim, nghỉ vài giờ hoặc tận hưởng một khoảng lặng.": {
    ENG: "Suggestion: NOIR Layout, good for movies, a few quiet hours or a calm evening.",
    CHN: "推荐：NOIR Layout，适合看电影、休息几小时或安静的夜晚。"
  },

  "Room Collection": { VIE: "Bộ sưu tập phòng", ENG: "Room Collection", CHN: "房间合集" },
  "Khám phá những căn phòng": { ENG: "Explore rooms", CHN: "探索房间" },
  "mang dấu ấn riêng.": { ENG: "with their own character.", CHN: "各有独特印记。" },
  "Về Unite": { ENG: "About Unite", CHN: "关于 Unite" },
  "Mỗi kỳ nghỉ": { ENG: "Every stay", CHN: "每一次入住" },
  "đều xứng đáng": { ENG: "deserves", CHN: "都值得" },
  "được nâng niu.": { ENG: "to feel cared for.", CHN: "被细心呵护。" },
  "Unite Staycation mang đến những không gian nghỉ ngơi riêng tư,": {
    ENG: "Unite Staycation was created to offer a private place to rest,",
    CHN: "Unite Staycation 希望提供一个私密的休憩空间，"
  },
  "tinh tế và giàu cảm xúc giữa lòng thành phố.": { ENG: "refined and full of feeling.", CHN: "精致且富有情绪感。" },
  "Ánh sáng, nội thất và từng góc nhỏ được chăm chút để mỗi kỳ nghỉ trở nên dễ chịu,": {
    ENG: "From lighting and furniture to the smallest corners, everything is curated so you can relax,",
    CHN: "从光线、家具到房间里的每个小角落，都经过用心安排，"
  },
  "thoải mái và đáng nhớ hơn.": {
    ENG: "enjoy the moment and keep meaningful memories with someone you love.",
    CHN: "让你放松享受，并与重要的人留下值得记住的时刻。"
  },
  "Stay Collection": { VIE: "Bộ sưu tập stay", ENG: "Stay Collection", CHN: "入住合集" },
  "Các không gian lưu trú": { ENG: "Stay spaces", CHN: "入住空间" },
  "tại Unite Staycation.": { ENG: "at Unite Staycation.", CHN: "在 Unite Staycation。" },
  "Khám phá các layout tại từng địa chỉ, mỗi căn phòng mang một tinh thần riêng: riêng tư, tinh tế và dễ chịu cho từng khoảnh khắc lưu trú.": {
    ENG: "Explore layouts at each address. Every room carries its own spirit: private, refined and comfortable for each stay moment.",
    CHN: "探索不同地址的房型，每个房间都有自己的气质：私密、精致、舒适，适合每个入住时刻。"
  },
  "Các layout hiện có": { ENG: "Available layouts", CHN: "现有房型" },
  "Stay price": { VIE: "Bảng giá stay", ENG: "Stay price", CHN: "入住价格" },
  "lưu trú": { ENG: "stay", CHN: "入住" },
  "Tham khảo khung giá theo thời lượng lưu trú. Giá có thể thay đổi theo thời điểm, ngày đặc biệt và tình trạng phòng thực tế.": {
    ENG: "Reference rates by stay duration. Prices may change by timing, special dates and actual room availability.",
    CHN: "按入住时长参考价格。价格可能因时段、特殊日期和实际房态而调整。"
  },
  "Tất cả": { ENG: "All", CHN: "全部" },
  "Có bồn tắm": { ENG: "Bathtub", CHN: "有浴缸" },
  "Giá tốt": { ENG: "Good value", CHN: "高性价比" },

  "Booking flow": { VIE: "Quy trình đặt phòng", ENG: "Booking flow", CHN: "预订流程" },
  "Từ xem phòng": { ENG: "From viewing rooms", CHN: "从看房" },
  "đến nhận lịch ở.": { ENG: "to confirming your stay.", CHN: "到确认入住。" },
  "Không gian riêng tư, bảng giá rõ ràng và quy trình đặt phòng được sắp xếp để hành trình lưu trú diễn ra nhẹ nhàng.": {
    ENG: "Unite keeps its private, soft and tasteful character; the operation flow simply needs to be clearer so guests do not get lost after viewing photos and rates.",
    CHN: "Unite 保留私密、柔和且有品味的气质；预订流程只需更清晰，让客人在看完照片和价格后不会迷路。"
  },
  "Chọn vibe phòng": { ENG: "Choose a room vibe", CHN: "选择房间氛围" },
  "Xem bộ sưu tập, mở chi tiết từng layout và chọn đúng không gian phù hợp.": {
    ENG: "View the collection, open each layout detail and choose the feeling you want.",
    CHN: "查看合集，打开每个房型详情，选择你想要的感觉。"
  },
  "So sánh giá": { ENG: "Compare rates", CHN: "比较价格" },
  "Lọc theo địa điểm, bồn tắm, signature hoặc giá tốt trước khi nhắn đặt.": {
    ENG: "Filter by location, bathtub, signature style or good value before messaging to book.",
    CHN: "在发消息预订前，可按位置、浴缸、招牌房型或高性价比筛选。"
  },
  "Xác nhận phòng": { ENG: "Confirm the room", CHN: "确认房间" },
  "Đội ngũ Unite kiểm tra lịch trống, giá theo khung giờ và gửi hướng dẫn thanh toán.": {
    ENG: "The Unite team checks availability, time-slot pricing and sends payment guidance.",
    CHN: "管理员会确认空档、时段价格，并发送付款指引。"
  },
  "Nhận check-in": { ENG: "Receive check-in details", CHN: "接收入住信息" },
  "Khách nhận địa chỉ, nội quy, giờ vào phòng và kênh hỗ trợ trong suốt kỳ ở.": {
    ENG: "Guests receive the address, house rules, entry time and support channel for the stay.",
    CHN: "客人会收到地址、入住规则、进房时间以及入住期间的支持渠道。"
  },

  "House Rules": { VIE: "Nội quy lưu trú", ENG: "House Rules", CHN: "入住规则" },
  "Nội quy": { ENG: "Rules", CHN: "规则" },
  "FAQ nhanh": { ENG: "Quick FAQ", CHN: "常见问题" },
  "Câu hỏi thường gặp trước khi đặt phòng.": { ENG: "Questions guests often ask before messaging.", CHN: "客人在发消息前常问的问题。" },
  "Các thông tin cần biết về sức chứa, giờ lưu trú, phụ thu và nội quy.": {
    ENG: "Answering the basics upfront helps guests feel safer and reduces back-and-forth messages.",
    CHN: "提前回答基础问题，让客人更安心，也减少来回询问。"
  },
  "Unite đặt theo giờ hay theo ngày?": { ENG: "Can Unite be booked hourly or daily?", CHN: "Unite 可以按小时或按天预订吗？" },
  "Có cả hai. Khách có thể tham khảo các gói 3h, 4h, 8h và ngày trong bảng giá.": {
    ENG: "Both. Guests can check the 3h, 4h, 8h and day packages in the rate table.",
    CHN: "都可以。客人可在价格表查看3小时、4小时、8小时和整日套餐。"
  },
  "Phòng phù hợp cho mấy người?": { ENG: "How many guests fit in a room?", CHN: "房间适合几个人？" },
  "Mỗi phòng ưu tiên tối đa 2 khách để giữ sự riêng tư, sạch sẽ và thoải mái.": {
    ENG: "Each room is best for up to 2 guests to keep it private, clean and comfortable.",
    CHN: "每间房建议最多2位客人，以保持私密、干净和舒适。"
  },
  "Làm sao biết còn phòng?": { ENG: "How do I know if a room is available?", CHN: "如何知道是否有房？" },
  "Gửi mã phòng và khung giờ mong muốn, Unite sẽ kiểm tra lịch trống trước khi xác nhận.": {
    ENG: "Send the room code and preferred time; Unite will check availability before confirming.",
    CHN: "发送房间代码和想要的时间，管理员会先确认空档再最终确认。"
  },
  "Giá trên web có phải giá cuối?": { ENG: "Is the website price final?", CHN: "网站价格是最终价格吗？" },
  "Đó là giá tham khảo rõ theo khung giờ. Giá cuối có thể thay đổi theo ngày đặc biệt hoặc tình trạng phòng.": {
    ENG: "It is a clear reference rate by time slot. Final price may change on special dates or by room status.",
    CHN: "这是按时段展示的参考价格。最终价格可能因特殊日期或房态而调整。"
  },
  "Địa điểm ở đâu?": { ENG: "Where are the locations?", CHN: "位置在哪里？" },
  "Hiện có các layout tại Nhiêu Tứ và Phan Tây Hồ, đều ở khu Phú Nhuận.": {
    ENG: "Current layouts are at the Nhieu Tu and Phan Tay Ho branches, both in Phu Nhuan.",
    CHN: "目前房型位于 Nhiêu Tứ 和 Phan Tây Hồ 分店，均在富润区。"
  },
  "Cần đọc nội quy không?": { ENG: "Should I read the rules?", CHN: "需要阅读规则吗？" },
  "Thông tin nội quy giúp hạn chế phát sinh về giờ, số khách hoặc phụ thu.": {
    ENG: "Yes, please read them first to avoid late fees, guest-limit issues or unwanted extra charges.",
    CHN: "建议提前阅读，以避免延时费、超人数或其他不必要费用。"
  },
  "Chọn phòng, xem giá và liên hệ Unite để được xác nhận lịch trống.": {
    ENG: "The contact section should close the action loop: choose a room, view rates, read rules and jump to admin when content needs updating.",
    CHN: "联系区应完成行动闭环：选房、看价格、读规则，并在需要更新内容时快速进入管理页。"
  },

  "Room finder": { VIE: "Tìm phòng", ENG: "Room finder", CHN: "房间查找" },
  "Chọn không gian phù hợp với lịch lưu trú.": { ENG: "Choose a room that fits your stay schedule.", CHN: "根据你的入住时间选择合适房间。" },
  "Đang chuẩn bị danh sách phòng phù hợp.": { ENG: "Preparing matching rooms.", CHN: "正在准备匹配房间。" },
  "Tìm phòng nhanh": { ENG: "Quick room search", CHN: "快速找房" },
  "Tất cả địa điểm": { ENG: "All locations", CHN: "所有位置" },
  "tất cả địa điểm": { ENG: "all locations", CHN: "所有位置" },
  "Chọn khu vực lưu trú.": { ENG: "Choose the stay area you want to browse.", CHN: "选择你想查看的入住区域。" },
  "7 layout đang mở": { ENG: "7 open layouts", CHN: "7个可预订房型" },
  "Gần Phan Xích Long": { ENG: "Near Phan Xich Long", CHN: "靠近 Phan Xich Long" },
  "Yên tĩnh, riêng tư": { ENG: "Quiet and private", CHN: "安静私密" },
  "Nhận phòng": { ENG: "Check-in", CHN: "入住" },
  "Hôm nay": { ENG: "Today", CHN: "今天" },
  "Trả phòng theo gói đã chọn.": { ENG: "Check-out follows the selected package.", CHN: "退房时间按所选套餐计算。" },
  "Lịch lưu trú": { ENG: "Stay calendar", CHN: "入住日历" },
  "Thời lượng": { ENG: "Duration", CHN: "时长" },
  "3 giờ": { ENG: "3 hours", CHN: "3小时" },
  "4 giờ": { ENG: "4 hours", CHN: "4小时" },
  "8 giờ": { ENG: "8 hours", CHN: "8小时" },
  "Theo ngày": { ENG: "By day", CHN: "按天" },
  "Nghỉ nhanh, xem phim": { ENG: "Quick rest, movie time", CHN: "短休、看电影" },
  "Thoải mái hơn một chút": { ENG: "A little more relaxed", CHN: "更从容一点" },
  "Nửa ngày riêng tư": { ENG: "Private half day", CHN: "私密半日" },
  "Ở lâu, check-in rõ lịch": { ENG: "Longer stay, clear check-in", CHN: "长住，入住时间清晰" },
  "Linh hoạt cho nghỉ nhanh hoặc stay dài hơn.": { ENG: "Flexible for quick rests or longer stays.", CHN: "适合短休或更长入住。" },
  "Khách": { ENG: "Guests", CHN: "客人" },
  "2 người lớn": { ENG: "2 adults", CHN: "2位成人" },
  "Tối đa 2 khách theo nội quy.": { ENG: "Maximum 2 guests by house rules.", CHN: "根据规则最多2位客人。" },
  "Từ 13 tuổi trở lên": { ENG: "Age 13 and above", CHN: "13岁及以上" },
  "Dưới 13 tuổi": { ENG: "Under 13", CHN: "13岁以下" },
  "Mỗi phòng tiêu chuẩn dành cho tối đa 2 khách. Trường hợp đặc biệt sẽ được xác nhận riêng.": {
    ENG: "Unite prioritizes up to 2 guests per room. For special needs, admin will confirm separately.",
    CHN: "Unite 每间房优先最多2位客人。如有特殊需求，管理员会另行确认。"
  },
  "Danh sách hiển thị theo địa điểm, ngày và gói lưu trú đã chọn.": { ENG: "The list will filter itself by your search details.", CHN: "列表会根据你的搜索信息自动筛选。" },
  "Phú Nhuận": { ENG: "Phu Nhuan", CHN: "富润区" },
  "3 địa điểm · 7 layout": { ENG: "3 locations · 7 layouts", CHN: "3个位置 · 7个房型" },
  "Lọc nhanh": { ENG: "Quick filters", CHN: "快速筛选" },
  "Đang mở": { ENG: "Available", CHN: "可预订" },
  "Tiện ích nổi bật": { ENG: "Featured amenities", CHN: "亮点设施" },
  "0 lựa chọn": { ENG: "0 options", CHN: "0个选择" },
  "Phòng phù hợp": { ENG: "Matching rooms", CHN: "合适房间" },
  "Gợi ý phù hợp": { ENG: "Best match", CHN: "推荐排序" },
  "Giá thấp đến cao": { ENG: "Price low to high", CHN: "价格从低到高" },
  "Giá cao đến thấp": { ENG: "Price high to low", CHN: "价格从高到低" },
  "Chọn phòng": { ENG: "Choose room", CHN: "选择房间" },
  "Chỉ từ": { ENG: "From", CHN: "起价" },
  "Giá tham khảo, admin xác nhận lại theo lịch trống.": {
    ENG: "Reference price. Unite reconfirms by availability.",
    CHN: "参考价格，管理员会根据空档再次确认。"
  },
  "Chưa có phòng phù hợp": { ENG: "No matching rooms yet", CHN: "暂无匹配房间" },
  "Thử đổi địa điểm, bỏ bớt tiện ích hoặc chọn gói lưu trú khác để xem thêm lựa chọn.": {
    ENG: "Try changing location, removing amenities or choosing another stay package.",
    CHN: "可尝试更换位置、减少设施筛选或选择其他套餐。"
  },

  "Studio mang cảm giác riêng tư, hiện đại và có điểm nhấn bồn tắm. Phù hợp cho staycation couple, nghỉ ngắn ngày hoặc chụp hình lifestyle.": {
    ENG: "A private, modern studio with a bathtub highlight. Great for couple staycations, short rests or lifestyle shoots.",
    CHN: "私密现代的 studio，亮点是浴缸。适合情侣 staycation、短住或生活方式拍摄。"
  },
  "Không gian tone tối sang, nội thất hiện đại và riêng tư. Phù hợp cho khách thích vibe noir, trầm, gọn và có gu.": {
    ENG: "A dark, polished and private space with modern furniture. Suits guests who like a noir, calm and tasteful vibe.",
    CHN: "深色高级、现代且私密的空间，适合喜欢 noir、沉稳、简洁且有品味的客人。"
  },
  "Một layout có tính thẩm mỹ cao, nổi bật với bồn tắm rời, cửa vòm và ánh sáng đẹp. Phù hợp định vị như phòng signature của hệ thống.": {
    ENG: "A highly aesthetic layout with a freestanding bathtub, arches and beautiful light. Positioned as the system's signature room.",
    CHN: "审美感很强的房型，独立浴缸、拱门和漂亮光线是亮点，适合作为系统招牌房。"
  },
  "Không gian ấm, mềm và hiện đại, phù hợp cho khách muốn một căn phòng riêng tư, dễ chịu nhưng vẫn có cảm giác cao cấp.": {
    ENG: "A warm, soft and modern room for guests who want privacy, comfort and a premium feel.",
    CHN: "温暖、柔和且现代的空间，适合想要私密、舒适又带高级感的客人。"
  },
  "Studio nhỏ gọn, tối giản và dễ tiếp cận hơn về giá. Phù hợp khách cần một không gian riêng tư, sạch đẹp, tiện lợi.": {
    ENG: "A compact, minimal studio with a more accessible price. Good for guests who need a private, clean and convenient space.",
    CHN: "小巧简约、价格更友好的 studio，适合需要私密、干净、方便空间的客人。"
  },
  "Bồn tắm": { ENG: "Bathtub", CHN: "浴缸" },
  "View thoáng": { ENG: "Open view", CHN: "开阔视野" },
  "Couple": { ENG: "Couple", CHN: "情侣" },
  "Tone tối": { ENG: "Dark tone", CHN: "深色调" },
  "Cửa vòm": { ENG: "Arch details", CHN: "拱门" },
  "Ấm sang": { ENG: "Warm luxury", CHN: "温暖高级" },
  "Private": { ENG: "Private", CHN: "私密" },
  "Compact": { ENG: "Compact", CHN: "紧凑" },

  "Wi-Fi": { ENG: "Wi-Fi", CHN: "Wi-Fi" },
  "Máy lạnh": { ENG: "Air conditioning", CHN: "空调" },
  "TV / giải trí": { ENG: "TV / entertainment", CHN: "电视 / 娱乐" },
  "Check-in tự túc": { ENG: "Self check-in", CHN: "自助入住" },
  "Hỗ trợ nhanh": { ENG: "Fast support", CHN: "快速支持" },
  "Góc chụp đẹp": { ENG: "Photo corner", CHN: "拍照角落" },
  "Gửi xe": { ENG: "Parking", CHN: "停车" },
  "Bếp nhỏ": { ENG: "Small kitchen", CHN: "小厨房" },
  "Giặt ủi": { ENG: "Laundry", CHN: "洗衣" }
});

Object.assign(textTranslations, {
  "Ngày": { ENG: "Day", CHN: "按天" },
  "Sắp kín": { ENG: "Almost full", CHN: "即将满房" },
  "Tạm khóa": { ENG: "Paused", CHN: "暂时关闭" },
  "Chọn lịch stay": { ENG: "Choose stay details", CHN: "选择入住信息" },
  "Tối đa 2 khách/phòng. Unite sẽ xác nhận lịch trống và giá cuối trước khi chốt.": {
    ENG: "Maximum 2 guests per room. Unite reconfirms availability and the final rate.",
    CHN: "每间房最多2位客人。管理员会再次确认空档和最终价格。"
  },
  "Xem": { ENG: "View", CHN: "查看" },
  "Premium": { ENG: "Premium", CHN: "高级" },
  "Couple bathtub": { ENG: "Couple bathtub", CHN: "情侣浴缸房" },
  "Private cinema": { ENG: "Private cinema", CHN: "私密影院房" },
  "Signature bathtub": { ENG: "Signature bathtub", CHN: "招牌浴缸房" },
  "Romantic bathtub": { ENG: "Romantic bathtub", CHN: "浪漫浴缸房" },
  "Warm studio": { ENG: "Warm studio", CHN: "温暖 studio" },
  "Budget studio": { ENG: "Budget studio", CHN: "高性价比 studio" },
  "Chill boutique · bồn tắm · cửa kính thoáng": { ENG: "Chill boutique · bathtub · airy glass", CHN: "轻松精品 · 浴缸 · 通透玻璃" },
  "Dark modern · riêng tư · cá tính": { ENG: "Dark modern · private · characterful", CHN: "深色现代 · 私密 · 有个性" },
  "Signature studio · cửa vòm · bồn tắm": { ENG: "Signature studio · arches · bathtub", CHN: "招牌 studio · 拱门 · 浴缸" },
  "Warm luxury · cozy · private stay": { ENG: "Warm luxury · cozy · private stay", CHN: "温暖高级 · 舒适 · 私密入住" },
  "Compact · giá tốt · tối giản": { ENG: "Compact · good value · minimal", CHN: "紧凑 · 高性价比 · 极简" }
});

Object.assign(textTranslations, {
  "Riêng tư": { ENG: "Private", CHN: "私密" },
  "Thoải mái": { ENG: "Comfortable", CHN: "舒适" },
  "Dễ chịu": { ENG: "Easy", CHN: "轻松" },
  "Xem bộ sưu tập": { ENG: "View collection", CHN: "查看房源" },
  "Chi nhánh Nhiêu Tứ": { ENG: "Nhieu Tu branch", CHN: "Nhiêu Tứ 分店" },
  "Chi nhánh Phan Tây Hồ": { ENG: "Phan Tay Ho branch", CHN: "Phan Tây Hồ 分店" },
  "Chi nhánh Lê Văn Sĩ": { ENG: "Le Van Si branch", CHN: "Lê Văn Sĩ 分店" },
  "chi nhánh Nhiêu Tứ": { ENG: "Nhieu Tu branch", CHN: "Nhiêu Tứ 分店" },
  "chi nhánh Phan Tây Hồ": { ENG: "Phan Tay Ho branch", CHN: "Phan Tây Hồ 分店" },
  "chi nhánh Lê Văn Sĩ": { ENG: "Le Van Si branch", CHN: "Lê Văn Sĩ 分店" },
  "Nhiêu Tứ": { ENG: "Nhieu Tu", CHN: "Nhiêu Tứ" },
  "Phan Tây Hồ": { ENG: "Phan Tay Ho", CHN: "Phan Tây Hồ" },
  "Lê Văn Sĩ": { ENG: "Le Van Si", CHN: "Lê Văn Sĩ" },
  "Hiện có các layout tại chi nhánh Nhiêu Tứ và chi nhánh Phan Tây Hồ, đều ở khu Phú Nhuận.": {
    ENG: "Current layouts are available at the Nhieu Tu branch and the Phan Tay Ho branch, both in Phu Nhuan.",
    CHN: "目前房型位于 Nhiêu Tứ 分店和 Phan Tây Hồ 分店，均在富润区。"
  },
  "Hiện có các layout tại chi nhánh Nhiêu Tứ, Phan Tây Hồ và Lê Văn Sĩ, đều ở khu Phú Nhuận.": {
    ENG: "Current layouts are available at the Nhieu Tu, Phan Tay Ho and Le Van Si branches, all in Phu Nhuan.",
    CHN: "目前房型位于 Nhiêu Tứ、Phan Tây Hồ 和 Lê Văn Sĩ 分店，均在富润区。"
  },
  "Unite Staycation mang đến những không gian nghỉ ngơi riêng tư, tinh tế và giàu cảm xúc giữa lòng thành phố.": {
    ENG: "Unite Staycation was created to offer a private, refined and emotional space to rest.",
    CHN: "Unite Staycation 希望提供一个私密、精致且富有情绪感的休憩空间。"
  },
  "Ánh sáng, nội thất và từng góc nhỏ được chăm chút để mỗi kỳ nghỉ trở nên dễ chịu, thoải mái và đáng nhớ hơn.": {
    ENG: "From lighting and furniture to every small corner, each detail is cared for so you can relax, enjoy the moment and keep meaningful memories with someone you love.",
    CHN: "从光线、家具到房间里的每个小角落，都经过细心安排，让你放松享受，并与重要的人留下值得记住的时刻。"
  },
  "Số đêm": { ENG: "Nights", CHN: "晚数" },
  "Cho đặt theo ngày hoặc nhiều ngày.": { ENG: "For day stays or multi-night stays.", CHN: "适合按天或多晚入住。" },
  "Theo ngày · 1 đêm": { ENG: "By day · 1 night", CHN: "按天 · 1晚" },
  "Không có": { ENG: "None", CHN: "无" },
  "Fanpage chính": { ENG: "Main fanpage", CHN: "官方主页" },
  "Fanpage Lê Văn Sỹ": { ENG: "Le Van Sy fanpage", CHN: "Lê Văn Sỹ 主页" },
  "Fanpage Tây Hồ": { ENG: "Tay Ho fanpage", CHN: "Tây Hồ 主页" },
  "Chọn kênh liên hệ": { ENG: "Choose a contact channel", CHN: "选择联系渠道" },
  "Nhắn đặt phòng": { ENG: "Message to book", CHN: "咨询预订" },
  "Nội dung liên hệ sẽ được chuẩn bị sẵn theo phòng và lịch đã chọn.": {
    ENG: "The site will copy the room details when you choose a channel.",
    CHN: "选择渠道时，网站会自动复制房间咨询内容。"
  },
  "Chọn Zalo, Fanpage, Instagram hoặc Hotline để gửi thông tin phòng đang xem.": {
    ENG: "Choose Zalo, Fanpage, Instagram or Hotline to send the room details.",
    CHN: "选择 Zalo、主页、Instagram 或热线发送当前房间信息。"
  },
  "Đã tính theo số đêm đã chọn, admin xác nhận lại lịch trống.": {
    ENG: "Calculated by selected nights. Unite reconfirms availability.",
    CHN: "已按所选晚数计算，管理员会再次确认空房。"
  },
  "Layout đã chọn được ưu tiên hiển thị đầu danh sách.": {
    ENG: "Your selected room is pinned at the top of the list.",
    CHN: "你刚选择的房间会优先显示在列表顶部。"
  }
});


Object.assign(textTranslations, {
  "được": { ENG: "to", CHN: "" },
  "nâng niu.": { ENG: "feel cared for.", CHN: "被细心呵护。" },
  "Mỗi kỳ nghỉ": { ENG: "Every stay", CHN: "每一次入住" },
  "đều xứng đáng": { ENG: "deserves", CHN: "都值得" },
  "Nội quy lưu trú": { ENG: "House Rules", CHN: "入住规则" },
  "House Rules": { VIE: "Nội quy lưu trú", ENG: "House Rules", CHN: "入住规则" },
  "Thank you for staying with us!": { VIE: "Cảm ơn quý khách đã lưu trú cùng Unite!", ENG: "Thank you for staying with us!", CHN: "感谢入住 Unite!" },
  "Scroll": { VIE: "Cuộn", ENG: "Scroll", CHN: "下滑" },
  "Ấm, riêng tư, dễ di chuyển": { ENG: "Warm, private and easy to reach", CHN: "温暖私密，出行方便" },
  "Chi nhánh Lê Văn Sĩ": { ENG: "Le Van Sy Branch", CHN: "黎文士分店" },
  "Chi nhánh Nhiêu Tứ": { ENG: "Nhieu Tu Branch", CHN: "Nhiêu Tứ 分店" },
  "Chi nhánh Phan Tây Hồ": { ENG: "Phan Tay Ho Branch", CHN: "潘西湖分店" },
  "Xem bộ sưu tập": { ENG: "View collection", CHN: "查看房源" },
  "Quản trị": { ENG: "Admin", CHN: "管理" },
  "Liên hệ nhanh": { ENG: "Quick contact", CHN: "快速联系" }
});

const houseRuleTranslations = {
  "Quý khách vui lòng check-in/check-out theo đúng thời gian đã đặt. Nếu có nhu cầu phát sinh thêm giờ, liên hệ với home để được hỗ trợ kịp thời. Trả phòng trễ từ 10 phút, home xin phép tính phụ thu <strong>99.000đ</strong>.": {
    ENG: "Please check in and check out at the booked time. If you need extra hours, contact the home team for support. Late check-out from 10 minutes is subject to a <strong>99,000đ</strong> surcharge.",
    CHN: "请按预订时间入住和退房。如需加时，请及时联系管家协助。退房延迟超过10分钟，将加收 <strong>99,000đ</strong>。"
  },
  "Không bỏ rác và các vật dụng khác ra ngoài ban công / cửa sổ.": {
    ENG: "Do not leave trash or any items outside the balcony or window.",
    CHN: "请勿将垃圾或物品放到阳台/窗外。"
  },
  "Không mang theo thú cưng.": {
    ENG: "Pets are not allowed.",
    CHN: "不可携带宠物。"
  },
  "Không sử dụng chất cấm.": {
    ENG: "Illegal substances are not allowed.",
    CHN: "禁止使用违禁品。"
  },
  "Không ở quá 2 người khi chưa có sự đồng ý của home.": {
    ENG: "Do not stay with more than 2 guests without approval from the home team.",
    CHN: "未经管家同意，不可超过2人入住。"
  },
  "Không thả giấy hay bất kỳ vật thể nào vào bồn cầu.": {
    ENG: "Do not flush paper or any objects down the toilet.",
    CHN: "请勿将纸张或任何物品丢入马桶。"
  },
  "Để chìa khóa, thẻ phòng lại vị trí cũ, tắt máy lạnh và các thiết bị điện trước khi ra khỏi phòng.": {
    ENG: "Return keys and room cards to their original place, then turn off the air conditioner and electrical devices before leaving.",
    CHN: "离开前请将钥匙/房卡放回原位，并关闭空调和电器。"
  },
  "Chủ động bảo quản tài sản cá nhân trong thời gian lưu trú. Kiểm tra kỹ tư trang cá nhân trước khi trả phòng.": {
    ENG: "Please look after personal belongings during the stay and check them carefully before check-out.",
    CHN: "入住期间请自行保管个人物品，退房前请仔细检查。"
  },
  "Bảo quản tài sản của home. Nếu làm hỏng/mất, sẽ tính theo bảng giá dịch vụ đính kèm.": {
    ENG: "Please take care of home property. Damaged or missing items will be charged according to the attached service price list.",
    CHN: "请爱护房内物品。如有损坏或遗失，将按附带服务价目表收费。"
  }
};



/* V13 COPY TONE PATCH
   Customer-facing text is written as hotel/booking UI copy, not internal assistant notes.
   This override keeps the original layout and only changes wording/translations. */
Object.assign(textTranslations, {
  "Chọn địa điểm, ngày và gói lưu trú để xem các layout phù hợp.": {
    ENG: "Select a location, date and stay package to view suitable layouts.",
    CHN: "选择位置、日期和入住套餐，查看合适房型。"
  },
  "Một chạm riêng tư": {
    ENG: "A private pause",
    CHN: "一处私享空间"
  },
  "giữa nhịp thành phố.": {
    ENG: "within the city rhythm.",
    CHN: "藏在城市节奏里。"
  },
  "Các phòng riêng được sắp xếp theo giờ hoặc theo ngày, với hình ảnh, bảng giá và quy trình xác nhận rõ ràng trước khi nhận phòng.": {
    ENG: "Private rooms are available by the hour or by the day, with clear photos, rates and confirmation before check-in.",
    CHN: "私密房间可按小时或按天预订，照片、价格与入住确认流程清晰呈现。"
  },
  "Chọn theo phong cách": {
    ENG: "Choose by style",
    CHN: "按风格选择"
  },
  "Mỗi layout mang một chất riêng: bồn tắm, tone tối, cửa vòm, ấm sang hoặc gọn gàng.": {
    ENG: "Each layout has its own character: bathtub, dark tone, arch details, warm luxury or clean simplicity.",
    CHN: "每个房型都有独特气质：浴缸、深色调、拱门、温暖高级感或简洁舒适。"
  },
  "Bảng giá rõ ràng": {
    ENG: "Clear rates",
    CHN: "价格清晰"
  },
  "Giá được phân theo 3 giờ, 4 giờ, 8 giờ và theo ngày để dễ lựa chọn.": {
    ENG: "Rates are grouped by 3 hours, 4 hours, 8 hours and full-day stays for easy comparison.",
    CHN: "价格按3小时、4小时、8小时与全天分组，方便比较。"
  },
  "Nội quy minh bạch": {
    ENG: "Transparent rules",
    CHN: "规则透明"
  },
  "Thông tin sức chứa, giờ trả phòng và phụ thu được thể hiện trước khi đặt.": {
    ENG: "Capacity, check-out time and surcharges are shown before booking.",
    CHN: "人数限制、退房时间与附加费用会在预订前说明。"
  },
  "Xác nhận nhanh": {
    ENG: "Quick confirmation",
    CHN: "快速确认"
  },
  "Đội ngũ Unite kiểm tra phòng trống, gửi hướng dẫn check-in và xác nhận giá cuối.": {
    ENG: "The Unite team checks availability, sends check-in guidance and confirms the final rate.",
    CHN: "Unite 团队会确认空房、发送入住指引并确认最终价格。"
  },
  "Chọn không gian phù hợp": {
    ENG: "Find the right space",
    CHN: "选择合适空间"
  },
  "Một vài nhóm lựa chọn giúp hành trình đặt phòng nhanh và rõ hơn.": {
    ENG: "These curated options make the booking journey quicker and easier to follow.",
    CHN: "这些精选分类让预订流程更快速、更清晰。"
  },
  "Một buổi riêng tư có điểm nhấn.": {
    ENG: "A private stay with a distinctive touch.",
    CHN: "一段带有亮点的私密时光。"
  },
  "ÉLAN Layout phù hợp cho dịp kỷ niệm, nghỉ ngắn hoặc chụp hình lifestyle.": {
    ENG: "ÉLAN Layout suits anniversaries, short rests and lifestyle photos.",
    CHN: "ÉLAN Layout 适合纪念日、短暂休息与生活方式拍摄。"
  },
  "Không gian signature nhiều điểm chạm thẩm mỹ.": {
    ENG: "A signature space with refined visual details.",
    CHN: "充满美学细节的招牌空间。"
  },
  "THE ART Layout nổi bật với đường cong, ánh sáng và bồn tắm rời.": {
    ENG: "THE ART Layout stands out with curves, natural light and a freestanding bathtub.",
    CHN: "THE ART Layout 以曲线、光线与独立浴缸为亮点。"
  },
  "Không gian riêng tư, gọn sạch và dễ đặt.": {
    ENG: "A private, clean and easy-to-book space.",
    CHN: "私密、干净且易于预订的空间。"
  },
  "MIDNIGHT Layout tối giản, tiện lợi và dễ tiếp cận về giá.": {
    ENG: "MIDNIGHT Layout is minimal, convenient and accessible in price.",
    CHN: "MIDNIGHT Layout 简洁便利，价格更易选择。"
  },
  "Tone trầm riêng tư, cá tính.": {
    ENG: "A moody, private and characterful stay.",
    CHN: "沉稳、私密且有个性的空间。"
  },
  "NOIR Layout hợp để xem phim, nghỉ vài giờ hoặc tận hưởng một khoảng lặng.": {
    ENG: "NOIR Layout suits movie time, short rests and quiet moments.",
    CHN: "NOIR Layout 适合看电影、短暂休息或享受安静时刻。"
  },
  "Unite Staycation mang đến những không gian nghỉ ngơi riêng tư,": {
    ENG: "Unite Staycation offers private places to rest,",
    CHN: "Unite Staycation 提供私密休憩空间，"
  },
  "tinh tế và giàu cảm xúc giữa lòng thành phố.": {
    ENG: "refined and full of feeling in the heart of the city.",
    CHN: "在城市中心呈现精致且富有情绪感的入住体验。"
  },
  "Ánh sáng, nội thất và từng góc nhỏ được chăm chút để mỗi kỳ nghỉ trở nên dễ chịu,": {
    ENG: "Lighting, furniture and every small corner are thoughtfully arranged so each stay feels calm,",
    CHN: "光线、家具与每个小角落都经过细心安排，让每一次入住更舒适，"
  },
  "thoải mái và đáng nhớ hơn.": {
    ENG: "comfortable and memorable.",
    CHN: "更放松，也更值得记住。"
  },
  "Không gian riêng tư, bảng giá rõ ràng và quy trình đặt phòng được sắp xếp để hành trình lưu trú diễn ra nhẹ nhàng.": {
    ENG: "Private spaces, clear rates and an organized booking flow make each stay feel effortless.",
    CHN: "私密空间、清晰价格与有序预订流程，让入住更轻松。"
  },
  "Xem bộ sưu tập, mở chi tiết từng layout và chọn đúng không gian phù hợp.": {
    ENG: "Explore the collection, open each layout and choose the space that fits.",
    CHN: "浏览房源合集，查看房型详情，选择合适空间。"
  },
  "Câu hỏi thường gặp trước khi đặt phòng.": {
    ENG: "Frequently asked questions before booking.",
    CHN: "预订前常见问题。"
  },
  "Các thông tin cần biết về sức chứa, giờ lưu trú, phụ thu và nội quy.": {
    ENG: "Key details about capacity, stay time, surcharges and house rules.",
    CHN: "关于人数、入住时间、附加费用与规则的重要信息。"
  },
  "Gửi mã phòng và khung giờ mong muốn, Unite sẽ kiểm tra lịch trống trước khi xác nhận.": {
    ENG: "Send the room code and preferred time; Unite will check availability before confirming.",
    CHN: "发送房间代码与期望时间，Unite 会先确认空房再完成预订。"
  },
  "Thông tin nội quy giúp hạn chế phát sinh về giờ, số khách hoặc phụ thu.": {
    ENG: "House rules help avoid unexpected time, guest-count or surcharge issues.",
    CHN: "入住规则可避免时间、人数或附加费用方面的临时问题。"
  },
  "Chọn phòng, xem giá và liên hệ Unite để được xác nhận lịch trống.": {
    ENG: "Choose a room, view rates and contact Unite to confirm availability.",
    CHN: "选择房间、查看价格，并联系 Unite 确认空房。"
  },
  "Chọn không gian phù hợp với lịch lưu trú.": {
    ENG: "Choose a space that fits the stay schedule.",
    CHN: "根据入住时间选择合适空间。"
  },
  "Chọn khu vực lưu trú.": {
    ENG: "Choose a stay area.",
    CHN: "选择入住区域。"
  },
  "Mỗi phòng tiêu chuẩn dành cho tối đa 2 khách. Trường hợp đặc biệt sẽ được xác nhận riêng.": {
    ENG: "Each standard room is arranged for up to 2 guests. Special cases are confirmed separately.",
    CHN: "每间标准房最多安排2位客人。特殊情况将另行确认。"
  },
  "Danh sách hiển thị theo địa điểm, ngày và gói lưu trú đã chọn.": {
    ENG: "The list updates by selected location, date and stay package.",
    CHN: "列表会根据所选位置、日期与入住套餐更新。"
  },
  "Layout đã chọn được ưu tiên hiển thị đầu danh sách.": {
    ENG: "The selected layout appears first in the list.",
    CHN: "已选房型会优先显示在列表顶部。"
  },
  "Đang xem": {
    ENG: "Viewing",
    CHN: "正在查看"
  },
  "Nội dung liên hệ sẽ được chuẩn bị sẵn theo phòng và lịch đã chọn.": {
    ENG: "The contact message is prepared with the selected room and schedule.",
    CHN: "联系内容会自动带上所选房间与时间。"
  },
  "Thông tin trước khi đặt": {
    ENG: "Before booking",
    CHN: "预订前信息"
  },
  "Chọn gói lưu trú": {
    ENG: "Choose a stay package",
    CHN: "选择入住套餐"
  },
  "Quy trình đặt phòng rõ ràng.": {
    ENG: "A clear booking flow.",
    CHN: "清晰的预订流程。"
  },
  "Vị trí và điểm kết nối gần đây.": {
    ENG: "Location and nearby connections.",
    CHN: "位置与周边连接。"
  },
  "Có thể xem thêm": {
    ENG: "More to explore",
    CHN: "更多可选"
  },
  "Các layout cùng phong cách.": {
    ENG: "Other layouts with a similar feel.",
    CHN: "相近风格的其他房型。"
  },
  "Đã cập nhật ngôn ngữ hiển thị.": {
    ENG: "Display language updated.",
    CHN: "显示语言已更新。"
  },
  "Tối đa 2 khách/phòng. Unite sẽ xác nhận lịch trống và giá cuối trước khi chốt.": {
    ENG: "Up to 2 guests per room. Unite confirms availability and the final rate before booking.",
    CHN: "每间房最多2位客人。Unite 会在确认前核对空房与最终价格。"
  }
});


// V14: Room detail mobile + multilingual copy cleanup.
// Các key này đặt trước translationLookup để đổi qua lại VI/EN/CN ổn định.
Object.assign(textTranslations, {
  "Tổng quan": { ENG: "Overview", CHN: "概览" },
  "Gói lưu trú": { ENG: "Stay packages", CHN: "套餐" },
  "Hình ảnh": { ENG: "Photos", CHN: "图片" },
  "Hướng dẫn": { ENG: "Guide", CHN: "指引" },
  "FAQ": { ENG: "FAQ", CHN: "FAQ" },
  "Đánh giá phòng": { ENG: "Room reviews", CHN: "房间评价" },
  "UNITE PICK": { ENG: "UNITE PICK", CHN: "UNITE 推荐" },
  "Rất tốt": { ENG: "Very good", CHN: "很不错" },
  "Rất được yêu thích": { ENG: "Guest favourite", CHN: "人气之选" },
  "Gọn sạch, dễ đặt": { ENG: "Clean and easy", CHN: "干净好订" },
  "68 đánh giá": { ENG: "68 reviews", CHN: "68条评价" },
  "86 đánh giá": { ENG: "86 reviews", CHN: "86条评价" },
  "41 đánh giá": { ENG: "41 reviews", CHN: "41条评价" },
  "Sức chứa": { ENG: "Capacity", CHN: "容纳人数" },
  "Số lượng": { ENG: "Inventory", CHN: "房间数量" },
  "Trạng thái": { ENG: "Status", CHN: "状态" },
  "Khung giờ": { ENG: "Time slots", CHN: "时段" },
  "Check-in": { ENG: "Check-in", CHN: "入住" },
  "Phụ thu trễ": { ENG: "Late fee", CHN: "延时费" },
  "Tối đa 2 khách": { ENG: "Up to 2 guests", CHN: "最多2位客人" },
  "Theo lịch đã đặt": { ENG: "By confirmed booking", CHN: "按预订时间" },
  "Từ 10 phút": { ENG: "From 10 minutes", CHN: "10分钟起" },
  "Địa chỉ": { ENG: "Address", CHN: "地址" },
  "Unite sẽ gửi hướng dẫn check-in chi tiết sau khi xác nhận lịch.": {
    ENG: "Unite will send detailed check-in instructions after confirmation.",
    CHN: "确认后，Unite 会发送详细入住指引。"
  },
  "Chọn gói lưu trú": { ENG: "Choose package", CHN: "选择套餐" },
  "Xem hình phòng": { ENG: "View photos", CHN: "查看图片" },
  "Stay story": { ENG: "Stay story", CHN: "入住氛围" },
  "Thông tin trước khi đặt": { ENG: "Before booking", CHN: "预订前须知" },
  "Phù hợp cho": { ENG: "Best for", CHN: "适合" },
  "Tiện nghi chính": { ENG: "Amenities", CHN: "主要设施" },
  "Thông tin thường được quan tâm trước khi đến.": {
    ENG: "Key details guests often check before arrival.",
    CHN: "到店前常看的重点信息。"
  },
  "Gói linh hoạt theo lịch ở.": { ENG: "Flexible packages for your stay.", CHN: "灵活选择入住套餐。" },
  "Phổ biến": { ENG: "Popular", CHN: "热门" },
  "Linh hoạt": { ENG: "Flexible", CHN: "灵活" },
  "Phù hợp cho một buổi nghỉ nhanh, xem phim hoặc đổi không gian.": {
    ENG: "Good for a quick rest, movie time or a short change of scene.",
    CHN: "适合短暂休息、看电影或换个空间。"
  },
  "Phù hợp cho lịch lưu trú dài hơn, nghỉ ngơi, làm việc nhẹ hoặc chụp hình.": {
    ENG: "Good for a longer stay, light work, relaxing or taking photos.",
    CHN: "适合更长时间休息、轻办公或拍照。"
  },
  "Giá hiển thị là giá tham khảo. Unite sẽ xác nhận lại theo ngày, khung giờ và tình trạng phòng thực tế.": {
    ENG: "Displayed rates are for reference. Unite will reconfirm by date, time slot and real availability.",
    CHN: "页面价格为参考价。Unite 会根据日期、时段与实际房态再次确认。"
  },
  "Trước khi đến": { ENG: "Before arrival", CHN: "到店前" },
  "Quy trình đặt phòng rõ ràng.": { ENG: "A clear booking flow.", CHN: "清晰的预订流程。" },
  "Chọn gói": { ENG: "Choose a package", CHN: "选择套餐" },
  "Chọn 3h, 4h, 8h hoặc ngày theo lịch cần nghỉ.": {
    ENG: "Choose 3h, 4h, 8h or day stay based on your plan.",
    CHN: "按行程选择3小时、4小时、8小时或按天入住。"
  },
  "Nhắn mã phòng": { ENG: "Send room code", CHN: "发送房型编号" },
  "Xác nhận": { ENG: "Confirm", CHN: "确认" },
  "Unite gửi giá cuối, giờ nhận phòng và lưu ý thanh toán.": {
    ENG: "Unite sends the final rate, check-in time and payment notes.",
    CHN: "Unite 会发送最终价格、入住时间和付款说明。"
  },
  "Nhận hướng dẫn": { ENG: "Receive guide", CHN: "接收入住指引" },
  "Khách nhận địa chỉ, cách vào phòng và nội quy cần biết.": {
    ENG: "You receive the address, entry guide and key house rules.",
    CHN: "客人会收到地址、进房方式和必要入住规则。"
  },
  "Xung quanh stay": { ENG: "Nearby", CHN: "周边" },
  "Vị trí và điểm kết nối gần đây.": { ENG: "Location and nearby connections.", CHN: "位置与附近连接点。" },
  "Guest mood": { ENG: "Guest mood", CHN: "客人反馈" },
  "Khách thường thích sự riêng tư, ảnh phòng rõ, giá theo khung giờ dễ hiểu và admin xác nhận nhanh trước khi đến. Điểm này là nội dung mô phỏng để tăng độ dễ hiểu cho trang chi tiết.": {
    ENG: "Guests often like the privacy, clear room photos, simple time-slot pricing and quick confirmation before arrival.",
    CHN: "客人通常喜欢这里的私密感、清晰房间照片、简单时段价格和到店前快速确认。"
  },
  "Câu hỏi thường gặp.": { ENG: "Frequently asked questions.", CHN: "常见问题。" },
  "Có thể xem thêm": { ENG: "You may also like", CHN: "还可看看" },
  "Các layout cùng phong cách.": { ENG: "Other layouts with a similar feel.", CHN: "相近风格的其他房型。" },
  "Đặt phòng": { ENG: "Book", CHN: "预订" },
  "Room mood": { ENG: "Room mood", CHN: "房间氛围" },
  "Stay note": { ENG: "Stay note", CHN: "入住提示" },
  "Có các gói linh hoạt theo từng khung giờ. Vui lòng xác nhận tình trạng phòng trước khi đặt.": {
    ENG: "Flexible packages are available by time slot. Please confirm availability before booking.",
    CHN: "可按不同时段灵活选择套餐，预订前请先确认房态。"
  },
  "Wi-Fi ổn định": { ENG: "Stable Wi-Fi", CHN: "稳定 Wi‑Fi" },
  "Máy lạnh riêng": { ENG: "Private air conditioning", CHN: "独立空调" },
  "Bồn tắm thư giãn": { ENG: "Relaxing bathtub", CHN: "放松浴缸" },
  "Phòng tắm riêng": { ENG: "Private bathroom", CHN: "独立卫浴" },
  "Phù hợp xem phim, nghe nhạc, gọi video hoặc làm việc nhẹ.": {
    ENG: "Good for movies, music, video calls or light work.",
    CHN: "适合看电影、听音乐、视频通话或轻办公。"
  },
  "Không gian riêng tư, dễ chỉnh nhiệt theo nhu cầu.": {
    ENG: "A private space with easy temperature control.",
    CHN: "私密空间，可按需求调节温度。"
  },
  "Chuẩn bị tốt cho stay couple, sinh nhật hoặc nghỉ ngắn.": {
    ENG: "Well suited for couple stays, birthdays or short rests.",
    CHN: "适合情侣入住、生日或短暂休息。"
  },
  "Sạch gọn, riêng tư, đủ tiện nghi cơ bản.": {
    ENG: "Clean, private and equipped with the essentials.",
    CHN: "干净私密，基础设施齐全。"
  },
  "Phù hợp một buổi xem phim, nghỉ ngơi hoặc chill nhẹ.": {
    ENG: "Good for a movie, a rest or an easy chill session.",
    CHN: "适合看电影、休息或轻松放空。"
  },
  "Hướng dẫn được gửi trước giờ nhận phòng để khách chủ động.": {
    ENG: "Instructions are sent before check-in so you can arrive smoothly.",
    CHN: "入住前会发送指引，方便客人主动安排。"
  },
  "Unite xác nhận lịch, giá và lưu ý trước khi nhận phòng.": {
    ENG: "Unite confirms schedule, rate and key notes before arrival.",
    CHN: "Unite 会在到店前确认时间、价格和注意事项。"
  },
  "Couple staycation": { ENG: "Couple staycation", CHN: "情侣 staycation" },
  "Nghỉ vài giờ": { ENG: "A few-hour rest", CHN: "短时休息" },
  "Chụp lifestyle": { ENG: "Lifestyle photos", CHN: "生活方式拍照" },
  "Xem phim riêng tư": { ENG: "Private movie time", CHN: "私密观影" },
  "Giá dễ tiếp cận": { ENG: "Accessible price", CHN: "价格友好" },
  "Dịp đặc biệt": { ENG: "Special moments", CHN: "特别时刻" },
  "Phan Xích Long": { ENG: "Phan Xich Long", CHN: "Phan Xich Long" },
  "Sân bay Tân Sơn Nhất": { ENG: "Tan Son Nhat Airport", CHN: "新山一机场" },
  "Trung tâm Quận 1": { ENG: "District 1 center", CHN: "第一郡中心" },
  "Khu Phan Tây Hồ": { ENG: "Phan Tay Ho area", CHN: "Phan Tây Hồ 区域" },
  "Trục Hoàng Văn Thụ": { ENG: "Hoang Van Thu axis", CHN: "Hoàng Văn Thụ 主干道" },
  "Nhiều quán ăn, cafe và tiện mua đồ trước khi check-in.": {
    ENG: "Many food, coffee and convenience options before check-in.",
    CHN: "附近有餐饮、咖啡与便利购物选择。"
  },
  "Di chuyển thuận tiện cho khách cần nghỉ ngắn trước hoặc sau chuyến bay.": {
    ENG: "Convenient for a short rest before or after a flight.",
    CHN: "适合航班前后短暂休息。"
  },
  "Phù hợp ghé chơi, chụp hình hoặc ăn tối rồi quay về nghỉ riêng tư.": {
    ENG: "Good for going out, photos or dinner before returning to a private stay.",
    CHN: "适合外出、拍照或晚餐后回到私密空间休息。"
  },
  "Hẻm yên tĩnh, dễ đặt xe và nhiều lựa chọn ăn uống gần phòng.": {
    ENG: "Quiet alley, easy ride booking and many nearby food options.",
    CHN: "安静巷内，叫车方便，附近有多种餐饮选择。"
  },
  "Gần cafe, nhà hàng, cửa hàng tiện lợi và các điểm hẹn nhẹ nhàng.": {
    ENG: "Near cafés, restaurants, convenience stores and easy meeting spots.",
    CHN: "靠近咖啡馆、餐厅、便利店和轻松约会点。"
  },
  "Thuận tiện đi sân bay, Quận 1, Bình Thạnh hoặc Gò Vấp.": {
    ENG: "Convenient to the airport, District 1, Binh Thanh or Go Vap.",
    CHN: "前往机场、第一郡、平盛或鹅邑较方便。"
  }
});

const languageTextSources = new WeakMap();

const translationLookup = Object.entries(textTranslations).reduce((map, [source, variants]) => {
  map.set(source, source);
  map.set(source.replace(/\s+/g, " "), source);
  Object.values(variants).forEach(value => {
    map.set(value, source);
    map.set(String(value).replace(/\s+/g, " "), source);
  });
  return map;
}, new Map());

const translatePlainText = (source, lang) => {
  if (lang === "VIE") return textTranslations[source]?.VIE || source;

  const exact = textTranslations[source]?.[lang];
  if (exact) return exact;


  if (/^Nhắn đặt (.+)$/.test(source)) {
    const code = source.match(/^Nhắn đặt (.+)$/)[1];
    return lang === "ENG" ? `Book ${code}` : `咨询 ${code}`;
  }

  if (/^Gửi mã (.+) để admin kiểm tra tình trạng phòng\.$/.test(source)) {
    const code = source.match(/^Gửi mã (.+) để admin kiểm tra tình trạng phòng\.$/)[1];
    return lang === "ENG"
      ? `Send code ${code} so Unite can check availability.`
      : `发送编号 ${code}，Unite 将为你确认房态。`;
  }

  if (/^Đang xem (.+)\. Chọn ngày, gói và số khách để kiểm tra lịch phù hợp\.$/.test(source)) {
    const code = source.match(/^Đang xem (.+)\. Chọn ngày, gói và số khách để kiểm tra lịch phù hợp\.$/)[1];
    return lang === "ENG"
      ? `Viewing ${code}. Choose date, package and guests to check availability.`
      : `正在查看 ${code}。请选择日期、套餐和人数以确认空档。`;
  }

  if (/^(.+) images$/.test(source)) {
    const count = source.match(/^(.+) images$/)[1];
    return lang === "ENG" ? `${count} images` : `${count} 张图片`;
  }

  if (/^(\d+) phòng$/.test(source)) {
    const count = source.match(/^(\d+) phòng$/)[1];
    return lang === "ENG" ? `${count} rooms` : `${count}间房`;
  }

  if (/^(.+) là lựa chọn (.+) dành cho những buổi staycation cần không gian đẹp, sạch và có cảm giác tách khỏi nhịp vội bên ngoài\.$/.test(source)) {
    const [, name] = source.match(/^(.+) là lựa chọn (.+) dành cho những buổi staycation cần không gian đẹp, sạch và có cảm giác tách khỏi nhịp vội bên ngoài\.$/);
    return lang === "ENG"
      ? `${name} is a private stay for guests who want a clean, beautiful room and a calm break from the city rhythm.`
      : `${name} 适合想要干净、好看且能暂时离开城市节奏的私密入住。`;
  }

  const translateDateFragment = (value = "") => {
    const weekdayMap = lang === "ENG"
      ? { "Thứ 2": "Mon", "Thứ 3": "Tue", "Thứ 4": "Wed", "Thứ 5": "Thu", "Thứ 6": "Fri", "Thứ 7": "Sat", "CN": "Sun" }
      : { "Thứ 2": "周一", "Thứ 3": "周二", "Thứ 4": "周三", "Thứ 5": "周四", "Thứ 6": "周五", "Thứ 7": "周六", "CN": "周日" };
    return Object.entries(weekdayMap).reduce((text, [from, to]) => text.replace(from, to), value);
  };

  if (/^(\d+) lựa chọn$/.test(source)) {
    const count = source.match(/^(\d+)/)[1];
    return lang === "ENG" ? `${count} options` : `${count} 个选择`;
  }

  if (/^Chi nhánh (.+), Phú Nhuận$/.test(source)) {
    const [, branch] = source.match(/^Chi nhánh (.+), Phú Nhuận$/);
    const branchName = translatePlainText(`Chi nhánh ${branch}`, lang);
    const district = translatePlainText("Phú Nhuận", lang);
    return lang === "ENG" ? `${branchName}, ${district}` : `${branchName}，${district}`;
  }

  if (/^(\d+) layout phù hợp cho (.+), nhận (.+), trả (.+), gói (.+), (.+)\.$/.test(source)) {
    const [, count, place, date, checkout, duration, guests] = source.match(/^(\d+) layout phù hợp cho (.+), nhận (.+), trả (.+), gói (.+), (.+)\.$/);
    const translatedPlace = translatePlainText(place, lang);
    const translatedDate = translateDateFragment(date);
    const translatedCheckout = translateDateFragment(checkout);
    const translatedDuration = translatePlainText(duration, lang);
    const translatedGuests = translatePlainText(guests, lang);
    return lang === "ENG"
      ? `${count} matching layouts for ${translatedPlace}, check-in ${translatedDate}, check-out ${translatedCheckout}, package ${translatedDuration}, ${translatedGuests}.`
      : `${count}个匹配房型，位置：${translatedPlace}，入住：${translatedDate}，退房：${translatedCheckout}，套餐：${translatedDuration}，${translatedGuests}。`;
  }

  if (/^(\d+) layout phù hợp cho (.+), nhận (.+), gói (.+), (.+)\.$/.test(source)) {
    const [, count, place, date, duration, guests] = source.match(/^(\d+) layout phù hợp cho (.+), nhận (.+), gói (.+), (.+)\.$/);
    const translatedPlace = translatePlainText(place, lang);
    const translatedDate = translateDateFragment(date);
    const translatedDuration = translatePlainText(duration, lang);
    const translatedGuests = translatePlainText(guests, lang);
    return lang === "ENG"
      ? `${count} matching layouts for ${translatedPlace}, check-in ${translatedDate}, package ${translatedDuration}, ${translatedGuests}.`
      : `${count}个匹配房型，位置：${translatedPlace}，入住：${translatedDate}，套餐：${translatedDuration}，${translatedGuests}。`;
  }

  if (/^(\d+) phòng · (.+)$/.test(source)) {
    const [, count, status] = source.match(/^(\d+) phòng · (.+)$/);
    const translatedStatus = translatePlainText(status, lang);
    return lang === "ENG" ? `${count} rooms · ${translatedStatus}` : `${count}间 · ${translatedStatus}`;
  }

  if (/^(\d+) người lớn(?:, (\d+) trẻ em)?$/.test(source)) {
    const [, adults, children] = source.match(/^(\d+) người lớn(?:, (\d+) trẻ em)?$/);
    if (lang === "ENG") return `${adults} adult${Number(adults) > 1 ? "s" : ""}${children ? `, ${children} child${Number(children) > 1 ? "ren" : ""}` : ""}`;
    return `${adults}位成人${children ? `，${children}位儿童` : ""}`;
  }

  if (/^(\d+) trẻ em$/.test(source)) {
    const children = source.match(/^(\d+) trẻ em$/)[1];
    return lang === "ENG" ? `${children} child${Number(children) > 1 ? "ren" : ""}` : `${children}位儿童`;
  }

  if (/^(.+) · ([0-9/-]+) · (.+) · (\d+) NL(?:, (\d+) trẻ em)?$/.test(source)) {
    const [, place, date, stay, adults, children] = source.match(/^(.+) · ([0-9/-]+) · (.+) · (\d+) NL(?:, (\d+) trẻ em)?$/);
    const translatedPlace = translatePlainText(place, lang);
    const translatedStay = translatePlainText(stay, lang);
    const translatedGuests = lang === "ENG"
      ? `${adults} adult${Number(adults) > 1 ? "s" : ""}${children ? `, ${children} child${Number(children) > 1 ? "ren" : ""}` : ""}`
      : `${adults}位成人${children ? `，${children}位儿童` : ""}`;
    return `${translatedPlace} · ${date} · ${translatedStay} · ${translatedGuests}`;
  }

  if (/^© Unite Staycation · (.+)$/.test(source)) {
    const label = source.match(/^© Unite Staycation · (.+)$/)[1];
    return `© Unite Staycation · ${translatePlainText(label, lang)}`;
  }

  if (/^Từ$/.test(source)) return lang === "ENG" ? "From" : "起";
  if (/^Từ (.+)$/.test(source)) {
    const price = source.match(/^Từ (.+)$/)[1];
    return lang === "ENG" ? `From ${price}` : `${price}起`;
  }
  if (/^(\d+) bước$/.test(source)) {
    const count = source.match(/^(\d+) bước$/)[1];
    return lang === "ENG" ? `${count} steps` : `${count}步`;
  }
  if (/^\/ Đêm$/.test(source)) return lang === "ENG" ? "/ night" : "/晚";
  if (/^\/ (\d+) đêm$/.test(source)) {
    const nights = source.match(/^\/ (\d+) đêm$/)[1];
    return lang === "ENG" ? `/ ${nights} night${Number(nights) > 1 ? "s" : ""}` : `/ ${nights}晚`;
  }
  if (/^(\d+) đêm$/.test(source)) {
    const nights = source.match(/^(\d+) đêm$/)[1];
    return lang === "ENG" ? `${nights} night${Number(nights) > 1 ? "s" : ""}` : `${nights}晚`;
  }
  if (/^Theo ngày · (\d+) đêm$/.test(source)) {
    const nights = source.match(/^Theo ngày · (\d+) đêm$/)[1];
    return lang === "ENG"
      ? `By day · ${nights} night${Number(nights) > 1 ? "s" : ""}`
      : `按天 · ${nights}晚`;
  }
  if (/^(\d+) tiếng$/.test(source)) {
    const hours = source.match(/^(\d+) tiếng$/)[1];
    return lang === "ENG" ? `${hours} hours` : `${hours}小时`;
  }
  if (/^(.+) \/ 3 tiếng$/.test(source)) {
    const price = source.match(/^(.+) \/ 3 tiếng$/)[1];
    return lang === "ENG" ? `${price} / 3 hours` : `${price} / 3小时`;
  }

  return source;
};

const languageElementTargets = [
  { selector: ".brand-copy small", text: { VIE: "Feel at home", ENG: "Feel at home", CHN: "家的舒适感" } },
  { selector: ".top-nav a[href='#about']", text: { VIE: "Về Unite", ENG: "About", CHN: "关于" } },
  { selector: ".top-nav a[href='#roomReel']", text: { VIE: "Bộ sưu tập", ENG: "Collection", CHN: "房源" } },
  { selector: ".top-nav a[href='#homes']", text: { VIE: "Địa điểm", ENG: "Locations", CHN: "位置" } },
  { selector: ".top-nav a[href='#priceList'], .top-nav a[href='index.html#priceList']", text: { VIE: "Bảng giá", ENG: "Rates", CHN: "价格" } },
  { selector: ".top-nav a[href='#rules'], .top-nav a[href='index.html#rules']", text: { VIE: "Nội quy", ENG: "Rules", CHN: "规则" } },
  { selector: ".top-nav a[href='#bookingFlow']", text: { VIE: "Cách đặt", ENG: "How to book", CHN: "预订方式" } },
  { selector: ".top-nav a[href='index.html#contact']", text: { VIE: "Liên hệ", ENG: "Contact", CHN: "联系" } },
  { selector: ".top-nav a[href='admin.html']", text: { VIE: "Quản trị", ENG: "Admin", CHN: "管理" } },
  { selector: ".top-nav a[href='index.html']", text: { VIE: "Trang chính", ENG: "Home", CHN: "首页" } },
  { selector: ".nav-cta", text: { VIE: "Đặt phòng", ENG: "Book", CHN: "预订" } },
  { selector: ".contact-copy .section-kicker", text: { VIE: "Liên hệ", ENG: "Contact", CHN: "联系" } },
  { selector: ".contact-title .title-row:first-child", text: { VIE: "Giữ lịch", ENG: "Reserve a", CHN: "预留" } },
  { selector: ".contact-title .title-row em", text: { VIE: "lưu trú riêng tư.", ENG: "private stay.", CHN: "私享入住。" } },
  { selector: ".floating-contact a[href='#contact']", text: { VIE: "Đặt phòng", ENG: "Book", CHN: "预订" } },
  { selector: ".floating-contact a[href='#priceList']", text: { VIE: "Xem giá", ENG: "Rates", CHN: "价格" } },
  { selector: ".about-copy h2.about-title .title-row:nth-child(1)", text: { VIE: "Mỗi kỳ nghỉ", ENG: "Every stay", CHN: "每一次入住" } },
  { selector: ".about-copy h2.about-title .title-row:nth-child(2)", text: { VIE: "đều xứng đáng", ENG: "deserves", CHN: "都值得" } },
  { selector: ".about-copy h2.about-title .title-row:nth-child(3)", html: { VIE: "được <em>chăm chút.</em>", ENG: "is <em>thoughtfully prepared.</em>", CHN: "皆被用心准备。" } },
  { selector: ".rules-card h2.rules-title", html: { VIE: "<span class=\"title-row\">Nội quy</span><span class=\"title-row\">lưu trú</span>", ENG: "<span class=\"title-row\">House</span><span class=\"title-row\">Rules</span>", CHN: "<span class=\"title-row\">入住</span><span class=\"title-row\">规则</span>" } },
  { selector: ".rules-subtitle", text: { VIE: "House Rules", ENG: "House Rules", CHN: "House Rules" } },
  { selector: ".thank-you", text: { VIE: "Thank you for staying with us!", ENG: "Thank you for staying with us!", CHN: "感谢入住 Unite!" } }
];

const detectSystemLanguage = () => {
  const raw = String(navigator.language || navigator.userLanguage || "vi").toLowerCase();
  if (raw.startsWith("zh") || raw.includes("hans") || raw.includes("hant")) return "CHN";
  if (raw.startsWith("en")) return "ENG";
  return "VIE";
};

const getStoredLanguage = () => {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved || detectSystemLanguage();
  } catch {
    return detectSystemLanguage();
  }
};

const writeStoredLanguage = (lang) => {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Language still changes for the current page even if storage is blocked.
  }
};

const applyLanguage = (lang = getStoredLanguage()) => {
  const selected = languageCodes[lang] ? lang : "VIE";
  document.documentElement.lang = languageCodes[selected];
  if (document.body) {
    document.body.dataset.lang = selected.toLowerCase();
    document.body.classList.toggle("is-chinese", selected === "CHN");
    document.body.classList.toggle("is-english", selected === "ENG");
  }

  const current = $("#languageToggle strong");
  if (current) current.textContent = selected;
  $$("[data-lang]").forEach(button => button.classList.toggle("active", button.dataset.lang === selected));

  if (!document.body) return;
  const ignored = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SVG", "PATH"]);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ignored.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node => {
    const original = node.nodeValue;
    const trimmed = original.trim();
    const compact = trimmed.replace(/\s+/g, " ");
    const source = languageTextSources.get(node) || translationLookup.get(trimmed) || translationLookup.get(compact) || compact;
    languageTextSources.set(node, source);

    const translated = translatePlainText(source, selected);
    if (translated === trimmed) return;
    node.nodeValue = original.replace(trimmed, translated);
  });

  languageElementTargets.forEach(({ selector, text, html }) => {
    $$(selector).forEach(element => {
      if (html) {
        element.innerHTML = html[selected] || html.VIE || element.innerHTML;
        return;
      }
      element.textContent = text?.[selected] || text?.VIE || element.textContent;
    });
  });
};

const toDateInputValue = (date = new Date()) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, "0");
  const day = String(copy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDestination = (value = "") => {
  const text = String(value || "").trim();
  if (text === "29 Nhiêu Tứ") return "Chi nhánh Nhiêu Tứ";
  if (text === "76/39 Phan Tây Hồ") return "Chi nhánh Phan Tây Hồ";
  if (text === "Lê Văn Sĩ" || text === "Lê Văn Sỹ") return "Chi nhánh Lê Văn Sĩ";
  return text;
};

const readStoredSmartBooking = () => {
  try {
    return JSON.parse(localStorage.getItem(SMART_BOOKING_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeStoredSmartBooking = (state) => {
  try {
    localStorage.setItem(SMART_BOOKING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The dock still works without persistence.
  }
};

const defaultContactChannels = [
  {
    id: "zalo",
    enabled: true,
    short: "ZA",
    label: "Zalo",
    url: "https://zalo.me/0902097755",
    note: "Nhắn Zalo chính, web tự copy nội dung phòng/ngày/gói.",
    template: "Xin chào Unite, mình muốn hỏi {{room}} tại {{destination}}. Lịch mong muốn: {{date}}, {{duration}}, {{guests}}. Link mình đang xem: {{url}}"
  },
  {
    id: "fanpage-main",
    enabled: true,
    short: "FB",
    label: "Fanpage chính",
    url: "https://www.facebook.com/share/1JYQHF6Ar5/?mibextid=wwXIfr",
    note: "Page chính Unite, phù hợp khách cần tư vấn chung.",
    template: "Unite ơi, mình cần tư vấn stay: {{room}} - {{destination}} - {{date}} - {{duration}} - {{guests}}. Link: {{url}}"
  },
  {
    id: "fanpage-le-van-sy",
    enabled: true,
    short: "LVS",
    label: "Fanpage Lê Văn Sỹ",
    url: "https://www.facebook.com/share/1EHkc77PoC/?mibextid=wwXIfr",
    note: "Kênh riêng cho khách quan tâm khu Lê Văn Sỹ.",
    template: "Unite Lê Văn Sỹ ơi, mình muốn hỏi {{room}}. Lịch: {{date}}, {{duration}}, {{guests}}. Link: {{url}}"
  },
  {
    id: "fanpage-tay-ho",
    enabled: true,
    short: "TH",
    label: "Fanpage Tây Hồ",
    url: "https://www.facebook.com/share/18pevnKYqa/?mibextid=wwXIfr",
    note: "Kênh riêng cho khách quan tâm khu Tây Hồ.",
    template: "Unite Tây Hồ ơi, mình muốn hỏi {{room}}. Lịch: {{date}}, {{duration}}, {{guests}}. Link: {{url}}"
  },
  {
    id: "instagram",
    enabled: true,
    short: "IG",
    label: "Instagram",
    url: "https://www.instagram.com/unite_staycation/",
    note: "Phù hợp khách xem ảnh rồi nhắn DM.",
    template: "Hi Unite, mình muốn hỏi phòng/stay này: {{room}}. Thời gian: {{date}}, {{duration}}, {{guests}}. Link: {{url}}"
  },
  {
    id: "hotline",
    enabled: true,
    short: "☎",
    label: "Hotline",
    url: "tel:0902097755",
    note: "Gọi nhanh khi khách cần xác nhận gấp.",
    template: "Khách muốn hỏi {{room}} tại {{destination}}, {{date}}, {{duration}}, {{guests}}."
  }
];

const readContactChannels = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CONTACT_CHANNEL_STORAGE_KEY) || "null");
    if (Array.isArray(stored) && stored.length) return stored;
  } catch {
    // Fall back to defaults below.
  }
  return defaultContactChannels.map(channel => ({ ...channel }));
};

const writeContactChannels = (channels) => {
  try {
    localStorage.setItem(CONTACT_CHANNEL_STORAGE_KEY, JSON.stringify(channels));
  } catch {
    // Static fallback: the default channels still render.
  }
};

const getContactContext = (overrides = {}) => {
  const params = new URLSearchParams(window.location.search);
  const stored = readStoredSmartBooking();
  const roomId = overrides.roomId || overrides.room || params.get("id") || params.get("room") || stored.room || "";
  const room = typeof rooms !== "undefined" ? rooms.find(item => item.id === roomId) : null;
  const destination = normalizeDestination(overrides.destination || params.get("destination") || room?.location || stored.destination || "Tất cả địa điểm");
  const date = overrides.date || params.get("date") || stored.date || toDateInputValue();
  const duration = overrides.duration || params.get("duration") || stored.duration || "3 tiếng";
  const nights = Math.max(1, Number(overrides.nights || params.get("nights") || stored.nights || 1));
  const adults = Number(overrides.adults || params.get("adults") || stored.adults || 2);
  const children = Number(overrides.children || params.get("children") || stored.children || 0);
  const guests = `${Math.max(1, adults)} người lớn${children > 0 ? `, ${children} trẻ em` : ""}`;
  const durationText = duration === "Ngày" ? `Theo ngày · ${nights} đêm` : duration;

  return {
    room: room ? `${room.name} (${room.id})` : (roomId ? `mã ${roomId}` : "chưa chọn phòng cụ thể"),
    roomId: room?.id || roomId || "chưa chọn",
    destination: destination === "all" ? "Tất cả địa điểm" : destination,
    date,
    duration: durationText,
    nights,
    guests,
    url: overrides.url || window.location.href
  };
};

const fillContactTemplate = (template = "", context = getContactContext()) => {
  const fallback = "🔖 [YÊU CẦU ĐẶT PHÒNG]\n- Phòng: {{room}}\n- Chi nhánh: {{destination}}\n- Ngày nhận: {{date}}\n- Gói: {{duration}}\n- Khách: {{guests}}\n\nXin chào Unite, mình muốn đặt phòng này. (Link: {{url}})";
  return (template || fallback).replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? "");
};

const channelHref = (channel, message) => {
  const rawUrl = (channel.url || "").trim();
  if (!rawUrl) return "#contact";
  const encoded = encodeURIComponent(message);
  const joiner = rawUrl.includes("?") ? "&" : "?";

  if (/^mailto:/i.test(rawUrl)) return `${rawUrl}${joiner}subject=Unite%20Staycation&body=${encoded}`;
  if (/wa\.me|whatsapp/i.test(rawUrl)) return `${rawUrl}${joiner}text=${encoded}`;
  if (/t\.me|telegram/i.test(rawUrl)) return `${rawUrl}${joiner}text=${encoded}`;
  if (/zalo\.me/i.test(rawUrl)) return `${rawUrl}${joiner}text=${encoded}`;
  return rawUrl;
};

const enabledContactChannels = () => readContactChannels().filter(channel => channel.enabled !== false);

const contactChannelHTML = (channel, context, className = "contact-item contact-channel") => {
  const getChannelIcon = (ch) => {
    const id = (ch.id || "").toLowerCase();
    const lbl = (ch.label || "").toLowerCase();
    
    if (id.includes('zalo') || id === 'za' || lbl.includes('zalo')) 
      return `<span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></span>`;
    
    if (id.includes('fanpage') || id.includes('facebook') || id === 'fb' || lbl.includes('fanpage') || lbl.includes('facebook')) 
      return `<span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></span>`;
    
    if (id.includes('instagram') || id === 'ig' || lbl.includes('instagram')) 
      return `<span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></span>`;
    
    if (id.includes('hotline') || id.includes('phone') || id === 'th' || lbl.includes('hotline') || lbl.includes('sđt') || lbl.includes('phone') || lbl.includes('gọi')) 
      return `<span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>`;
    
    return `<span>${escapeHTML(ch.short || ch.label?.slice(0, 2) || "US")}</span>`;
  };

  const message = fillContactTemplate(channel.template, context);
  const href = channelHref(channel, message);
  const external = !href.startsWith("#") && !href.startsWith("tel:") && !href.startsWith("mailto:");
  return `
    <a
      href="${escapeHTML(href)}"
      class="${className}"
      data-contact-message="${escapeHTML(message)}"
      ${external ? 'target="_blank" rel="noopener"' : ""}
    >
      ${getChannelIcon(channel)}
      <strong>${escapeHTML(channel.label || "Kênh liên hệ")}</strong>
      <small>${escapeHTML(channel.note || "Nhấn để nhắn kèm thông tin phòng đang xem.")}</small>
    </a>
  `;
};

const renderContactChannels = () => {
  const grid = $("#contactChannels") || $(".contact-grid");
  if (!grid) return;

  const context = getContactContext();
  const channels = enabledContactChannels();

  grid.innerHTML = channels.map(channel => contactChannelHTML(channel, context)).join("");

  if (!channels.length) {
    grid.innerHTML = `
      <div class="empty-state contact-empty">
        <h3>Chưa bật kênh liên hệ</h3>
        <p>Vào admin để bật Zalo, Fanpage, Instagram hoặc hotline.</p>
      </div>
    `;
  }

  applyLanguage(getStoredLanguage());
};

const closeContactModal = () => {
  const modal = $("#contactModal");
  const backdrop = $("#contactModalBackdrop");
  modal?.classList.remove("open");
  backdrop?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("contact-modal-open");
};

if (typeof window !== "undefined") {
  window.uniteCloseContactModal = closeContactModal;
}

const ensureContactModal = () => {
  let modal = $("#contactModal");
  if (modal) return modal;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="contact-modal-backdrop" id="contactModalBackdrop" aria-hidden="true" onclick="window.uniteCloseContactModal?.()"></div>
    <section class="contact-modal" id="contactModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="contactModalTitle" style="max-width: 450px;">
      <button class="contact-modal-close" type="button" data-contact-modal-close aria-label="Đóng" onclick="window.uniteCloseContactModal?.()">×</button>
      
      <div class="contact-modal-head" style="margin-bottom: 16px;">
        <span>Yêu cầu đặt phòng</span>
        <h2 id="contactModalTitle">Đặt ngay trên web</h2>
        <p id="contactModalSummary">Điền thông tin để Unite xác nhận lịch trống và giữ phòng cho bạn.</p>
      </div>
      
      <form id="customerBookingForm" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
        <input type="text" name="customerName" placeholder="Họ và tên của bạn *" required style="padding: 12px; border: 1px solid var(--border, #ddd); border-radius: 8px; font-family: inherit; font-size: 15px;">
        <input type="tel" name="phone" placeholder="Số điện thoại / Zalo *" required style="padding: 12px; border: 1px solid var(--border, #ddd); border-radius: 8px; font-family: inherit; font-size: 15px;">
        <textarea name="note" placeholder="Ghi chú thêm (giờ muốn nhận phòng, yêu cầu đặc biệt...)" rows="3" style="padding: 12px; border: 1px solid var(--border, #ddd); border-radius: 8px; font-family: inherit; font-size: 15px; resize: vertical;"></textarea>
        <button type="submit" class="btn primary" id="submitCustomerBookingBtn" style="margin-top: 8px; padding: 14px; font-size: 16px; border-radius: 8px;">Gửi yêu cầu đặt phòng</button>
      </form>
      
      <div id="bookingSuccessMsg" style="display: none; background: #e8f5e9; color: #2e7d32; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px;">🎉 Đã gửi yêu cầu!</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.5;">Đội ngũ Unite sẽ liên hệ qua Zalo/SĐT của bạn trong ít phút để xác nhận lịch và hỗ trợ giữ phòng.</p>
      </div>

      <div style="border-top: 1px solid #eaeaea; margin: 0 -24px; padding: 24px 24px 0;">
        <p style="font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px;">Hoặc liên hệ trực tiếp</p>
        <div class="contact-modal-grid" id="contactModalChannels"></div>
        <p class="contact-modal-copy-note" style="margin-top: 12px;">Nội dung liên hệ sẽ được chuẩn bị sẵn theo phòng và lịch đã chọn.</p>
      </div>
    </section>
  `);

  modal = $("#contactModal");
  $("#contactModalBackdrop")?.addEventListener("click", closeContactModal);
  $("[data-contact-modal-close]", modal)?.addEventListener("click", closeContactModal);
  
  $("#customerBookingForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#submitCustomerBookingBtn");
    btn.disabled = true;
    btn.textContent = "Đang gửi...";
    try {
      await window.submitCustomerBookingAsync(window.currentBookingContext, e.target);
      $("#customerBookingForm").style.display = "none";
      $("#bookingSuccessMsg").style.display = "block";
    } catch (err) {
      alert("Có lỗi xảy ra: " + err.message);
      btn.disabled = false;
      btn.textContent = "Gửi yêu cầu đặt phòng";
    }
  });

  return modal;
};

window.submitCustomerBookingAsync = async (context, form) => {
  const cfg = window.UNITE_SUPABASE_CONFIG || {};
  const baseUrl = (cfg.url || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const anonKey = cfg.anonKey || cfg.publishableKey;
  if (!baseUrl || !anonKey) throw new Error("Hệ thống chưa cấu hình kết nối.");

  let checkinAt = new Date().toISOString();
  let checkoutAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

  if (context.date) {
    const d = new Date(context.date + "T14:00:00");
    if (!Number.isNaN(d.getTime())) {
      checkinAt = d.toISOString();
      const out = new Date(d);
      out.setHours(d.getHours() + 3);
      checkoutAt = out.toISOString();
    }
  }

  const payload = {
    customer_name: form.customerName.value,
    customer_phone: form.phone.value,
    customer_note: form.note.value,
    status: "new",
    source_code: "website",
    package_label: context.duration || "3 tiếng",
    guests: Number(String(context.guests).match(/\d+/)?.[0] || 2),
    internal_note: "Phòng: " + context.room + " | Chi nhánh: " + context.destination + " | Khách: " + context.guests,
    checkin_at: checkinAt,
    checkout_at: checkoutAt
  };

  const res = await fetch(`${baseUrl}/rest/v1/bookings`, {
    method: "POST",
    headers: {
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
};

const openContactModal = (context = getContactContext()) => {
  const modal = ensureContactModal();
  const backdrop = $("#contactModalBackdrop");
  const summary = $("#contactModalSummary");
  const grid = $("#contactModalChannels");
  
  const destStr = (context.destination || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const channels = enabledContactChannels().filter(ch => {
    const lbl = (ch.label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (destStr && destStr !== "tat ca dia diem") {
      if (lbl.includes("fanpage") && !lbl.includes("chinh") && lbl !== "fanpage") {
        return lbl.includes(destStr);
      }
    }
    return true;
  });
  
  window.currentBookingContext = context;

  if (summary) {
    summary.textContent = `${context.room} · ${context.destination} · ${context.date} · ${context.duration} · ${context.guests}`;
  }

  if (grid) {
    grid.innerHTML = channels.length
      ? channels.map(channel => contactChannelHTML(channel, context, "contact-modal-channel")).join("")
      : `
        <div class="empty-state contact-empty" style="margin:0;padding:12px;">
          <h3 style="margin:0 0 4px;font-size:14px;">Chưa bật kênh liên hệ</h3>
          <p style="margin:0;font-size:13px;">Vào admin để bật kênh nhắn tin.</p>
        </div>
      `;
  }

  // Reset form when reopening
  $("#customerBookingForm").style.display = "flex";
  $("#customerBookingForm").reset();
  $("#bookingSuccessMsg").style.display = "none";
  const btn = $("#submitCustomerBookingBtn");
  if (btn) {
    btn.disabled = false;
    btn.textContent = "Gửi yêu cầu đặt phòng";
  }

  modal?.classList.add("open");
  backdrop?.classList.add("open");
  modal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("contact-modal-open");
  applyLanguage(getStoredLanguage());
  $("[data-contact-modal-close]", modal)?.focus();
};

const initContactChannels = () => {
  renderContactChannels();

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element
      ? event.target
      : event.target?.parentNode instanceof Element
        ? event.target.parentNode
        : null;
    if (!target) return;

    if (target.closest("[data-contact-modal-close]") || target === $("#contactModalBackdrop")) {
      event.preventDefault();
      closeContactModal();
      return;
    }

    const trigger = target.closest("[data-contact-popover]");
    if (trigger) {
      event.preventDefault();
      openContactModal(getContactContext({
        roomId: trigger.dataset.roomId || trigger.dataset.room || "",
        destination: trigger.dataset.destination || "",
        duration: trigger.dataset.duration || "",
        nights: trigger.dataset.nights || "",
        date: trigger.dataset.date || ""
      }));
      return;
    }

    const link = target.closest("[data-contact-message]");
    if (!link) return;

    const message = link.dataset.contactMessage || "";
    if (!message || !navigator.clipboard?.writeText) return;

    navigator.clipboard.writeText(message).catch(() => {
      // The channel still opens even if the browser blocks clipboard access.
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeContactModal();
  });
};

const amenityCatalog = {
  wifi: { label: "Wi-Fi", short: "WF", icon: "wifi" },
  aircon: { label: "Máy lạnh", short: "AC", icon: "snow" },
  bathtub: { label: "Bồn tắm", short: "BT", icon: "bath" },
  tv: { label: "TV / giải trí", short: "TV", icon: "tv" },
  "self-checkin": { label: "Check-in tự túc", short: "IN", icon: "key" },
  support: { label: "Hỗ trợ nhanh", short: "SP", icon: "chat" },
  "photo-corner": { label: "Góc chụp đẹp", short: "PH", icon: "spark" },
  parking: { label: "Gửi xe", short: "PK", icon: "car" },
  kitchen: { label: "Bếp nhỏ", short: "KT", icon: "kitchen" },
  laundry: { label: "Giặt ủi", short: "LD", icon: "wash" }
};

const statusLabels = {
  available: "Đang mở",
  low: "Sắp kín",
  maintenance: "Tạm khóa"
};

const readAdminOverrides = () => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeAdminOverrides = (data) => {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Static fallback: keep the visible admin controls usable even if storage is blocked.
  }
};

const defaultRoomAdmin = (room) => ({
  inventory: Number(room.inventory || 1),
  status: room.status || "available",
  category: room.category || room.type || "Studio",
  amenities: [...(room.amenities || [])]
});

const getRoomAdmin = (room) => {
  const override = readAdminOverrides()[room.id] || {};
  const defaults = defaultRoomAdmin(room);
  return {
    ...defaults,
    ...override,
    inventory: Math.max(0, Number(override.inventory ?? defaults.inventory ?? 1)),
    amenities: Array.isArray(override.amenities) ? override.amenities : defaults.amenities
  };
};

const amenityIcon = (name) => {
  const paths = {
    wifi: `<path d="M4 10c4.7-4 11.3-4 16 0"/><path d="M7 13c3-2.5 7-2.5 10 0"/><path d="M10 16c1.2-.8 2.8-.8 4 0"/><circle cx="12" cy="19" r="1"/>`,
    snow: `<path d="M12 3v18"/><path d="M5 7l14 10"/><path d="M19 7L5 17"/><path d="M8 5l4 3 4-3"/><path d="M8 19l4-3 4 3"/>`,
    bath: `<path d="M5 11h14v3a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-3Z"/><path d="M7 11V6a2 2 0 0 1 2-2h1"/><path d="M4 21h16"/><path d="M9 7h4"/>`,
    tv: `<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/>`,
    key: `<circle cx="8" cy="12" r="3"/><path d="M11 12h9"/><path d="M16 12v3"/><path d="M19 12v2"/>`,
    chat: `<path d="M5 5h14v10H8l-3 4V5Z"/><path d="M8 9h8"/><path d="M8 12h5"/>`,
    spark: `<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z"/>`,
    car: `<path d="M5 13l2-5h10l2 5"/><rect x="4" y="13" width="16" height="5" rx="2"/><circle cx="7" cy="18" r="1"/><circle cx="17" cy="18" r="1"/>`,
    kitchen: `<path d="M7 3v18"/><path d="M4 3v6a3 3 0 0 0 6 0V3"/><path d="M15 3h3v18h-3z"/>`,
    wash: `<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="14" r="4"/><path d="M8 7h2"/><path d="M14 7h2"/>`
  };

  return `
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      ${paths[name] || paths.spark}
    </svg>
  `;
};

const getRoomAmenities = (room) => {
  const admin = getRoomAdmin(room);
  return admin.amenities
    .map(key => ({ key, ...(amenityCatalog[key] || { label: key, short: key.slice(0, 2).toUpperCase(), icon: "spark" }) }));
};

const amenityBadgesHTML = (room, limit = 4) => {
  const items = getRoomAmenities(room).slice(0, limit);
  return `
    <div class="amenity-mini-list">
      ${items.map(item => `
        <span title="${item.label}">
          ${amenityIcon(item.icon)}
          <small>${item.label}</small>
        </span>
      `).join("")}
    </div>
  `;
};

const numericPrice = (room, label) => {
  const raw = getPrice(room, label);
  const match = String(raw).match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

const roomDetailContent = (room) => {
  const hasBathtub = room.filters.includes("bathtub");
  const isSignature = room.filters.includes("signature");
  const isBudget = room.filters.includes("budget");
  const isNhieuTu = room.location.includes("Nhiêu Tứ");
  const admin = getRoomAdmin(room);

  const locationPicks = isNhieuTu
    ? [
        { name: "Phan Xích Long", desc: "Nhiều quán ăn, cafe và tiện mua đồ trước khi check-in." },
        { name: "Sân bay Tân Sơn Nhất", desc: "Di chuyển thuận tiện cho khách cần nghỉ ngắn trước hoặc sau chuyến bay." },
        { name: "Trung tâm Quận 1", desc: "Phù hợp ghé chơi, chụp hình hoặc ăn tối rồi quay về nghỉ riêng tư." }
      ]
    : [
        { name: "Khu Phan Tây Hồ", desc: "Hẻm yên tĩnh, dễ đặt xe và nhiều lựa chọn ăn uống gần phòng." },
        { name: "Phan Xích Long", desc: "Gần cafe, nhà hàng, cửa hàng tiện lợi và các điểm hẹn nhẹ nhàng." },
        { name: "Trục Hoàng Văn Thụ", desc: "Thuận tiện đi sân bay, Quận 1, Bình Thạnh hoặc Gò Vấp." }
      ];

  return {
    score: isSignature ? "4.9" : isBudget ? "4.7" : "4.8",
    reviews: isSignature ? "86 đánh giá" : isBudget ? "41 đánh giá" : "68 đánh giá",
    verdict: isSignature ? "Rất được yêu thích" : isBudget ? "Gọn sạch, dễ đặt" : "Rất tốt",
    intro: [
      `${room.name} là lựa chọn ${isSignature ? "signature" : isBudget ? "gọn gàng, dễ tiếp cận" : "premium riêng tư"} dành cho những buổi staycation cần không gian đẹp, sạch và có cảm giác tách khỏi nhịp vội bên ngoài.`,
      hasBathtub
        ? "Điểm nhấn bồn tắm giúp căn phòng hợp với dịp kỷ niệm, nghỉ ngơi sau một ngày dài hoặc một buổi chụp lifestyle nhẹ nhàng."
        : "Không gian được giữ tối giản, riêng tư và dễ dùng để khách có thể nghỉ, xem phim, làm việc nhẹ hoặc tận hưởng vài giờ yên tĩnh.",
      "Trước khi nhận phòng, admin sẽ xác nhận lại khung giờ, số khách, tình trạng phòng và gửi hướng dẫn check-in rõ ràng để khách không phải hỏi nhiều."
    ],
    amenities: [
      { label: "Wi-Fi ổn định", desc: "Phù hợp xem phim, nghe nhạc, gọi video hoặc làm việc nhẹ." },
      { label: "Máy lạnh riêng", desc: "Không gian riêng tư, dễ chỉnh nhiệt theo nhu cầu." },
      { label: hasBathtub ? "Bồn tắm thư giãn" : "Phòng tắm riêng", desc: hasBathtub ? "Chuẩn bị tốt cho stay couple, sinh nhật hoặc nghỉ ngắn." : "Sạch gọn, riêng tư, đủ tiện nghi cơ bản." },
      { label: "TV / giải trí", desc: "Phù hợp một buổi xem phim, nghỉ ngơi hoặc chill nhẹ." },
      { label: "Check-in tự túc", desc: "Hướng dẫn được gửi trước giờ nhận phòng để khách chủ động." },
      { label: "Hỗ trợ nhanh", desc: "Unite xác nhận lịch, giá và lưu ý trước khi nhận phòng." }
    ],
    goodFor: [
      "Couple staycation",
      "Nghỉ vài giờ",
      isSignature ? "Chụp lifestyle" : "Xem phim riêng tư",
      isBudget ? "Giá dễ tiếp cận" : "Dịp đặc biệt"
    ],
    facts: [
      { label: "Sức chứa", value: "Tối đa 2 khách" },
      { label: "Số lượng", value: `${admin.inventory} phòng` },
      { label: "Trạng thái", value: statusLabels[admin.status] || "Đang mở" },
      { label: "Khung giờ", value: "3h / 4h / 8h / Ngày" },
      { label: "Check-in", value: "Theo lịch đã đặt" },
      { label: "Phụ thu trễ", value: "Từ 10 phút" }
    ],
    steps: [
      { title: "Chọn gói", desc: "Chọn 3h, 4h, 8h hoặc ngày theo lịch cần nghỉ." },
      { title: "Nhắn mã phòng", desc: `Gửi mã ${room.id} để admin kiểm tra tình trạng phòng.` },
      { title: "Xác nhận", desc: "Unite gửi giá cuối, giờ nhận phòng và lưu ý thanh toán." },
      { title: "Nhận hướng dẫn", desc: "Khách nhận địa chỉ, cách vào phòng và nội quy cần biết." }
    ],
    faqs: [
      { q: "Phòng có phù hợp cho 2 người không?", a: "Có. Các phòng được thiết kế cho tối đa 2 khách để giữ sự riêng tư và thoải mái." },
      { q: "Có thể đặt theo giờ không?", a: "Có. Unite có các gói 3h, 4h, 8h và ngày; giá có thể thay đổi theo lịch thực tế." },
      { q: "Làm sao biết còn phòng?", a: "Khách gửi mã phòng và khung giờ mong muốn, admin sẽ xác nhận tình trạng trước khi chốt." },
      { q: "Có cần đọc nội quy trước không?", a: "Nên đọc trước phần nội quy để tránh phụ thu trễ giờ, vượt số khách hoặc phát sinh ngoài ý muốn." }
    ],
    nearby: locationPicks
  };
};

const compactPricesHTML = (room) => `
  <div class="compact-price-line">
    <span><small>3h</small>${getPrice(room, "3 tiếng")}</span>
    <span><small>4h</small>${getPrice(room, "4 tiếng")}</span>
    <span><small>8h</small>${getPrice(room, "8 tiếng")}</span>
    <span><small>Ngày</small>${getPrice(room, "Ngày")}</span>
  </div>
`;

const priceHTML = (prices) => prices.map(item => `
  <div class="price-item">
    <span>${item.label}</span>
    <strong>${item.originalValue ? `<del>${item.originalValue}</del>` : ""}${item.value}</strong>
  </div>
`).join("");

const initLoader = () => {
  const loader = $("#pageLoader");
  if (!loader) return;
  window.setTimeout(() => loader.classList.add("hide"), 520);
};

const initHeader = () => {
  const header = $("#siteHeader");
  const progress = $("#pageProgress");

  const update = () => {
    const y = window.scrollY;
    header?.classList.toggle("is-scrolled", y > 24);

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? y / max : 0;
      progress.style.transform = `scaleX(${ratio})`;
    }
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
};

const initReveal = () => {
  const items = $$(".reveal-up, .room-card, .policy-grid article, .rules-item, .price-row, .flow-card, .admin-card");
  if (!("IntersectionObserver" in window)) {
    items.forEach(item => item.classList.add("active"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  items.forEach(item => observer.observe(item));
};

const initMagneticButtons = () => {
  if (window.matchMedia("(hover: none)").matches) return;

  $$(".magnetic").forEach((btn) => {
    btn.addEventListener("mousemove", (event) => {
      const rect = btn.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.06}px, ${y * 0.12}px)`;
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
    });
  });
};

const renderHeroStack = () => {
  const stack = $("#heroStack");
  if (!stack) return;

  const selected = [rooms[0], rooms[2], rooms[4]].filter(Boolean);

  stack.innerHTML = `
    <div class="hero-orbit" aria-hidden="true"></div>
    <div class="hero-ambient ambient-one" aria-hidden="true"></div>
    <div class="hero-ambient ambient-two" aria-hidden="true"></div>

    ${selected.map((room, index) => `
      <a class="hero-photo hero-photo-${index + 1}" href="room.html?id=${room.id}" style="--i:${index}">
        ${imgTag(getMainImage(room), room.name)}
        <div class="hero-photo-sheen" aria-hidden="true"></div>
        <div class="hero-photo-caption">
          <span>${room.id}</span>
          <strong>${room.name}</strong>
          <small>${room.location}</small>
        </div>
      </a>
    `).join("")}

    <div class="hero-mood-note">
      <span>Selected stays</span>
      <strong>Private · Soft · Curated</strong>
    </div>
  `;
};

const roomPreviewHTML = (room, index = 0) => `
  <a class="layout-tile reveal-up" href="room.html?id=${room.id}" style="--delay:${index * 45}ms" aria-label="Xem chi tiết ${room.name}">
    <div class="layout-thumb">
      ${imgTag(getMainImage(room), room.name)}
      <span>${room.chapter}</span>
      ${promotionBadgeHTML(room)}
    </div>

    <div class="layout-info">
      <div>
        <p>${room.id} · ${room.type}</p>
        <h3>${room.name}</h3>
      </div>
      <small>${room.vibe}</small>
      ${amenityBadgesHTML(room, 4)}
      <div class="layout-meta">
        <span>Từ <strong>${getPrice(room, "3 tiếng")}</strong></span>
        <span>${getRoomAdmin(room).inventory} phòng · ${statusLabels[getRoomAdmin(room).status] || "Đang mở"}</span>
      </div>
    </div>
  </a>
`;

const renderHomeRooms = () => {
  const nhieuTu = $("#homeNhieuTu");
  const phanTayHo = $("#homePhanTayHo");
  const leVanSi = $("#homeLeVanSi");

  if (nhieuTu) {
    const data = rooms.filter(room => room.location === "Chi nhánh Nhiêu Tứ");
    nhieuTu.innerHTML = data.map((room, index) => roomPreviewHTML(room, index)).join("");
  }

  if (phanTayHo) {
    const data = rooms.filter(room => room.location === "Chi nhánh Phan Tây Hồ");
    phanTayHo.innerHTML = data.map((room, index) => roomPreviewHTML(room, index)).join("");
  }

  if (leVanSi) {
    const data = rooms.filter(room => room.location === "Chi nhánh Lê Văn Sĩ");
    leVanSi.innerHTML = data.map((room, index) => roomPreviewHTML(room, index)).join("");
  }

  bindCopyButtons();
  initReveal();
};

const priceCompareHTML = (room, index = 0) => `
  <article class="price-row reveal-up" style="--delay:${index * 45}ms">
    <a class="price-room" href="room.html?id=${room.id}">
      <img src="${getMainImage(room)}" alt="${room.name}" loading="lazy" />
      ${promotionBadgeHTML(room)}
      <span>
        <strong>${room.name}</strong>
        <small>${room.id} · ${room.location}</small>
        ${amenityBadgesHTML(room, 3)}
      </span>
    </a>

    <div class="price-values">
      <span><small>3 tiếng</small><strong>${getPrice(room, "3 tiếng")}</strong></span>
      <span><small>4 tiếng</small><strong>${getPrice(room, "4 tiếng")}</strong></span>
      <span><small>8 tiếng</small><strong>${getPrice(room, "8 tiếng")}</strong></span>
      <span><small>Ngày</small><strong>${getPrice(room, "Ngày")}</strong></span>
    </div>

    <a class="btn soft small" href="room.html?id=${room.id}">Xem</a>
  </article>
`;

const renderPriceCompare = (list) => {
  const grid = $("#priceCompare");
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Chưa có phòng phù hợp</h3>
        <p>Thử điều chỉnh bộ lọc hoặc chọn một thời gian khác.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map((room, index) => priceCompareHTML(room, index)).join("");
  initReveal();
  applyLanguage(getStoredLanguage());
};

const initLanguageSwitcher = () => {
  const switcher = $("#languageSwitcher");
  const toggle = $("#languageToggle");
  const menu = $("#languageMenu");
  if (!switcher || !toggle || !menu) return;

  const current = $("strong", toggle);
  const close = () => {
    switcher.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = !switcher.classList.contains("open");
    switcher.classList.toggle("open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
  });

  $$("[data-lang]", menu).forEach(button => {
    button.addEventListener("click", () => {
      const lang = button.dataset.lang;
      writeStoredLanguage(lang);
      applyLanguage(lang);
      if ($("#rulesList")) renderRules();

      const note = $("#bookingResultNote");
      if (note) {
        note.textContent = lang === "VIE"
          ? "Đã cập nhật ngôn ngữ hiển thị."
          : lang === "ENG"
            ? "Display language updated."
            : "显示语言已更新。";
      }

      close();
    });
  });

  const initialLang = getStoredLanguage();
  writeStoredLanguage(initialLang);
  applyLanguage(initialLang);

  document.addEventListener("click", (event) => {
    if (!switcher.contains(event.target)) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
};

const initHeaderQuickContact = () => {
  const button = $(".tool-icon");
  if (!button) return;

  button.addEventListener("click", () => {
    $("#contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    const note = $("#bookingResultNote");
    if (note) {
      note.textContent = "Cần hỏi nhanh? Kéo xuống phần liên hệ để nhắn Unite xác nhận lịch, giá và hướng dẫn check-in.";
    }
  });
};

const bookingWidgetHTML = ({ className = "", buttonText = "Tìm phòng", note = "", room = null } = {}) => `
  <section
    class="home-booking-bar ${className}"
    id="homeBookingBar"
    aria-label="${room ? `Đặt phòng ${room.name}` : "Tìm phòng nhanh"}"
    ${room ? `data-booking-context="room" data-room-id="${room.id}" data-default-destination="${room.location}"` : ""}
  >
    <div class="booking-field" data-panel="destination">
      <button type="button" class="booking-trigger" aria-expanded="false">
        <span>Địa điểm</span>
        <strong id="bookingDestinationText">${room ? room.location : "Tất cả địa điểm"}</strong>
        <small>${room ? `${room.id} · ${room.name}` : "Chọn khu vực lưu trú."}</small>
      </button>
      <div class="booking-popover destination-popover" data-booking-panel="destination">
        <button type="button" data-destination="all">Tất cả địa điểm <small>7 layout đang mở</small></button>
        <button type="button" data-destination="Chi nhánh Nhiêu Tứ">Chi nhánh Nhiêu Tứ <small>Gần Phan Xích Long</small></button>
        <button type="button" data-destination="Chi nhánh Phan Tây Hồ">Chi nhánh Phan Tây Hồ <small>Yên tĩnh, riêng tư</small></button>
        <button type="button" data-destination="Chi nhánh Lê Văn Sĩ">Chi nhánh Lê Văn Sĩ <small>Ấm, riêng tư, dễ di chuyển</small></button>
      </div>
    </div>

    <div class="booking-field" data-panel="dates">
      <button type="button" class="booking-trigger" aria-expanded="false">
        <span>Nhận phòng</span>
        <strong id="bookingDateText">Hôm nay</strong>
        <small id="bookingCheckoutText">Trả phòng theo gói đã chọn.</small>
      </button>
      <div class="booking-popover date-popover" data-booking-panel="dates">
        <div class="calendar-toolbar">
          <button type="button" id="calendarPrev" aria-label="Tháng trước">‹</button>
          <strong>Lịch lưu trú</strong>
          <button type="button" id="calendarNext" aria-label="Tháng sau">›</button>
        </div>
        <div class="calendar-months" id="bookingCalendar"></div>
      </div>
    </div>

    <div class="booking-field" data-panel="duration">
      <button type="button" class="booking-trigger" aria-expanded="false">
        <span>Thời lượng</span>
        <strong id="bookingDurationText">3 giờ</strong>
        <small>Linh hoạt cho nghỉ nhanh hoặc stay dài hơn.</small>
      </button>
      <div class="booking-popover duration-popover" data-booking-panel="duration">
        <button type="button" data-duration="3 tiếng" class="active">3 giờ <small>Nghỉ nhanh, xem phim</small></button>
        <button type="button" data-duration="4 tiếng">4 giờ <small>Thoải mái hơn một chút</small></button>
        <button type="button" data-duration="8 tiếng">8 giờ <small>Nửa ngày riêng tư</small></button>
        <button type="button" data-duration="Ngày">Theo ngày <small>Ở lâu, check-in rõ lịch</small></button>
        <div class="night-stepper" id="bookingNightsWrap" hidden>
          <span><strong>Số đêm</strong><small>Cho đặt theo ngày hoặc nhiều ngày.</small></span>
          <div class="counter-control">
            <button type="button" data-night-step="-1">−</button>
            <strong id="bookingNightCount">1</strong>
            <button type="button" data-night-step="1">+</button>
          </div>
        </div>
      </div>
    </div>

    <div class="booking-field" data-panel="guests">
      <button type="button" class="booking-trigger" aria-expanded="false">
        <span>Khách</span>
        <strong id="bookingGuestText">2 người lớn</strong>
        <small>Tối đa 2 khách theo nội quy.</small>
      </button>
      <div class="booking-popover guest-popover" data-booking-panel="guests">
        <div class="guest-row">
          <span><strong>Người lớn</strong><small>Từ 13 tuổi trở lên</small></span>
          <div class="counter-control">
            <button type="button" data-counter="adults" data-step="-1">−</button>
            <strong id="adultCount">2</strong>
            <button type="button" data-counter="adults" data-step="1">+</button>
          </div>
        </div>
        <div class="guest-row">
          <span><strong>Trẻ em</strong><small>Dưới 13 tuổi</small></span>
          <div class="counter-control">
            <button type="button" data-counter="children" data-step="-1">−</button>
            <strong id="childCount">0</strong>
            <button type="button" data-counter="children" data-step="1">+</button>
          </div>
        </div>
        <p>Mỗi phòng tiêu chuẩn dành cho tối đa 2 khách. Trường hợp đặc biệt sẽ được xác nhận riêng.</p>
      </div>
    </div>

    <button class="btn primary booking-search-btn" type="button" id="bookingSearchBtn">${buttonText}</button>
  </section>
  ${note ? `<div class="booking-result-note detail-booking-note" id="bookingResultNote" aria-live="polite">${note}</div>` : ""}
`;

const initHomeBookingWidget = () => {
  const bar = $("#homeBookingBar");
  const calendar = $("#bookingCalendar");
  if (!bar || !calendar) return;

  const maxGuests = 2;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const urlParams = new URLSearchParams(window.location.search);

  const parseDateKey = (key) => {
    if (!key) return new Date(today);
    const [year, month, day] = key.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) || parsed < today ? new Date(today) : parsed;
  };

  const state = {
    destination: normalizeDestination(urlParams.get("destination") || bar.dataset.defaultDestination || "all"),
    destinationLabel: "Tất cả địa điểm",
    duration: urlParams.get("duration") || bar.dataset.defaultDuration || "3 tiếng",
    durationLabel: "3 giờ",
    nights: Math.min(30, Math.max(1, Number(urlParams.get("nights") || bar.dataset.defaultNights || 1))),
    adults: Math.min(maxGuests, Math.max(1, Number(urlParams.get("adults") || 2))),
    children: Math.min(maxGuests - 1, Math.max(0, Number(urlParams.get("children") || 0))),
    selectedDate: parseDateKey(urlParams.get("date")),
    calendarMonth: new Date(parseDateKey(urlParams.get("date")).getFullYear(), parseDateKey(urlParams.get("date")).getMonth(), 1)
  };
  if (state.adults + state.children > maxGuests) {
    state.children = Math.max(0, maxGuests - state.adults);
  }

  const monthNames = [
    "Tháng Một", "Tháng Hai", "Tháng Ba", "Tháng Tư", "Tháng Năm", "Tháng Sáu",
    "Tháng Bảy", "Tháng Tám", "Tháng Chín", "Tháng Mười", "Tháng Mười Một", "Tháng Mười Hai"
  ];

  const durationLabels = {
    "3 tiếng": "3 giờ",
    "4 tiếng": "4 giờ",
    "8 tiếng": "8 giờ",
    "Ngày": "Theo ngày"
  };
  state.durationLabel = durationLabels[state.duration] || state.duration;
  if (state.duration !== "Ngày") state.nights = 1;

  const formatDate = (date) => new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(date);

  const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fromDateKey = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  const syncActiveOptions = () => {
    const destinationButton = $$("[data-destination]", bar).find(button => button.dataset.destination === state.destination);
    if (destinationButton) {
      state.destinationLabel = destinationButton.childNodes[0]?.textContent.trim() || destinationButton.textContent.trim();
      $$("[data-destination]", bar).forEach(item => item.classList.toggle("active", item === destinationButton));
    }

    const durationButton = $$("[data-duration]", bar).find(button => button.dataset.duration === state.duration);
    if (durationButton) {
      $$("[data-duration]", bar).forEach(item => item.classList.toggle("active", item === durationButton));
    }
  };

  const searchUrl = () => {
    const params = new URLSearchParams();
    params.set("destination", state.destination);
    params.set("date", toDateKey(state.selectedDate));
    params.set("duration", state.duration);
    if (state.duration === "Ngày") {
      params.set("nights", String(state.nights));
      params.set("checkout", toDateKey(addDays(state.selectedDate, state.nights)));
    }
    params.set("adults", String(state.adults));
    params.set("children", String(state.children));
    if (bar.dataset.roomId) params.set("room", bar.dataset.roomId);
    return `rooms.html?${params.toString()}`;
  };

  const closePanels = () => {
    $$(".booking-field", bar).forEach(field => {
      field.classList.remove("open");
      $(".booking-trigger", field)?.setAttribute("aria-expanded", "false");
    });
  };

  const openPanel = (field) => {
    closePanels();
    field.classList.add("open");
    $(".booking-trigger", field)?.setAttribute("aria-expanded", "true");
  };

  const guestText = () => {
    const parts = [`${state.adults} người lớn`];
    if (state.children > 0) parts.push(`${state.children} trẻ em`);
    return parts.join(", ");
  };

  const updateGuestControls = () => {
    const total = state.adults + state.children;
    $("#adultCount") && ($("#adultCount").textContent = state.adults);
    $("#childCount") && ($("#childCount").textContent = state.children);
    $("#bookingGuestText") && ($("#bookingGuestText").textContent = guestText());

    $$("[data-counter]", bar).forEach(button => {
      const counter = button.dataset.counter;
      const step = Number(button.dataset.step || 0);
      const isMinus = step < 0;
      const isPlus = step > 0;
      const atMin = counter === "adults" ? state.adults <= 1 : state.children <= 0;
      const atMax = total >= maxGuests;
      button.disabled = (isMinus && atMin) || (isPlus && atMax);
    });
  };

  const updateSummary = () => {
    $("#bookingDestinationText") && ($("#bookingDestinationText").textContent = state.destinationLabel);
    const durationDisplay = state.duration === "Ngày" ? `${state.durationLabel} · ${state.nights} đêm` : state.durationLabel;
    $("#bookingDurationText") && ($("#bookingDurationText").textContent = durationDisplay);
    $("#bookingDateText") && ($("#bookingDateText").textContent = formatDate(state.selectedDate));
    $("#bookingNightCount") && ($("#bookingNightCount").textContent = state.nights);

    const nightsWrap = $("#bookingNightsWrap");
    if (nightsWrap) nightsWrap.hidden = state.duration !== "Ngày";

    const checkoutText = $("#bookingCheckoutText");
    if (checkoutText) {
      checkoutText.textContent = state.duration === "Ngày"
        ? `Trả phòng dự kiến ${formatDate(addDays(state.selectedDate, state.nights))}.`
        : `Trả phòng sau gói ${state.durationLabel.toLowerCase()}.`;
    }

    $$("[data-night-step]", bar).forEach(button => {
      const step = Number(button.dataset.nightStep || 0);
      button.disabled = (step < 0 && state.nights <= 1) || (step > 0 && state.nights >= 30);
    });

    updateGuestControls();
    applyLanguage(getStoredLanguage());
  };

  const renderCalendar = () => {
    const selectedKey = toDateKey(state.selectedDate);
    const todayKey = toDateKey(today);

    calendar.innerHTML = [0, 1].map(offset => {
      const monthDate = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + offset, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const leadingBlanks = (monthDate.getDay() + 6) % 7;

      const blanks = Array.from({ length: leadingBlanks }, () => `<span class="calendar-day is-blank"></span>`);
      const days = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = new Date(year, month, day);
        const key = toDateKey(date);
        const isPast = date < today;
        const isInStayRange = state.duration === "Ngày"
          && date > state.selectedDate
          && date < addDays(state.selectedDate, state.nights);
        const classes = [
          "calendar-day",
          key === todayKey ? "is-today" : "",
          key === selectedKey ? "is-selected" : "",
          isInStayRange ? "is-in-range" : "",
          isPast ? "is-disabled" : ""
        ].filter(Boolean).join(" ");

        return `<button class="${classes}" type="button" data-date="${key}" ${isPast ? "disabled" : ""}>${String(day).padStart(2, "0")}</button>`;
      });

      return `
        <section class="calendar-month" aria-label="${monthNames[month]} ${year}">
          <h4>${monthNames[month]} ${year}</h4>
          <div class="calendar-weekdays" aria-hidden="true">
            <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
          </div>
          <div class="calendar-grid">${[...blanks, ...days].join("")}</div>
        </section>
      `;
    }).join("");

    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const prev = $("#calendarPrev");
    if (prev) prev.disabled = state.calendarMonth <= minMonth;
  };

  $$(".booking-field", bar).forEach(field => {
    const trigger = $(".booking-trigger", field);
    if (!trigger) return;

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      field.classList.contains("open") ? closePanels() : openPanel(field);
    });
  });

  $$("[data-destination]", bar).forEach(button => {
    button.addEventListener("click", () => {
      const value = button.dataset.destination;
      state.destination = value;
      state.destinationLabel = button.childNodes[0]?.textContent.trim() || button.textContent.trim();
      $$("[data-destination]", bar).forEach(item => item.classList.toggle("active", item === button));
      updateSummary();
      closePanels();
    });
  });

  $$("[data-duration]", bar).forEach(button => {
    button.addEventListener("click", () => {
      state.duration = button.dataset.duration;
      state.durationLabel = durationLabels[state.duration] || state.duration;
      if (state.duration !== "Ngày") state.nights = 1;
      $$("[data-duration]", bar).forEach(item => item.classList.toggle("active", item === button));
      updateSummary();
      if (state.duration !== "Ngày") closePanels();
    });
  });

  $$("[data-night-step]", bar).forEach(button => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.nightStep || 0);
      state.nights = Math.min(30, Math.max(1, state.nights + step));
      updateSummary();
    });
  });

  $$("[data-counter]", bar).forEach(button => {
    button.addEventListener("click", () => {
      const counter = button.dataset.counter;
      const step = Number(button.dataset.step || 0);
      const total = state.adults + state.children;

      if (step > 0 && total >= maxGuests) {
        const note = $("#bookingResultNote");
        if (note) note.textContent = "Mỗi phòng tiêu chuẩn dành cho tối đa 2 khách. Trường hợp đặc biệt sẽ được xác nhận riêng.";
        return;
      }

      if (counter === "adults") {
        state.adults = Math.min(maxGuests, Math.max(1, state.adults + step));
      } else {
        state.children = Math.min(maxGuests - state.adults, Math.max(0, state.children + step));
      }

      updateGuestControls();
    });
  });

  calendar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button || button.disabled) return;
    state.selectedDate = fromDateKey(button.dataset.date);
    updateSummary();
    renderCalendar();
    closePanels();
  });

  $("#calendarPrev")?.addEventListener("click", () => {
    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const previous = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
    if (previous < minMonth) return;
    state.calendarMonth = previous;
    renderCalendar();
  });

  $("#calendarNext")?.addEventListener("click", () => {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  $("#bookingSearchBtn")?.addEventListener("click", () => {
    const note = $("#bookingResultNote");
    if (note) {
      const place = state.destination === "all" ? "tất cả địa điểm" : state.destinationLabel;
      const stayLabel = state.duration === "Ngày" ? `theo ngày ${state.nights} đêm` : `gói ${state.durationLabel.toLowerCase()}`;
      note.textContent = `Đang mở danh sách phòng phù hợp cho ${place}, nhận ${formatDate(state.selectedDate)}, ${stayLabel}, ${guestText().toLowerCase()}.`;
    }

    closePanels();
    window.location.href = searchUrl();
  });

  document.addEventListener("click", (event) => {
    if (!bar.contains(event.target)) closePanels();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanels();
  });

  syncActiveOptions();
  updateSummary();
  renderCalendar();
};

const initSmartBookingDock = () => {
  document.body.classList.add("has-smart-booking");
  if ($("#smartBookingDock")) return;

  const params = new URLSearchParams(window.location.search);
  const stored = readStoredSmartBooking();
  const todayKey = toDateInputValue();
  const currentRoom = params.get("id")
    ? rooms.find(room => room.id === params.get("id"))
    : null;

  const destinationOptions = [
    { value: "all", label: "Tất cả địa điểm" },
    ...[...new Set(rooms.map(room => room.location))].map(location => ({ value: location, label: location }))
  ];

  const initial = {
    destination: normalizeDestination(params.get("destination") || currentRoom?.location || stored.destination || "all"),
    date: params.get("date") || stored.date || todayKey,
    duration: params.get("duration") || stored.duration || "3 tiếng",
    nights: Math.min(30, Math.max(1, Number(params.get("nights") || stored.nights || 1))),
    adults: Math.min(2, Math.max(1, Number(params.get("adults") || stored.adults || 2))),
    children: Math.min(1, Math.max(0, Number(params.get("children") || stored.children || 0))),
    room: params.get("room") || currentRoom?.id || ""
  };

  if (initial.adults + initial.children > 2) {
    initial.children = Math.max(0, 2 - initial.adults);
  }

  document.body.insertAdjacentHTML("beforeend", `
    <div class="smart-booking-backdrop" id="smartBookingBackdrop" aria-hidden="true"></div>
    <aside class="smart-booking-dock" id="smartBookingDock" aria-label="Đặt phòng nhanh">
      <button class="smart-booking-pill" type="button" id="smartBookingToggle" aria-expanded="false">
        <span>
          <small>Đặt phòng nhanh</small>
          <strong id="smartBookingSummary">Chọn lịch stay</strong>
        </span>
        <b>Mở</b>
      </button>

      <form class="smart-booking-sheet" id="smartBookingSheet" aria-hidden="true">
        <div class="smart-sheet-handle" aria-hidden="true"></div>
        <div class="smart-sheet-head">
          <div>
            <span>Unite Staycation</span>
            <strong>Chọn nhanh lịch và xem phòng phù hợp</strong>
          </div>
          <button type="button" id="smartBookingClose" aria-label="Thu gọn đặt phòng">×</button>
        </div>

        <div class="smart-booking-grid">
          <label>
            <span>Địa điểm</span>
            <select id="smartDestination">
              ${destinationOptions.map(option => `<option value="${option.value}">${option.label}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Ngày nhận</span>
            <input id="smartDate" type="date" min="${todayKey}">
          </label>
          <label>
            <span>Thời lượng</span>
            <select id="smartDuration">
              <option value="3 tiếng">3 giờ</option>
              <option value="4 tiếng">4 giờ</option>
              <option value="8 tiếng">8 giờ</option>
              <option value="Ngày">Theo ngày</option>
            </select>
          </label>
          <label id="smartNightsLabel">
            <span>Số đêm</span>
            <select id="smartNights">
              ${Array.from({ length: 14 }, (_, index) => `<option value="${index + 1}">${index + 1} đêm</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Người lớn</span>
            <select id="smartAdults">
              <option value="1">1 người lớn</option>
              <option value="2">2 người lớn</option>
            </select>
          </label>
          <label>
            <span>Trẻ em</span>
            <select id="smartChildren">
              <option value="0">Không có</option>
              <option value="1">1 trẻ em</option>
            </select>
          </label>
        </div>

        <p id="smartBookingHint">Tối đa 2 khách/phòng. Unite sẽ xác nhận lịch trống và giá cuối trước khi chốt.</p>
        <button class="btn primary smart-booking-submit" type="submit">Xem phòng phù hợp</button>
      </form>
    </aside>
  `);

  const dock = $("#smartBookingDock");
  const backdrop = $("#smartBookingBackdrop");
  const toggle = $("#smartBookingToggle");
  const sheet = $("#smartBookingSheet");
  const closeButton = $("#smartBookingClose");
  const summary = $("#smartBookingSummary");
  const destination = $("#smartDestination");
  const date = $("#smartDate");
  const duration = $("#smartDuration");
  const nights = $("#smartNights");
  const nightsLabel = $("#smartNightsLabel");
  const adults = $("#smartAdults");
  const children = $("#smartChildren");

  const durationLabel = (value) => ({
    "3 tiếng": "3 giờ",
    "4 tiếng": "4 giờ",
    "8 tiếng": "8 giờ",
    "Ngày": "Theo ngày"
  })[value] || value;

  const formatShortDate = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) return "Hôm nay";
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(parsed);
  };

  const positionSheet = () => {
    const rect = dock.getBoundingClientRect();
    sheet.style.position = "fixed";
    sheet.style.left = `${Math.round(rect.left)}px`;
    sheet.style.right = "auto";
    sheet.style.width = `${Math.round(rect.width)}px`;
    sheet.style.bottom = "calc(12px + env(safe-area-inset-bottom))";
  };

  const resetSheetPosition = () => {
    sheet.style.removeProperty("position");
    sheet.style.removeProperty("left");
    sheet.style.removeProperty("right");
    sheet.style.removeProperty("width");
    sheet.style.removeProperty("bottom");
  };

  const setOpen = (open) => {
    dock.classList.toggle("open", open);
    sheet.classList.toggle("is-open", open);
    if (open) {
      positionSheet();
      sheet.style.setProperty("opacity", "1", "important");
      sheet.style.setProperty("transform", "translateY(0)", "important");
    } else {
      resetSheetPosition();
      sheet.style.setProperty("opacity", "0", "important");
      sheet.style.setProperty("transform", "translateY(calc(100% + 18px))", "important");
    }
    backdrop.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    sheet.setAttribute("aria-hidden", String(!open));
  };

  const getState = () => {
    const state = {
      destination: destination.value,
      date: date.value || todayKey,
      duration: duration.value,
      nights: Math.min(30, Math.max(1, Number(nights?.value || 1))),
      adults: Number(adults.value || 1),
      children: Number(children.value || 0),
      room: initial.room
    };

    if (state.adults + state.children > 2) {
      state.children = Math.max(0, 2 - state.adults);
      children.value = String(state.children);
    }

    return state;
  };

  const sync = () => {
    const state = getState();
    const childText = state.children > 0 ? `, ${state.children} trẻ em` : "";
    const place = state.destination === "all" ? "Tất cả địa điểm" : state.destination.replace(/^Chi nhánh\s+/i, "");
    const stayText = state.duration === "Ngày" ? `${durationLabel(state.duration)} · ${state.nights} đêm` : durationLabel(state.duration);
    summary.textContent = `${place} · ${formatShortDate(state.date)} · ${stayText} · ${state.adults} NL${childText}`;
    children.disabled = state.adults >= 2;
    if (nightsLabel) nightsLabel.hidden = state.duration !== "Ngày";
    if (nights) nights.disabled = state.duration !== "Ngày";
    writeStoredSmartBooking(state);
  };

  destination.value = destinationOptions.some(option => option.value === initial.destination) ? initial.destination : "all";
  date.value = initial.date < todayKey ? todayKey : initial.date;
  duration.value = initial.duration;
  if (nights) nights.value = String(initial.duration === "Ngày" ? initial.nights : 1);
  adults.value = String(initial.adults);
  children.value = String(initial.children);
  sync();

  [destination, date, duration, nights, adults, children].filter(Boolean).forEach(control => {
    control.addEventListener("change", sync);
    control.addEventListener("input", sync);
  });

  toggle.addEventListener("click", () => setOpen(!dock.classList.contains("open")));
  closeButton.addEventListener("click", () => setOpen(false));
  backdrop.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (dock.classList.contains("open")) positionSheet();
  });

  sheet.addEventListener("submit", (event) => {
    event.preventDefault();
    const state = getState();
    writeStoredSmartBooking(state);
    const search = new URLSearchParams();
    search.set("destination", state.destination);
    search.set("date", state.date);
    search.set("duration", state.duration);
    if (state.duration === "Ngày") {
      search.set("nights", String(state.nights));
      const [year, month, day] = state.date.split("-").map(Number);
      const checkout = new Date(year, month - 1, day);
      checkout.setDate(checkout.getDate() + state.nights);
      search.set("checkout", toDateInputValue(checkout));
    }
    search.set("adults", String(state.adults));
    search.set("children", String(state.children));
    if (state.room) search.set("room", state.room);
    window.location.href = `rooms.html?${search.toString()}`;
  });
};

const getRoomsSearchState = () => {
  const params = new URLSearchParams(window.location.search);
  const duration = params.get("duration") || "3 tiếng";
  const nights = Math.min(30, Math.max(1, Number(params.get("nights") || 1)));
  return {
    destination: normalizeDestination(params.get("destination") || "all"),
    date: params.get("date") || "",
    checkout: params.get("checkout") || "",
    duration,
    nights: duration === "Ngày" ? nights : 1,
    adults: Number(params.get("adults") || 2),
    children: Number(params.get("children") || 0),
    room: params.get("room") || "",
    sort: $("#roomsSort")?.value || "recommended",
    filters: $$("[data-result-filter]:checked").map(input => input.dataset.resultFilter)
  };
};

const formatSearchDate = (key) => {
  if (!key) return "hôm nay";
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "hôm nay";
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
};

const addDaysToDateKey = (key, days = 1) => {
  const [year, month, day] = String(key || "").split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

const formatKPrice = (value) => {
  if (!Number.isFinite(value)) return "";
  if (value >= 1000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value / 1000)}tr`;
  }
  return `${value}k`;
};

const roomResultCardHTML = (room, state, index = 0) => {
  const admin = getRoomAdmin(room);
  const basePrice = getPrice(room, state.duration);
  const baseNumericPrice = numericPrice(room, state.duration);
  const isDayStay = state.duration === "Ngày";
  const price = isDayStay ? formatKPrice(baseNumericPrice * state.nights) : basePrice;
  const priceSuffix = isDayStay ? `/ ${state.nights} đêm` : `/ ${state.duration}`;
  const priceNote = isDayStay ? "Đã tính theo số đêm đã chọn, admin xác nhận lại lịch trống." : "Giá tham khảo, admin xác nhận lại theo lịch trống.";
  const isFocused = state.room === room.id;
  const status = statusLabels[admin.status] || "Đang mở";
  const detailParams = new URLSearchParams();
  detailParams.set("id", room.id);
  detailParams.set("destination", room.location);
  if (state.date) detailParams.set("date", state.date);
  detailParams.set("duration", state.duration);
  if (isDayStay) {
    detailParams.set("nights", String(state.nights));
    detailParams.set("checkout", state.checkout || addDaysToDateKey(state.date, state.nights));
  }
  detailParams.set("adults", String(state.adults));
  detailParams.set("children", String(state.children));
  const detailHref = `room.html?${detailParams.toString()}`;

  return `
    <article class="room-result-card reveal-up ${isFocused ? "is-focused" : ""}" style="--delay:${index * 35}ms">
      <a class="result-photo" href="${detailHref}">
        ${imgTag(getMainImage(room), room.name)}
        <span>${isFocused ? "Đang xem" : room.priceTier}</span>
        ${promotionBadgeHTML(room)}
      </a>

      <div class="result-copy">
        <span class="result-brand">Unite Staycation</span>
        <h2>${room.name}</h2>
        <p>${room.description}</p>
        <div class="result-address">
          <span>⌖</span>
          <small>${room.address}</small>
        </div>
        ${amenityBadgesHTML(room, 5)}
        <div class="result-tags">
          ${room.tags.slice(0, 4).map(tag => `<span>${tag}</span>`).join("")}
          <span>${admin.category}</span>
          <span>${admin.inventory} phòng · ${status}</span>
        </div>
      </div>

      <aside class="result-price">
        <small>Chỉ từ</small>
        <strong>${price}</strong>
        <span>${priceSuffix}</span>
        <em>${priceNote}</em>
        <a class="btn primary small" href="${detailHref}">Chọn phòng</a>
      </aside>
    </article>
  `;
};

const renderRoomsResults = () => {
  const list = $("#roomsResultList");
  if (!list) return;

  const state = getRoomsSearchState();
  const note = $("#bookingResultNote");
  const queryText = $("#roomsResultQuery");
  const countText = $("#roomsResultCount");
  const amenitySummary = $("#resultsAmenitySummary");

  let result = rooms.filter(room => {
    const admin = getRoomAdmin(room);
    if (admin.status === "maintenance") return false;
    if (state.destination !== "all" && room.location !== state.destination && !room.filters.includes(state.destination)) return false;
    if (state.filters.includes("bathtub") && !room.filters.includes("bathtub")) return false;
    if (state.filters.includes("signature") && !room.filters.includes("signature")) return false;
    if (state.filters.includes("budget") && !room.filters.includes("budget")) return false;
    if (state.filters.includes("available") && admin.status !== "available") return false;
    return true;
  });

  result.sort((a, b) => {
    if (state.room) {
      if (a.id === state.room) return -1;
      if (b.id === state.room) return 1;
    }
    if (state.sort === "price-asc") return numericPrice(a, state.duration) - numericPrice(b, state.duration);
    if (state.sort === "price-desc") return numericPrice(b, state.duration) - numericPrice(a, state.duration);
    return 0;
  });

  const place = state.destination === "all" ? "tất cả địa điểm" : state.destination;
  const guestCount = state.children > 0
    ? `${state.adults} người lớn, ${state.children} trẻ em`
    : `${state.adults} người lớn`;
  const checkoutKey = state.checkout || (state.duration === "Ngày" ? addDaysToDateKey(state.date, state.nights) : "");
  const stayText = state.duration === "Ngày" ? `${state.nights} đêm` : state.duration;
  const checkoutText = state.duration === "Ngày" && checkoutKey ? `, trả ${formatSearchDate(checkoutKey)}` : "";
  const summary = `${result.length} layout phù hợp cho ${place}, nhận ${formatSearchDate(state.date)}${checkoutText}, gói ${stayText}, ${guestCount}.`;

  if (queryText) queryText.textContent = state.room ? `${summary} Layout đã chọn được ưu tiên hiển thị đầu danh sách.` : summary;
  if (countText) countText.textContent = `${result.length} lựa chọn`;
  if (note) note.textContent = summary;

  if (amenitySummary) {
    const keys = [...new Set(result.flatMap(room => getRoomAmenities(room).map(item => item.key)))].slice(0, 8);
    amenitySummary.innerHTML = keys.map(key => {
      const item = amenityCatalog[key] || { label: key, icon: "spark" };
      return `<span>${amenityIcon(item.icon)} ${item.label}</span>`;
    }).join("");
  }

  list.innerHTML = result.length
    ? result.map((room, index) => roomResultCardHTML(room, state, index)).join("")
    : `
      <div class="empty-state">
        <h3>Chưa có phòng phù hợp</h3>
        <p>Thử đổi địa điểm, bỏ bớt tiện ích hoặc chọn gói lưu trú khác để xem thêm lựa chọn.</p>
      </div>
    `;

  initReveal();
  applyLanguage(getStoredLanguage());
};

const initRoomsResultsPage = () => {
  if (!$("#roomsResultList")) return;
  renderRoomsResults();
  $("#roomsSort")?.addEventListener("change", renderRoomsResults);
  $$("[data-result-filter]").forEach(input => input.addEventListener("change", renderRoomsResults));
};

const adminRoomRowHTML = (room) => {
  const admin = getRoomAdmin(room);
  const amenities = Object.entries(amenityCatalog).map(([key, item]) => `
    <label class="admin-amenity-toggle">
      <input type="checkbox" data-room-id="${room.id}" data-admin-field="amenity" data-amenity="${key}" ${admin.amenities.includes(key) ? "checked" : ""}>
      <span>${amenityIcon(item.icon)} ${item.label}</span>
    </label>
  `).join("");

  return `
    <article class="admin-room-row" data-room-id="${room.id}">
      <img src="${getMainImage(room)}" alt="${room.name}" loading="lazy">
      <div class="admin-room-main">
        <span>${room.id} · ${room.location}</span>
        <h3>${room.name}</h3>
        <div class="admin-room-controls">
          <label>Số lượng
            <input type="number" min="0" max="12" value="${admin.inventory}" data-room-id="${room.id}" data-admin-field="inventory">
          </label>
          <label>Trạng thái
            <select data-room-id="${room.id}" data-admin-field="status">
              ${Object.entries(statusLabels).map(([key, label]) => `<option value="${key}" ${admin.status === key ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </label>
          <label>Dạng phòng
            <input type="text" value="${admin.category}" data-room-id="${room.id}" data-admin-field="category">
          </label>
        </div>
        <div class="admin-amenity-list">${amenities}</div>
      </div>
    </article>
  `;
};

const adminContactChannelHTML = (channel) => `
  <article class="admin-contact-row" data-contact-id="${escapeHTML(channel.id)}">
    <label class="admin-contact-enabled">
      <input type="checkbox" data-contact-field="enabled" ${channel.enabled !== false ? "checked" : ""}>
      <span>Hiển thị</span>
    </label>
    <div class="admin-contact-main">
      <div class="admin-contact-title">
        <span>${escapeHTML(channel.short || "US")}</span>
        <strong>${escapeHTML(channel.label || "Kênh liên hệ")}</strong>
      </div>
      <div class="admin-contact-controls">
        <label>Tên kênh
          <input type="text" value="${escapeHTML(channel.label || "")}" data-contact-field="label">
        </label>
        <label>Ký hiệu
          <input type="text" maxlength="4" value="${escapeHTML(channel.short || "")}" data-contact-field="short">
        </label>
        <label>Link
          <input type="url" value="${escapeHTML(channel.url || "")}" data-contact-field="url" placeholder="https://zalo.me/...">
        </label>
        <label>Ghi chú trên nút
          <input type="text" value="${escapeHTML(channel.note || "")}" data-contact-field="note">
        </label>
      </div>
      <label class="admin-contact-template">Mẫu tin nhắn tự copy
        <textarea data-contact-field="template" rows="3">${escapeHTML(channel.template || "")}</textarea>
      </label>
      <p class="admin-contact-help">Biến dùng được: {{room}}, {{roomId}}, {{destination}}, {{date}}, {{duration}}, {{nights}}, {{guests}}, {{url}}</p>
    </div>
    <button class="btn soft small admin-contact-delete" type="button" data-contact-action="delete">Xóa</button>
  </article>
`;

const renderAdminContactTools = () => {
  const manager = $("#adminContactManager");
  if (!manager) return;

  const channels = readContactChannels();
  manager.innerHTML = channels.map(adminContactChannelHTML).join("");

  const state = $("#adminContactState");
  if (state) {
    const active = channels.filter(channel => channel.enabled !== false).length;
    state.textContent = `${active}/${channels.length} kênh đang hiển thị ngoài trang chính. Tin nhắn sẽ kèm thông tin phòng, ngày, gói và số khách.`;
  }
};

const renderAdminTools = () => {
  const manager = $("#adminRoomManager");
  if (!manager) return;

  const metrics = $("#adminMetrics");
  const totalInventory = rooms.reduce((sum, room) => sum + getRoomAdmin(room).inventory, 0);
  const activeRooms = rooms.filter(room => getRoomAdmin(room).status !== "maintenance").length;
  const lockedRooms = rooms.length - activeRooms;
  const locationCount = new Set(rooms.map(room => room.location)).size;

  if (metrics) {
    metrics.innerHTML = `
      <div><strong>${rooms.length}</strong><span>layout</span></div>
      <div><strong>${totalInventory}</strong><span>phòng đang quản lý</span></div>
      <div><strong>${activeRooms}</strong><span>layout đang mở</span></div>
      <div><strong>${locationCount}</strong><span>địa điểm</span></div>
      <div><strong>${lockedRooms}</strong><span>layout tạm khóa</span></div>
    `;
  }

  manager.innerHTML = rooms.map(adminRoomRowHTML).join("");
  renderAdminContactTools();

  const catalog = $("#adminAmenityCatalog");
  if (catalog) {
    catalog.innerHTML = Object.values(amenityCatalog).map(item => `
      <span>${amenityIcon(item.icon)} ${item.label}</span>
    `).join("");
  }
  applyLanguage(getStoredLanguage());
};

const initAdminTools = () => {
  const manager = $("#adminRoomManager");
  if (!manager || typeof rooms === "undefined") return;

  const bookingMount = $("#adminBookingMount");
  if (bookingMount && !$("#homeBookingBar")) {
    bookingMount.innerHTML = bookingWidgetHTML({
      className: "admin-booking-bar reveal-up",
      buttonText: "Tìm phòng",
      note: "Preview nhanh luồng khách: chọn tiêu chí rồi mở trang lựa phòng."
    });
    initHomeBookingWidget();
  }

  renderAdminTools();

  const saveAdminControl = (event) => {
    const control = event.target.closest("[data-room-id][data-admin-field]");
    if (!control) return;

    const room = rooms.find(item => item.id === control.dataset.roomId);
    if (!room) return;

    const data = readAdminOverrides();
    const current = { ...getRoomAdmin(room) };
    const field = control.dataset.adminField;
    if (event.type === "input" && field !== "inventory") return;

    if (field === "inventory") current.inventory = Math.max(0, Number(control.value || 0));
    if (field === "status") current.status = control.value;
    if (field === "category") current.category = control.value.trim() || defaultRoomAdmin(room).category;
    if (field === "amenity") {
      const key = control.dataset.amenity;
      current.amenities = control.checked
        ? [...new Set([...current.amenities, key])]
        : current.amenities.filter(item => item !== key);
    }

    data[room.id] = current;
    writeAdminOverrides(data);
    renderAdminTools();

    const saved = $("#adminSaveState");
    if (saved) {
      saved.textContent = `Đã lưu thay đổi cho ${room.id}. Trang chính, chọn phòng và chi tiết sẽ đọc dữ liệu này.`;
    }
  };

  manager.addEventListener("input", saveAdminControl);
  manager.addEventListener("change", saveAdminControl);

  const contactManager = $("#adminContactManager");
  const saveContactControl = (event) => {
    const row = event.target.closest("[data-contact-id]");
    const control = event.target.closest("[data-contact-field]");
    if (!row || !control) return;

    const channels = readContactChannels();
    const channel = channels.find(item => item.id === row.dataset.contactId);
    if (!channel) return;

    const field = control.dataset.contactField;
    if (field === "enabled") channel.enabled = control.checked;
    if (field === "label") channel.label = control.value.trim();
    if (field === "short") channel.short = control.value.trim().slice(0, 4);
    if (field === "url") channel.url = control.value.trim();
    if (field === "note") channel.note = control.value.trim();
    if (field === "template") channel.template = control.value.trim();

    writeContactChannels(channels);
    const state = $("#adminContactState");
    if (state) state.textContent = `Đã lưu kênh ${channel.label || channel.id}. Trang chính sẽ dùng nội dung mới.`;
  };

  contactManager?.addEventListener("input", saveContactControl);
  contactManager?.addEventListener("change", saveContactControl);
  contactManager?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-contact-action]");
    if (!action) return;

    const row = action.closest("[data-contact-id]");
    const channels = readContactChannels();
    const next = channels.filter(channel => channel.id !== row?.dataset.contactId);
    writeContactChannels(next);
    renderAdminContactTools();
  });

  $("#adminAddContactChannel")?.addEventListener("click", () => {
    const channels = readContactChannels();
    const id = `custom-${Date.now()}`;
    channels.push({
      id,
      enabled: true,
      short: "NEW",
      label: "Kênh mới",
      url: "",
      note: "Nhấn để nhắn kèm thông tin phòng.",
      template: "Xin chào Unite, mình muốn hỏi {{room}} tại {{destination}}, {{date}}, {{duration}}, {{guests}}. Link: {{url}}"
    });
    writeContactChannels(channels);
    renderAdminContactTools();
  });

  $("#adminResetContactChannels")?.addEventListener("click", () => {
    try {
      localStorage.removeItem(CONTACT_CHANNEL_STORAGE_KEY);
    } catch {
      // Defaults will render below.
    }
    renderAdminContactTools();
  });

  $("#adminResetOverrides")?.addEventListener("click", () => {
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch {
      // Nothing else to reset when browser storage is blocked.
    }
    renderAdminTools();
    const saved = $("#adminSaveState");
    if (saved) saved.textContent = "Đã đưa dữ liệu quản trị về mặc định trong rooms.js.";
  });
};

const bindFilters = () => {
  const buttons = $$(".filter-btn");
  if (!buttons.length) return;

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(item => item.classList.remove("active"));
      button.classList.add("active");

      const filter = button.dataset.filter;
      const filteredRooms = filter === "all"
        ? rooms
        : rooms.filter(room => room.filters.includes(filter));

      renderPriceCompare(filteredRooms);
    });
  });
};

const bindCopyButtons = () => {
  $$("[data-copy]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.copy;
      try {
        await navigator.clipboard.writeText(id);
        const oldText = button.textContent;
        button.textContent = "Đã copy";
        setTimeout(() => button.textContent = oldText, 1200);
      } catch {
        alert(`Mã phòng: ${id}`);
      }
    });
  });
};

const renderReel = () => {
  const track = $("#reelTrack");
  const windowEl = $("#reelWindow");
  if (!track || !windowEl) return;

  const itemHTML = (room) => `
    <a class="reel-card" href="room.html?id=${room.id}" data-room="${room.id}">
      ${imgTag(getMainImage(room), room.name)}
      <div class="reel-overlay"></div>
      <div class="reel-content">
        <span>${room.chapter} · ${room.location}</span>
        <h3>${room.name}</h3>
        <p>${room.shortLine}</p>
        <strong>${getPrice(room, "3 tiếng")} / 3 tiếng</strong>
      </div>
    </a>
  `;

  const loop = [...rooms, ...rooms, ...rooms, ...rooms];
  track.innerHTML = loop.map(itemHTML).join("");

  let raf = null;
  let isDown = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let isHovered = false;
  let moved = false;
  let gestureMode = null; // null | "horizontal" | "vertical"
  let lastTime = performance.now();
  let resumeTimer = null;

  const getOneSetWidth = () => track.scrollWidth / 4;

  const normalizeScroll = () => {
    const oneSetWidth = getOneSetWidth();
    if (oneSetWidth <= 0) return;
    if (windowEl.scrollLeft >= oneSetWidth * 2.5) windowEl.scrollLeft -= oneSetWidth;
    if (windowEl.scrollLeft <= oneSetWidth * 0.25) windowEl.scrollLeft += oneSetWidth;
  };

  const temporarilyPause = (ms = 900) => {
    isHovered = true;
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => { isHovered = false; }, ms);
  };

  const loopScroll = (now = performance.now()) => {
    const dt = Math.min(40, now - lastTime);
    lastTime = now;
    normalizeScroll();

    const speed = window.innerWidth < 760 ? 34 : 42;
    if (!isDown && !isHovered && document.visibilityState === "visible") {
      windowEl.scrollLeft += (speed * dt) / 1000;
    }

    raf = requestAnimationFrame(loopScroll);
  };

  const initPosition = () => {
    const oneSetWidth = getOneSetWidth();
    if (oneSetWidth > 0) windowEl.scrollLeft = oneSetWidth;
    lastTime = performance.now();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loopScroll);
  };

  requestAnimationFrame(() => setTimeout(initPosition, 220));
  window.addEventListener("resize", () => setTimeout(initPosition, 180));

  const startDrag = (clientX, clientY = 0) => {
    isDown = true;
    moved = false;
    gestureMode = null;
    startX = clientX;
    startY = clientY;
    scrollLeft = windowEl.scrollLeft;
    windowEl.classList.add("cursor-grabbing");
  };

  const moveDrag = (clientX, clientY = 0, event) => {
    if (!isDown) return;

    const dx = clientX - startX;
    const dy = clientY - startY;

    if (event?.type === "touchmove" && gestureMode === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      gestureMode = Math.abs(dx) > Math.abs(dy) * 1.18 ? "horizontal" : "vertical";
      if (gestureMode === "vertical") {
        isDown = false;
        windowEl.classList.remove("cursor-grabbing");
        return;
      }
    }

    if (event?.type === "touchmove" && gestureMode !== "horizontal") return;

    if (Math.abs(dx) > 5) moved = true;
    windowEl.scrollLeft = scrollLeft - dx * 1.12;
    normalizeScroll();
    if (event?.cancelable) event.preventDefault();
  };

  const endDrag = () => {
    if (isDown || gestureMode === "horizontal") temporarilyPause(650);
    isDown = false;
    gestureMode = null;
    windowEl.classList.remove("cursor-grabbing");
  };

  if (window.matchMedia("(hover: hover)").matches) {
    windowEl.addEventListener("mouseenter", () => isHovered = true);
    windowEl.addEventListener("mouseleave", () => { isHovered = false; endDrag(); });
  }

  windowEl.addEventListener("mousedown", e => startDrag(e.pageX, e.pageY));
  window.addEventListener("mousemove", e => moveDrag(e.pageX, e.pageY, e));
  window.addEventListener("mouseup", endDrag);

  windowEl.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, { passive: true });

  windowEl.addEventListener("touchmove", e => {
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY, e);
  }, { passive: false });

  window.addEventListener("touchend", endDrag, { passive: true });
  window.addEventListener("touchcancel", endDrag, { passive: true });

  windowEl.addEventListener("click", e => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  const scrollAmount = () => {
    const firstCard = $(".reel-card", track);
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : Math.min(520, window.innerWidth * 0.82);
    return Math.round(cardWidth + 28);
  };

  $("#reelPrev")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    temporarilyPause(900);
    windowEl.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
  });

  $("#reelNext")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    temporarilyPause(900);
    windowEl.scrollBy({ left: scrollAmount(), behavior: "smooth" });
  });

  window.addEventListener("beforeunload", () => {
    if (raf) cancelAnimationFrame(raf);
    window.clearTimeout(resumeTimer);
  });
};

const renderRules = () => {
  const list = $("#rulesList");
  if (!list) return;
  const lang = getStoredLanguage();

  list.innerHTML = houseRules.map((rule, index) => `
    <article class="rules-item" style="--delay:${index * 45}ms">
      <div class="rules-number">${String(index + 1).padStart(2, "0")}</div>
      <div class="rules-icon">${rule.icon}</div>
      <p>${houseRuleTranslations[rule.text]?.[lang] || rule.text}</p>
    </article>
  `).join("");
  applyLanguage(lang);
};

const renderRoomDetail = () => {
  const container = $("#roomDetail");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || rooms[0]?.id;
  const room = rooms.find(item => item.id === id);

  if (!room) {
    container.innerHTML = `
      <section class="detail-shell not-found">
        <h1>Không tìm thấy phòng</h1>
        <p>Mã phòng chưa có trong rooms.js.</p>
        <a class="btn primary" href="index.html">Quay về trang chính</a>
      </section>
    `;
    return;
  }

  document.title = `${room.name} | Unite Staycation`;
  const detail = roomDetailContent(room);
  const relatedRooms = rooms.filter(item => item.id !== room.id).slice(0, 3);

  container.innerHTML = `
    <nav class="detail-subnav" aria-label="Điều hướng chi tiết phòng">
      <a href="#overviewPanel">Tổng quan</a>
      <a href="#bookingPanel">Gói lưu trú</a>
      <a href="#galleryPanel">Hình ảnh</a>
      <a href="#guidePanel">Hướng dẫn</a>
      <a href="#faqPanel">FAQ</a>
    </nav>

    <section class="detail-top">
      <div class="detail-cover reveal-up">
        ${imgTag(getMainImage(room), room.name)}
        <span class="room-id large">${room.id}</span>
      </div>

      <div id="overviewPanel" class="detail-info reveal-up">
        <p class="eyebrow">${room.chapter} · ${room.type} · ${room.location}</p>
        <h1>${room.name}</h1>
        <div class="review-strip" aria-label="Đánh giá phòng">
          <span class="review-source">UNITE PICK</span>
          <strong>${detail.score}<small>/5</small></strong>
          <span>${detail.verdict}</span>
          <a href="#reviewPanel">${detail.reviews}</a>
        </div>
        <p class="detail-desc">${room.description}</p>
        <div class="tag-list">${tagsHTML(room.tags)}</div>

        <div class="detail-price-compact">
          ${compactPricesHTML(room)}
        </div>

        <div class="detail-facts">
          ${detail.facts.map(item => `
            <span><small>${item.label}</small><strong>${item.value}</strong></span>
          `).join("")}
        </div>

        <div class="address-box">
          <span>Địa chỉ</span>
          <strong>${room.address}</strong>
          <small>Unite sẽ gửi hướng dẫn check-in chi tiết sau khi xác nhận lịch.</small>
        </div>

        <div class="detail-actions">
          <a class="btn primary magnetic" href="#bookingPanel">Chọn gói lưu trú</a>
          <a class="btn ghost magnetic" href="#galleryPanel">Xem hình phòng</a>
        </div>
      </div>
    </section>

    <section id="galleryPanel" class="detail-body">
      <div class="gallery-panel reveal-up">
        <div class="gallery-heading">
          <div>
            <p class="section-kicker">Gallery</p>
            <h2>Room mood</h2>
          </div>
          <span>${room.images.length} images</span>
        </div>

        <div class="gallery-grid">
          ${room.images.map((src, index) => `
            <button class="gallery-item" type="button" data-preview="${src}">
              ${imgTag(src, `${room.name} ${index + 1}`)}
            </button>
          `).join("")}
        </div>
      </div>

      <aside class="detail-note reveal-up">
        <p class="section-kicker">Stay note</p>
        <h2>${room.vibe}</h2>
        <p>${room.description}</p>
        <p class="price-note">Có các gói linh hoạt theo từng khung giờ. Vui lòng xác nhận tình trạng phòng trước khi đặt.</p>
      </aside>
    </section>

    ${bookingWidgetHTML({
      className: "detail-booking-bar reveal-up",
      buttonText: "Đặt phòng",
      note: `Đang xem ${room.id}. Chọn ngày, gói và số khách để kiểm tra lịch phù hợp.`,
      room
    })}

    <section class="detail-story-grid">
      <article class="detail-story reveal-up">
        <p class="section-kicker">Stay story</p>
        <h2>Thông tin trước khi đặt</h2>
        ${detail.intro.map(text => `<p>${text}</p>`).join("")}
      </article>

      <aside class="fit-panel reveal-up">
        <p class="section-kicker">Phù hợp cho</p>
        <div class="fit-list">
          ${detail.goodFor.map(item => `<span>${item}</span>`).join("")}
        </div>
      </aside>
    </section>

    <section class="amenity-section reveal-up">
      <div class="section-line-heading">
        <p class="section-kicker">Tiện nghi chính</p>
        <h2>Thông tin thường được quan tâm trước khi đến.</h2>
      </div>
      <div class="amenity-grid">
        ${getRoomAmenities(room).map(item => `
          <article class="amenity-card">
            <span>${amenityIcon(item.icon)}</span>
            <h3>${item.label}</h3>
            <p>${detail.amenities.find(base => base.label.includes(item.label) || item.label.includes(base.label))?.desc || "Tiện ích được admin bật trong dữ liệu phòng và hiển thị đồng bộ trên các bề mặt web."}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section id="bookingPanel" class="booking-panel reveal-up">
      <div class="section-line-heading">
        <p class="section-kicker">Chọn gói lưu trú</p>
        <h2>Gói linh hoạt theo lịch ở.</h2>
      </div>
      <div class="booking-package-grid">
        ${room.prices.map((item, index) => `
          <article class="package-card ${index === 0 ? "is-featured" : ""}">
            <span>${index === 0 ? "Phổ biến" : "Linh hoạt"}</span>
            <h3>${item.label}</h3>
            <strong>${item.value}</strong>
            <p>${index === 0 ? "Phù hợp cho một buổi nghỉ nhanh, xem phim hoặc đổi không gian." : "Phù hợp cho lịch lưu trú dài hơn, nghỉ ngơi, làm việc nhẹ hoặc chụp hình."}</p>
            <a class="btn soft small" href="#contact" data-contact-popover data-room-id="${room.id}">Nhắn đặt ${room.id}</a>
          </article>
        `).join("")}
      </div>
      <p class="booking-note">Giá hiển thị là giá tham khảo. Unite sẽ xác nhận lại theo ngày, khung giờ và tình trạng phòng thực tế.</p>
    </section>

    <section id="guidePanel" class="guide-section reveal-up">
      <div class="section-line-heading">
        <p class="section-kicker">Trước khi đến</p>
        <h2>Quy trình đặt phòng rõ ràng.</h2>
      </div>
      <div class="guide-grid">
        ${detail.steps.map((step, index) => `
          <article class="guide-card">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <h3>${step.title}</h3>
            <p>${step.desc}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="nearby-section reveal-up">
      <div class="section-line-heading">
        <p class="section-kicker">Xung quanh stay</p>
        <h2>Vị trí và điểm kết nối gần đây.</h2>
      </div>
      <div class="nearby-grid">
        ${detail.nearby.map(item => `
          <article class="nearby-card">
            <h3>${item.name}</h3>
            <p>${item.desc}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section id="reviewPanel" class="review-panel reveal-up">
      <div>
        <p class="section-kicker">Guest mood</p>
        <h2>${detail.score}<small>/5</small></h2>
        <strong>${detail.verdict}</strong>
      </div>
      <p>Khách thường thích sự riêng tư, ảnh phòng rõ, giá theo khung giờ dễ hiểu và admin xác nhận nhanh trước khi đến. Điểm này là nội dung mô phỏng để tăng độ dễ hiểu cho trang chi tiết.</p>
    </section>

    <section id="faqPanel" class="faq-section reveal-up">
      <div class="section-line-heading">
        <p class="section-kicker">FAQ</p>
        <h2>Câu hỏi thường gặp.</h2>
      </div>
      <div class="faq-list">
        ${detail.faqs.map(item => `
          <article>
            <h3>${item.q}</h3>
            <p>${item.a}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="related-section reveal-up">
      <div class="section-line-heading">
        <p class="section-kicker">Có thể xem thêm</p>
        <h2>Các layout cùng phong cách.</h2>
      </div>
      <div class="related-grid">
        ${relatedRooms.map(item => `
          <a class="related-card" href="room.html?id=${item.id}">
            ${imgTag(getMainImage(item), item.name)}
            <span>${item.id}</span>
            <h3>${item.name}</h3>
            <p>${item.shortLine}</p>
          </a>
        `).join("")}
      </div>
    </section>

    <div class="floating-book">
      <span>${room.name}</span>
      <a class="btn primary small" href="#bookingPanel">Đặt phòng</a>
    </div>

    <div class="lightbox" id="lightbox" aria-hidden="true">
      <button class="lightbox-close" type="button" aria-label="Đóng">×</button>
      <img alt="Xem ảnh lớn" />
    </div>
  `;

  initReveal();
  initMagneticButtons();
  bindLightbox();
};

const bindLightbox = () => {
  const lightbox = $("#lightbox");
  if (!lightbox) return;

  const lightboxImg = $("img", lightbox);
  const closeBtn = $(".lightbox-close", lightbox);

  $$("[data-preview]").forEach(button => {
    button.addEventListener("click", () => {
      lightboxImg.src = button.dataset.preview;
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
    });
  });

  const close = () => {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.removeAttribute("src");
  };

  closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) close();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") close();
  });
};



// V11: Public live catalogue loader. Giữ nguyên UI, chỉ thay nguồn dữ liệu nếu Supabase đã cấu hình.
const loadPublicRoomsFromSupabase = async () => {
  const config = window.UNITE_SUPABASE_CONFIG || {};
  const baseUrl = String(config.url || "").replace(/\/$/, "");
  const key = config.anonKey || config.publishableKey || "";
  if (!baseUrl || !key || baseUrl.includes("PASTE_") || key.includes("PASTE_")) return false;
  try {
    const select = [
      "id","code","name","category","price_tier","vibe","short_line","description","inventory_count","status","is_published","sort_order",
      "branches(name,area,public_address)",
      "room_prices(package_label,base_price,sale_price,sort_order,is_active)",
      "room_images(storage_path,public_url,sort_order,is_cover,is_active)",
      "promotions(title,discount_percent,discount_amount,badge_label,show_badge,starts_at,ends_at,is_active,created_at)"
    ].join(",");
    const query = new URLSearchParams({ select, is_published: "eq.true", order: "sort_order.asc" });
    const requestHeaders = { apikey: key, Authorization: `Bearer ${key}` };
    const [response, globalPromoResponse] = await Promise.all([
      fetch(`${baseUrl}/rest/v1/room_types?${query.toString()}`, { headers: requestHeaders }),
      fetch(`${baseUrl}/rest/v1/promotions?select=title,discount_percent,discount_amount,badge_label,show_badge,starts_at,ends_at,is_active,created_at&room_type_id=is.null&is_active=eq.true&order=created_at.desc`, { headers: requestHeaders })
    ]);
    if (!response.ok) return false;
    const rows = await response.json();
    const globalPromotions = globalPromoResponse.ok ? await globalPromoResponse.json() : [];
    if (!Array.isArray(rows) || !rows.length) return false;
    const imageUrl = (img) => img.public_url || (img.storage_path ? `${baseUrl}/storage/v1/object/public/${config.roomImageBucket || "room-images"}/${img.storage_path}` : "");
    const isCurrentPromotion = (promo) => {
      if (!promo || promo.is_active === false) return false;
      const now = Date.now();
      if (promo.starts_at && new Date(promo.starts_at).getTime() > now) return false;
      if (promo.ends_at && new Date(promo.ends_at).getTime() < now) return false;
      return true;
    };
    rooms = rows.map(row => {
      const promotion = [...(row.promotions || []), ...(globalPromotions || [])]
        .filter(isCurrentPromotion)
        .sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null;
      const mappedPrices = (row.room_prices || []).filter(p => p.is_active !== false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(p => {
        const base = Number(p.base_price || 0);
        const displayLabel = ({ day:"Ngày", night:"Qua đêm", "3h":"3 tiếng", "4h":"4 tiếng", "8h":"8 tiếng" })[p.package_code] || p.package_label;
        let sale = Number(p.sale_price || base);
        if (promotion?.discount_percent) sale = Math.round(base * (100 - Number(promotion.discount_percent)) / 100);
        else if (promotion?.discount_amount) sale = Math.max(0, base - Number(promotion.discount_amount));
        return { label:displayLabel, value:formatKPrice(sale / 1000), originalValue:sale < base ? formatKPrice(base / 1000) : "", basePrice:base, salePrice:sale };
      });
      return ({
      id: row.code,
      chapter: row.code?.split("-")?.[0]?.replace("C", "Chapter ") || "Chapter",
      type: "Studio",
      name: row.name,
      location: row.branches?.name || "Unite Staycation",
      district: row.branches?.area || "",
      address: row.branches?.public_address || row.branches?.name || "",
      priceTier: row.price_tier || "premium",
      inventory: Number(row.inventory_count || 0),
      status: row.status || "available",
      category: row.category || "Studio",
      vibe: row.vibe || "Private stay",
      shortLine: row.short_line || row.vibe || "Private stay",
      description: row.description || row.short_line || "Không gian lưu trú riêng tư tại Unite Staycation.",
      prices: mappedPrices,
      promotion,
      tags: ["Studio", row.category || "Private", row.price_tier || "Premium"].filter(Boolean),
      amenities: ["wifi", "aircon", "tv", "self-checkin"],
      filters: [row.branches?.name, row.branches?.area, row.category, row.price_tier].filter(Boolean),
      images: (row.room_images || []).filter(img => img.is_active !== false).sort((a,b)=>(b.is_cover===true)-(a.is_cover===true) || (a.sort_order||0)-(b.sort_order||0)).map(imageUrl).filter(Boolean)
    });
    });
    window.rooms = rooms;
    return true;
  } catch (error) {
    console.warn("Public Supabase catalogue fallback to local rooms.js", error);
    return false;
  }
};

const init = async () => {
  initLoader();
  initHeader();
  initLanguageSwitcher();
  initHeaderQuickContact();
  initReveal();
  initMagneticButtons();
  initSmartBookingDock();
  initContactChannels();

  await loadPublicRoomsFromSupabase();
  syncStaticLiveImages();

  const page = document.body.dataset.page;

  if (page === "home") {
    renderHeroStack();
    renderReel();
    renderHomeRooms();
    renderPriceCompare(rooms);
    renderRules();
    bindFilters();
    initHomeBookingWidget();
    initReveal();
  }

  if (page === "rooms") {
    initHomeBookingWidget();
    initRoomsResultsPage();
    initReveal();
  }

  if (page === "room") {
    renderRoomDetail();
    initHomeBookingWidget();
  }

  if (page === "admin") {
    initAdminTools();
    initReveal();
  }

  applyLanguage(getStoredLanguage());
};

document.addEventListener("DOMContentLoaded", init);
