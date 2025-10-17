const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carga variables en orden: .env, .env.local, config/.env, config/.env.local
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'config/.env'),
  path.resolve(process.cwd(), 'config/.env.local'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}


