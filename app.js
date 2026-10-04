import { createClient } from "@supabase/supabase-js";

// Los datos de aquí se usan en el menú y en el panel de administración.
const games = [
  { id: "tres-en-raya", name: "Tres en raya", icon: "⭕", description: "Haz una línea antes que el ordenador." },
  { id: "snake", name: "Snake", icon: "🐍", description: "Come la fruta y evita chocar." },
  { id: "memoria", name: "Memoria", icon: "🧠", description: "Encuentra las parejas de dibujos." },
  { id: "piedra-papel-tijera", name: "Piedra, papel o tijera", icon: "✂️", description: "Juega una partida de 10 rondas contra el ordenador." },
  { id: "adivina-numero", name: "Adivina el número", icon: "🔢", description: "Encuentra el número secreto en 7 intentos o menos." },
  { id: "quiz", name: "Quiz relámpago", icon: "💡", description: "Responde 10 preguntas de cultura general." },
  { id: "reaccion", name: "Reto de reacción", icon: "⚡", description: "Haz tantos clics como puedas en 10 segundos." },
  { id: "simon", name: "Simón dice", icon: "🎨", description: "Repite la secuencia de colores sin equivocarte." },
  { id: "pong", name: "Pong", icon: "🏓", description: "Un clásico de palas: juega contra el ordenador o con otra persona." },
  { id: "aventura-plataformas", name: "Aventura de plataformas", icon: "🌟", description: "Salta por las plataformas, recoge estrellas y llega a la meta." },
  { id: "rompe-ladrillos", name: "Rompe ladrillos", icon: "🧱", description: "Mueve la pala y despeja todos los ladrillos." },
  { id: "buscaminas", name: "Buscaminas", icon: "💣", description: "Encuentra las casillas seguras sin tocar una mina." },
  { id: "2048", name: "2048", icon: "🔢", description: "Combina las fichas iguales para conseguir la ficha más grande." },
  { id: "defensa-espacial", name: "Defensa espacial", icon: "🚀", description: "Esquiva a los invasores y defiende tu nave." },
];

const app = document.querySelector("#app");
let stopCurrentGame = () => {};
let leaderboardLoadNumber = 0;
let loginMode = "login";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;
let currentUser = null;
let currentUserName = "";
let currentAvatarPath = null;
let isAdministrator = false;
let allowedGameIds = [];
let requestedGameIds = [];
let authIsReady = false;
let accountMessage = "";
let accessError = "";
let userCheckNumber = 0;
let avatarPreviewUrl = "";

const profileTrigger = document.querySelector("#profile-trigger");
const profileMenu = document.querySelector("#profile-menu");
const profileDialog = document.querySelector("#profile-dialog");
const profileForm = document.querySelector("#profile-form");
const avatarFileInput = document.querySelector("#avatar-file");

function getAvatarUrl(path) {
  if (!supabase || !path) return "";
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

function renderProfileMenu() {
  const avatar = document.querySelector("#header-avatar");
  const fallback = document.querySelector("#header-avatar-fallback");
  const avatarUrl = getAvatarUrl(currentAvatarPath);

  avatar.onerror = () => {
    avatar.hidden = true;
    fallback.hidden = false;
  };

  if (avatarUrl) {
    avatar.src = avatarUrl;
    avatar.hidden = false;
    fallback.hidden = true;
  } else {
    avatar.removeAttribute("src");
    avatar.hidden = true;
    fallback.hidden = false;
  }

  profileMenu.replaceChildren();
  if (!currentUser) {
    const prompt = document.createElement("p");
    prompt.className = "profile-menu-message";
    prompt.textContent = "Inicia sesión para gestionar tu perfil.";
    profileMenu.append(prompt);
    return;
  }

  const name = document.createElement("p");
  name.className = "profile-menu-name";
  name.textContent = currentUserName || "Jugador";
  profileMenu.append(name);

  const editButton = document.createElement("button");
  editButton.className = "profile-menu-item";
  editButton.type = "button";
  editButton.textContent = "Editar perfil";
  editButton.addEventListener("click", openProfileDialog);
  profileMenu.append(editButton);

  if (isAdministrator) {
    const adminLink = document.createElement("a");
    adminLink.className = "profile-menu-item";
    adminLink.href = "#/admin";
    adminLink.textContent = "Administración";
    adminLink.addEventListener("click", closeProfileMenu);
    profileMenu.append(adminLink);
  }

  const signOutButton = document.createElement("button");
  signOutButton.className = "profile-menu-item profile-menu-sign-out";
  signOutButton.type = "button";
  signOutButton.textContent = "Cerrar sesión";
  signOutButton.addEventListener("click", async () => {
    if (await signOut()) closeProfileMenu();
  });
  profileMenu.append(signOutButton);
}

function closeProfileMenu() {
  profileMenu.hidden = true;
  profileTrigger.setAttribute("aria-expanded", "false");
}

profileTrigger.addEventListener("click", () => {
  const isOpening = profileMenu.hidden;
  profileMenu.hidden = !isOpening;
  profileTrigger.setAttribute("aria-expanded", String(isOpening));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".profile-menu-wrap")) closeProfileMenu();
});

function openProfileDialog() {
  closeProfileMenu();
  if (!currentUser) return;

  profileForm.reset();
  profileForm.querySelector("#profile-name").value = currentUserName;
  profileForm.querySelector("#profile-message").textContent = "";
  avatarFileInput.value = "";
  showAvatarPreview(getAvatarUrl(currentAvatarPath));
  profileDialog.showModal();
}

function showAvatarPreview(url) {
  const image = profileDialog.querySelector("#avatar-preview-image");
  const fallback = profileDialog.querySelector("#avatar-preview-fallback");

  if (url) {
    image.src = url;
    image.hidden = false;
    fallback.hidden = true;
  } else {
    image.removeAttribute("src");
    image.hidden = true;
    fallback.hidden = false;
  }
}

avatarFileInput.addEventListener("change", () => {
  const file = avatarFileInput.files[0];
  const message = profileForm.querySelector("#profile-message");
  message.textContent = "";
  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    avatarFileInput.value = "";
    message.textContent = "Elige una imagen PNG, JPG o WebP.";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    avatarFileInput.value = "";
    message.textContent = "La imagen debe ocupar como máximo 2 MB.";
    return;
  }

  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  avatarPreviewUrl = URL.createObjectURL(file);
  showAvatarPreview(avatarPreviewUrl);
});

document.querySelector("#profile-close").addEventListener("click", () => profileDialog.close());
document.querySelector("#profile-cancel").addEventListener("click", () => profileDialog.close());
profileDialog.addEventListener("click", (event) => {
  if (event.target === profileDialog) profileDialog.close();
});
profileDialog.addEventListener("close", () => {
  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  avatarPreviewUrl = "";
});
profileForm.addEventListener("submit", saveProfile);

async function saveProfile(event) {
  event.preventDefault();
  const name = profileForm.querySelector("#profile-name").value.trim();
  const newPassword = profileForm.querySelector("#profile-password").value;
  const file = avatarFileInput.files[0];
  const message = profileForm.querySelector("#profile-message");
  const saveButton = profileForm.querySelector('button[type="submit"]');

  if (!currentUser || !supabase) {
    message.textContent = "Inicia sesión para editar tu perfil.";
    return;
  }

  if (name.length < 2 || name.length > 80) {
    message.textContent = "El nombre debe tener entre 2 y 80 caracteres.";
    return;
  }

  if (newPassword && newPassword.length < 8) {
    message.textContent = "La nueva contraseña debe tener al menos 8 caracteres.";
    return;
  }

  saveButton.disabled = true;
  message.textContent = "Guardando cambios…";
  let uploadedAvatarPath = null;
  const oldAvatarPath = currentAvatarPath;

  try {
    if (file) {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.slice("image/".length);
      uploadedAvatarPath = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(uploadedAvatarPath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw error;
    }

    const nextAvatarPath = uploadedAvatarPath || currentAvatarPath;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: name, avatar_path: nextAvatarPath })
      .eq("id", currentUser.id);
    if (profileError) throw profileError;

    currentUserName = name;
    currentAvatarPath = nextAvatarPath;
    renderProfileMenu();
    renderAccountPanel();

    if (oldAvatarPath && uploadedAvatarPath) {
      const { error: removeError } = await supabase.storage.from("avatars").remove([oldAvatarPath]);
      if (removeError) console.error("No se pudo borrar la foto anterior.", removeError);
    }

    if (newPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) {
        message.textContent = `El perfil se guardó, pero no se pudo cambiar la contraseña: ${passwordError.message}`;
        return;
      }
    }

    profileDialog.close();
  } catch (error) {
    if (uploadedAvatarPath) {
      const { error: cleanupError } = await supabase.storage.from("avatars").remove([uploadedAvatarPath]);
      if (cleanupError) console.error("No se pudo limpiar la foto nueva.", cleanupError);
    }
    message.textContent = error.message || "No se pudieron guardar los cambios.";
  } finally {
    saveButton.disabled = false;
  }
}

// La parte de la dirección después de # decide qué pantalla enseñar.
function showPage() {
  stopCurrentGame();
  stopCurrentGame = () => {};

  if (!authIsReady) {
    app.innerHTML = `<p class="page-message">Comprobando tu cuenta…</p>`;
    return;
  }

  if (location.hash === "#/admin") {
    showAdminPage();
    return;
  }

  const match = location.hash.match(/^#\/jugar\/([\w-]+)$/);
  const game = match && games.find((item) => item.id === match[1]);

  if (!game) {
    showMenu();
    return;
  }

  if (!currentUser || !allowedGameIds.includes(game.id)) {
    location.hash = "#/";
    return;
  }

  showGame(game);
  window.scrollTo(0, 0);
}

function showMenu() {
  app.innerHTML = `
    <section class="welcome">
      <p class="eyebrow">Pasto Games</p>
      <h1>Tu rincón para jugar.</h1>
      <p class="intro">Inicia sesión para ver los juegos que tienes asignados.</p>
    </section>
    <div class="login-layout">
      <section class="account-panel" id="account-panel" aria-label="Acceso a tu cuenta"></section>
      <aside class="login-art">
        <img src="./public/images/login-controller-neon.jpg"
          alt="Consola y mandos de videojuegos" fetchpriority="high">
      </aside>
    </div>
    <section id="player-games"></section>
  `;
  renderAccountPanel();
  showPlayerGames();
}

function renderAccountPanel() {
  const panel = document.querySelector("#account-panel");
  if (!panel) return;
  const loginLayout = panel.closest(".login-layout");
  loginLayout?.classList.toggle("is-signed-in", Boolean(currentUser));

  if (currentUser) {
    panel.innerHTML = `
      <div class="account-heading">
        <div>
          <p class="account-label">Tu cuenta</p>
          <p class="account-email" id="account-name"></p>
        </div>
      </div>
    `;
    panel.querySelector("#account-name").textContent = currentUserName || "Jugador";
    return;
  }

  const isSigningUp = loginMode === "signup";
  panel.innerHTML = `
    <p class="account-label">Acceso de jugadores</p>
    <h2>${isSigningUp ? "Crear una cuenta" : "Inicia sesión"}</h2>
    <form class="account-form" id="account-form">
      ${isSigningUp ? `
        <label for="account-name">Tu nombre</label>
        <input id="account-name" name="name" type="text" autocomplete="name"
          minlength="2" maxlength="80" required>
      ` : ""}
      <label for="account-email">Correo electrónico</label>
      <input id="account-email" name="email" type="email" autocomplete="email" required>

      <label for="account-password">Contraseña</label>
      <input id="account-password" name="password" type="password"
        autocomplete="${isSigningUp ? "new-password" : "current-password"}"
        minlength="8" required>

      <button class="primary-button" type="submit">
        ${isSigningUp ? "Crear cuenta" : "Entrar"}
      </button>
      <p class="account-message" id="account-message" aria-live="polite"></p>
    </form>
    <button class="text-button" id="change-login-mode" type="button">
      ${isSigningUp ? "Ya tengo una cuenta" : "Quiero crear una cuenta"}
    </button>
  `;

  panel.querySelector("#account-form").addEventListener("submit", submitAuthForm);
  panel.querySelector("#change-login-mode").addEventListener("click", () => {
    loginMode = isSigningUp ? "login" : "signup";
    accountMessage = "";
    renderAccountPanel();
  });

  panel.querySelector("#account-message").textContent = supabase
    ? accountMessage
    : "La página no está leyendo las credenciales. Añade la URL y la clave publicable en .env.local y arranca con npm run dev.";
}

async function submitAuthForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const email = formData.get("email");
  const password = formData.get("password");
  const name = formData.get("name")?.trim();
  const submitButton = form.querySelector('button[type="submit"]');
  const message = form.querySelector("#account-message");

  if (!supabase) {
    message.textContent = "No se puede registrar todavía: falta configurar .env.local y abrir el portal con npm run dev.";
    return;
  }

  submitButton.disabled = true;
  message.textContent = "Un momento…";

  try {
    if (loginMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });
      if (error) throw error;

      if (data.session) {
        accountMessage = "Cuenta creada. Espera a que el administrador te asigne juegos.";
      } else {
        accountMessage = "Cuenta creada. Confirma el correo y espera a que te asignen juegos.";
      }
      renderAccountPanel();
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (error) {
    message.textContent = error.message || "No se pudo completar el acceso.";
  } finally {
    submitButton.disabled = false;
  }
}

async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();

  if (error) {
    let message = profileMenu.querySelector("#profile-menu-message");
    if (!message) {
      message = document.createElement("p");
      message.id = "profile-menu-message";
      message.className = "profile-menu-message";
      profileMenu.prepend(message);
    }
    message.textContent = error.message;
    return false;
  }

  return true;
}

// Supabase decides which games and user details this account can read.
async function loadAccountData(user) {
  const checkNumber = ++userCheckNumber;
  currentUser = user;
  currentUserName = "";
  isAdministrator = false;
  allowedGameIds = [];
  requestedGameIds = [];
  accessError = "";
  authIsReady = false;
  showPage();

  const [profileResult, accessResult, requestResult] = await Promise.all([
    supabase.from("profiles").select("is_admin, full_name, avatar_path").eq("id", user.id).maybeSingle(),
    supabase.from("user_game_access").select("game_id").eq("user_id", user.id),
    supabase.from("game_requests").select("game_id").eq("user_id", user.id),
  ]);

  if (checkNumber !== userCheckNumber) return;

  if (profileResult.error || accessResult.error || requestResult.error) {
    accessError = "No se pudo cargar tu cuenta. Comprueba la configuración de Supabase.";
    console.error(profileResult.error || accessResult.error || requestResult.error);
  } else {
    isAdministrator = profileResult.data?.is_admin === true;
    currentUserName = profileResult.data?.full_name?.trim() || "";
    currentAvatarPath = profileResult.data?.avatar_path || null;
    allowedGameIds = accessResult.data.map((row) => row.game_id);
    requestedGameIds = requestResult.data.map((row) => row.game_id);
  }

  authIsReady = true;
  renderProfileMenu();
  showPage();
}

function loadSignedOutPage() {
  userCheckNumber += 1;
  currentUser = null;
  currentUserName = "";
  currentAvatarPath = null;
  isAdministrator = false;
  allowedGameIds = [];
  accessError = "";
  authIsReady = true;
  renderProfileMenu();
  showPage();
}

function showPlayerGames() {
  const section = document.querySelector("#player-games");
  if (!section) return;

  if (!currentUser) {
    section.innerHTML = `
      <p class="page-message">Inicia sesión para ver tus juegos. Si aún no tienes cuenta, puedes crearla arriba.</p>
    `;
    return;
  }

  if (accessError) {
    section.innerHTML = `<p class="page-message">${accessError}</p>`;
    return;
  }

  const playerGames = games.filter((game) => allowedGameIds.includes(game.id));
  const basicGames = playerGames;
  const topGames = [];

  const availableGames = games.filter((game) =>
    !allowedGameIds.includes(game.id) && !requestedGameIds.includes(game.id)
  );
  const availableBasicGames = availableGames;
  const availableTopGames = [];

  function renderGameCards(gameGroup, isTop = false) {
    if (gameGroup.length === 0) return "";
    return `
      <section class="game-category ${isTop ? "game-category-top" : ""}" aria-label="${isTop ? "Juegos top" : "Juegos básicos"}">
        <h3 class="game-category-title">${isTop ? "⭐ Juegos top" : "🎮 Juegos básicos"}</h3>
        <div class="game-list">
          ${gameGroup.map((game) => `
            <a class="game-card ${isTop ? "game-card-top" : ""}" href="#/jugar/${game.id}">
              ${isTop ? '<span class="top-game-badge">TOP</span>' : ""}
              <span class="game-icon" aria-hidden="true">${game.icon}</span>
              <h2>${game.name}</h2>
              <p class="game-description">${game.description}</p>
            </a>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderRequestOptions(gameGroup, isTop = false) {
    if (gameGroup.length === 0) return "";
    return `
      <div class="request-game-category ${isTop ? "request-game-category-top" : ""}">
        <h3>${isTop ? "⭐ Juegos top" : "🎮 Juegos básicos"}</h3>
        <div class="request-options">
          ${gameGroup.map((game) => `
            <label class="game-permission">
              <input type="checkbox" name="game" value="${game.id}">
              <span>${game.icon} ${game.name}</span>
            </label>
          `).join("")}
        </div>
      </div>
    `;
  }

  section.innerHTML = `
    ${playerGames.length > 0 ? `
      <h2 class="section-title">Tus juegos</h2>
      <button class="surprise-button" id="surprise-game" type="button">🎲 Sorpréndeme</button>
      ${renderGameCards(topGames, true)}
      ${renderGameCards(basicGames)}
    ` : ""}

    <section class="request-panel">
      <p class="eyebrow">Tu biblioteca</p>
      <h2>${availableGames.length ? "¿Quieres más juegos?" : "No tienes más juegos por pedir"}</h2>
      <p>Solicita acceso a otros juegos. El administrador revisará tu petición.</p>
      ${availableGames.length ? `
        <form class="request-form" id="game-request-form">
          ${renderRequestOptions(availableBasicGames)}
          ${renderRequestOptions(availableTopGames, true)}
          <button class="primary-button" type="submit">Solicitar juegos</button>
          <p class="account-message" id="request-message" aria-live="polite"></p>
        </form>
      ` : ""}
      ${requestedGameIds.length ? `
        <div class="pending-requests">
          <h3>Solicitudes pendientes</h3>
          <ul>${requestedGameIds.map((id) => {
            const game = games.find((item) => item.id === id);
            return game ? `<li>${game.icon} ${game.name}</li>` : "";
          }).join("")}</ul>
        </div>
      ` : ""}
    </section>
  `;

  const requestForm = section.querySelector("#game-request-form");
  requestForm?.addEventListener("submit", submitGameRequests);
  section.querySelector("#surprise-game")?.addEventListener("click", () => {
    const randomGame = playerGames[Math.floor(Math.random() * playerGames.length)];
    location.hash = `#/jugar/${randomGame.id}`;
  });
}

async function submitGameRequests(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector("#request-message");
  const submitButton = form.querySelector('button[type="submit"]');
  const selectedGameIds = new FormData(form).getAll("game");

  if (!supabase || !currentUser) {
    message.textContent = "Inicia sesión para solicitar juegos.";
    return;
  }

  if (selectedGameIds.length === 0) {
    message.textContent = "Elige al menos un juego.";
    return;
  }

  submitButton.disabled = true;
  message.textContent = "Enviando solicitud…";

  const requests = selectedGameIds.map((gameId) => ({
    user_id: currentUser.id,
    game_id: gameId,
  }));
  let data;
  try {
    const result = await supabase
      .from("game_requests")
      .insert(requests)
      .select("game_id");
    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    message.textContent = explainGameAccessError(error, "solicitar");
    console.error("No se pudieron enviar las solicitudes.", error);
    return;
  } finally {
    submitButton.disabled = false;
  }

  requestedGameIds = [...new Set([...requestedGameIds, ...data.map((request) => request.game_id)])];
  showPlayerGames();
  const updatedMessage = document.querySelector("#request-message");
  if (updatedMessage) updatedMessage.textContent = "Solicitud enviada al administrador.";
}

async function showAdminPage() {
  if (!currentUser) {
    location.hash = "#/";
    return;
  }

  if (!isAdministrator) {
    app.innerHTML = `
      <section class="game-page">
        <a class="back-link" href="#/">← Volver a mis juegos</a>
        <p class="page-message">Esta cuenta no tiene permiso para abrir el panel de administración.</p>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="admin-page">
      <a class="back-link" href="#/">← Volver a mis juegos</a>
      <p class="eyebrow">Administración</p>
      <h1>Usuarios y juegos</h1>
      <p class="intro">Marca los juegos que quieres mostrar en el portal de cada persona.</p>
      <p class="account-message" id="admin-message" aria-live="polite">Cargando usuarios…</p>
      <section class="admin-requests" id="admin-requests"></section>
      <div class="user-list" id="user-list"></div>
    </section>
  `;

  await loadUsersForAdmin();
}

async function loadUsersForAdmin() {
  const message = document.querySelector("#admin-message");
  const userList = document.querySelector("#user-list");
  const requestList = document.querySelector("#admin-requests");
  if (!message || !userList || !requestList || !supabase) return;

  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_admin, created_at")
    .order("created_at", { ascending: false });

  if (usersError) {
    message.textContent = "No se pudieron cargar los usuarios. Comprueba que has instalado supabase-setup.sql.";
    console.error(usersError);
    return;
  }

  let assignments = [];
  let requests = [];
  if (users.length > 0) {
    const userIds = users.map((user) => user.id);
    const [accessResult, requestResult] = await Promise.all([
      supabase.from("user_game_access").select("user_id, game_id").in("user_id", userIds),
      supabase.from("game_requests").select("user_id, game_id, requested_at").in("user_id", userIds)
        .order("requested_at", { ascending: true }),
    ]);

    if (accessResult.error || requestResult.error) {
      message.textContent = "No se pudieron cargar los permisos de juegos.";
      console.error(accessResult.error || requestResult.error);
      return;
    }
    assignments = accessResult.data;
    requests = requestResult.data;
  }

  message.textContent = users.length === 0
    ? "Aún no hay cuentas registradas."
    : `Cuentas registradas: ${users.length}`;
  userList.replaceChildren();
  renderAdminRequests(requestList, users, requests);

  for (const user of users) {
    const row = document.createElement("section");
    row.className = "user-row";

    const details = document.createElement("div");
    details.className = "user-details";

    const email = document.createElement("strong");
    email.textContent = user.full_name?.trim() || "Sin nombre";
    details.append(email);
    if (user.email) {
      const userEmail = document.createElement("span");
      userEmail.className = "user-email";
      userEmail.textContent = user.email;
      details.append(userEmail);
    }

    if (user.is_admin) {
      const role = document.createElement("span");
      role.className = "admin-badge";
      role.textContent = "Administrador";
      details.append(role);
    }
    row.append(details);

    const userGames = document.createElement("div");
    userGames.className = "user-games";
    userGames.setAttribute("aria-label", `Juegos asignados a ${user.email}`);
    const assignedIds = assignments
      .filter((assignment) => assignment.user_id === user.id)
      .map((assignment) => assignment.game_id);

    for (const game of games) {
      const label = document.createElement("label");
      label.className = "game-permission";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = assignedIds.includes(game.id);
      checkbox.addEventListener("change", () => {
        changeGamePermission(user.id, game.id, checkbox);
      });

      const name = document.createElement("span");
      name.textContent = `${game.icon} ${game.name}`;
      label.append(checkbox, name);
      userGames.append(label);
    }

    row.append(userGames);
    const rowMessage = document.createElement("p");
    rowMessage.className = "permission-message";
    rowMessage.setAttribute("aria-live", "polite");
    row.append(rowMessage);
    userList.append(row);
  }
}

function renderAdminRequests(requestList, users, requests) {
  requestList.replaceChildren();

  const heading = document.createElement("h2");
  heading.className = "section-title";
  heading.textContent = `Solicitudes pendientes (${requests.length})`;
  requestList.append(heading);

  if (requests.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "page-message";
    emptyMessage.textContent = "No hay solicitudes pendientes.";
    requestList.append(emptyMessage);
    return;
  }

  for (const request of requests) {
    const user = users.find((item) => item.id === request.user_id);
    const game = games.find((item) => item.id === request.game_id);
    if (!user || !game) continue;

    const row = document.createElement("article");
    row.className = "request-row";

    const requestedBy = document.createElement("div");
    requestedBy.className = "request-details";
    const name = document.createElement("strong");
    name.textContent = user.full_name?.trim() || user.email || "Jugador";
    const gameName = document.createElement("span");
    gameName.textContent = `solicita ${game.icon} ${game.name}`;
    requestedBy.append(name, gameName);

    const actions = document.createElement("div");
    actions.className = "request-actions";
    const approveButton = document.createElement("button");
    approveButton.className = "primary-button";
    approveButton.type = "button";
    approveButton.textContent = "Activar juego";
    approveButton.addEventListener("click", () => handleGameRequest(request, true, row));

    const rejectButton = document.createElement("button");
    rejectButton.className = "secondary-button";
    rejectButton.type = "button";
    rejectButton.textContent = "Rechazar";
    rejectButton.addEventListener("click", () => handleGameRequest(request, false, row));
    actions.append(approveButton, rejectButton);

    const status = document.createElement("p");
    status.className = "permission-message";
    status.setAttribute("aria-live", "polite");
    row.append(requestedBy, actions, status);
    requestList.append(row);
  }
}

async function handleGameRequest(request, approve, row) {
  const buttons = row.querySelectorAll("button");
  const status = row.querySelector(".permission-message");
  buttons.forEach((button) => { button.disabled = true; });
  status.textContent = approve ? "Activando juego…" : "Rechazando solicitud…";

  try {
    if (approve) {
      const { error } = await supabase
        .from("user_game_access")
        .upsert(
          { user_id: request.user_id, game_id: request.game_id },
          { onConflict: "user_id,game_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    }

    const { error: deleteError } = await supabase
      .from("game_requests")
      .delete()
      .eq("user_id", request.user_id)
      .eq("game_id", request.game_id);
    if (deleteError) throw deleteError;

    row.remove();
    await loadUsersForAdmin();
  } catch (error) {
    status.textContent = approve
      ? "No se pudo activar el juego. La solicitud sigue pendiente."
      : "No se pudo rechazar la solicitud.";
    buttons.forEach((button) => { button.disabled = false; });
    console.error(error);
  }
}

async function changeGamePermission(userId, gameId, checkbox) {
  const rowMessage = checkbox.closest(".user-row").querySelector(".permission-message");
  const shouldGrantAccess = checkbox.checked;
  checkbox.disabled = true;
  rowMessage.textContent = "Guardando…";

  try {
    let error;
    if (shouldGrantAccess) {
      const result = await supabase
        .from("user_game_access")
        .insert({ user_id: userId, game_id: gameId });
      error = result.error;
    } else {
      const result = await supabase
        .from("user_game_access")
        .delete()
        .eq("user_id", userId)
        .eq("game_id", gameId);
      error = result.error;
    }

    if (error) throw error;
    if (userId === currentUser.id) {
      if (shouldGrantAccess) {
        allowedGameIds.push(gameId);
      } else {
        allowedGameIds = allowedGameIds.filter((id) => id !== gameId);
      }
    }
    rowMessage.textContent = "Permiso guardado.";
  } catch (error) {
    checkbox.checked = !shouldGrantAccess;
    rowMessage.textContent = explainGameAccessError(error, "asignar");
    console.error("No se pudo guardar el permiso del juego.", error);
  } finally {
    checkbox.disabled = false;
  }
}

function explainGameAccessError(error, action) {
  if (["23503", "42P01", "PGRST205"].includes(error?.code)) {
    return "Faltan datos o tablas de juegos en Supabase. Ejecuta el supabase-setup.sql actualizado en el SQL Editor y vuelve a intentarlo.";
  }
  if (error?.code === "42501" || error?.code === "PGRST301") {
    return action === "asignar"
      ? "Supabase ha rechazado el permiso. Comprueba que tu cuenta sigue siendo administradora y vuelve a ejecutar el supabase-setup.sql actualizado."
      : "Supabase ha rechazado la solicitud. Vuelve a ejecutar el supabase-setup.sql actualizado para restaurar las políticas.";
  }
  if (error?.code === "23505") {
    return action === "solicitar"
      ? "Ya existe una solicitud para ese juego. Recarga la página para actualizar tu lista."
      : "Ese permiso ya estaba asignado. Recarga la página para actualizar la lista.";
  }
  if (error instanceof TypeError || !navigator.onLine) {
    return "No hay conexión con Supabase. Comprueba internet e inténtalo de nuevo.";
  }
  return action === "asignar"
    ? "No se pudo guardar el permiso. Consulta la consola del navegador para ver el error de Supabase."
    : "No se pudo enviar la solicitud. Consulta la consola del navegador para ver el error de Supabase.";
}

function showGame(game) {
  app.innerHTML = `
    <section class="game-page ${game.id === "pong" ? "game-page-wide" : ""}">
      <a class="back-link" href="#/">← Todos los juegos</a>
      <h1>${game.icon} ${game.name}</h1>
      <p class="game-help">${game.description}</p>
      <div class="game-fullscreen-shell" id="game-fullscreen-shell">
        ${game.id === "pong"
          ? `<iframe class="embedded-game pong-embedded-game" src="./pong/index.html"
              title="Pong" allow="fullscreen" allowfullscreen></iframe>`
          : `<div class="game-area" id="game-area"></div>`}
      </div>
      <button class="fullscreen-button" id="fullscreen-game" type="button" aria-pressed="false">
        ⛶ Pantalla completa
      </button>
      <p class="fullscreen-message" id="fullscreen-message" aria-live="polite"></p>
      ${game.id === "pong" ? `
        <section class="game-controls" aria-labelledby="pong-controls-title">
          <h2 id="pong-controls-title">Controles</h2>
          <p>Elige «Jugar contra el ordenador» o «Dos jugadores». Jugador 1: Q para subir y A para bajar. Jugador 2: P para subir y L para bajar.</p>
        </section>
      ` : ""}
      <section class="leaderboard" id="leaderboard" aria-live="polite">
        <h2>Clasificación</h2>
        <p class="leaderboard-message">Cargando puntuaciones…</p>
      </section>
    </section>
  `;

  const fullscreenShell = document.querySelector("#game-fullscreen-shell");
  const fullscreenButton = document.querySelector("#fullscreen-game");
  const fullscreenMessage = document.querySelector("#fullscreen-message");
  const updateFullscreenButton = () => {
    const isFullscreen = document.fullscreenElement === fullscreenShell;
    fullscreenButton.textContent = isFullscreen ? "⛶ Salir de pantalla completa" : "⛶ Pantalla completa";
    fullscreenButton.setAttribute("aria-pressed", String(isFullscreen));
  };
  const onFullscreenClick = async () => {
    fullscreenMessage.textContent = "";
    try {
      if (document.fullscreenElement === fullscreenShell) {
        await document.exitFullscreen();
      } else {
        await fullscreenShell.requestFullscreen();
      }
    } catch (error) {
      fullscreenMessage.textContent = "El navegador no ha podido abrir la pantalla completa.";
      console.error("No se pudo cambiar a pantalla completa.", error);
    }
  };
  fullscreenButton.addEventListener("click", onFullscreenClick);
  document.addEventListener("fullscreenchange", updateFullscreenButton);
  const stopFullscreen = () => {
    fullscreenButton.removeEventListener("click", onFullscreenClick);
    document.removeEventListener("fullscreenchange", updateFullscreenButton);
    if (document.fullscreenElement === fullscreenShell) document.exitFullscreen().catch(console.error);
  };

  if (game.id === "pong") {
    const iframe = document.querySelector(".embedded-game");
    const onTorrenteScore = (event) => {
      if (event.origin !== location.origin || event.source !== iframe.contentWindow) return;
      if (event.data?.type !== "pasto-game-score" || event.data.gameId !== game.id) return;
      submitGameScore(game.id, event.data.score);
    };
    window.addEventListener("message", onTorrenteScore);
    stopCurrentGame = () => {
      window.removeEventListener("message", onTorrenteScore);
      stopFullscreen();
    };
    loadLeaderboard(game);
    return;
  }

  const area = document.querySelector("#game-area");
  loadLeaderboard(game);
  if (game.id === "tres-en-raya") stopCurrentGame = startTicTacToe(area);
  if (game.id === "snake") stopCurrentGame = startSnake(area);
  if (game.id === "memoria") stopCurrentGame = startMemory(area);
  if (game.id === "piedra-papel-tijera") stopCurrentGame = startRockPaperScissors(area);
  if (game.id === "adivina-numero") stopCurrentGame = startGuessNumber(area);
  if (game.id === "quiz") stopCurrentGame = startQuiz(area);
  if (game.id === "reaccion") stopCurrentGame = startReaction(area);
  if (game.id === "simon") stopCurrentGame = startSimon(area);
  if (game.id === "aventura-plataformas") stopCurrentGame = startPlatformAdventure(area);
  if (game.id === "rompe-ladrillos") stopCurrentGame = startBreakout(area);
  if (game.id === "buscaminas") stopCurrentGame = startMinesweeper(area);
  if (game.id === "2048") stopCurrentGame = start2048(area);
  if (game.id === "defensa-espacial") stopCurrentGame = startSpaceDefender(area);
  const stopGame = stopCurrentGame;
  stopCurrentGame = () => {
    stopGame();
    stopFullscreen();
  };
}

function scoreDescription(gameId, score) {
  if (gameId === "tres-en-raya") return `${score} ${score === 1 ? "victoria" : "victorias"}`;
  if (gameId === "memoria") return `${score} ${score === 1 ? "movimiento" : "movimientos"}`;
  if (gameId === "adivina-numero") return `${score} ${score === 1 ? "intento" : "intentos"}`;
  if (gameId === "quiz") return `${score}/10 respuestas correctas`;
  if (gameId === "piedra-papel-tijera") return `${score}/10 victorias`;
  if (gameId === "simon") return `Nivel ${score}`;
  if (gameId === "reaccion") return `${score} clics`;
  if (gameId === "pong") return `${score} ${score === 1 ? "punto" : "puntos"} del jugador 1`;
  if (gameId === "buscaminas") return `${score} ${score === 1 ? "segundo" : "segundos"}`;
  if (gameId === "2048") return `ficha de ${score}`;
  return `${score} puntos`;
}

async function loadLeaderboard(game) {
  const leaderboard = document.querySelector("#leaderboard");
  if (!leaderboard) return;
  const loadNumber = ++leaderboardLoadNumber;

  if (!supabase || !currentUser) {
    leaderboard.querySelector(".leaderboard-message").textContent =
      "Inicia sesión para consultar la clasificación.";
    return;
  }

  const message = leaderboard.querySelector(".leaderboard-message");
  message.textContent = "Cargando puntuaciones…";

  const orderAscending = ["memoria", "adivina-numero", "buscaminas"].includes(game.id);
  let topResults;
  let currentPlayerResult;
  try {
    [topResults, currentPlayerResult] = await Promise.all([
      supabase
        .from("game_leaderboard")
        .select("user_id, display_name, score")
        .eq("game_id", game.id)
        .order("score", { ascending: orderAscending })
        .order("updated_at", { ascending: true })
        .limit(100),
      supabase
        .from("game_leaderboard")
        .select("user_id, display_name, score")
        .eq("game_id", game.id)
        .eq("user_id", currentUser.id)
        .maybeSingle(),
    ]);
  } catch (error) {
    if (document.querySelector("#leaderboard") && loadNumber === leaderboardLoadNumber) {
      message.textContent = "No se pudo cargar la clasificación. Comprueba tu conexión.";
    }
    console.error("No se pudo cargar la clasificación.", error);
    return;
  }

  if (!document.querySelector("#leaderboard") || loadNumber !== leaderboardLoadNumber) return;

  if (topResults.error || currentPlayerResult.error) {
    message.textContent = "No se pudo cargar la clasificación. Comprueba la configuración de Supabase.";
    console.error(topResults.error || currentPlayerResult.error);
    return;
  }

  const entries = topResults.data || [];
  const currentPlayer = currentPlayerResult.data;
  const currentPlayerIsListed = entries.some((entry) => entry.user_id === currentUser.id);
  const isOutsideTopHundred = currentPlayer && !currentPlayerIsListed;

  if (entries.length === 0 && !currentPlayer) {
    message.textContent = "Todavía no hay puntuaciones. ¡Sé el primero en jugar!";
    return;
  }

  const rows = entries.map((entry, index) => {
    const isCurrentPlayer = entry.user_id === currentUser.id;
    return `
      <tr class="${isCurrentPlayer ? "leaderboard-current-player" : ""}" ${isCurrentPlayer ? 'aria-current="true"' : ""}>
        <td>${index + 1}</td>
        <td>${escapeHtml(entry.display_name || "Jugador")}${isCurrentPlayer ? '<span class="you-badge">Tú</span>' : ""}</td>
        <td>${scoreDescription(game.id, entry.score)}</td>
      </tr>
    `;
  }).join("");
  const currentPlayerRow = isOutsideTopHundred ? `
    <tr class="leaderboard-current-player" aria-current="true">
      <td>—</td>
      <td>${escapeHtml(currentPlayer.display_name || "Jugador")}<span class="you-badge">Tú · fuera del top 100</span></td>
      <td>${scoreDescription(game.id, currentPlayer.score)}</td>
    </tr>
  ` : "";

  leaderboard.innerHTML = `
    <h2>Clasificación</h2>
    <p class="leaderboard-message">${entries.length} mejores ${entries.length === 1 ? "puntuación" : "puntuaciones"}${isOutsideTopHundred ? " y tu resultado" : ""}</p>
    <div class="leaderboard-table-wrap">
      <table class="leaderboard-table">
        <thead><tr><th scope="col">#</th><th scope="col">Jugador</th><th scope="col">Puntuación</th></tr></thead>
        <tbody>${rows}${currentPlayerRow}</tbody>
      </table>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

async function submitGameScore(gameId, score) {
  if (!supabase || !currentUser || !Number.isSafeInteger(score) || score < 0) return;

  let result;
  try {
    result = await supabase.rpc("submit_game_score", {
      p_game_id: gameId,
      p_score: score,
    });
  } catch (error) {
    console.error("No se pudo guardar la puntuación.", error);
    const message = document.querySelector("#leaderboard .leaderboard-message");
    if (message) message.textContent = "No se pudo guardar la puntuación. Comprueba tu conexión.";
    return;
  }

  if (result.error) {
    console.error("No se pudo guardar la puntuación.", result.error);
    const message = document.querySelector("#leaderboard .leaderboard-message");
    if (message) message.textContent = "No se pudo guardar la puntuación. Comprueba la configuración de Supabase.";
    return;
  }

  const game = games.find((item) => item.id === gameId);
  if (game) await loadLeaderboard(game);
}

// TRES EN RAYA
function startTicTacToe(area) {
  area.innerHTML = `
    <p class="status" id="status">Tu turno: eres X</p>
    <div class="tic-tac-toe" id="board"></div>
    <button class="primary-button" id="restart">Empezar de nuevo</button>
  `;

  const boardElement = area.querySelector("#board");
  const status = area.querySelector("#status");
  let board = Array(9).fill("");
  let gameOver = false;
  let computerTimer;

  function drawBoard() {
    boardElement.innerHTML = board.map((mark, index) => `
      <button data-square="${index}" aria-label="Casilla ${index + 1}" ${mark || gameOver ? "disabled" : ""}>
        ${mark}
      </button>
    `).join("");
  }

  function findWinner() {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];

    return lines.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
  }

  function checkEnd() {
    const winningLine = findWinner();

    if (winningLine) {
      gameOver = true;
      status.textContent = board[winningLine[0]] === "X" ? "¡Has ganado!" : "Ha ganado el ordenador.";
      if (board[winningLine[0]] === "X") submitGameScore("tres-en-raya", 1);
      drawBoard();
      winningLine.forEach((index) => {
        boardElement.children[index].style.background = "#dff3e5";
      });
      return true;
    }

    if (board.every(Boolean)) {
      gameOver = true;
      status.textContent = "Empate.";
      drawBoard();
      return true;
    }

    return false;
  }

  function computerTurn() {
    const emptySquares = board
      .map((mark, index) => mark === "" ? index : -1)
      .filter((index) => index !== -1);

    const choice = emptySquares[Math.floor(Math.random() * emptySquares.length)];
    board[choice] = "O";
    drawBoard();

    if (!checkEnd()) status.textContent = "Tu turno: eres X";
  }

  function restart() {
    clearTimeout(computerTimer);
    board = Array(9).fill("");
    gameOver = false;
    status.textContent = "Tu turno: eres X";
    drawBoard();
  }

  boardElement.addEventListener("click", (event) => {
    const square = event.target.closest("[data-square]");
    if (!square || gameOver) return;

    const index = Number(square.dataset.square);
    if (board[index]) return;

    board[index] = "X";
    drawBoard();
    if (checkEnd()) return;

    status.textContent = "Turno del ordenador…";
    computerTimer = setTimeout(computerTurn, 400);
  });

  area.querySelector("#restart").addEventListener("click", restart);
  restart();

  return () => clearTimeout(computerTimer);
}

// SNAKE
function startSnake(area) {
  const size = 20;
  const cellSize = 18;

  area.innerHTML = `
    <p class="status" id="status">Puntos: 0 · Usa las flechas o WASD</p>
    <canvas class="snake-board" width="${size * cellSize}" height="${size * cellSize}"></canvas>
    <div class="directions" aria-label="Controles de dirección">
      <button class="direction-button direction-up" data-direction="up" aria-label="Arriba">↑</button>
      <button class="direction-button direction-left" data-direction="left" aria-label="Izquierda">←</button>
      <button class="direction-button direction-down" data-direction="down" aria-label="Abajo">↓</button>
      <button class="direction-button direction-right" data-direction="right" aria-label="Derecha">→</button>
    </div>
    <button class="primary-button" id="restart">Empezar de nuevo</button>
  `;

  const canvas = area.querySelector("canvas");
  const context = canvas.getContext("2d");
  const status = area.querySelector("#status");
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const keyDirections = {
    ArrowUp: "up", w: "up",
    ArrowDown: "down", s: "down",
    ArrowLeft: "left", a: "left",
    ArrowRight: "right", d: "right",
  };

  let snake;
  let direction;
  let nextDirection;
  let food;
  let score;
  let timer;
  let gameOver;

  function placeFood() {
    do {
      food = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
    } while (snake.some((part) => part.x === food.x && part.y === food.y));
  }

  function draw() {
    context.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--canvas")
      .trim();
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#e26b48";
    context.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);

    snake.forEach((part, index) => {
      context.fillStyle = index === 0 ? "#4358d8" : "#7484e6";
      context.fillRect(part.x * cellSize + 1, part.y * cellSize + 1, cellSize - 2, cellSize - 2);
    });
  }

  function move() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const eatsFood = head.x === food.x && head.y === food.y;
    const bodyToCheck = eatsFood ? snake : snake.slice(0, -1);
    const hitsWall = head.x < 0 || head.y < 0 || head.x >= size || head.y >= size;
    const hitsSnake = bodyToCheck.some((part) => part.x === head.x && part.y === head.y);

    if (hitsWall || hitsSnake) {
      clearInterval(timer);
      gameOver = true;
      status.textContent = `Fin del juego · Puntos: ${score}`;
      submitGameScore("snake", score);
      return;
    }

    snake.unshift(head);
    if (eatsFood) {
      score += 1;
      status.textContent = `Puntos: ${score} · Usa las flechas o WASD`;
      placeFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function changeDirection(name) {
    const newDirection = directions[name];
    if (!newDirection) return;

    const isOpposite = newDirection.x === -direction.x && newDirection.y === -direction.y;
    if (!isOpposite) nextDirection = newDirection;
  }

  function onKeyDown(event) {
    const name = keyDirections[event.key];
    if (name) {
      event.preventDefault();
      changeDirection(name);
    }
  }

  function restart() {
    clearInterval(timer);
    snake = [{ x: 10, y: 10 }];
    direction = directions.right;
    nextDirection = directions.right;
    score = 0;
    gameOver = false;
    status.textContent = "Puntos: 0 · Usa las flechas o WASD";
    placeFood();
    draw();
    timer = setInterval(move, 130);
  }

  window.addEventListener("keydown", onKeyDown);
  area.querySelector(".directions").addEventListener("click", (event) => {
    const button = event.target.closest("[data-direction]");
    if (button) changeDirection(button.dataset.direction);
  });
  area.querySelector("#restart").addEventListener("click", restart);
  restart();

  return () => {
    clearInterval(timer);
    window.removeEventListener("keydown", onKeyDown);
  };
}

// MEMORIA
function startMemory(area) {
  const pictures = ["🍎", "🍌", "🍇", "🍓", "🍒", "🥝", "🍋", "🍉"];

  area.innerHTML = `
    <p class="status" id="status">Movimientos: 0</p>
    <div class="memory-board" id="board"></div>
    <button class="primary-button" id="restart">Barajar de nuevo</button>
  `;

  const board = area.querySelector("#board");
  const status = area.querySelector("#status");
  let cards = [];
  let firstCard = null;
  let moves = 0;
  let matchedPairs = 0;
  let waiting = false;
  let hideTimer;

  function shuffle(items) {
    // Mezcla los elementos eligiendo al azar cuál va en cada posición.
    for (let index = items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }
    return items;
  }

  function startOver() {
    clearTimeout(hideTimer);
    cards = shuffle([...pictures, ...pictures]);
    firstCard = null;
    moves = 0;
    matchedPairs = 0;
    waiting = false;
    status.textContent = "Movimientos: 0";
    board.innerHTML = cards.map((picture, index) => `
      <button class="memory-card" data-card="${index}" aria-label="Carta ${index + 1}">
        ${picture}
      </button>
    `).join("");
  }

  board.addEventListener("click", (event) => {
    const card = event.target.closest("[data-card]");
    if (!card || waiting || card.classList.contains("is-matched") || card === firstCard) return;

    card.classList.add("is-visible");

    if (!firstCard) {
      firstCard = card;
      return;
    }

    moves += 1;
    status.textContent = `Movimientos: ${moves}`;

    if (firstCard.textContent === card.textContent) {
      firstCard.classList.replace("is-visible", "is-matched");
      card.classList.replace("is-visible", "is-matched");
      firstCard = null;
      matchedPairs += 1;

      if (matchedPairs === pictures.length) {
        status.textContent = `¡Has encontrado todas las parejas en ${moves} movimientos!`;
        submitGameScore("memoria", moves);
      }
      return;
    }

    waiting = true;
    const previousCard = firstCard;
    firstCard = null;
    hideTimer = setTimeout(() => {
      previousCard.classList.remove("is-visible");
      card.classList.remove("is-visible");
      waiting = false;
    }, 800);
  });

  area.querySelector("#restart").addEventListener("click", startOver);
  startOver();

  return () => clearTimeout(hideTimer);
}

// PIEDRA, PAPEL O TIJERA
function startRockPaperScissors(area) {
  const choices = ["Piedra", "Papel", "Tijera"];
  area.innerHTML = `
    <p class="status" id="status">El primero en 10 rondas. ¡Elige!</p>
    <p class="game-score" id="score">Tú: 0 · Ordenador: 0</p>
    <div class="game-options">
      ${choices.map((choice, index) => `<button class="game-choice-button" data-choice="${index}">${choice}</button>`).join("")}
    </div>
    <button class="primary-button" id="restart">Empezar de nuevo</button>
  `;

  const status = area.querySelector("#status");
  const scoreLabel = area.querySelector("#score");
  let playerScore = 0;
  let computerScore = 0;
  let rounds = 0;

  function choose(event) {
    const button = event.target.closest("[data-choice]");
    if (!button || rounds >= 10) return;
    const player = Number(button.dataset.choice);
    const computer = Math.floor(Math.random() * choices.length);
    rounds += 1;
    if (player !== computer) {
      if ((player - computer + 3) % 3 === 1) playerScore += 1;
      else computerScore += 1;
    }
    scoreLabel.textContent = `Tú: ${playerScore} · Ordenador: ${computerScore}`;

    if (rounds === 10) {
      status.textContent = `Fin de la partida: ${playerScore} victorias de 10.`;
      submitGameScore("piedra-papel-tijera", playerScore);
    } else {
      status.textContent = `Ronda ${rounds}/10: tú ${choices[player]}, ordenador ${choices[computer]}.`;
    }
  }

  function restart() {
    playerScore = 0;
    computerScore = 0;
    rounds = 0;
    scoreLabel.textContent = "Tú: 0 · Ordenador: 0";
    status.textContent = "El primero en 10 rondas. ¡Elige!";
  }

  area.querySelector(".game-options").addEventListener("click", choose);
  area.querySelector("#restart").addEventListener("click", restart);
  return () => {};
}

// ADIVINA EL NÚMERO
function startGuessNumber(area) {
  area.innerHTML = `
    <p class="status" id="status">Estoy pensando un número del 1 al 100. Tienes 7 intentos.</p>
    <form class="game-options" id="guess-form">
      <label for="guess">Tu número</label>
      <input class="game-number-input" id="guess" type="number" min="1" max="100" required>
      <button class="primary-button" type="submit">Probar</button>
    </form>
    <p class="game-score" id="score">Intentos: 0/7</p>
    <button class="primary-button" id="restart">Nuevo número</button>
  `;

  const status = area.querySelector("#status");
  const form = area.querySelector("#guess-form");
  const input = area.querySelector("#guess");
  const scoreLabel = area.querySelector("#score");
  let secret;
  let attempts;
  let gameOver;

  function restart() {
    secret = Math.floor(Math.random() * 100) + 1;
    attempts = 0;
    gameOver = false;
    input.disabled = false;
    form.querySelector("button").disabled = false;
    input.value = "";
    scoreLabel.textContent = "Intentos: 0/7";
    status.textContent = "Estoy pensando un número del 1 al 100. Tienes 7 intentos.";
    input.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const guess = Number(input.value);
    if (gameOver || !Number.isInteger(guess) || guess < 1 || guess > 100) return;
    attempts += 1;
    scoreLabel.textContent = `Intentos: ${attempts}/7`;

    if (guess === secret) {
      gameOver = true;
      status.textContent = `¡Correcto! Lo has adivinado en ${attempts} intentos.`;
      submitGameScore("adivina-numero", attempts);
    } else if (attempts === 7) {
      gameOver = true;
      status.textContent = `Se acabaron los intentos. El número era ${secret}.`;
    } else {
      status.textContent = guess < secret ? "El número secreto es mayor." : "El número secreto es menor.";
    }

    if (gameOver) {
      input.disabled = true;
      form.querySelector("button").disabled = true;
    } else {
      input.select();
    }
  });
  area.querySelector("#restart").addEventListener("click", restart);
  restart();
  return () => {};
}

// QUIZ RELÁMPAGO
function startQuiz(area) {
  const questions = [
    { text: "¿Cuál es el planeta más grande?", answers: ["Marte", "Júpiter", "Venus"], correct: 1 },
    { text: "¿Cuántos lados tiene un hexágono?", answers: ["Seis", "Ocho", "Cinco"], correct: 0 },
    { text: "¿Cuál es la capital de Italia?", answers: ["Atenas", "Roma", "Lisboa"], correct: 1 },
    { text: "¿Qué gas necesitan las plantas para la fotosíntesis?", answers: ["Oxígeno", "Helio", "Dióxido de carbono"], correct: 2 },
    { text: "¿Cuánto es 9 × 7?", answers: ["63", "72", "56"], correct: 0 },
    { text: "¿En qué continente está Japón?", answers: ["Europa", "Asia", "Oceanía"], correct: 1 },
    { text: "¿Cuál de estos animales es un mamífero?", answers: ["Delfín", "Tiburón", "Pulpo"], correct: 0 },
    { text: "¿Cuántos minutos tiene una hora?", answers: ["100", "50", "60"], correct: 2 },
    { text: "¿Qué instrumento tiene teclas blancas y negras?", answers: ["Piano", "Tambor", "Flauta"], correct: 0 },
    { text: "¿Cuál es el océano más grande?", answers: ["Índico", "Pacífico", "Ártico"], correct: 1 },
  ];
  area.innerHTML = `
    <p class="status" id="status">Responde correctamente a tantas preguntas como puedas.</p>
    <p class="game-score" id="score">Pregunta 1/10 · Aciertos: 0</p>
    <h2 class="quiz-question" id="question"></h2>
    <div class="game-options" id="answers"></div>
    <button class="primary-button" id="restart">Volver a jugar</button>
  `;

  const status = area.querySelector("#status");
  const scoreLabel = area.querySelector("#score");
  const questionLabel = area.querySelector("#question");
  const answersArea = area.querySelector("#answers");
  let questionIndex = 0;
  let correctAnswers = 0;
  let finished = false;

  function showQuestion() {
    const question = questions[questionIndex];
    questionLabel.textContent = question.text;
    scoreLabel.textContent = `Pregunta ${questionIndex + 1}/10 · Aciertos: ${correctAnswers}`;
    answersArea.innerHTML = question.answers.map((answer, index) =>
      `<button class="game-choice-button" data-answer="${index}">${answer}</button>`
    ).join("");
  }

  function restart() {
    questionIndex = 0;
    correctAnswers = 0;
    finished = false;
    status.textContent = "Responde correctamente a tantas preguntas como puedas.";
    showQuestion();
  }

  answersArea.addEventListener("click", (event) => {
    const button = event.target.closest("[data-answer]");
    if (!button || finished) return;
    if (Number(button.dataset.answer) === questions[questionIndex].correct) correctAnswers += 1;
    questionIndex += 1;

    if (questionIndex === questions.length) {
      finished = true;
      questionLabel.textContent = `¡Quiz terminado! Has acertado ${correctAnswers} de 10.`;
      scoreLabel.textContent = "Partida completada";
      answersArea.innerHTML = "";
      status.textContent = "Tu resultado se ha guardado en la clasificación.";
      submitGameScore("quiz", correctAnswers);
    } else {
      showQuestion();
    }
  });

  area.querySelector("#restart").addEventListener("click", restart);
  restart();
  return () => {};
}

// RETO DE REACCIÓN
function startReaction(area) {
  area.innerHTML = `
    <p class="status" id="status">Pulsa empezar y haz clic tantas veces como puedas.</p>
    <p class="game-score" id="score">Tiempo: 10 · Clics: 0</p>
    <button class="primary-button" id="start">Empezar reto</button>
    <button class="reaction-target" id="target" disabled>¡Pulsa aquí!</button>
  `;

  const status = area.querySelector("#status");
  const scoreLabel = area.querySelector("#score");
  const startButton = area.querySelector("#start");
  const target = area.querySelector("#target");
  let timer;
  let clicks = 0;
  let seconds = 10;

  function finish() {
    clearInterval(timer);
    target.disabled = true;
    startButton.disabled = false;
    status.textContent = `¡Tiempo! Has hecho ${clicks} clics.`;
    submitGameScore("reaccion", clicks);
  }

  function start() {
    clearInterval(timer);
    clicks = 0;
    seconds = 10;
    startButton.disabled = true;
    target.disabled = false;
    status.textContent = "¡Ya! Haz clic lo más rápido que puedas.";
    scoreLabel.textContent = "Tiempo: 10 · Clics: 0";
    timer = setInterval(() => {
      seconds -= 1;
      scoreLabel.textContent = `Tiempo: ${seconds} · Clics: ${clicks}`;
      if (seconds <= 0) finish();
    }, 1000);
  }

  target.addEventListener("click", () => {
    if (target.disabled) return;
    clicks += 1;
    scoreLabel.textContent = `Tiempo: ${seconds} · Clics: ${clicks}`;
  });
  startButton.addEventListener("click", start);
  return () => clearInterval(timer);
}

// SIMÓN DICE
function startSimon(area) {
  const colors = ["rojo", "azul", "verde", "amarillo"];
  const symbols = { rojo: "🔴", azul: "🔵", verde: "🟢", amarillo: "🟡" };
  area.innerHTML = `
    <p class="status" id="status">Pulsa empezar y memoriza la secuencia.</p>
    <p class="game-score" id="score">Nivel: 0</p>
    <div class="simon-board">
      ${colors.map((color) => `<button class="simon-button simon-${color}" data-color="${color}" aria-label="${color}" disabled>${symbols[color]}</button>`).join("")}
    </div>
    <button class="primary-button" id="start">Empezar</button>
  `;

  const status = area.querySelector("#status");
  const scoreLabel = area.querySelector("#score");
  const startButton = area.querySelector("#start");
  const buttons = [...area.querySelectorAll("[data-color]")];
  let sequence = [];
  let playerIndex = 0;
  let completedLevels = 0;
  let timers = [];
  let playingSequence = false;
  let finished = false;

  function wait(milliseconds) {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, milliseconds);
      timers.push(timer);
    });
  }

  async function showSequence() {
    playingSequence = true;
    buttons.forEach((button) => { button.disabled = true; });
    status.textContent = "Mira la secuencia…";
    for (const color of sequence) {
      if (finished) return;
      await wait(450);
      const button = buttons.find((item) => item.dataset.color === color);
      button.classList.add("is-lit");
      await wait(350);
      button.classList.remove("is-lit");
    }
    if (finished) return;
    playingSequence = false;
    playerIndex = 0;
    buttons.forEach((button) => { button.disabled = false; });
    status.textContent = "Ahora repite la secuencia.";
  }

  function nextLevel() {
    if (sequence.length === 20) {
      finished = true;
      status.textContent = "¡Increíble! Has completado el nivel 20.";
      buttons.forEach((button) => { button.disabled = true; });
      startButton.disabled = false;
      submitGameScore("simon", 20);
      return;
    }
    sequence.push(colors[Math.floor(Math.random() * colors.length)]);
    scoreLabel.textContent = `Nivel: ${sequence.length}`;
    showSequence();
  }

  function restart() {
    timers.forEach(clearTimeout);
    timers = [];
    sequence = [];
    playerIndex = 0;
    completedLevels = 0;
    playingSequence = false;
    finished = false;
    startButton.disabled = true;
    nextLevel();
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      if (playingSequence || finished) return;
      const color = button.dataset.color;
      button.classList.add("is-lit");
      setTimeout(() => button.classList.remove("is-lit"), 180);
      if (color !== sequence[playerIndex]) {
        finished = true;
        buttons.forEach((item) => { item.disabled = true; });
        startButton.disabled = false;
        status.textContent = `Fin del juego. Has completado el nivel ${completedLevels}.`;
        if (completedLevels > 0) submitGameScore("simon", completedLevels);
        return;
      }
      playerIndex += 1;
      if (playerIndex === sequence.length) {
        completedLevels = sequence.length;
        buttons.forEach((item) => { item.disabled = true; });
        nextLevel();
      }
    });
  });

  startButton.addEventListener("click", restart);
  buttons.forEach((button) => { button.disabled = true; });
  return () => {
    finished = true;
    timers.forEach(clearTimeout);
  };
}

// AVENTURA DE PLATAFORMAS
function startPlatformAdventure(area) {
  const width = 760;
  const height = 340;
  const worldWidth = 1500;
  const platforms = [
    { x: 0, y: 300, width: 260 },
    { x: 330, y: 260, width: 160 },
    { x: 550, y: 220, width: 160 },
    { x: 770, y: 270, width: 170 },
    { x: 1000, y: 225, width: 150 },
    { x: 1210, y: 285, width: 290 },
  ];
  let stars;
  let player;
  let keys = {};
  let camera = 0;
  let score = 0;
  let finished = false;
  let frame;

  area.innerHTML = `
    <p class="status" id="status">Usa ← → o A/D para moverte y espacio, ↑ o W para saltar.</p>
    <p class="game-score" id="score">Estrellas: 0</p>
    <canvas class="arcade-canvas" width="${width}" height="${height}" aria-label="Aventura de plataformas"></canvas>
    <button class="primary-button" id="restart">Empezar de nuevo</button>
  `;
  const canvas = area.querySelector("canvas");
  const context = canvas.getContext("2d");
  const status = area.querySelector("#status");
  const scoreLabel = area.querySelector("#score");

  function reset() {
    stars = [
      { x: 390, y: 228, taken: false }, { x: 610, y: 188, taken: false },
      { x: 835, y: 238, taken: false }, { x: 1060, y: 193, taken: false },
    ];
    player = { x: 40, y: 250, width: 25, height: 38, vx: 0, vy: 0, grounded: false };
    camera = 0;
    score = 0;
    finished = false;
    status.textContent = "Usa ← → o A/D para moverte y espacio, ↑ o W para saltar.";
    scoreLabel.textContent = "Estrellas: 0";
  }

  function draw() {
    context.fillStyle = "#9bdbff";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#65b965";
    for (const platform of platforms) {
      context.fillRect(platform.x - camera, platform.y, platform.width, height - platform.y);
      context.fillStyle = "#357d47";
      context.fillRect(platform.x - camera, platform.y, platform.width, 8);
      context.fillStyle = "#65b965";
    }
    context.fillStyle = "#ffcf40";
    for (const star of stars) {
      if (!star.taken) {
        context.beginPath();
        context.arc(star.x - camera, star.y, 10, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.fillStyle = "#7445a5";
    context.fillRect(player.x - camera, player.y, player.width, player.height);
    context.fillStyle = "#fff";
    context.fillRect(player.x - camera + 15, player.y + 8, 5, 5);
    context.fillStyle = "#db465a";
    context.fillRect(worldWidth - 50 - camera, 225, 18, 60);
    context.fillRect(worldWidth - 70 - camera, 225, 38, 8);
    if (player.x > worldWidth - 85 && !finished) {
      finished = true;
      score += 100;
      scoreLabel.textContent = `¡Meta alcanzada! Puntuación: ${score}`;
      status.textContent = "¡Has llegado al final de la aventura!";
      submitGameScore("aventura-plataformas", score);
    }
    if (player.y > height + 30 && !finished) {
      finished = true;
      status.textContent = "Te has caído. ¡Inténtalo otra vez!";
      submitGameScore("aventura-plataformas", score);
    }
  }

  function update() {
    if (finished) return;
    const oldY = player.y;
    player.vx = (keys.ArrowRight || keys.d ? 3.4 : 0) - (keys.ArrowLeft || keys.a ? 3.4 : 0);
    if ((keys.ArrowUp || keys.w || keys[" "]) && player.grounded) {
      player.vy = -10.5;
      player.grounded = false;
    }
    player.vy = Math.min(player.vy + 0.48, 11);
    player.x = Math.max(0, Math.min(worldWidth - player.width, player.x + player.vx));
    player.y += player.vy;
    player.grounded = false;
    if (player.vy >= 0) {
      for (const platform of platforms) {
        const crossedTop = oldY + player.height <= platform.y && player.y + player.height >= platform.y;
        const overlapsPlatform = player.x + player.width > platform.x && player.x < platform.x + platform.width;
        if (crossedTop && overlapsPlatform) {
          player.y = platform.y - player.height;
          player.vy = 0;
          player.grounded = true;
          break;
        }
      }
    }
    for (const star of stars) {
      if (!star.taken && Math.abs(player.x + player.width / 2 - star.x) < 20 &&
        Math.abs(player.y + player.height / 2 - star.y) < 25) {
        star.taken = true;
        score += 25;
        scoreLabel.textContent = `Estrellas: ${score}`;
      }
    }
    camera = Math.max(0, Math.min(worldWidth - width, player.x - width * 0.35));
    draw();
  }

  function onKeyDown(event) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(event.key)) event.preventDefault();
    keys[event.key] = true;
  }
  function onKeyUp(event) { keys[event.key] = false; }
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  area.querySelector("#restart").addEventListener("click", reset);
  reset();
  frame = setInterval(update, 1000 / 60);
  return () => {
    clearInterval(frame);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  };
}

// ROMPE LADRILLOS
function startBreakout(area) {
  const width = 640;
  const height = 400;
  let paddle;
  let ball;
  let bricks;
  let keys = {};
  let score;
  let lives;
  let finished;
  let timer;

  area.innerHTML = `
    <p class="status" id="status">Mueve la pala con ← → o A/D.</p>
    <p class="game-score" id="score">Puntos: 0 · Vidas: 3</p>
    <canvas class="arcade-canvas" width="${width}" height="${height}" aria-label="Rompe ladrillos"></canvas>
    <button class="primary-button" id="restart">Empezar de nuevo</button>
  `;
  const canvas = area.querySelector("canvas");
  const context = canvas.getContext("2d");
  const status = area.querySelector("#status");
  const scoreLabel = area.querySelector("#score");

  function reset() {
    paddle = { x: width / 2 - 48, y: height - 28, width: 96, height: 12 };
    ball = { x: width / 2, y: height - 45, vx: 3.4, vy: -3.5, radius: 8 };
    bricks = Array.from({ length: 40 }, (_, index) => ({
      x: 26 + (index % 8) * 74,
      y: 32 + Math.floor(index / 8) * 25,
      width: 62,
      height: 15,
      alive: true,
    }));
    score = 0;
    lives = 3;
    finished = false;
    status.textContent = "Mueve la pala con ← → o A/D.";
    scoreLabel.textContent = "Puntos: 0 · Vidas: 3";
  }

  function finish(message) {
    if (finished) return;
    finished = true;
    status.textContent = message;
    submitGameScore("rompe-ladrillos", score);
  }

  function draw() {
    context.fillStyle = "#111827";
    context.fillRect(0, 0, width, height);
    bricks.forEach((brick, index) => {
      if (!brick.alive) return;
      context.fillStyle = ["#f56b6b", "#f5b942", "#4cb782", "#5686ed", "#ad6bea"][Math.floor(index / 8)];
      context.fillRect(brick.x, brick.y, brick.width, brick.height);
    });
    context.fillStyle = "#f8fafc";
    context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    context.beginPath();
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.fill();
  }

  function update() {
    if (!finished) {
      if (keys.ArrowLeft || keys.a) paddle.x -= 6;
      if (keys.ArrowRight || keys.d) paddle.x += 6;
      paddle.x = Math.max(0, Math.min(width - paddle.width, paddle.x));
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.x < ball.radius || ball.x > width - ball.radius) ball.vx *= -1;
      if (ball.y < ball.radius) ball.vy *= -1;
      if (ball.vy > 0 && ball.y + ball.radius >= paddle.y && ball.y < paddle.y + paddle.height &&
        ball.x >= paddle.x && ball.x <= paddle.x + paddle.width) {
        ball.vy = -Math.abs(ball.vy);
        ball.vx = ((ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2)) * 5;
      }
      for (const brick of bricks) {
        if (brick.alive && ball.x + ball.radius >= brick.x && ball.x - ball.radius <= brick.x + brick.width &&
          ball.y + ball.radius >= brick.y && ball.y - ball.radius <= brick.y + brick.height) {
          brick.alive = false;
          ball.vy *= -1;
          score += 10;
          break;
        }
      }
      if (bricks.every((brick) => !brick.alive)) finish(`¡Has despejado todos los ladrillos! Puntos: ${score}`);
      if (ball.y > height) {
        lives -= 1;
        if (lives === 0) finish(`Fin del juego · Puntos: ${score}`);
        else ball = { x: width / 2, y: height - 45, vx: 3.4, vy: -3.5, radius: 8 };
      }
      scoreLabel.textContent = `Puntos: ${score} · Vidas: ${lives}`;
    }
    draw();
  }

  function onKeyDown(event) {
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) event.preventDefault();
    keys[event.key] = true;
  }
  function onKeyUp(event) { keys[event.key] = false; }
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  area.querySelector("#restart").addEventListener("click", reset);
  reset();
  timer = setInterval(update, 1000 / 60);
  return () => {
    clearInterval(timer);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  };
}

// BUSCAMINAS
function startMinesweeper(area) {
  const boardSize = 8;
  const mineCount = 10;
  let cells;
  let opened;
  let flags;
  let seconds;
  let timer;
  let finished;

  area.innerHTML = `
    <p class="status" id="status">Abre todas las casillas seguras. Clic derecho para marcar una mina.</p>
    <p class="game-score" id="score">Tiempo: 0 · Minas: 10</p>
    <div class="minesweeper-board" id="board" aria-label="Tablero de Buscaminas"></div>
    <button class="primary-button" id="restart">Nueva partida</button>
  `;
  const board = area.querySelector("#board");
  const status = area.querySelector("#status");
  const scoreLabel = area.querySelector("#score");

  function setup() {
    clearInterval(timer);
    cells = Array.from({ length: boardSize * boardSize }, () => ({ mine: false, open: false, flagged: false }));
    let placed = 0;
    while (placed < mineCount) {
      const index = Math.floor(Math.random() * cells.length);
      if (!cells[index].mine) {
        cells[index].mine = true;
        placed += 1;
      }
    }
    opened = 0;
    flags = 0;
    seconds = 0;
    finished = false;
    status.textContent = "Abre todas las casillas seguras. Clic derecho para marcar una mina.";
    scoreLabel.textContent = "Tiempo: 0 · Minas: 10";
    timer = setInterval(() => {
      if (!finished) {
        seconds += 1;
        scoreLabel.textContent = `Tiempo: ${seconds} · Minas marcadas: ${flags}/${mineCount}`;
      }
    }, 1000);
    draw();
  }

  function neighbors(index) {
    const row = Math.floor(index / boardSize);
    const column = index % boardSize;
    const result = [];
    for (let y = Math.max(0, row - 1); y <= Math.min(boardSize - 1, row + 1); y += 1) {
      for (let x = Math.max(0, column - 1); x <= Math.min(boardSize - 1, column + 1); x += 1) {
        const neighbor = y * boardSize + x;
        if (neighbor !== index) result.push(neighbor);
      }
    }
    return result;
  }

  function draw() {
    board.innerHTML = cells.map((cell, index) => {
      const nearbyMines = cell.mine ? "" : neighbors(index).filter((neighbor) => cells[neighbor].mine).length || "";
      const content = cell.flagged ? "🚩" : cell.open ? (cell.mine ? "💣" : nearbyMines) : "";
      return `<button class="mine-cell ${cell.open ? "is-open" : ""}" data-cell="${index}" aria-label="Casilla ${index + 1}">${content}</button>`;
    }).join("");
  }

  function openCell(index) {
    const cell = cells[index];
    if (finished || cell.open || cell.flagged) return;
    if (opened === 0 && cell.mine) {
      cell.mine = false;
      const safeCell = cells.find((candidate) => !candidate.mine && candidate !== cell);
      if (safeCell) safeCell.mine = true;
    }
    cell.open = true;
    opened += 1;
    if (cell.mine) {
      finished = true;
      clearInterval(timer);
      status.textContent = "¡Has encontrado una mina! Prueba otra vez.";
    } else if (opened === cells.length - mineCount) {
      finished = true;
      clearInterval(timer);
      status.textContent = `¡Has despejado el campo en ${seconds} segundos!`;
      submitGameScore("buscaminas", seconds);
    }
    draw();
  }

  board.addEventListener("click", (event) => {
    const cell = event.target.closest("[data-cell]");
    if (cell) openCell(Number(cell.dataset.cell));
  });
  board.addEventListener("contextmenu", (event) => {
    const cellButton = event.target.closest("[data-cell]");
    if (!cellButton || finished) return;
    event.preventDefault();
    const cell = cells[Number(cellButton.dataset.cell)];
    if (cell.open) return;
    cell.flagged = !cell.flagged;
    flags += cell.flagged ? 1 : -1;
    scoreLabel.textContent = `Tiempo: ${seconds} · Minas marcadas: ${flags}/${mineCount}`;
    draw();
  });
  area.querySelector("#restart").addEventListener("click", setup);
  setup();
  return () => clearInterval(timer);
}

// 2048
function start2048(area) {
  const side = 4;
  let board;
  let score;
  let finished;

  area.innerHTML = `
    <p class="status" id="status">Usa las flechas del teclado para juntar las fichas iguales.</p>
    <p class="game-score" id="score">Puntos: 0 · Mejor ficha: 0</p>
    <div class="number-board" id="board" aria-label="Tablero 2048"></div>
    <button class="primary-button" id="restart">Nueva partida</button>
  `;
  const boardElement = area.querySelector("#board");
  const status = area.querySelector("#status");
  const scoreLabel = area.querySelector("#score");

  function addTile() {
    const empty = board.map((value, index) => value === 0 ? index : -1).filter((index) => index >= 0);
    if (empty.length) board[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
  }

  function draw() {
    boardElement.innerHTML = board.map((value) =>
      `<div class="number-cell" data-value="${value}">${value || ""}</div>`
    ).join("");
    const best = Math.max(...board);
    scoreLabel.textContent = `Puntos: ${score} · Mejor ficha: ${best}`;
  }

  function reset() {
    board = Array(side * side).fill(0);
    score = 0;
    finished = false;
    status.textContent = "Usa las flechas del teclado para juntar las fichas iguales.";
    addTile();
    addTile();
    draw();
  }

  function move(direction) {
    if (finished) return;
    const before = board.join(",");
    for (let line = 0; line < side; line += 1) {
      const indexes = Array.from({ length: side }, (_, step) => {
        if (direction === "left") return line * side + step;
        if (direction === "right") return line * side + (side - 1 - step);
        if (direction === "up") return step * side + line;
        return (side - 1 - step) * side + line;
      });
      const values = indexes.map((index) => board[index]).filter(Boolean);
      const merged = [];
      for (let index = 0; index < values.length; index += 1) {
        if (values[index] === values[index + 1]) {
          const value = values[index] * 2;
          merged.push(value);
          score += value;
          index += 1;
        } else {
          merged.push(values[index]);
        }
      }
      indexes.forEach((index, step) => { board[index] = merged[step] || 0; });
    }
    if (board.join(",") === before) return;
    addTile();
    draw();
    const best = Math.max(...board);
    if (best >= 2048) {
      finished = true;
      status.textContent = "¡Has conseguido la ficha 2048!";
      submitGameScore("2048", best);
    } else if (!board.includes(0) && !hasAvailableMove()) {
      finished = true;
      status.textContent = `No quedan movimientos. Tu mejor ficha fue ${best}.`;
      submitGameScore("2048", best);
    }
  }

  function hasAvailableMove() {
    for (let row = 0; row < side; row += 1) {
      for (let column = 0; column < side; column += 1) {
        const index = row * side + column;
        if (column < side - 1 && board[index] === board[index + 1]) return true;
        if (row < side - 1 && board[index] === board[index + side]) return true;
      }
    }
    return false;
  }

  function onKeyDown(event) {
    const directions = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    if (directions[event.key]) {
      event.preventDefault();
      move(directions[event.key]);
    }
  }
  document.addEventListener("keydown", onKeyDown);
  area.querySelector("#restart").addEventListener("click", reset);
  reset();
  return () => document.removeEventListener("keydown", onKeyDown);
}

// DEFENSA ESPACIAL
function startSpaceDefender(area) {
  const width = 640;
  const height = 400;
  let player;
  let bullets;
  let enemies;
  let keys = {};
  let score;
  let ended;
  let lastShot;
  let timer;

  area.innerHTML = `
    <p class="status" id="status">Muévete con ← → o A/D y dispara con espacio.</p>
    <p class="game-score" id="score">Puntos: 0</p>
    <canvas class="arcade-canvas" width="${width}" height="${height}" aria-label="Defensa espacial"></canvas>
    <button class="primary-button" id="restart">Nueva partida</button>
  `;
  const canvas = area.querySelector("canvas");
  const context = canvas.getContext("2d");
  const status = area.querySelector("#status");
  const scoreLabel = area.querySelector("#score");

  function reset() {
    player = { x: width / 2, y: height - 32 };
    bullets = [];
    enemies = [];
    keys = {};
    score = 0;
    ended = false;
    lastShot = 0;
    status.textContent = "Muévete con ← → o A/D y dispara con espacio.";
    scoreLabel.textContent = "Puntos: 0";
  }

  function finish() {
    if (ended) return;
    ended = true;
    status.textContent = `La nave ha sido alcanzada. Puntuación: ${score}`;
    submitGameScore("defensa-espacial", score);
  }

  function draw() {
    context.fillStyle = "#080f25";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#fff";
    for (let index = 0; index < 35; index += 1) {
      const x = (index * 173 + 39) % width;
      const y = (index * 97 + 13) % height;
      context.fillRect(x, y, 2, 2);
    }
    context.fillStyle = "#52d5ef";
    context.beginPath();
    context.moveTo(player.x, player.y - 16);
    context.lineTo(player.x - 14, player.y + 12);
    context.lineTo(player.x + 14, player.y + 12);
    context.fill();
    context.fillStyle = "#ffd45c";
    bullets.forEach((bullet) => context.fillRect(bullet.x - 2, bullet.y - 8, 4, 12));
    context.fillStyle = "#f06478";
    enemies.forEach((enemy) => {
      context.beginPath();
      context.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
      context.fill();
    });
  }

  function update() {
    if (!ended) {
      if (keys.ArrowLeft || keys.a) player.x -= 5;
      if (keys.ArrowRight || keys.d) player.x += 5;
      player.x = Math.max(16, Math.min(width - 16, player.x));
      const now = Date.now();
      if (keys[" "] && now - lastShot > 250) {
        bullets.push({ x: player.x, y: player.y - 16 });
        lastShot = now;
      }
      bullets.forEach((bullet) => { bullet.y -= 7; });
      bullets = bullets.filter((bullet) => bullet.y > -10);
      if (Math.random() < 0.035) enemies.push({ x: 20 + Math.random() * (width - 40), y: -12, speed: 1.4 + Math.random() * 1.4 });
      enemies.forEach((enemy) => { enemy.y += enemy.speed; });

      for (const enemy of enemies) {
        if (Math.abs(enemy.x - player.x) < 22 && Math.abs(enemy.y - player.y) < 22 || enemy.y > height) {
          finish();
          break;
        }
      }
      for (const bullet of bullets) {
        const hit = enemies.find((enemy) => Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < 16);
        if (hit) {
          enemies = enemies.filter((enemy) => enemy !== hit);
          bullet.y = -20;
          score += 10;
        }
      }
      scoreLabel.textContent = `Puntos: ${score}`;
    }
    draw();
  }

  function onKeyDown(event) {
    if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
    keys[event.key] = true;
  }
  function onKeyUp(event) { keys[event.key] = false; }
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  area.querySelector("#restart").addEventListener("click", reset);
  reset();
  timer = setInterval(update, 1000 / 60);
  return () => {
    clearInterval(timer);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  };
}

window.addEventListener("hashchange", showPage);

if (!supabase) {
  loadSignedOutPage();
} else {
  // Start reading account changes outside Supabase's event callback.
  supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => {
      if (session?.user) {
        loadAccountData(session.user);
      } else {
        loadSignedOutPage();
      }
    }, 0);
  });

  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error(error);
      accessError = "No se pudo comprobar la sesión. Recarga la página para volver a intentarlo.";
      loadSignedOutPage();
      return;
    }

    if (data.session?.user) {
      loadAccountData(data.session.user);
    } else {
      loadSignedOutPage();
    }
  }).catch((error) => {
    console.error(error);
    loadSignedOutPage();
  });
}
