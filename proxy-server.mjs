import { createServer } from 'http';
import { request as httpsRequest } from 'https';

const PORT = 4300;

createServer((req, res) => {
  const jiraBaseUrl = req.headers['x-jira-base-url'];

  if (!jiraBaseUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing X-Jira-Base-URL header' }));
    return;
  }

  let hostname, basePath;
  try {
    const url = new URL(jiraBaseUrl);
    hostname = url.hostname;
    basePath = url.pathname.replace(/\/$/, '');
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid X-Jira-Base-URL' }));
    return;
  }

  const headers = { ...req.headers };
  delete headers['host'];
  delete headers['x-jira-base-url'];
  delete headers['content-length'];
  headers['host'] = hostname;

  const proxyReq = httpsRequest(
    { hostname, path: basePath + req.url, method: req.method, headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  req.pipe(proxyReq);
}).listen(PORT, () => {
  console.log(`Jira proxy running at http://localhost:${PORT}`);
});
