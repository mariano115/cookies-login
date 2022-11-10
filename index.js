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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(cookieParser("secreto"));
app.use(
  session({
    store: MongoStore.create({
      mongoUrl: Config.urlMongo,
      mongoOptions: { useNewUrlParser: true, useUnifiedTopology: true },
    }),
    secret: "secreto",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 },
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

  socket.on("new-product", async (data) => {
    const products = await fakerProducts(5)
    products.push(data)
    io.sockets.emit("products", products);
  });
});

app.set("views", "./views");
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  req.session.user = req.query.nombre;
  res.cookie("logged", req.query.nombre, { signed: true, maxAge: 60000 });
  res.render("formulario", { nombre: req.query.nombre });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logged", (req, res) => {
  const log = req.signedCookies.logged;
  const ses = req.session.user;

  if (log && log === ses) {
    res.cookie("logged", log, { signed: true, maxAge: 60000 });
    res.status(200).send(true);
  } else {
    res.status(500).send(false);
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.json({success:'false', error:err})
    }
    
    res.clearCookie('logged')
    res.render("bye", { nombre: req.query.nombre });
  });
})
  

app.get("/test-mensaje", (req, res) => {
  res.send(testNormalizr());
});

app.get("/productos-test", async (req, res) => {
  res.send(fakerProducts(5));
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
