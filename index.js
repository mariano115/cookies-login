const express = require("express");
const mongoose = require("mongoose");
const { getMensajes, addMensaje } = require("./Mensajes");
const { Server: HttpServer } = require("http");
const { Server: IOServer } = require("socket.io");
const { faker } = require("@faker-js/faker");
const app = express();
const httpServer = new HttpServer(app);
const io = new IOServer(httpServer);
const cors = require("cors");
const Config = require("./config");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const MongoStore = require("connect-mongo");
const advancedOptions = { useNewUrlParser: true, useUnifiedTopology: true };

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(
  session({
    store: MongoStore.create({
      mongoUrl: Config.urlMongo,
      mongoOptions: advancedOptions,
    }),
    secret: "secreto",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // Session expires after 1 min of inactivity.
      expires: 60000,
    },
  })
);

const PORT = process.env.PORT || 8080;

mongoose.connect(
  Config.urlMongo,
  {
    useNewUrlParser: true,
  },
  (err) => {
    if (err) throw new Error(`Error de conexión a la base de datos ${err}`);
    console.log("Base de datos conectada");
  }
);

io.on("connection", async (socket) => {
  await getMensajes().then((res) => socket.emit("messages", res));
  socket.emit("products", await fakerProducts(5));

  socket.on("new-message", async (data) => {
    await addMensaje({
      author: {
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        edad: data.edad,
        alias: data.alias,
        avatar: data.avatar,
      },
      text: data.text,
    });
    io.sockets.emit("messages", await getMensajes());
  });
  socket.on("login", async (nombre) => {});
});

app.set("views", "./views");
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  console.log("------------ req.session -------------");
  console.log(req.session);
  console.log("--------------------------------------");

  console.log("----------- req.sessionID ------------");
  console.log(req.sessionID);
  console.log("--------------------------------------");
  res.render("formulario", { nombre: req.query.nombre });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/logout", (req, res) => {
  //borrar session
  req.session.destroy(async () => {
    res.render("bye", { nombre: req.query.nombre });
  });
  /* res.render("login"); */
});

app.get("/test-mensaje", (req, res) => {
  res.send(testNormalizr());
});

app.get("/productos-test", async (req, res) => {
  res.send(fakerProducts(5));
});

app.get("/info", (req, res) => {
  console.log("------------ req.session -------------");
  console.log(req.session);
  console.log("--------------------------------------");

  console.log("----------- req.sessionID ------------");
  console.log(req.sessionID);
  console.log("--------------------------------------");

  console.log("----------- req.cookies ------------");
  console.log(req.cookies);
  console.log("--------------------------------------");

  console.log("---------- req.sessionStore ----------");
  console.log(req.sessionStore);
  console.log("--------------------------------------");

  res.send("Send info ok!");
});

const fakerProducts = () => {
  const products = [];
  for (let index = 0; index < 5; index++) {
    products.push({
      nombre: faker.commerce.product(),
      precio: faker.commerce.price(),
      foto: faker.image.imageUrl(),
    });
  }
  return products;
};

httpServer.listen(PORT, () => console.log("servidor Levantado"));
