## San Roque - Registro de Clientes

Aplicación mínima con Express + PostgreSQL para registrar clientes del spa de mascotas y guardar en la tabla `prod.clientes`.

### Requisitos
- Node.js 18+
- Una base de datos PostgreSQL (Render) con la tabla creada

### Configuración
1. Crea el archivo de entorno:
   - Copia `.env.example` a `.env` y rellena las variables.
   - Este repo ya incluye `.gitignore` para no subir `.env`.

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Ejecuta en desarrollo:
   ```bash
   npm run dev
   ```

4. Producción/local simple:
   ```bash
   npm start
   ```

La app sirve un formulario en `http://localhost:3000/` y expone `POST /api/clientes` para crear registros.

### Variables de entorno
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSCHEMA`, `PGSSL` (true para Render)
- `PORT` puerto HTTP del servidor

### Despliegue en Render (Web Service)
1. Crea un nuevo Web Service desde tu repo
2. Runtime: Node 18
3. Build command: `npm install`
4. Start command: `npm start`
5. Añade en Render las mismas variables de entorno del `.env`

### Notas de seguridad
- No subas `.env` al repositorio (ya ignorado).
- Las consultas usan parámetros para prevenir inyección SQL.
- SSL activado en conexión a PostgreSQL para Render.

