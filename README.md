# Pasto Games

Portal de juegos para navegador hecho con HTML, CSS y JavaScript. Incluye
minijuegos, cuentas, clasificaciones y un panel de administración con Supabase.

> **Licencias y contenido de terceros:** este repositorio no tiene una licencia
> general que cubra todos sus archivos. Cada juego, imagen y recurso conserva
> los derechos y condiciones de su autor. Consulta «Créditos y licencias» antes
> de reutilizar contenido.

## Iniciar el portal

1. Instala Node.js.
2. En la carpeta del proyecto, ejecuta `npm install`.
3. Ejecuta `npm run dev` y abre la dirección que muestra la terminal.
4. Para verificar una versión de producción, ejecuta `npm run build`; Vite
   genera el sitio estático en `dist/`.

## Publicar el sitio

Hacer público el repositorio en GitHub comparte el código y los archivos del
proyecto, pero **no publica automáticamente el sitio web**. Para alojarlo,
utiliza un servicio compatible con sitios estáticos, por ejemplo Netlify o
Vercel, y configura:

- Comando de compilación: `npm run build`.
- Carpeta de publicación: `dist`.
- Variables de compilación `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_PUBLISHABLE_KEY`, con los valores de tu proyecto Supabase.

Después, añade la URL pública del sitio a las URL permitidas en la configuración
de autenticación de Supabase (Site URL y Redirect URLs). Comprueba también que
las políticas RLS del archivo `supabase-setup.sql` estén aplicadas antes de
permitir el registro de usuarios.

La clave publicable de Supabase se incluye en el JavaScript generado para el
navegador; eso es normal. La protección de los datos depende de las políticas
RLS. **Nunca añadas la clave `service_role` a este repositorio ni a las
variables públicas del sitio.** El archivo `.env.local` está excluido por
`.gitignore`; verifica que no hayas subido claves o contraseñas antes de hacer
público el repositorio.

## Activar el login

El inicio de sesión usa Supabase. Crea un proyecto y copia su URL y su clave
publicable desde la configuración de API del proyecto.

1. Abre el SQL Editor de Supabase, pega el contenido actualizado de
   `supabase-setup.sql` y ejecútalo. Se puede volver a ejecutar después de
   cambios: configura perfiles, permisos, solicitudes y clasificaciones.
2. Crea una cuenta en el portal y confirma el correo.
3. En el SQL Editor, ejecuta este comando y cambia el correo por el tuyo:

   ```sql
   update public.profiles
   set is_admin = true
   where email = 'tu-correo@example.com';
   ```

4. En la carpeta del proyecto, crea un archivo llamado `.env.local` con estas
   dos líneas y reemplaza los valores de ejemplo por los de tu proyecto:

   ```dotenv
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
   ```

5. En Supabase, permite las direcciones local y publicada del portal en la
   configuración de URL de autenticación.
6. Ejecuta `npm run dev` desde esta carpeta y abre la dirección que muestra
   la terminal (normalmente `http://localhost:5173`). No abras `index.html`
   haciendo doble clic.
7. Si el servidor ya estaba iniciado antes de crear `.env.local`, detenlo con
   `Ctrl+C` y ejecuta otra vez `npm run dev`.
8. Inicia sesión con la cuenta administradora.

La clave publicable está pensada para usarse en una página web. **No pongas nunca
la clave `service_role` en este proyecto**: esa clave da acceso administrativo.
Supabase almacena las contraseñas; este portal no las guarda.

Si todavía no has configurado Supabase, el portal explica que el acceso real
necesita esa conexión.

## Archivos principales

- `index.html`: el contenido básico de la página.
- `style.css`: los colores, los tamaños y la disposición.
- `app.js`: las pantallas, el login, el panel de administración y los juegos.
- `supabase-setup.sql`: las tablas y reglas de seguridad de Supabase.
- `.env.local`: la dirección y la clave publicable del proyecto Supabase.

Al registrarse, cada jugador escribe su nombre. Supabase lo guarda en el perfil
y ese nombre aparece en los detalles de la cuenta; el administrador también lo
ve en la lista de usuarios.
El menú del icono de perfil permite cambiar el nombre, la foto y la contraseña.
Para activar estas funciones, vuelve a ejecutar el `supabase-setup.sql` actualizado
en el SQL Editor de Supabase. Las fotos se guardan en el bucket público `avatars`
(máximo 2 MB); cada usuario solo puede subir o borrar imágenes de su carpeta.

En `app.js`, `showPage()` elige entre el menú y el juego. Cada juego tiene una
función `start...()`: prepara el tablero, guarda su estado y responde a los clics.
En el panel de administración, marca o desmarca los juegos de cada cuenta.
La base de datos impide que un jugador cambie sus propios permisos o vea otras cuentas.
Los jugadores pueden solicitar los juegos que no tienen. Las solicitudes aparecen
en administración y se pueden aprobar o rechazar.
La biblioteca separa los juegos en «Juegos básicos» y «Juegos top».
Cada partida cuenta con un botón «Pantalla completa» para jugar sin que el menú
ni las clasificaciones ocupen espacio. Pulsa Esc para volver a la página.
El botón «Modo oscuro» del encabezado alterna el tema y recuerda la elección en
ese navegador.
El fondo tiene un movimiento suave y se adapta al tema claro u oscuro. Respeta
la configuración del dispositivo para reducir movimiento.

Cada juego muestra una clasificación con las puntuaciones de las cuentas
autorizadas para jugarlo. Se guardan las victorias acumuladas en Tres en raya,
la mejor puntuación en Snake y el menor número de movimientos en
Memoria y Adivina el número. En los juegos nuevos también se guardan las
victorias de Piedra, papel o tijera, aciertos del Quiz, clics del Reto de
reacción y nivel de Simón dice. El jugador aparece resaltado; si no está entre
los primeros 100, su resultado se muestra igualmente al final. Vuelve a ejecutar
`supabase-setup.sql` en el SQL Editor para crear la tabla y los permisos de
clasificación. Estas puntuaciones las envía el navegador y no tienen protección
contra trampas.

Pong está basado en [javascript-pong de Jake Gordon](https://github.com/jakesgordon/javascript-pong),
con licencia MIT. Se conserva el aviso de copyright y la licencia original en
`public/pong/LICENSE`. La clasificación guarda el mejor resultado del jugador 1.

La Aventura de plataformas es un juego propio del género de plataformas; utiliza
personajes y gráficos originales, sin copiar a Mario ni sus recursos.
También se han añadido Rompe ladrillos, Buscaminas, 2048 y Defensa espacial.
Para que estos juegos aparezcan en el catálogo y puedan guardar sus resultados,
ejecuta la versión actualizada de `supabase-setup.sql` y asígnalos desde el panel
de administración.

## Créditos y licencias

- **Pong:** adaptación de `jakesgordon/javascript-pong`, de Jake Gordon y
  colaboradores. Licencia MIT; el aviso completo se conserva en
  [`public/pong/LICENSE`](public/pong/LICENSE).
- **Fotografías del inicio de sesión:** alojadas localmente en
  `public/images/` y descargadas de Unsplash. Consulta la
  [licencia de Unsplash](https://unsplash.com/license).
- **Código y recursos restantes:** conservan sus derechos de autor salvo que
  una licencia o aviso específico indique lo contrario. La publicación de este
  repositorio no implica que todo su contenido pueda copiarse o redistribuirse.
