const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');
const markdown = require('marked');

const csrf = require('csurf');

const app = express();
const sanitizeHTML = require('sanitize-html');

app.use(express.urlencoded({ extended: false }));
// user submitted data to request object gesen tohirgoo
// request.body
app.use(express.json());

app.use('/api', require('./router-api'));
// ingesneer all doorh app.use uud api-d neelttei bolno

const sessionOptions = session({
  secret: 'Javasript is soooooooo cooooool',
  // default aar session ni memory-d save hiigddeg.
  // yyniig doorh baidlaar overwrite hiine
  store: new MongoStore({ client: require('./db') }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
});

app.use(sessionOptions);
app.use(flash());

// every request-d ashiglah hesgiig oruulna
app.use(function (req, res, next) {
  // make our markdown function available from within ejs template
  res.locals.filterUserHTML = function (content) {
    // filterUserHTML bol zugeer l zohioson ner shuu
    return sanitizeHTML(markdown(content), {
      allowedTags: [
        'p',
        'br',
        'ul',
        'ol',
        'li',
        'strong',
        'bold',
        'i',
        'em',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
      ],
      allowedAttributs: {},
    });
  };

  // make all error and success flash messages available from all templates
  res.locals.errors = req.flash('errors');
  res.locals.success = req.flash('success');

  // make current user is available on the req object
  if (req.session.user) {
    req.visitorId = req.session.user._id;
  } else {
    req.visitorId = 0;
    // if user not logged in 0
  }

  // make user session data available from within view templates
  res.locals.user = req.session.user;
  // deerh ni byh app dotor respond-iin user object iig req.session.user-eer ashiglah bolomjtoi bolgono
  next();
});

// const { runInNewContext } = require('vm');
const router = require('./router');
// const { Socket } = require('socket.io');

app.use(express.static('public'));
app.set('views', 'views');
app.set('view engine', 'ejs');

app.use(csrf());

app.use(function (req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/', router);

app.use(function (err, req, res, next) {
  if (err) {
    if (err.code === 'EBADCSRFTOKEN') {
      req.flash('errors', 'Cross site request forgery detected.');
      req.session.save(() => res.redirect('/'));
    } else {
      res.render('404');
    }
  }
});

const server = require('http').createServer(app);

const io = require('socket.io')(server);

// express session package (don't need to memorise)
io.use(function (socket, next) {
  sessionOptions(socket.request, socket.request.res, next);
  // ene ni express data-g socket.io dotor available bolgono gesen ug
});

io.on('connection', function (socket) {
  // if only logged in
  if (socket.request.session.user) {
    // userController deer req.session.user-iig login() deer zaaj ugsun bga
    const { user } = socket.request.session;
    // "let user = socket.request.session.user" iin tovchlol ium

    // session user iin medeelliig frontend JS ruu yawuulna
    socket.emit('welcome', { username: user.username, avatar: user.avatar });

    socket.on('chatMessageFromBrowser', function (data) {
      // send message to all broadcasting users gevel "io.emit" hiine.
      // harin anh bichsen hunruu ni butsaan yawuulahgui bol "socket.broadcast.emit"
      // gesen ch server ni current logged in user-iin username, avatar iig medeh shaardlagatai
      // yamar argaar medeh ve? deer bichsen socket.emit(...)
      socket.broadcast.emit('chatMessageFromServer', {
        message: sanitizeHTML(data.message, {
          allowedTags: [],
          allowedAttributes: {},
        }),
        username: user.username,
        avatar: user.avatar,
      });
      // we want to send to all connected users
    });
  }
});

module.exports = server;
