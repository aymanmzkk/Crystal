# Contexto del proyecto Crystal (carpeta "vida")

Te paso el contexto de mi proyecto para que me ayudes con él. Léelo entero antes de responder.

## Qué es

**Crystal** es una app personal para organizar toda mi vida (estilo ERP/CRM, pero bonita): calendario, tareas, hábitos, clase, gimnasio, finanzas, casa, viajes, recuerdos y más. Antes se llamaba "vida" y por eso la carpeta y algunos nombres internos siguen siendo `vida`.

- Es una **PWA** (se instala en el PC con Windows y en el móvil Android como si fuera una app).
- Funciona **sin internet**: los datos se guardan en el dispositivo (IndexedDB).
- Tiene **cuentas con Supabase** para que la usen también mis hermanos y mi novia, con una cuenta **admin** (yo).
- Está en **español e inglés**, con **tema oscuro por defecto** y tema claro.
- Soy estudiante de DAM2 y Crystal es mi proyecto personal. Uso asistentes de IA como apoyo cuando me atasco.

## Tecnologías

- **React 19 + TypeScript 5.9** (modo estricto, `noUnusedLocals`, `verbatimModuleSyntax`) con **Vite 7**.
- **Tailwind CSS 4**: los colores son variables CSS (tokens) en `src/index.css` con `@theme inline` (`bg`, `surface`, `surface-2`, `line`, `fg`, `fg-2`, `fg-3`, `accent`...). Utilidades propias: `card`, `card-hover`, `eyebrow`, `skeleton`, `page-in`, `stagger`, `activity-tint`...
- **React Router 7** (`createBrowserRouter`).
- **Dexie 4** (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`) para los datos.
- **Zustand** (con `persist` en localStorage) para preferencias: tema, idioma, vista del calendario, Pomodoro...
- **i18next / react-i18next**: textos en `src/i18n/es.json` y `en.json` (plurales con `_one` / `_other`).
- **@tabler/icons-react** para los iconos, **cmdk** para el buscador Ctrl+K, fuente **Inter**.
- **vite-plugin-pwa** (service worker e iconos generados desde `public/logo.svg`).
- **Supabase** (`@supabase/supabase-js`) para cuentas y, más adelante, sincronización.
- **Vitest + fake-indexeddb** para los tests.

Comandos: `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`.

## Estructura de carpetas

```
src/
  main.tsx            Arranque: si hay Supabase, comprueba la sesión, abre la base de datos de esa cuenta y pinta la app (o la pantalla de entrar)
  App.tsx             Layout (barra lateral, navegación móvil, toasts, buscador) y rutas: /, /trash, /data, /admin, /:module
  index.css           Sistema de diseño (tokens de color, sombras, animaciones, casillas)
  auth/               Pantalla de entrar/registrarse, perfil y cuenta (account.ts)
  components/         Piezas compartidas: AppSidebar, TopBar, MobileNav, SidePanel (ventana modal), Attachments, FileViewer,
                      BarChart, LineChart, ProgressRing, Checklist, CommandPalette, Toast, ui.ts (clases de botones y campos)
  db/                 types.ts (tipos), db.ts (Dexie y versiones), repo.ts (crear/actualizar/papelera), hooks.ts (useLiveQuery)
  lib/                dates, format, colors, files (adjuntos), images (reducir fotos), backup (copias), supabase
  modules/            Una carpeta por app + registry.ts (lista de apps, iconos, colores y grupos)
  pages/              Home (inicio tipo bento), ModulePage (carga cada app), TrashPage, DataPage, AdminPage
  reminders/          Motor de avisos (notificaciones del navegador)
  store/              Stores de Zustand
supabase/schema.sql   Tablas, roles y reglas de seguridad (RLS) de Supabase
public/               logo.svg y _redirects (para que las rutas funcionen al recargar)
```

## Cómo se guardan los datos

- Todo registro tiene: `id`, `createdAt`, `updatedAt`, `deletedAt` (0 = activo, si no = fecha en que fue a la papelera) y `dirty` (1 = cambios sin subir a la nube).
- **Papelera**: borrar = poner `deletedAt`. Se borra de verdad a los 30 días; al borrar para siempre se deja una "lápida" (`tombstones`) para la futura sincronización.
- Todas las escrituras pasan por `src/db/repo.ts` (`createRecord`, `updateRecord`, `upsertRecord`, `moveToTrash`, `restoreFromTrash`, `deleteForever`).
- Registros diarios con id fijo: `habitId:fecha`, `journal:fecha`...
- La base de datos va por la **versión 15** de Dexie. Cada versión nueva solo declara lo que cambia y, si hace falta, migra los datos sin perder nada.
- Tabla **`attachments`**: fotos, billetes y PDFs de cualquier registro (`ownerTable`, `ownerId`, `slot`, `blob`, `thumb`, `date`, `comment`, `archive`). Las fotos se reducen a 1600 px. Desde la v15 las fotos de Recuerdos también son adjuntos (`ownerTable 'memories'`, `slot 'photos'`); `memory.photos` es el formato antiguo y se migra solo, también al restaurar copias antiguas (`src/db/migrations.ts`).
- **Archivado** (`src/lib/archive.ts`): un adjunto puede tener una copia externa (`archive`: carpeta o descarga, ruta, huella SHA-256 y `verifiedAt`). Solo si la copia está verificada se puede liberar el original (`blob = null`, se queda la miniatura). Las carpetas elegidas se guardan en la tabla local `archiveTargets`, que no entra en las copias de seguridad ni en la sincronización.
- **Cuentas**: sin cuentas la base de datos se llama `vida`. Con cuentas, cada usuario tiene la suya: `vida-<userId>`. La primera cuenta que entra en un dispositivo se queda con los datos que ya había. **No hay que cambiar el nombre interno `vida`**, porque se perderían los datos.
- Página **Datos y copias**: descargar copia (JSON con los archivos en base64), restaurar copia y borrar todo.

## Apps (agrupadas como en la barra lateral)

**Día a día**
- **Dashboard**: widgets que se pueden arrastrar y ocultar.
- **Calendario** (estilo Pipedrive + Google Calendar):
  - Vistas día, semana, mes y agenda (en el móvil la semana enseña 3 días).
  - Calendarios por color y eventos que se repiten.
  - Círculo para marcar como hecho, arrastrar para mover y estirar para cambiar la duración.
  - Las tareas con fecha y los exámenes de Clase también salen y se pueden mover.
  - Al pulsar un hueco sale una tarjeta de creación rápida; al pulsar un evento, una vista rápida.
  - La barra lateral se puede plegar.
- **Tareas**: lista, kanban y matriz urgente/importante.
- **Pomodoro**.

**Crecimiento**
- **Hábitos**, **Objetivos** (con pasos), **Notas** (con diario).
- **Gimnasio**, con 6 pestañas:
  - Resumen y Plan semanal (Torso, Pierna, Empuje...).
  - Entrenamientos: plantillas con series, repeticiones y descanso, duplicar e historial comparado con la sesión anterior.
  - Progreso: gráficas, constancia y peso corporal opcional.
  - Récords y biblioteca de Ejercicios.
  - Durante el entrenamiento: temporizador de descanso y aviso de récord.
- **Logros**: puntos (XP) y niveles calculados con los datos que ya hay (tareas, hábitos, gimnasio, Pomodoro...), más 19 logros.

**Estudios**
- **Asignaturas** (con horario), **Exámenes** y **Calificaciones** (media ponderada y nota que falta para aprobar).

**Casa, dinero y personas**
- **Finanzas**, **Casa** (lista de la compra y tareas del hogar), **Inventario** (garantías), **Documentos** (caducidades) y **Contactos** (cumpleaños).

**Ocio y recuerdos**
- **Viajes**:
  - Tarjetas con portada, cuenta atrás, presupuesto y preparación.
  - Dentro de cada viaje: preparación, vuelos y alojamiento con billetes, qué hacer y comer, presupuesto, itinerario por días y archivos.
- **Recuerdos**: fotos con fecha y comentario.
- **Biblioteca**: libros, series y pelis.

**Otras cosas de toda la app**: inicio tipo bento (resumen del día, progreso, prioridades, próximos eventos, hábitos y acciones rápidas), buscador Ctrl+K, papelera, avisos del navegador y archivos adjuntos en varias apps.

**Almacenamiento** (`/storage`, en `src/modules/storage/`): cuánto ocupa Crystal (por tipo, por app, los más pesados y antiguos, evolución diaria), límite configurable con avisos al 70/85/95 %, archivar archivos en una carpeta (File System Access API: Windows, disco externo) o por descarga + verificación (Android), liberar espacio solo con copia verificada y confirmación, recuperar archivos, y recomendaciones con reglas locales (sin IA de pago). Lógica pura en `src/lib/storage.ts`.

**Apps quitadas** (sus datos siguen en la base de datos, pero ya no salen en la app): Prioridades, Rutinas, Cursos, Horas y nómina, Proyectos, Salud y Flashcards.

## Cuentas y Supabase

- Las claves van en **`.env.local`** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Nunca se suben a ningún sitio. Sin ese archivo, la app funciona sin cuentas.
- `supabase/schema.sql` crea:
  - **`profiles`**: id, email, name, `role` (`user` o `admin`), `status` (`active` o `blocked`), `created_at`, `last_seen_at`. La **primera cuenta registrada es la admin**.
  - **`records`**: `user_id`, `table_name`, `id`, `data jsonb`, `updated_at`, `deleted_at`. Está preparada para la sincronización, pero todavía no se usa.
  - Reglas **RLS**: cada uno lee y escribe solo lo suyo. El admin puede leer lo de todos, y nadie puede cambiarse el rol ni desbloquearse.
  - La función `admin_stats()` (registros y tamaño por usuario).
- El registro es libre. El admin puede **bloquear o desbloquear** cuentas, ver **estadísticas** y **ver los datos** de los demás (en la pantalla de registro hay un aviso de esto).
- Panel en `/admin` (solo para el admin).

## Publicación

- Se compila con `npm run build` y se sube la carpeta `dist` a **Cloudflare Pages** con `npx wrangler pages deploy dist --project-name crystal`.
- La dirección publicada tiene que estar en Supabase, en **Authentication → URL Configuration**.

## Normas del código

- Los comentarios y los nombres de cosas para el usuario van en **español**. Todo texto visible sale de i18n, en los dos idiomas.
- Hay que reutilizar las clases de `src/components/ui.ts` (`btn`, `btnPrimary`, `field`, `input`, `pill`, `segment`...) y los tokens de color. No usar colores fijos.
- Para crear y editar se usa `SidePanel`, que es una ventana centrada (en el móvil sale desde abajo).
- No se borra nada de verdad: siempre a la papelera, con un toast para deshacer.
- Los cambios en la base de datos se hacen siempre con una nueva versión de Dexie y migración, sin romper los datos existentes.
- Antes de dar algo por terminado: `npm run typecheck`, `npm test` y `npm run build`.

## Estado actual y lo que falta

- Hecho: todo lo de arriba, cuentas con admin y la app publicada.
- Siguiente: **sincronización** con Supabase. Supabase Storage podría ser otro destino de archivado más adelante. Hay que subir y bajar la tabla `records` usando `dirty`, `updatedAt` y las lápidas, y subir los adjuntos a Supabase Storage. Con ella los datos del móvil y del PC serán los mismos, y el admin podrá ver los datos de los demás.
- Después: **avisos push** con la app cerrada, conectar con **Google Calendar** y, quizá, un mapa de países visitados.
