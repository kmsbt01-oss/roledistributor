import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'vercel-api-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/')) {
              // Parse body
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  // Make sure env is available to the handler
                  process.env.OPENAI_API_KEY = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

                  const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
                  const pathname = urlObj.pathname;

                  // Load the TS module matching the pathname (e.g. /api/sync)
                  const module = await server.ssrLoadModule(`${pathname}.ts`);
                  
                  // Parse query parameters
                  const query: Record<string, string> = {};
                  urlObj.searchParams.forEach((val, key) => {
                    query[key] = val;
                  });

                  // Mock Vercel Request Object
                  const mockReq = {
                    ...req,
                    body: body ? JSON.parse(body) : undefined,
                    query: query,
                    cookies: {},
                  };
                  
                  // Mock Vercel Response Object
                  const mockRes = {
                    status: (code: number) => {
                      res.statusCode = code;
                      return mockRes;
                    },
                    json: (data: any) => {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end(),
                    setHeader: (name: string, value: string) => {
                      res.setHeader(name, value);
                    }
                  };

                  await module.default(mockReq, mockRes);
                } catch (e) {
                  console.error('Error executing local API:', e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Internal Server Error', details: String(e) }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
  };
})
