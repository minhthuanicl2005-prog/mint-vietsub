/**
 * Mint Vietsub — Backend API (Cloudflare Worker)
 * ------------------------------------------------
 * Lưu trữ: 1 KV namespace tên "MINT_KV"
 * Key dùng trong KV:
 *   - "shows"  -> JSON: [{ id, title, poster, playlistId }, ...]
 *
 * Đổi mật khẩu admin ở dòng ADMIN_PASSWORD bên dưới trước khi deploy.
 */

const ADMIN_PASSWORD = "mint2026admin"; // <-- ĐỔI MẬT KHẨU Ở ĐÂY

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

function checkAuth(request) {
  const pw = request.headers.get("X-Admin-Password");
  return pw === ADMIN_PASSWORD;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // GET /api/shows  -> ai cũng xem được (trang chính dùng)
    if (path === "/api/shows" && request.method === "GET") {
      const raw = await env.MINT_KV.get("shows");
      const shows = raw ? JSON.parse(raw) : [];
      return json({ ok: true, shows });
    }

    // POST /api/shows -> cần mật khẩu admin, ghi đè toàn bộ danh sách phim
    if (path === "/api/shows" && request.method === "POST") {
      if (!checkAuth(request)) return json({ ok: false, error: "Sai mật khẩu admin" }, 401);
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "JSON không hợp lệ" }, 400);
      }
      if (!Array.isArray(body.shows)) {
        return json({ ok: false, error: "Thiếu trường 'shows' (mảng)" }, 400);
      }
      await env.MINT_KV.put("shows", JSON.stringify(body.shows));
      return json({ ok: true });
    }

    // POST /api/login -> kiểm tra mật khẩu, dùng khi admin đăng nhập
    if (path === "/api/login" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "JSON không hợp lệ" }, 400);
      }
      if (body.password === ADMIN_PASSWORD) {
        return json({ ok: true });
      }
      return json({ ok: false, error: "Sai mật khẩu" }, 401);
    }

    return json({ ok: false, error: "Không tìm thấy endpoint" }, 404);
  },
};
