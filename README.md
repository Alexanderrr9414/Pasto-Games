# Pasto Games

[English](#english) | [Español](#español)

## English

A browser game portal built with HTML, CSS, and JavaScript. It features 14
mini-games, user accounts, leaderboards, and an administration panel powered by
Supabase.

> **Third-party content and licensing:** this repository does not have one
> license covering all files. Each game, image, and asset remains subject to
> its creator's rights and license. Check [Credits and licenses](#credits-and-licenses)
> before reusing any content.

### Run locally

1. Install Node.js.
2. In the project folder, run `npm install`.
3. Run `npm run dev` and open the address shown in the terminal.
4. To create a production build, run `npm run build`. Vite writes the static
   site to `dist/`.

### Deploy the website

Making this GitHub repository public shares the source files, but **does not
automatically publish the website**. Deploy it with a static hosting provider
such as Netlify or Vercel, using:

- Build command: `npm run build`
- Output directory: `dist`
- Build environment variables: `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY`, using values from your Supabase project.

Add the public website URL to Supabase Authentication's **Site URL** and
**Redirect URLs**. Apply the RLS policies in `supabase-setup.sql` before
allowing users to register.

The Supabase publishable key is included in browser JavaScript by design.
Database protection depends on the RLS policies. **Never add a `service_role`
key to this repository or to public hosting variables.** `.env.local` is
excluded by `.gitignore`; check that no passwords or keys have been committed
before making the repository public.

### Configure Supabase and sign-in

1. Create a Supabase project.
2. In the Supabase SQL Editor, run the current `supabase-setup.sql`. It sets up
   profiles, game permissions, requests, and leaderboards. You can run it again
   after schema updates.
3. Create an account in the portal and confirm the email.
4. In the SQL Editor, make your account an administrator by replacing the email
   in this query:

   ```sql
   update public.profiles
   set is_admin = true
   where email = 'you@example.com';
   ```

5. Create a `.env.local` file in the project folder:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

6. In Supabase Authentication settings, allow your local and deployed website
   URLs. Start the local site with `npm run dev`; do not open `index.html`
   directly from the file manager.
7. Sign in with the administrator account to grant games and manage requests.

Supabase stores user passwords; this portal does not. Never use the
`service_role` key in this project.

### Features

- Fourteen browser games, grouped into **Basic Games** and **Top Games**.
- Game requests and per-user game access managed by administrators.
- Per-game leaderboards that highlight the signed-in player's result. Scores
  are submitted by the browser and are not protected against cheating.
- Profile menu to change the player's name, picture, or password. Profile
  pictures are stored in the public `avatars` bucket (2 MB maximum); each user
  can manage files in their own folder.
- Dark mode, a gently animated background that respects reduced-motion
  settings, and a surprise button that opens a random assigned game.
- Full-screen play mode.

Main files: `index.html` contains the page structure, `style.css` its design,
`app.js` the application and game logic, and `supabase-setup.sql` the database
schema and security policies.

### Contributors

- [Alexanderrr9414](https://github.com/Alexanderrr9414) — project creator and maintainer.

### Credits and licenses

- **Pong:** based on [`jakesgordon/javascript-pong`](https://github.com/jakesgordon/javascript-pong)
  by Jake Gordon and contributors. Licensed under MIT; the original notice is
  included in [`public/pong/LICENSE`](public/pong/LICENSE).
- **Sign-in photos:** downloaded from Unsplash and stored in `public/images/`.
  See the [Unsplash License](https://unsplash.com/license).
- **Other code and assets:** remain under their respective copyright and license
  terms unless a specific notice states otherwise. Making this repository
  public does not grant permission to copy or redistribute third-party content.

## Español

Portal de juegos para navegador hecho con HTML, CSS y JavaScript. Incluye 14
minijuegos, cuentas de usuario, clasificaciones y un panel de administración
con Supabase.

> **Contenido de terceros y licencias:** este repositorio no tiene una única
> licencia que cubra todos sus archivos. Cada juego, imagen y recurso conserva
> los derechos y condiciones de su autor. Consulta
> [Créditos y licencias](#créditos-y-licencias) antes de reutilizar contenido.

### Iniciar en local

1. Instala Node.js.
2. En la carpeta del proyecto, ejecuta `npm install`.
3. Ejecuta `npm run dev` y abre la dirección que muestra la terminal.
4. Para generar una versión de producción, ejecuta `npm run build`. Vite
   crea el sitio estático en `dist/`.

### Publicar la web

Hacer público este repositorio en GitHub comparte los archivos de código, pero
**no publica automáticamente la web**. Para alojarla, utiliza un servicio para
sitios estáticos, como Netlify o Vercel, con esta configuración:

- Comando de compilación: `npm run build`
- Carpeta de salida: `dist`
- Variables de compilación: `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_PUBLISHABLE_KEY`, con los valores de tu proyecto Supabase.

Añade la URL pública de la web a **Site URL** y **Redirect URLs** en la
configuración de autenticación de Supabase. Aplica las políticas RLS de
`supabase-setup.sql` antes de permitir que los usuarios se registren.

La clave publicable de Supabase se incluye intencionadamente en el JavaScript
del navegador. La protección de la base de datos depende de las políticas RLS.
**Nunca añadas una clave `service_role` a este repositorio ni a las variables
públicas del alojamiento.** `.env.local` está excluido mediante `.gitignore`;
antes de hacer público el repositorio, comprueba que no hayas subido
contraseñas ni claves.

### Configurar Supabase e iniciar sesión

1. Crea un proyecto en Supabase.
2. En el SQL Editor de Supabase, ejecuta el archivo actualizado
   `supabase-setup.sql`. Configura perfiles, permisos de juegos, solicitudes y
   clasificaciones. Puedes volver a ejecutarlo cuando cambie el esquema.
3. Crea una cuenta en el portal y confirma el correo.
4. En el SQL Editor, convierte tu cuenta en administradora. Sustituye el correo
   del ejemplo:

   ```sql
   update public.profiles
   set is_admin = true
   where email = 'tu-correo@example.com';
   ```

5. Crea un archivo `.env.local` en la carpeta del proyecto:

   ```dotenv
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
   ```

6. En la configuración de autenticación de Supabase, permite las direcciones
   local y publicada de la web. Para iniciar en local, ejecuta `npm run dev`;
   no abras `index.html` directamente desde el explorador de archivos.
7. Inicia sesión con la cuenta administradora para asignar juegos y gestionar
   las solicitudes.

Supabase almacena las contraseñas; este portal no las guarda. No uses nunca la
clave `service_role` en este proyecto.

### Funciones

- Catorce juegos de navegador, organizados en **Juegos básicos** y
  **Juegos top**.
- Solicitudes de juegos y permisos individuales gestionados por el
  administrador.
- Clasificaciones por juego que resaltan el resultado del jugador conectado.
  Las puntuaciones se envían desde el navegador y no están protegidas contra
  trampas.
- Menú de perfil para cambiar el nombre, la foto o la contraseña. Las fotos se
  guardan en el bucket público `avatars` (máximo 2 MB); cada usuario solo puede
  gestionar los archivos de su propia carpeta.
- Modo oscuro, fondo animado suave que respeta la configuración para reducir
  movimiento y botón para abrir un juego asignado al azar.
- Modo de pantalla completa.

Archivos principales: `index.html` contiene la estructura de la página,
`style.css` su diseño, `app.js` la aplicación y la lógica de los juegos, y
`supabase-setup.sql` el esquema y las políticas de seguridad de la base de datos.

### Contribuidores

- [Alexanderrr9414](https://github.com/Alexanderrr9414) — creador y responsable del proyecto.

### Créditos y licencias

- **Pong:** basado en [`jakesgordon/javascript-pong`](https://github.com/jakesgordon/javascript-pong),
  de Jake Gordon y sus colaboradores. Tiene licencia MIT; el aviso original se
  incluye en [`public/pong/LICENSE`](public/pong/LICENSE).
- **Fotos del inicio de sesión:** descargadas de Unsplash y guardadas en
  `public/images/`. Consulta la [licencia de Unsplash](https://unsplash.com/license).
- **Resto del código y los recursos:** conservan sus respectivos derechos de
  autor y condiciones de licencia, salvo que un aviso específico indique otra
  cosa. Hacer público este repositorio no da permiso para copiar o redistribuir
  contenido de terceros.
