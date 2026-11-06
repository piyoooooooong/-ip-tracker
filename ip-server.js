'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = Number(process.env.PORT) || 3000;
const LOG_FILE = path.join(__dirname, 'ip-logs.json');

// ── 아이콘 이미지 로드 ─────────────────────────────────────────
// 같은 폴더에 icon.png 넣어두면 그 이미지를 보여줌
// 없으면 1x1 투명 픽셀로 대체
const ICON_PATH = path.join(__dirname, 'icon.png');
let ICON_IMG;
try {
  ICON_IMG = fs.readFileSync(ICON_PATH);
  console.log(`[OK] icon.png 로드됨 (${ICON_IMG.length} bytes)`);
} catch {
  ICON_IMG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRU5ErkJggg==',
    'base64',
  );
  console.log('[!] icon.png 없음 → 1x1 투명 픽셀 사용');
}

// ── 로그 읽기 / 쓰기 ──────────────────────────────────────────
function readLogs() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeLogs(logs) {
  // 최대 500개만 유지
  if (logs.length > 500) logs = logs.slice(-500);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

// ── IP 위치 조회 (ip-api.com, 한국어) ─────────────────────────
function geoLookup(ip) {
  return new Promise((resolve) => {
    const url = `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org&lang=ko`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.status === 'success') {
            resolve({
              country:  j.country    || '?',
              region:   j.regionName || '?',
              city:     j.city       || '?',
              isp:      j.isp || j.org || '?',
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// ── 클라이언트 실제 IP 추출 ───────────────────────────────────
function getClientIp(req) {
  // 프록시/로드밸런서 뒤에 있을 경우
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress?.replace('::ffff:', '') || '0.0.0.0';
}

// ── HTTP 서버 ─────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ── GET /t.png  →  트래킹 픽셀 + IP 기록 ──────────────────
  if (url.pathname === '/t.png') {
    const ip = getClientIp(req);
    const geo = await geoLookup(ip);

    const entry = {
      ip,
      ts: Date.now(),
      time: new Date().toISOString(),
      geo,
      ua: req.headers['user-agent'] || '',
    };

    const logs = readLogs();
    logs.push(entry);
    writeLogs(logs);

    console.log(`[HIT] ${ip}  ${geo ? `${geo.city} ${geo.region} | ${geo.isp}` : '(geo fail)'}`);

    res.writeHead(200, {
      'Content-Type':  'image/png',
      'Content-Length': ICON_IMG.length,
      'Cache-Control':  'no-store, no-cache, must-revalidate',
      'Pragma':         'no-cache',
      'Expires':        '0',
    });
    return res.end(ICON_IMG);
  }

  // ── GET /api/logs  →  최근 로그 반환 ───────────────────────
  if (url.pathname === '/api/logs') {
    const since = Number(url.searchParams.get('since')) || 0;
    let logs = readLogs();

    if (since > 0) {
      logs = logs.filter((e) => e.ts > since);
    } else {
      // since 없으면 최근 50개만
      logs = logs.slice(-50);
    }

    res.writeHead(200, {
      'Content-Type':  'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify({ count: logs.length, logs }));
  }

  // ── GET /api/clear  →  로그 초기화 ─────────────────────────
  if (url.pathname === '/api/clear') {
    writeLogs([]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, message: 'logs cleared' }));
  }

  // ── 그 외 → 상태 페이지 ────────────────────────────────────
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('IP Tracker Running\n');
});

server.listen(PORT, () => {
  console.log(`[IP-SERVER] http://0.0.0.0:${PORT}`);
  console.log(`  트래킹 픽셀: http://<공개IP>:${PORT}/t.png`);
  console.log(`  로그 API:    http://<공개IP>:${PORT}/api/logs`);
  console.log(`  로그 초기화: http://<공개IP>:${PORT}/api/clear`);
});
