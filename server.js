const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const STATIC_FILES = new Set(['index.html', 'styles.css', 'app.js', 'logo.svg']);
const PORT = Number(process.env.PORT || 3000);

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!Object.hasOwn(process.env, key)) process.env[key] = value;
  }
}
loadEnvFile();

const CATALOG_CONTEXT = [
  'Gunpla Action Display Kit — Gundam — mô hình lắp ráp robot Gundam.',
  'Mika — Blue Archive — figure anime/game tỉ lệ trưng bày.',
  'Hina — Blue Archive — figure anime/game tỉ lệ trưng bày.',
  'Link — The Legend of Zelda: Tears of the Kingdom — figure game.',
  'Mario Question Block Statue — Super Mario — mô hình game.',
  'Atreus — God of War — figure game.',
].join('\n');

const HOBBYVERSE_INSTRUCTIONS = [
  'Bạn là HobbyVerse AI, trợ lý tư vấn sưu tầm mô hình Gundam/Gunpla, figure anime, mô hình game và collectible.',
  'Luôn trả lời bằng tiếng Việt tự nhiên, thân thiện, dễ hiểu cho người mới sưu tầm.',
  'Giúp người dùng chọn mô hình theo ngân sách, kích thước, sở thích series, kinh nghiệm lắp ráp và không gian trưng bày.',
  'Khi tư vấn hãy nêu ưu điểm, nhược điểm, độ khó, vật dụng cần thiết và lưu ý bảo quản nếu phù hợp.',
  'Không bịa giá bán hiện tại, nơi bán, hàng còn hay độ hiếm. Giá trên website chỉ là dữ liệu minh họa; hãy nói rõ khi không có dữ liệu xác thực.',
  'Không khẳng định một sản phẩm là chính hãng nếu chưa có nguồn xác nhận. Khuyến khích kiểm tra nhà sản xuất, tem và nhà bán uy tín.',
  'Nếu yêu cầu chưa rõ, chỉ hỏi tối đa 1–2 câu thiết yếu như ngân sách hoặc series yêu thích.',
  'Không yêu cầu người dùng gửi mật khẩu, mã OTP hoặc khóa API.',
  'Danh mục demo hiện có:\n' + CATALOG_CONTEXT,
].join('\n');

function sanitizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .slice(-8)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 2500) }));
}

function buildGeminiInput({ message, history = [] }) {
  const turns = sanitizeHistory(history);
  const transcript = turns.map((item) =>
    `${item.role === 'user' ? 'Người dùng' : 'HobbyVerse AI'}: ${item.content}`,
  );
  transcript.push(`Người dùng: ${message.slice(0, 3000)}`);
  return transcript.join('\n\n');
}

function getProviderConfig() {
  const provider = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  if (provider === 'gemini') {
    return {
      provider,
      url: 'https://generativelanguage.googleapis.com/v1beta/interactions',
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    };
  }
  if (provider === 'openclaw') {
    return {
      provider,
      url: process.env.OPENCLAW_API_URL || 'http://127.0.0.1:18789/v1/chat/completions',
      apiKey: process.env.OPENCLAW_GATEWAY_TOKEN,
      model: process.env.OPENCLAW_MODEL || 'openclaw/default',
    };
  }
  if (provider === 'compatible') {
    const baseUrl = (process.env.AI_BASE_URL || '').replace(/\/$/, '');
    return {
      provider,
      url: baseUrl ? `${baseUrl}/chat/completions` : '',
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL,
    };
  }
  throw new Error('AI_PROVIDER chỉ nhận gemini, compatible hoặc openclaw.');
}

function isRealConfig(config) {
  return [config.url, config.apiKey, config.model].every(
    (value) => typeof value === 'string' && value.trim() && !/YOUR_|PUT_YOUR_|PLACEHOLDER/i.test(value),
  );
}

function extractGeminiText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const text = (data?.steps || [])
    .filter((step) => step?.type === 'model_output')
    .flatMap((step) => step.content || [])
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();
  return text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(response, attempt, baseDelayMs, maxDelayMs) {
  const retryAfter = response.headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const retryDate = Date.parse(retryAfter);
    const serverDelay = Number.isFinite(seconds)
      ? seconds * 1000
      : (Number.isFinite(retryDate) ? Math.max(0, retryDate - Date.now()) : NaN);
    if (Number.isFinite(serverDelay)) {
      return Math.min(maxDelayMs, Math.max(0, serverDelay));
    }
  }
  return Math.min(maxDelayMs, baseDelayMs * (2 ** attempt));
}

async function fetchWithRetry(url, options, {
  maxRetries = 2,
  baseDelayMs = 1500,
  maxDelayMs = 6000,
  fetchImpl = fetch,
  sleepImpl = sleep,
} = {}) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetchImpl(url, options);
    if (response.status !== 503 || attempt >= maxRetries) {
      return response;
    }
    const delayMs = getRetryDelayMs(response, attempt, baseDelayMs, maxDelayMs);
    await sleepImpl(delayMs);
  }
}

async function callGemini({ message, history, config }) {
  const response = await fetchWithRetry(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey,
    },
    body: JSON.stringify({
      model: config.model,
      input: buildGeminiInput({ message, history }),
      system_instruction: HOBBYVERSE_INSTRUCTIONS,
      store: false,
    }),
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = data?.error?.message;
    const error = new Error(
      `Gemini API phản hồi HTTP ${response.status}${providerMessage ? `: ${String(providerMessage).slice(0, 260)}` : '. Hãy kiểm tra API key, model và quyền truy cập.'}`,
    );
    error.providerStatus = response.status;
    error.status = response.status === 429 ? 429 : response.status === 503 ? 503 : 502;
    throw error;
  }
  const answer = extractGeminiText(data);
  if (!answer) {
    const error = new Error('Gemini không trả về nội dung văn bản. Hãy thử lại hoặc kiểm tra model đã chọn.');
    error.status = 502;
    throw error;
  }
  return answer;
}

async function callOpenAICompatible({ message, history, config }) {
  const messages = [
    { role: 'system', content: HOBBYVERSE_INSTRUCTIONS },
    ...sanitizeHistory(history),
    { role: 'user', content: message.slice(0, 3000) },
  ];
  const response = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages }),
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Dịch vụ AI phản hồi HTTP ${response.status}. Hãy kiểm tra cấu hình nhà cung cấp.`);
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }
  const answer = data?.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) {
    const error = new Error('AI không trả về nội dung theo định dạng Chat Completions.');
    error.status = 502;
    throw error;
  }
  return answer.trim();
}

async function requestAI({ message, history = [] }) {
  const config = getProviderConfig();
  if (!isRealConfig(config)) {
    const error = new Error('Chưa cấu hình Gemini. Hãy điền GEMINI_API_KEY trong file .env rồi khởi động lại website.');
    error.status = 503;
    throw error;
  }
  if (config.provider === 'gemini') return callGemini({ message, history, config });
  return callOpenAICompatible({ message, history, config });
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon',
};
const rateBuckets = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const current = rateBuckets.get(ip);
  if (!current || now - current.start > 60_000) {
    rateBuckets.set(ip, { start: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > 12;
}
function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readJson(req, limit = 24 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        const error = new Error('Nội dung gửi lên quá lớn.');
        error.status = 413;
        reject(error);
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { const error = new Error('Dữ liệu JSON không hợp lệ.'); error.status = 400; reject(error); }
    });
    req.on('error', reject);
  });
}
function sendSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
}

const server = http.createServer(async (req, res) => {
  sendSecurityHeaders(res);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    let provider = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
    let configured = false;
    let model = null;
    try {
      const config = getProviderConfig();
      configured = isRealConfig(config);
      model = config.model;
    } catch {}
    return sendJson(res, 200, { ok: true, provider, configured, model });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (isRateLimited(ip)) return sendJson(res, 429, { error: 'Bạn gửi hơi nhanh. Vui lòng thử lại sau một phút.' });
    try {
      const body = await readJson(req);
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      const history = Array.isArray(body.history) ? body.history : [];
      if (!message) return sendJson(res, 400, { error: 'Bạn hãy nhập câu hỏi trước nhé.' });
      if (message.length > 3000) return sendJson(res, 413, { error: 'Câu hỏi quá dài. Giới hạn là 3.000 ký tự.' });
      const answer = await requestAI({ message, history });
      return sendJson(res, 200, { answer });
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 502;
      let userMessage;
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        userMessage = 'Gemini phản hồi quá lâu. Hãy thử lại với câu hỏi ngắn hơn.';
      } else if (error.providerStatus === 503) {
        userMessage = 'Gemini đang tạm thời quá tải (HTTP 503). Website đã tự thử lại 2 lần nhưng dịch vụ vẫn bận. Đây thường không phải lỗi API key; hãy chờ một lúc rồi gửi lại nhé.';
      } else if (error.providerStatus === 429) {
        userMessage = 'Gemini đang giới hạn số lượt gọi hoặc hạn mức sử dụng (HTTP 429). Hãy kiểm tra Usage & Billing trong Google AI Studio rồi thử lại sau.';
      } else {
        userMessage = error.message || 'Không thể kết nối AI lúc này.';
      }
      return sendJson(res, status, { error: userMessage });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Phương thức không được hỗ trợ.' });
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return sendJson(res, 400, { error: 'Đường dẫn không hợp lệ.' }); }
  const filename = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  if (!STATIC_FILES.has(filename) || filename.includes('/') || filename.includes('\\')) {
    return sendJson(res, 404, { error: 'Không tìm thấy tài nguyên.' });
  }
  const filePath = path.join(ROOT, filename);
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) return sendJson(res, 404, { error: 'Không tìm thấy tài nguyên.' });
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`HobbyVerse đang chạy tại http://localhost:${PORT}`);
  });
}

module.exports = {
  server,
  HOBBYVERSE_INSTRUCTIONS,
  buildGeminiInput,
  getProviderConfig,
  isRealConfig,
  extractGeminiText,
  fetchWithRetry,
  getRetryDelayMs,
  requestAI,
  isRateLimited,
};
