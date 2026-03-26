module.exports = {
  '/api/jira': {
    target: 'http://localhost:4300',
    changeOrigin: false,
    rewrite: (path) => path.replace(/^\/api\/jira/, ''),
  },
};
