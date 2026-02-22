# San Roque - Spa de Mascotas

Aplicación web para gestión de clientes, mascotas, pedidos/servicios y equipo groomer del spa de mascotas San Roque.

## Requisitos

- Node.js >= 18
- PostgreSQL (Render u otro proveedor)

## Instalación local

```bash
npm install
```

## Variables de entorno

Copia `.env.example` a `config/.env` y completa los valores:

```bash
cp .env.example config/.env
```

| Variable | Descripción |
|---|---|
| `PGHOST` | Host de PostgreSQL |
| `PGPORT` | Puerto (default: 5432) |
| `PGUSER` | Usuario de BD |
| `PGPASSWORD` | Contraseña de BD |
| `PGDATABASE` | Nombre de la BD |
| `PGSCHEMA` | Esquema (default: prod) |
| `PGSSL` | Usar SSL (true/false) |
| `PORT` | Puerto del servidor web (default: 3000) |
| `SESSION_SECRET` | Secreto para sesiones (generar uno seguro) |

## Ejecución

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm start
```

## Gestión de usuarios

```bash
# Crear usuario
node scripts/gestionar-usuario.js crear <username> <password> "Nombre"

# Desactivar (cuando alguien se va)
node scripts/gestionar-usuario.js desactivar <username>

# Activar
node scripts/gestionar-usuario.js activar <username>

# Cambiar contraseña
node scripts/gestionar-usuario.js cambiar-clave <username> <nueva_password>

# Listar todos
node scripts/gestionar-usuario.js listar
```

## Despliegue en Render

1. Crear un **Web Service** conectado al repositorio de GitHub
2. **Build Command:** `npm install`
3. **Start Command:** `npm start`
4. Configurar las variables de entorno (ver tabla arriba)
5. El servicio arranca automáticamente al hacer push
