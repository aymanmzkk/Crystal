# Crystal

App personal estilo ERP para organizar la vida: calendario, tareas, clase, trabajo, gimnasio, finanzas y más.
Es una PWA: funciona en el navegador, se instala en Windows y Android y funciona sin internet.

## Cómo arrancarla

```bash
npm install      # solo la primera vez
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # comprueba los tipos y genera la versión final en dist/
npm run preview  # sirve dist/ para probar la PWA instalable y el modo sin conexión
npm test         # ejecuta los tests
```

En modo desarrollo, la barra inferior tiene un botón "Datos de ejemplo" que añade eventos, tareas y elementos en la papelera para probar. Ese botón no aparece en la versión final.

## Tecnología

- React + TypeScript con Vite
- Tailwind CSS con variables de tema (`src/index.css`): letra Inter, color principal elegible (`data-accent`), claro y oscuro automático
- React Router: `/` es la cuadrícula de apps y `/:módulo` cada app
- Zustand para los ajustes (tema e idioma), guardados en localStorage
- i18next para español e inglés (`src/i18n/`)
- vite-plugin-pwa: service worker, manifest e iconos generados desde `public/logo.svg`
- Dexie (IndexedDB) para guardar los datos en el dispositivo; `useLiveQuery` actualiza la pantalla sola cuando cambian
- Vitest + fake-indexeddb para los tests de la base de datos

## Datos

Todos los registros tienen `id` (UUID), `createdAt`, `updatedAt`, `deletedAt` y `dirty`:

- **Borrar** pone `deletedAt` con la fecha: el registro pasa a la papelera y se puede restaurar durante 30 días.
- **Borrar para siempre**, o que pasen los 30 días, elimina el registro y deja una "lápida" en `tombstones`.
- **`dirty: 1`** marca que hay cambios sin subir a la nube. Lo usará la sincronización con Supabase.

Escribe siempre a través de `src/db/repo.ts`, que pone estos campos. No uses `db.tabla.put()` directamente.

## Estructura

```
src/
  modules/registry.ts   catálogo de módulos y orden de la cuadrícula
  db/                   base de datos: tipos, tablas, operaciones (repo), hooks y tests
  pages/                Home (cuadrícula de apps), ModulePage y TrashPage
  components/           TopBar, AppGrid, StatusBar, ConfirmButton
  lib/                  utilidades (fechas)
  hooks/                tema y estado de conexión
  store/settings.ts     ajustes del usuario
  i18n/                 traducciones
```

Para añadir una app nueva: añade su id en `ModuleId`, su icono y fase en `MODULES`, su posición en `APP_ORDER` y su nombre en `es.json` y `en.json`.

## Estado

Fase 1:
1. [x] Estructura, tema, cuadrícula de apps, ES/EN y PWA
2. [x] Base de datos local (Dexie) y papelera
3. [x] Calendario: mes, semana y agenda, eventos que se repiten, colores, calendarios propios y cuentas atrás
4. [x] Tareas (lista, Kanban y matriz de prioridades) y recordatorios del navegador
5. [x] Cuentas atrás en el inicio y buscador Ctrl+K (apps, eventos, tareas, crear y acciones)

Fase 2 (clase, trabajo y hábitos):
1. [x] Hábitos (rachas, objetivos de contar, mapa de 12 semanas) y rutinas (pasos diarios con plantillas)
2. [x] Pomodoro (sesiones guardadas, indicador en la barra inferior) y horas trabajadas (fichar, turnos, extras y nómina estimada)
3. [x] Clase: asignaturas con horario (se ve en el calendario), exámenes y entregas (cuentas atrás y avisos automáticos), calificaciones con media ponderada y nota necesaria, y flashcards con repaso espaciado
4. [x] Gimnasio: rutinas, entrenamiento en curso con series que se rellenan con la última vez, historial con volumen semanal y progreso por ejercicio (1RM estimado)
5. [x] Dashboard: cifras del día y widgets de cada área, que se pueden ordenar y ocultar

Fase 3 (dinero, personas y casa):
1. [x] Finanzas: gastos e ingresos, presupuestos, suscripciones (salen en el calendario), ahorro, lista de deseos y quién me debe
2. [x] Contactos: CRM con cumpleaños (en el calendario y con aviso), ideas de regalo y aviso de contacto pendiente
3. [x] Casa: lista de la compra por pasillos (los adivina por el nombre) y tareas del hogar periódicas
4. [x] Inventario y documentos: garantías y caducidades en el calendario con aviso una semana antes
5. [x] Salud (peso con gráfica y medicación con avisos), notas y diario (se guardan solos) y objetivos con pasos y bucket list

Fase 4 (ocio y aprendizaje):
1. [x] Viajes: en el calendario con cuenta atrás, maleta con plantilla, plan y países visitados
2. [x] Recuerdos: álbum con fotos reducidas y guardadas en el dispositivo
3. [x] Biblioteca: libros, series y pelis por estado, con puntuación
4. [x] Proyectos personales con pendientes y enlace
5. [x] Cursos e idiomas con progreso, nivel y certificado

Rediseño (2026-11-06):
1. [x] Sistema de diseño nuevo, tema oscuro por defecto, barra lateral y navegación móvil
2. [x] Inicio tipo bento con progreso del día
3. [x] Archivos adjuntos: fotos, billetes y PDFs con fecha y comentario
4. [x] Viajes completos: reservas, planes, presupuesto, itinerario y archivos

Después: sincronización con la nube (Supabase), avisos push con la app cerrada y Google Calendar. Para eso hará falta que crees una cuenta.

La especificación completa está en `especificacion.md`.

## Cuentas (Supabase)

1. Crea un proyecto en supabase.com (región Europe).
2. En **SQL Editor** pega el contenido de `supabase/schema.sql` y pulsa **Run**.
3. En **Project Settings → API** copia la *Project URL* y la *anon public key*.
4. Crea el archivo `.env.local` en esta carpeta (no se sube a ningún sitio):

   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
5. Reinicia `npm run dev`. La primera cuenta que se registre es la de admin.

Sin `.env.local` la app funciona como antes, sin cuentas y solo en el dispositivo.
