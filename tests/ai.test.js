const test = require('node:test');
const assert = require('node:assert/strict');
const {
  HOBBYVERSE_INSTRUCTIONS,
  buildGeminiInput,
  getProviderConfig,
  isRealConfig,
  extractGeminiText,
} = require('../server');

function withEnv(values, callback) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try { callback(); }
  finally {
    for (const key of Object.keys(values)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test('prompt HobbyVerse định hướng trợ lý tư vấn mô hình bằng tiếng Việt', () => {
  assert.match(HOBBYVERSE_INSTRUCTIONS, /Gundam\/Gunpla/);
  assert.match(HOBBYVERSE_INSTRUCTIONS, /tiếng Việt/);
  assert.match(HOBBYVERSE_INSTRUCTIONS, /Không bịa giá bán hiện tại/);
});

test('buildGeminiInput giữ lịch sử hội thoại theo thứ tự', () => {
  const input = buildGeminiInput({
    message: 'Tư vấn Gunpla cho người mới',
    history: [
      { role: 'user', content: 'Mình thích Gundam.' },
      { role: 'assistant', content: 'Bạn mới bắt đầu chứ?' },
      { role: 'system', content: 'Không được đưa vào.' },
    ],
  });
  assert.match(input, /Người dùng: Mình thích Gundam\./);
  assert.match(input, /HobbyVerse AI: Bạn mới bắt đầu chứ\?/);
  assert.ok(input.endsWith('Người dùng: Tư vấn Gunpla cho người mới'));
  assert.doesNotMatch(input, /Không được đưa vào/);
});

test('buildGeminiInput chỉ dùng tối đa 8 lượt hợp lệ gần nhất', () => {
  const history = Array.from({ length: 12 }, (_, i) => ({ role: 'user', content: `câu ${i}` }));
  const input = buildGeminiInput({ message: 'câu hiện tại', history });
  assert.doesNotMatch(input, /câu 3\b/);
  assert.match(input, /câu 4\b/);
  assert.match(input, /câu 11\b/);
  assert.ok(input.endsWith('Người dùng: câu hiện tại'));
});

test('getProviderConfig mặc định sử dụng Gemini Interactions API', () => {
  withEnv({ AI_PROVIDER: undefined, GEMINI_API_KEY: 'test-key', GEMINI_MODEL: undefined }, () => {
    const config = getProviderConfig();
    assert.equal(config.provider, 'gemini');
    assert.equal(config.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(config.apiKey, 'test-key');
    assert.equal(config.model, 'gemini-3.8-flash');
    assert.equal(isRealConfig(config), true);
  });
});

test('placeholder không được coi là API key đã cấu hình', () => {
  assert.equal(isRealConfig({
    url: 'https://generativelanguage.googleapis.com/v1beta/interactions',
    apiKey: 'PASTE_YOUR_NEW_GOOGLE_AI_STUDIO_KEY_HERE',
    model: 'gemini-3.8-flash',
  }), false);
});

test('extractGeminiText đọc schema steps mới của Interactions API', () => {
  const result = extractGeminiText({
    steps: [
      { type: 'thought', content: [{ type: 'text', text: 'ẩn' }] },
      { type: 'model_output', content: [{ type: 'text', text: 'Xin chào ' }, { type: 'text', text: 'collector!' }] },
    ],
  });
  assert.equal(result, 'Xin chào collector!');
});

test('extractGeminiText hỗ trợ output_text khi có từ SDK', () => {
  assert.equal(extractGeminiText({ output_text: 'Tư vấn mô hình phù hợp.' }), 'Tư vấn mô hình phù hợp.');
});
