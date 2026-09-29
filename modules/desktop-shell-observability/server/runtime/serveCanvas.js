import express from 'express';
import path from 'node:path';

export function serveCanvas(app, directory) {
  const root = path.resolve(directory);
  const index = path.join(root, 'index.html');

  app.use(express.static(root, {
    etag: true,
    fallthrough: true,
    index: 'index.html',
    maxAge: 0,
  }));
  app.use((request, response, next) => {
    if (!['GET', 'HEAD'].includes(request.method)) return next();
    if (path.extname(request.path)) return next();
    response.setHeader('Cache-Control', 'no-cache');
    return response.sendFile(index);
  });
}
