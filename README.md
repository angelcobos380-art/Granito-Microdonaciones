# 🌾 Granito — Donaciones pequeñas, impacto grande

![Estado del Proyecto](https://img.shields.io/badge/Estado-MVP%20Demo-brightgreen)
![Materia](https://img.shields.io/badge/Materia-An%C3%A1lisis%20y%20Dise%C3%B1o%20de%20Software-blue)
![Universidad](https://img.shields.io/badge/UPChiapas-2026-orange)

> **Granito** es una plataforma web de microdonaciones que permite apoyar causas de organizaciones verificadas con montos pequeños ($5, $10 o $20 MXN) mediante **donación en un solo clic** y transparencia en tiempo real.

---

## 🚀 Funcionalidades Principales (MVP)

- 🔐 **Registro e Inicio de Sesión:** Autenticación de usuarios mediante JWT y encriptación de contraseñas con Bcrypt.
- 📋 **Lista de Campañas:** Visualización de causas activas con imagen, meta, monto recaudado y barra de progreso dinámica.
- 💳 **Monedero Virtual & Saldo:** Control de saldo disponible por usuario para realizar microdonaciones instantáneas.
- ⚡ **Donación de 1-Clic:** Donación instantánea ($5, $10, $20 MXN) utilizando transacciones SQL atómicas para descontar saldo y actualizar el avance de la campaña en vivo.
- 🔌 **API REST Integrada:** Arquitectura desacoplada frontend-backend.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3 (Mobile-First, sin frameworks) y JavaScript Vanilla (Fetch API).
- **Backend:** Node.js, Express.js, JWT (`jsonwebtoken`), Bcrypt.
- **Base de Datos:** PostgreSQL (consultas parametrizadas y transacciones ACID).
- **Control de Versiones:** Git & GitHub.

---

## 📂 Estructura del Proyecto

```text
granito/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuración de base de datos
│   │   ├── controllers/   # Controladores (Auth, Campañas, Donaciones)
│   │   ├── middlewares/   # Auth Middleware (JWT)
│   │   ├── routes/        # Rutas de la API REST
│   │   └── app.js         # Servidor principal Express
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── styles.css     # Estilos globales (Paleta: crema, verde, naranja)
│   ├── js/
│   │   ├── api.js         # Cliente Fetch para consumir la API
│   │   └── main.js        # Lógica de UI y renderizado dinámico
│   └── index.html         # Vista principal
├── database/
│   └── schema.sql         # Script de creación de tablas y datos semilla
└── README.md
