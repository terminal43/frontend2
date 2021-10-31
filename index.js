const fs = require("fs");
const { resolve } = require("path");
const express = require("express");
const app = express();
const SERVERLOGLIST = [];

app.use("/", express.static("../client"));
const server = app.listen(3100, () => {
  console.log(`Example app listening at http://localhost:3100`);
});

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    method: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

const ALL_LOGS_VAL = "logsAll";
const CHANGED_LOGS = "logsChanged";

io.on("connection", (client) => {
  console.log("new client connected");
  client.emit(ALL_LOGS_VAL, SERVERLOGLIST);
});

async function readFixBytes(startIndex, endIndex, fixBuffer) {
  return new Promise((resolve, reject) => {
    const reader = fs.createReadStream("./watch.txt", {
      encoding: "utf-8",
      start: startIndex,
      end: endIndex,
      highWaterMark: fixBuffer,
    });

    let content = "";
    reader.on("data", (chunk) => {
      content += chunk;
    });

    reader.on("end", () => {
      resolve(content);
    });
    reader.on("error", () => {
      reject(error);
    });
  });
}

function makeObjectWithLinesIds(startIndex, content) {
  const list = [];
  const lines = content.split("\n");

  let last = 0;

  for (const line of lines) {
    list.push({ id: startIndex + last, log: line });
    last += line.length;
  }
  return list;
}

async function readLastNLines(lines) {
  let fixBuffer = 10000;
  const fileSize = fs.statSync("watch.txt").size;
  //  console.log(endIndex-1);
  let endIndex = fileSize - 1;
  let startIndex = endIndex - fixBuffer;
  if (startIndex < 0) {
    startIndex = 0;
  }
  let totalContent = "";
  let linesList = [];

  while (endIndex >= 0 && linesList) {
    const content = await readFixBytes(startIndex, endIndex, fixBuffer);
    // console.log(content);
    totalContent = content + totalContent;
    linesList = makeObjectWithLinesIds(startIndex, totalContent);

    endIndex = startIndex - 1;
    startIndex = endIndex - fixBuffer;
    if (startIndex < 0) {
      startIndex = 0;
    }
  }
  // {0, content}
  // {1,content}
  // .
  // .
  // .
  // {n,content}

  //check for changes

  const lastLogIndex = SERVERLOGLIST.length - 1;

  const changes = [];

  for (let l of linesList) {
    if (lastLogIndex < 0 || SERVERLOGLIST[lastLogIndex].id < l.id) {
      changes.push(l);
      SERVERLOGLIST.push(l);
    } else if (SERVERLOGLIST[lastLogIndex].id === l.id) {
      if (SERVERLOGLIST[lastLogIndex].log.length != l.log.length) {
        changes.push(l);
        SERVERLOGLIST[lastLogIndex] = l;
      }
    }

    if (changes.length > 0) {
      console.log("changes have been monitored", changes);
    }
  }
}

async function main() {
  //monitor-file
  fs.watch("./watch.txt", (eventType, filename) => {
    if (filename && eventType === "change") {
      console.log("\nThe file", filename, "was modified!");
      console.log("The type of change was:", eventType);
      readLastNLines();
    }
  });

  //take last 10 lines
  await readLastNLines(10);

  //emit to socket
}

main();
