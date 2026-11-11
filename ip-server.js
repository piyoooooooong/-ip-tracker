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
let ICON_TYPE = 'image/png';
let ICON_IMG;
try {
  ICON_IMG = fs.readFileSync(ICON_PATH);
  console.log(`[OK] icon.png 로드됨 (${ICON_IMG.length} bytes)`);
} catch {
  ICON_IMG = Buffer.from(
    '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',
    'base64',
  );
  ICON_TYPE = 'image/webp';
  console.log('[!] icon.png 없음 → 내장 이미지 사용');
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
      'Content-Type':  ICON_TYPE,
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
