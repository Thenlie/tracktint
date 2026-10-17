import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_FILE = path.join(DATA_DIR, 'names.json');
const PAGE_SIZE = 100;

interface CorosActivity {
  labelId: string | number;
  name?: string;
}

interface CorosQueryResponse {
  result?: string;
  message?: string;
  data?: {
    totalPage?: number;
    dataList?: CorosActivity[];
  };
}

async function fetchPage(base: string, token: string, page: number): Promise<CorosQueryResponse> {
  const url = `${base}/activity/query?size=${PAGE_SIZE}&pageNumber=${page}&modeList=`;
  const res = await fetch(url, { headers: { accesstoken: token } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching page ${page}`);
  const body = (await res.json()) as CorosQueryResponse;
  if (body.result !== '0000') {
    throw new Error(`Coros API error: ${body.message ?? body.result} (token expired?)`);
  }
  return body;
}

async function main(): Promise<void> {
  const token = process.env.COROS_ACCESS_TOKEN;
  if (!token) {
    console.error('Set COROS_ACCESS_TOKEN (copy the `accesstoken` request header from t.coros.com DevTools).');
    process.exit(1);
  }
  // Region base: teamapi.coros.com (US), teameuapi.coros.com (EU), teamcnapi.coros.com (CN)
  const base = process.env.COROS_API_BASE ?? 'https://teamapi.coros.com';

  const names: Record<string, string> = {};
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const body = await fetchPage(base, token, page);
    totalPages = body.data?.totalPage ?? 1;
    for (const a of body.data?.dataList ?? []) {
      if (a.name) names[String(a.labelId)] = a.name;
    }
    console.log(`page ${page}/${totalPages}`);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(names, null, 2));
  const ids = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.fit')).map(f => path.basename(f, '.fit'));
  const matched = ids.filter(id => id in names).length;
  console.log(`Wrote ${Object.keys(names).length} names to ${OUT_FILE}; matched ${matched}/${ids.length} .fit files.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
