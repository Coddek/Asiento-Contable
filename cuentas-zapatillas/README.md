# Cuentas Zapatillas

Cuenta corriente digital para un negocio de reventa de zapatillas: reemplaza el cuaderno donde se anota quién debe y quién pagó. Cada cliente tiene un saldo calculado a partir de sus movimientos (fía / paga), con login y datos aislados por usuario mediante Row Level Security de Supabase.

**Demo en vivo:** https://asiento-contable.vercel.app

## Funcionalidades

- Login y registro de usuarios (Supabase Auth)
- Alta de clientes, con búsqueda por nombre
- Carga de movimientos (debe / haber) por cliente, con concepto y fecha
- Cálculo automático de saldo por cliente y saldo total a cobrar
- Filtro de movimientos por rango de fechas
- Indicador de antigüedad de deuda (días desde el último débito)
- Edición y borrado de clientes y movimientos
- Datos aislados por usuario: cada cuenta ve solo sus propios clientes (RLS)

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- **Deploy:** Vercel

## Por qué está hecho así

El negocio no necesita un backend propio: Supabase da autenticación, base de datos y reglas de acceso por fila (RLS) sin escribir una API. El frontend consulta la base directamente con la anon key, y la seguridad de "cada usuario ve solo lo suyo" se garantiza en la base de datos (no en el cliente), así que ni un bug en el frontend puede filtrar datos de otro usuario.

## Correr el proyecto localmente

```bash
git clone https://github.com/Coddek/Asiento-Contable.git
cd Asiento-Contable/cuentas-zapatillas
npm install
cp .env.example .env   # completar con tu proyecto de Supabase
npm run dev
```

Necesitás un proyecto de Supabase con dos tablas: `clientes` (con `owner_id` referenciando al usuario) y `movimientos` (con `cliente_id`, `debe`, `haber`, `fecha`, `concepto`), y políticas RLS que filtren por `owner_id = auth.uid()`.

## Estado del proyecto

Funcional end-to-end: login, alta de clientes, carga y edición de movimientos, cálculo de saldos, deploy en producción. Pendiente: tests automatizados, y unificar estilos (parte de la UI usa Tailwind, otra parte usa estilos inline — ambos funcionan, pero no está unificado todavía).
