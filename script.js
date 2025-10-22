    const conteneur = document.getElementById('conteneur')
    const message = document.getElementById('message')
    function alerter(mess) {
      conteneur.style.display = 'block'
      message.innerHTML = mess
    }
    function remove() {
      conteneur.style.display = 'none'
    }
    // static/script.js (PARTIE 2 corrigée)
/*
 Client Socket.IO
 - register: envoie le nom
 - receives:
    - registered {username}
    - user_list {users: []}
    - system_message {msg}
    - new_public_message {from, text}
    - new_private_message {from, to, text}
    - pm_error {error}
*/
(function(){
  const socket = io("http://0.0.0.0:5000"); // connect to same host:port
  const el = (id)=>document.getElementById(id);

  const usernameInput = el("username");
  const btnRegister = el("btnRegister");
  const usersUl = el("users");
  const messagesDiv = el("messages");
  const recipientSelect = el("recipient");
  const messageInput = el("messageInput");
  const sendBtn = el("sendBtn");
  const btnRefresh = el("btnRefresh");
  const connStatus = el("connectionStatus");

  let MY_USERNAME = null;

  function setStatus(online){
    socket.emit("ping_server")
    connStatus.textContent = online ? "Connecté 🟢" : "Hors-ligne 🔴";
    connStatus.className = online ? "status on" : "status off";
    if (connStatus.className == "status on") {
      alerter("Connecté au serveur")
      socket.emit("ping_server")//Actualiser
      if (usernameInput.value != '') {
        btnRegister.style.display = 'none'
      }
    }
    if (connStatus.className == "status off") {
      alerter("Déconnécté du serveur")
      socket.emit("ping_server")//ACTUALISER
      remettreAzero()
    }
  }

  // register button
  btnRegister.addEventListener("click", () => {
    const name = usernameInput.value.trim();
    socket.emit("ping_server")//Rafraichir
    if(!name) return alerter("Choisis d'abord un pseudo.");
    socket.emit("register", { username: name });
    if (connStatus.textContent =="Connecté 🟢") {
      alerter("Tu es Connecté en tant que "+ name)
      socket.emit("ping_server")
    }
    if (connStatus.textContent == "Hors-ligne 🔴") {
      alerter("Enregistré avec succès. Vous devez être Connecté pour participer à la discussion")
    }
    btnRegister.style.display = 'none'
  });

  // refresh users
  btnRefresh.addEventListener("click", () => {
    // ask server to resend user list (we'll rely on 'user_list' events)
    socket.emit("ping_server");
  });

  // send message
  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      sendMessage();
    }
  });

  function sendMessage(){
    const text = messageInput.value.trim();
    if(!text) return;
    const recipient = recipientSelect.value;
    if(recipient === "public"){
      socket.emit("public_message", { text: text });
    } else {
      socket.emit("private_message", { to: recipient, text: text });
    }
    messageInput.value = "";
  }

  // helper: append message
  function appendMessage(kind, html){
    const div = document.createElement("div");
    div.className = "msg " + kind;
    div.innerHTML = html;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // socket events
  socket.on("connect", () => {
    setStatus(true);
    // if we have a stored username, auto-register
    const saved = localStorage.getItem("chat_username");
    if(saved && !MY_USERNAME){
      usernameInput.value = saved;
      socket.emit("register", { username: saved });
    }
  });

  socket.on("disconnect", () => {
    setStatus(false);
  });

  socket.on("registered", (data) => {
    MY_USERNAME = data.username;
    localStorage.setItem("chat_username", MY_USERNAME);
    appendMessage("system", `<b>Tu es connecté en tant que <i>${MY_USERNAME}</i></b>`);
  });

  socket.on("user_list", (data) => {
    const users = data.users || [];
    usersUl.innerHTML = "";
    recipientSelect.innerHTML = '<option value="public">Tout le monde (public)</option>';
    users.forEach((u) => {
      const li = document.createElement("li");
      li.textContent = u;
      if(u === MY_USERNAME) li.classList.add("me");
      li.addEventListener("click", () => {
        if(u === MY_USERNAME) return alerter("C'est toi !");
        recipientSelect.value = u;
        messageInput.focus();
      });
      usersUl.appendChild(li);

      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = `Privé → ${u}`;
      recipientSelect.appendChild(opt);
    });
  });

  socket.on("system_message", (data) => {
    appendMessage("system", data.msg);
  });

  socket.on("new_public_message", (msg) => {
    const html = `<strong>${escapeHtml(msg.from)}</strong>: ${escapeHtml(msg.text)}`;
    appendMessage(msg.from === MY_USERNAME ? "me" : "them", html);
  });

  socket.on("new_private_message", (msg) => {
    const isMe = msg.from === MY_USERNAME;
    const label = isMe ? `Moi → ${escapeHtml(msg.to)}` : `${escapeHtml(msg.from)} → Moi`;
    const html = `<small style="color:#fcfaa0">${label}</small><br>${escapeHtml(msg.text)}`;
    appendMessage(isMe ? "me" : "them", html);
  });

  socket.on("pm_error", (data) => {
    appendMessage("system", `<span style="color:red">${escapeHtml(data.error)}</span>`);
  });

  socket.on("pong_server", () => {});

  function escapeHtml(s){
    if(!s) return "";
    return s.replace(/[&<>"']/g, (m)=>({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }
  function remettreAzero() {
    username = ''
    btnRegister.style.display = 'block'
    socket.emit("ping_server")
  }

  window.__CHAT = { socket, appendMessage };
})();