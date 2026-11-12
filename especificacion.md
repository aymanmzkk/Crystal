# Crystal — app personal estilo ERP

Especificación acordada el 2026-11-05.

## Organización

- **Navegación:** cuadrícula de apps en la pantalla de inicio.
- **Sin espacios:** todas las apps están juntas en una sola cuadrícula. El filtro Personal, Trabajo y Clase se quitó el 2026-11-05.
- **Vistas de registros:** tabla, tarjetas y lista, con un botón para cambiar en cada módulo.
- **Cuentas atrás:** franja en la pantalla de inicio con los próximos eventos.

## Apps

El orden de la cuadrícula está en `src/modules/registry.ts` (`APP_ORDER`).

### Vida personal
| App | Incluye |
|---|---|
| Dashboard | Widgets arrastrables, KPIs, estadísticas |
| Calendario | Calendario unificado, sincronización con Google Calendar |
| Tareas | Kanban, recordatorios |
| Hábitos | Seguimiento con rachas |
| Rutinas | Checklist de mañana y noche |
| Objetivos | Metas, bucket list, revisión semanal |
| Diario | Notas y diario |
| Finanzas | Gastos e ingresos, presupuestos, suscripciones, metas de ahorro, lista de deseos, quién me debe |
| Gimnasio | Rutinas, series, pesos, progreso |
| Salud | Peso y medidas, citas médicas y medicación |
| Contactos | CRM, cumpleaños, ideas de regalos, aviso de contacto pendiente |
| Casa | Lista de la compra, tareas del hogar |
| Inventario | Objetos, tickets y garantías |
| Documentos | DNI, pasaporte y avisos de caducidad |
| Viajes | Itinerario, presupuesto, checklist de maleta, mapa de lugares visitados |
| Recuerdos | Álbum de fotos por viaje o evento |
| Biblioteca | Libros, series y pelis |
| Proyectos | Proyectos personales |

### Trabajo
| App | Incluye |
|---|---|
| Prioridades | Matriz urgente / importante |
| Pomodoro | Pomodoro y control de tiempo |
| Horas y nómina | Horas trabajadas, turnos, extras y nómina |

### Clase
| App | Incluye |
|---|---|
| Asignaturas | Horario y asignaturas |
| Exámenes | Exámenes y entregas |
| Calificaciones | Notas y media |
| Flashcards | Repaso para exámenes |
| Cursos e idiomas | Progreso y certificados |

## Funciones generales

- Buscador global y captura rápida con Ctrl+K
- Atajos de teclado
- Notificaciones push y por email
- Estadísticas y gráficas
- Gamificación con XP, niveles y logros
- Widgets arrastrables en el dashboard
- Funciona sin internet
- Copias de seguridad automáticas
- Bloqueo con PIN
- Papelera para recuperar lo borrado
- Español e inglés
- Versión móvil
- Sincronización con Google Calendar

## Estilo

Rediseño del 2026-11-06, inspirado en Linear, Notion y Apple: sobrio, coherente y con el oscuro como tema principal.

| Aspecto | Elección |
|---|---|
| Tema | Oscuro por defecto; el claro igual de cuidado. Se cambia en la barra lateral (oscuro, claro, automático) |
| Color principal | Índigo por defecto; también violeta, esmeralda, azul cielo, naranja o rosa |
| Superficies | Neutras e iguales en todas las apps. El color de cada app solo aparece en su icono |
| Tipografía | Inter, raíz de 17 px (16 px en el móvil) |
| Tarjetas | Borde sutil, sombra mínima, esquinas de 14 px; se elevan al pasar el ratón |
| Navegación | Barra lateral con las apps por grupos (se puede plegar). En el móvil, pestañas abajo y menú lateral |
| Inicio | Bento: saludo con fecha, resumen de hoy, progreso del día, prioridades, próximos eventos, hábitos, acciones rápidas, cuentas atrás y concentración |
| Movimiento | Transición al cambiar de página, listas que aparecen en cascada, casillas con animación al marcar, paneles y visor suaves, esqueletos mientras carga. Se respeta "reducir movimiento" |

## Archivos adjuntos

- Tabla `attachments` (versión 14 de la base de datos): fotos, billetes y PDFs de cualquier registro, guardados solo en el dispositivo
- Las fotos se reducen (lado mayor 1600 px) y llevan miniatura; otros archivos, hasta 25 MB
- Cada archivo tiene fecha y comentario y se abre en un visor a pantalla completa
- Al quitar un archivo va a la papelera; al borrar para siempre un registro se borran sus archivos
- Dónde: viajes (portada, billetes, tickets, fotos), recuerdos (fecha y comentario por foto), flashcards (material en PDF), documentos (copias), inventario y finanzas (facturas y tickets), notas, proyectos y cursos (certificado)

## Apps quitadas (2026-11-06)

Prioridades (la matriz sigue como vista dentro de Tareas), Rutinas, Cursos e idiomas, Horas y nómina, Proyectos, Salud y Flashcards. También el botón de datos de ejemplo. Sus datos siguen guardados en la base de datos; solo se han quitado de la app. Finanzas pasa al grupo "Casa, dinero y personas" y Gimnasio a "Crecimiento".

## Calendario (estilo Pipedrive)

- Vistas día, semana, mes y agenda (en el móvil, la semana enseña 3 días)
- Círculo en cada actividad para marcarla como hecha: se vuelve gris y tachada
- Arrastrar para mover a otro día u hora (en cuartos de hora); estirar desde el borde de abajo para cambiar la duración
- En una serie que se repite, mover un día lo saca de la serie como evento suelto
- Las tareas con fecha salen en el calendario y se pueden marcar y mover; las tareas sin fecha se arrastran desde la barra lateral
- Lo que viene de otras apps (clase, cumpleaños, cobros, viajes) no se mueve desde aquí

## Gimnasio

Seis pestañas: Resumen (entrenamiento de hoy, semana, actividad reciente, cifras y acciones rápidas), Plan semanal (Torso, Pierna, Empuje, Tirón, Piernas, Cuerpo entero, Cardio o Descanso, con plantilla por día), Entrenamientos (plantillas con series, repeticiones y descanso, duplicar, historial comparado con la sesión anterior), Progreso (gráficas, constancia, actividad semanal, series por músculo, historial por ejercicio y peso corporal opcional), Récords y Ejercicios (biblioteca con buscador y grupos musculares). Durante el entrenamiento: temporizador de descanso, comparación serie a serie, aviso de récord y notas.

## Almacenamiento (gestor inteligente)

- Panel en `/storage`: espacio total (según el navegador), por tipo (fotos, vídeos, PDFs y documentos, otros), por app, número de archivos, los más pesados, los más antiguos y evolución diaria.
- Límite por dispositivo (500 MB, 1 GB, 2 GB, 5 GB o personalizado) y avisos dentro de Crystal al 70, 85 y 95 %, una sola vez por nivel. Se pueden desactivar.
- Archivar: elegir archivos (filtrar por app y tipo, ordenar), elegir destino (carpeta o descarga), copiar, verificar con SHA-256 leyendo la copia, ver el resumen y liberar los originales solo con confirmación. Si algo falla, el original se queda.
- En la carpeta se crea `Crystal/<App>/<Año>/` y un índice `Crystal/crystal-archivo.json` para poder recuperarlo todo.
- Recuperar desde la carpeta, eligiendo el archivo a mano (se comprueba la huella) o volviendo a enlazar la carpeta en otro dispositivo.
- Recomendaciones con reglas: archivos grandes, antiguos, de viajes terminados, sin abrir en 6 meses y en la papelera. Nunca archivan ni borran nada solas.

## Viajes

- Tarjetas con portada, destino, fechas, cuenta atrás, estado, presupuesto y preparación
- Dentro de cada viaje: resumen, preparación (antes de viajar, cosas que comprar y maleta), vuelos y alojamiento con localizador y billete, qué hacer y comer, presupuesto con dinero disponible y gastos por categoría, itinerario por días y archivos

## Módulo Calendario

- Vistas: mes, semana con franjas horarias de 07:00 a 24:00, y agenda
- Cada tipo de evento tiene su color, y cada evento puede cambiarlo
- Colores por defecto: Clase azul, Trabajo grafito, Gimnasio verde, Cumpleaños rosa, Finanzas ámbar, Salud y documentos rojo, Viajes turquesa, Personal morado, Google coral
- Los eventos importantes (exámenes, cumpleaños, viajes) van con el color relleno
- Horario de clase fijo, visible solo en la vista semana
- Línea roja con la hora actual en la vista semana
- Pulsar un hueco libre en la vista semana crea un evento a esa hora
- Filtros por calendario, cuentas atrás en la barra lateral, papelera con opción de deshacer y XP al completar

## Pendiente de decidir

- Tecnología
- Qué se ve al abrir un registro (propuesta: panel lateral, como en la maqueta del calendario)
