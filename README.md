# Sagsa PWA — Sprint 1

Sistema de control de horarios, disponibilidad y programación de vuelos —
Escuela de Aviación Sagsa.

Este Sprint 1 incluye: configuración del entorno (React + Node.js + MySQL) y
el **Módulo 1 — Gestión de usuarios y roles** (registro, login con JWT,
roles: administrador / instructor / alumno).

## Estructura del proyecto

```
sagsa-pwa/
├── backend/     → API REST (Node.js + Express + Sequelize + MySQL)
└── frontend/    → Interfaz web (React + Vite)
```

## 1. Configurar el backend

```bash
cd backend
npm install
```

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Abre `.env` y coloca tu contraseña real de MySQL (la que definiste al
instalarlo):

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sagsa_pwa
DB_USER=root
DB_PASSWORD=tu_contraseña_real_aquí
PORT=4000
JWT_SECRET=escribe_aquí_una_frase_larga_y_secreta
JWT_EXPIRES_IN=8h
```

Crea la base de datos vacía en MySQL Workbench (o desde la terminal):

```sql
CREATE DATABASE sagsa_pwa;
```

Inicia el servidor:

```bash
npm run dev
```

Si todo está bien configurado, verás en la terminal:

```
✅ Conexión a MySQL establecida correctamente.
✅ Modelos sincronizados con la base de datos.
🚀 Servidor corriendo en http://localhost:4000
```

La primera vez que corras esto, Sequelize crea automáticamente la tabla
`usuarios` dentro de `sagsa_pwa` — no necesitas escribir el SQL de la tabla
a mano.

## 2. Configurar el frontend

En otra terminal (deja la del backend corriendo):

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abre en el navegador la URL que te indique la terminal (normalmente
`http://localhost:5173`).

## 3. Probar el flujo completo

1. Entra a `/registro`, crea una cuenta (elige el rol que quieras probar).
2. Inicia sesión en `/login` con ese mismo correo y contraseña.
3. Deberías llegar a `/panel`, que muestra tu nombre y tu rol.

## Endpoints disponibles (para probar en Postman)

| Método | Ruta                  | Descripción                          | Requiere token |
|--------|-----------------------|---------------------------------------|-----------------|
| GET    | /api/health           | Verifica que el servidor esté vivo   | No              |
| POST   | /api/auth/registro    | Crea un nuevo usuario                | No              |
| POST   | /api/auth/login       | Inicia sesión, devuelve el token JWT | No              |
| GET    | /api/auth/perfil      | Devuelve los datos del usuario actual| Sí (Bearer)     |

Para probar `/api/auth/perfil` en Postman: pestaña **Authorization** →
tipo **Bearer Token** → pega el token que recibiste al hacer login.

## Ya validado antes de entregarte esto

Este Sprint 1 fue probado de extremo a extremo (registro, login, ruta
protegida con y sin token, contraseña incorrecta) en un entorno de prueba
antes de entregarlo — debería funcionar igual en tu máquina siguiendo estos
pasos, siempre que MySQL esté corriendo y las credenciales en `.env` sean
correctas.

## Siguientes pasos (Sprint 2 en adelante)

A partir de aquí, sube este proyecto a un repositorio de GitHub y continúa
el desarrollo en Claude Code — vas a poder seguir programando, ejecutando
y depurando directamente sobre este mismo código.
