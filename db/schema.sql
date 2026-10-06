CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol VARCHAR(10) NOT NULL DEFAULT 'donante' CHECK (rol IN ('donante', 'admin')),
  saldo NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizaciones (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NOT NULL,
  logo TEXT,
  verificada BOOLEAN NOT NULL DEFAULT TRUE,
  es_ficticia BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE campanas (
  id SERIAL PRIMARY KEY,
  organizacion_id INTEGER NOT NULL REFERENCES organizaciones(id),
  titulo VARCHAR(180) NOT NULL,
  descripcion TEXT NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  imagen TEXT,
  meta NUMERIC(12,2) NOT NULL CHECK (meta > 0),
  recaudado NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (recaudado >= 0),
  estado VARCHAR(10) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada', 'cerrada')),
  fecha_cierre DATE,
  desglose_destino TEXT NOT NULL
);

CREATE TABLE donaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  campana_id INTEGER NOT NULL REFERENCES campanas(id),
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  comision NUMERIC(10,2) NOT NULL CHECK (comision >= 0),
  monto_causa NUMERIC(10,2) NOT NULL CHECK (monto_causa >= 0),
  anonima BOOLEAN NOT NULL DEFAULT FALSE,
  clave_idempotencia VARCHAR(255) NOT NULL UNIQUE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE movimientos_monedero (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('recarga', 'donacion')),
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  saldo_resultante NUMERIC(10,2),
  estado VARCHAR(12) NOT NULL CHECK (estado IN ('pendiente', 'completada', 'fallida')),
  id_pago_pasarela VARCHAR(255) UNIQUE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campanas_estado ON campanas(estado);
CREATE INDEX idx_movimientos_usuario ON movimientos_monedero(usuario_id, fecha DESC);
