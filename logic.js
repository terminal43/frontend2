let SERVERLOGLIST = [];
const LINES = 10;
const ALL_LOGS_VAL = "logsAll";
const CHANGED_LOGS = "logsChange";

function renderTable() {
  let html = "<tr><th>Log Message</th></tr>";
  for (let row of SERVERLOGLIST) {
    html += "<tr><td>" + row.log + "</td></tr>";
  }

  document.getElementById("logTable").innerHTML = html;
}

function socketClientInit() {
  const socket = io.connect("http://localhost:3100", {
    "force new connection": true,
    reconnectionAttempts: "Infinity",
    timeout: 10000,
    transport: ["websocket", "polling", "flashsocket"],
  });
  socket.on("connect", () => {
    console.log("connected to socket server");
  });
  socket.on(ALL_LOGS_VAL, (arr) => {
    SERVERLOGLIST = arr;
    renderTable();
  });

  socket.on(CHANGED_LOGS, (changes) => {
    const lastLogIndex = SERVERLOGLIST.length - 1;

    for (let l of changes) {
      if (lastLogIndex < 0 || SERVERLOGLIST[lastLogIndex].id < l.id) {
        SERVERLOGLIST.push(l);
      } else if (SERVERLOGLIST[lastLogIndex].id === l.id) {
        SERVERLOGLIST[lastLogIndex] = l;
      }
    }

    if (SERVERLOGLIST.length > LINES) {
      SERVERLOGLIST.splice(0, SERVERLOGLIST.length - LINES);
    }

    renderTable();
  });
}

$(document).ready(function () {
  socketClientInit();
});
