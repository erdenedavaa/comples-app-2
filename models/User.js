const bcrypt = require('bcryptjs');
const usersCollection = require('../db').db().collection('users');
// db.js deer "module.export=client"-iin db()-g clear hiisen tul deer code-nd ".db()" nemj ugj bn
const validator = require('validator');
const md5 = require('md5');

// User constructor function
const User = function (data, getAvatar) {
  this.data = data;
  this.errors = [];
  if (getAvatar === undefined) {
    getAvatar = false;
  }
  if (getAvatar) {
    this.getAvatar();
  }
};

User.prototype.cleanUp = function () {
  if (typeof this.data.username !== 'string') {
    this.data.username = '';
  }
  if (typeof this.data.email !== 'string') {
    this.data.email = '';
  }
  if (typeof this.data.password !== 'string') {
    this.data.password = '';
  }

  // get rid of any bogus properties
  this.data = {
    username: this.data.username.trim().toLowerCase(),
    email: this.data.email.trim().toLowerCase(),
    password: this.data.password,
  };
};

User.prototype.validate = function () {
  return new Promise(async (resolve, reject) => {
    if (this.data.username === '') {
      this.errors.push('You must provide a username.');
    }
    if (
      this.data.username !== '' &&
      !validator.isAlphanumeric(this.data.username)
    ) {
      this.errors.push('Username can only contain letters and numbers.');
    }

    if (!validator.isEmail(this.data.email)) {
      this.errors.push('You must provide a valid email address.');
    }
    if (this.data.password == '') {
      this.errors.push('You must provide a password.');
    }
    if (this.data.password.length > 0 && this.data.password.length < 6) {
      this.errors.push('Password must be at least 6 characters.');
    }
    if (this.data.password.length > 50) {
      this.errors.push('Password cannot exceed 50 characters.');
    }

    if (this.data.username.length > 0 && this.data.username.length < 3) {
      this.errors.push('Username must be at least 3 characters.');
    }
    if (this.data.username.length > 30) {
      this.errors.push('Username cannot exceed 30 characters.');
    }

    // Only if username is valid then check to see if it's already taken
    if (
      this.data.username.length > 2 &&
      this.data.username.length < 31 &&
      validator.isAlphanumeric(this.data.username)
    ) {
      const usernameExists = await usersCollection.findOne({
        username: this.data.username,
      });
      // how to coordinate above and below operations. Solution is async, await
      // findOne function returns promise, so we can use await before that function
      // Ingesneer JS freeze all other operations until this operation is completed
      if (usernameExists) {
        this.errors.push('That username is already taken.');
      }
    }

    // Only if email is valid then check to see if it's already taken
    if (validator.isEmail(this.data.email)) {
      const emailExists = await usersCollection.findOne({
        email: this.data.email,
      });
      if (emailExists) {
        this.errors.push('That email is already been used.');
      }
    }

    resolve(); // Promise completed bolsniig ingej bichij duusgadag ium bn
  });
};

User.prototype.login = function () {
  return new Promise((resolve, reject) => {
    // findOne() -nii "this"-iig GLobalruu zaahguind tuld ARROW FUNCTION bolgono.
    this.cleanUp();
    usersCollection
      .findOne({ username: this.data.username })
      .then((attemptedUser) => {
        // findOne in return Promise
        if (
          attemptedUser &&
          bcrypt.compareSync(this.data.password, attemptedUser.password)
        ) {
          this.data = attemptedUser;
          this.getAvatar();
          resolve('Congrats!');
        } else {
          reject('Invalid username / password.');
          // catch(function(e)) -ruu shidegdene
        }
      })
      .catch(function () {
        reject('Please try again later.');
      });
  });
};

User.prototype.register = function () {
  return new Promise(async (resolve, reject) => {
    // Stp #1: Validate user data
    this.cleanUp();
    await this.validate();

    // Neg anhaarah zuil bn. validate() ees umnu daraagiin function uud run hiihees sergiileh yostoi.
    // Shiidel ni PROMISE. Validate ni Promise bolood await uildel hiih yostoi.

    // Step #2: Only if there are no validation errors
    // then save the user data into a datbase
    if (!this.errors.length) {
      // hash user password
      const salt = bcrypt.genSaltSync(10);
      this.data.password = bcrypt.hashSync(this.data.password, salt);
      await usersCollection.insertOne(this.data);
      // avatar iig databse-d permanently save hiihguin tul daraa ni bairluulj bn
      this.getAvatar();
      // ingesneer generate url on the fly when we needed
      resolve();
    } else {
      reject(this.errors);
    }
  });
};

User.prototype.getAvatar = function () {
  this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`;
  // property name is avatar gesen ug.
};

User.findByUsername = function (username) {
  return new Promise(function (resolve, reject) {
    if (typeof username !== 'string') {
      reject();
      return;
    }
    usersCollection
      .findOne({ username })
      .then(function (userDoc) {
        if (userDoc) {
          userDoc = new User(userDoc, true);
          userDoc = {
            _id: userDoc.data._id,
            username: userDoc.data.username,
            avatar: userDoc.avatar,
          };
          resolve(userDoc);
        } else {
          reject();
        }
      })
      .catch(function () {
        reject();
      });
  });
};

User.doesEmailExist = function (email) {
  return new Promise(async function (resolve, reject) {
    if (typeof email !== 'string') {
      resolve(false);
    }

    const user = await usersCollection.findOne({ email });
    if (user) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
};

module.exports = User;
