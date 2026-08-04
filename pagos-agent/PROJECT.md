# PROJECT.md

## Problema
El personal olvida los pagos recurrentes, lo que genera conflictos en la empresa.

## Perfiles de usuario
- **Empleado**: Repite pagos mensuales, gestiona calendario de pagos, interactúa con el agente por chat.
- **Administrador**: Monitorea pagos de todos los usuarios, gestiona usuarios, ve resumen general.

## Flujo de la solución
Un agente que ayude con todos los pagos que tiene el empleado que se repiten cada mes, parecido a un agente que maneje un calendario.

## Stack técnico
- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS 4 + shadcn/ui (base-ui)
- **Base de datos**: MongoDB (Mongoose)
- **Auth**: NextAuth v5 (credentials, JWT)
- **Email**: Nodemailer (SMTP Gmail)
- **Deploy**: Vercel (con cron jobs)

## Arquitectura

### Estructura de carpetas
```
src/
├── app/
│   ├── page.tsx                    # Redirect: autenticado → /dashboard, no → /login
│   ├── layout.tsx                  # Root layout (fonts, metadata)
│   ├── globals.css                 # Variables CSS de tema (light/dark)
│   ├── login/page.tsx              # Login + registro (toggle)
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth handlers
│   │   ├── register/route.ts       # POST crear usuario
│   │   ├── chat/route.ts           # POST mensaje al agente
│   │   ├── payments/route.ts       # GET (listar) + POST (crear)
│   │   ├── payments/[id]/route.ts  # PUT (actualizar) + DELETE
│   │   ├── admin/users/route.ts    # GET listar usuarios con pagos (solo admin)
│   │   └── cron/remind/route.ts    # GET cron: recordatorios + reset mensual
│   └── dashboard/
│       ├── layout.tsx              # Navbar + auth guard
│       ├── page.tsx                # Lista de pagos + crear + acciones
│       ├── chat/page.tsx           # Chat con el agente
│       └── admin/page.tsx          # Panel admin (solo role=admin)
├── components/ui/                  # shadcn/ui components
├── lib/
│   ├── auth.ts                     # NextAuth config (credentials, JWT callbacks)
│   ├── db.ts                       # Mongoose connection (cached)
│   ├── email.ts                    # Nodemailer email sender (Gmail SMTP)
│   └── utils.ts                    # cn() helper
├── models/
│   ├── User.ts                     # email, password, name, role (empleado|admin)
│   └── Payment.ts                  # userId, title, amount, dueDay, status, lastPaidAt
├── services/
│   ├── chat.service.ts             # NLP simple: registrar, listar, pagar, pausar
│   └── payment.service.ts          # CRUD + getUpcoming + resetMonthly
├── types/
│   └── next-auth.d.ts              # Tipos extendidos de sesión (id, role)
└── middleware.ts                    # Protege /dashboard y redirige /login si autenticado
```

### Modelos

**User**
| Campo | Tipo | Notas |
|-------|------|-------|
| email | String | unique, required |
| password | String | bcrypt hash |
| name | String | required |
| role | String | "empleado" \| "admin", default "empleado" |
| createdAt | Date | default Date.now |

**Payment**
| Campo | Tipo | Notas |
|-------|------|-------|
| userId | ObjectId → User | index |
| title | String | required |
| amount | Number | required |
| frequency | String | "diario" \| "semanal" \| "quincenal" \| "mensual" \| "personalizado", default "mensual" |
| intervalDays | Number | requerido si frequency = "personalizado" (1-365) |
| dueDay | Number | 1-31, solo para frequency = "mensual" |
| startDate | Date | required - fecha de inicio del pago |
| status | String | "activo" \| "pagado" \| "pausado" |
| lastPaidAt | Date | última vez marcado pagado |
| createdAt | Date | default Date.now |

### Estados visuales calculados (no se almacenan en BD)

Además de los estados almacenados en `status` (`activo`, `pagado`, `pausado`), el sistema calcula dinámicamente dos estados visuales adicionales para mostrar la urgencia real de cada pago:

- **Por vencer**: El pago está activo y faltan 3 días o menos para su fecha de vencimiento (incluyendo el día actual). Se muestra con badge naranja.
- **Vencido**: La fecha de vencimiento ya pasó y el pago no ha sido marcado como pagado. Se muestra con badge rojo.

Estos estados **NO se guardan en MongoDB**. Se calculan en tiempo real usando `dueDay`, la fecha actual y `status`. No requieren actualizaciones diarias en la base de datos.

**Cambio automático entre estados:**
- Un pago "Por vencer" pasa a "Vencido" automáticamente cuando la fecha de vencimiento se supera sin haber sido pagado.
- Un pago "Vencido" o "Por vencer" pasa a "Pagado" inmediatamente cuando el usuario lo marca como pagado.
- El campo `status` en la BD solo almacena: `activo`, `pagado`, `pausado`.

**Prioridad de visualización (orden automático):**

1. 🔴 Vencido
2. 🟠 Por vencer
3. 🟢 Activo
4. 🔵 Pagado
5. ⚪ Pausado

Los pagos más urgentes siempre aparecen primero en el dashboard.

### Métricas del dashboard

El dashboard muestra dos indicadores financieros principales que miden conceptos diferentes:

**Gasto mensual estimado** (`getEstimatedMonthlyExpense()`):
- Representa cuánto dinero gasta el usuario normalmente cada mes.
- Incluye todos los pagos recurrentes excepto los pausados: activo, pagado, por vencer, vencido.
- Un pago marcado como "Pagado" sigue formando parte del gasto mensual porque volverá a repetirse en el siguiente ciclo.
- Calcula usando ocurrencias reales del calendario (no aproximaciones).

**Pendiente por pagar** (`getPendingPaymentsTotal()`):
- Representa cuánto dinero falta pagar en el ciclo actual.
- Incluye únicamente: activo, por vencer, vencido.
- Excluye: pagado, pausado.
- Calcula usando ocurrencias reales del calendario.

#### Cálculo basado en calendario real

El sistema calcula las ocurrencias reales de cada pago dentro del mes actual utilizando `countOccurrencesInMonth()`, que genera fechas desde `startDate` con la frecuencia configurada y cuenta cuántas caen en el mes en curso.

| Frecuencia | Lógica de cálculo |
|---|---|
| Diario | Días del mes desde `startDate` hasta fin de mes |
| Semanal | Ocurrencias cada 7 días desde `startDate` dentro del mes |
| Quincenal | Ocurrencias cada 15 días desde `startDate` dentro del mes |
| Mensual | Siempre 1 ocurrencia por mes (`dueDay`) |
| Personalizado | Ocurrencias cada `intervalDays` desde `startDate` dentro del mes |

**No se utilizan aproximaciones** como `amount × (30 / intervalDays)`. Cada cálculo respeta el calendario real, incluyendo meses con 28, 29, 30 o 31 días.

| Pago | Frecuencia | Monto | Ocurrencias (ago) | Total mes |
|------|-----------|-------|-------------------|-----------|
| Netflix | Mensual (día 15) | S/ 45 | 1 | S/ 45 |
| Spotify | Semanal (desde 3 jul) | S/ 20 | 5 | S/ 100 |
| Internet | Quincenal (desde 5 jul) | S/ 80 | 2 | S/ 160 |
| Café | Diario (desde 1 ago) | S/ 5 | 4 | S/ 20 |
| Gimnasio | Personalizado (20 días) | S/ 50 | 2 | S/ 100 |
| Disney | Pausado | S/ 35 | 0 | — |
| **Total** | | | | **S/ 425** |

### Flujo del cron diario (8am)
1. Verifica `CRON_SECRET` en header Authorization
2. Busca pagos activos con `dueDay` en los próximos 3 días (incluye el día actual)
3. Agrupa por usuario y envía email de recordatorio (Nodemailer)
   - Remitente (`from`): `EMAIL_USER` (cuenta Gmail SMTP)
   - Destinatario (`to`): email del usuario registrado al que pertenece el pago
4. Resetea pagos "pagado" → "activo" (para el nuevo mes)

### Chat agent (comandos)
- `agregar pago [nombre] [monto] día [número]` → crea pago
- `mis pagos` / `qué pagos tengo` → lista pagos
- `ya pagué [nombre]` → marca como pagado
- `pausar [nombre]` → pausa un pago
- `ayuda` → muestra comandos disponibles

### Rutas protegidas
- `/dashboard/*` → requiere sesión (middleware)
- `/login` → redirige a `/dashboard` si ya autenticado
- `/dashboard/admin` → requiere `role === "admin"` (API level)

## Variables de entorno
```
MONGODB_URI=mongodb://localhost:27017/pagos-agent
NEXTAUTH_SECRET=genera-un-secreto-seguro
NEXTAUTH_URL=http://localhost:3000
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion
CRON_SECRET=un-secreto-para-el-cron
```

## Instrucciones para el agente de código
Implementa lo descrito. Si falta una decisión menor, elige la alternativa más simple. Si es una decisión de negocio importante, pregunta antes de implementar.