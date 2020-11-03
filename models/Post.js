const postsCollection = require("../db").db().collection("posts");
const ObjectId = require("mongodb").ObjectId;
// MongoDb ni "id"-d special aar handdag. iimees ingej duudaj bn
const User = require("./User");

let Post = function (data, userid, requestedPostId) {
  this.data = data;
  this.errors = [];
  this.userid = userid;
  this.requestedPostId = requestedPostId;
};
// This is constructor function

Post.prototype.cleanUp = function () {
  if (typeof this.data.title != "string") {
    this.data.title = "";
  }

  if (typeof this.data.body != "string") {
    this.data.body = "";
  }

  // get rid of any bogus properties

  this.data = {
    title: this.data.title.trim(),
    body: this.data.body.trim(),
    createdDate: new Date(), // this program executed current time
    // author: this.userid
    // mongoDb ni "id"-d special-eer handdag tul iim engiin bailgaj boldoggui. doorhoor shiidne
    author: ObjectId(this.userid), // ene ni "id" object return hiine
  };
};

Post.prototype.validate = function () {
  if (this.data.title == "") {
    this.errors.push("You must provide a title.");
  }

  if (this.data.body == "") {
    this.errors.push("You must provide post content.");
  }
};

Post.prototype.create = function () {
  return new Promise((resolve, reject) => {
    this.cleanUp();
    this.validate();

    if (!this.errors.length) {
      // save post into database
      postsCollection
        .insertOne(this.data) // We don't know how long it takes to store on DB, so await or then, catch need!
        .then(() => {
          resolve();
        })
        .catch(() => {
          this.errors.push("Please try again later.");
          reject(this.errors);
        });
      //   resolve(); Үүнийг арилгаж байгаа шалтгаан нь дээр байгаа
      // insertOne ni Promise. Энэ promise-ийн ардаас "await" ашиглахгүйгээр
      // then, catch залгах гэж байгаа тул resolve хэрэггүй болдог юм байна
    } else {
      reject(this.errors);
    }
  });
};

Post.prototype.update = function () {
  return new Promise(async (resolve, reject) => {
    try {
      let post = await Post.findSingleById(this.requestedPostId, this.userid);
      // deert post var await bolson tul doorh ni "reliable can access to post var"
      // if "findSingleById" promise ni REJECT hiivel automataar door bga catch ajillana.
      // herhen reject hiihiig already in findSingleById-d zaasan bga
      if (post.isVisitorOwner) {
        // actually update db
        let status = await this.actuallyUpdate(); // mongoDb-d actually update hiisnii daraa main promise resolve() hiih yostoi
        resolve(status); // yndsen promise iin resolve()
      } else {
        reject(); // doorhtoi ajil bololtoi
      }
    } catch {
      reject();
      // ene reject ni "findSingleById"-giin reject shuu
    }
  });
};

Post.prototype.actuallyUpdate = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    this.validate();
    if (!this.errors.length) {
      await postsCollection.findOneAndUpdate(
        { _id: new ObjectId(this.requestedPostId) },
        { $set: { title: this.data.title, body: this.data.body } }
      );
      resolve("success");
    } else {
      resolve("failure");
      // neg udaa 2 uur resolve() return hiij boldogiig anhaar
    }
  });
};

Post.reusablePostQuery = function (uniqueOperations, visitorId) {
  return new Promise(async function (resolve, reject) {
    let aggOperations = uniqueOperations.concat([
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorDocument",
        },
      },
      {
        $project: {
          title: 1,
          body: 1,
          createdDate: 1,
          authorId: "$author", // In mongoDb $ means that it's original field value
          author: { $arrayElemAt: ["$authorDocument", 0] },
        },
      },
    ]);

    let posts = await postsCollection.aggregate(aggOperations).toArray();
    // aggregate() ni run multiple operations

    // clean up author property in each post object
    posts = posts.map(function (post) {
      post.isVisitorOwner = post.authorId.equals(visitorId);
      // return boolean

      post.author = {
        username: post.author.username,
        avatar: new User(post.author, true).avatar,
      };

      return post;
    });

    resolve(posts);
  });
};

// Sonirholtoi shiidel
Post.findSingleById = function (id, visitorId) {
  return new Promise(async function (resolve, reject) {
    if (typeof id != "string" || !ObjectId.isValid(id)) {
      reject();
      return;
    }

    let posts = await Post.reusablePostQuery(
      [{ $match: { _id: new ObjectId(id) } }],
      visitorId
    );

    if (posts.length) {
      console.log(posts[0]);
      resolve(posts[0]);
    } else {
      reject();
    }
  });
};

Post.findByAuthorId = function (authorId) {
  // userController-oos authorId pass hiisen.
  // author ni post gui baij boloh tul "no need to include any logic"
  // so no need to include PROMISE
  // reusablePostQeury ni Promise tul findByAuthorId ni promise boloh ium shig bn
  return Post.reusablePostQuery([
    { $match: { author: authorId } },
    { $sort: { createdDate: -1 } }, // descending order, 1 for accending order
  ]);
};

module.exports = Post;
