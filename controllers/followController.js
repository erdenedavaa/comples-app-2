const Follow = require("../models/Follow");

exports.addFollow = function (req, res) {
  let follow = new Follow(req.params.username, req.visitorId);
  // dagah gej bga hun, tuhain hun uuruu

  follow
    .create()
    .then(() => {
      req.flash("success", `Successfully followed ${req.params.username}`);
      req.session.save(() => res.redirect(`/profile/${req.params.username}`));
    })
    .catch((errors) => {
      // asuudaltai user dagahiig oroldvol
      errors.forEach((error) => {
        req.flash("errors", error);
      });
      req.session.save(() => res.redirect("/"));
    });
};

exports.removeFollow = function (req, res) {
  let follow = new Follow(req.params.username, req.visitorId);
  // dagah gej bga hun, tuhain hun uuruu

  follow
    .delete()
    .then(() => {
      req.flash("success", `Successfully stopped following ${req.params.username}`);
      req.session.save(() => res.redirect(`/profile/${req.params.username}`));
    })
    .catch((errors) => {
      // asuudaltai user dagahiig oroldvol
      errors.forEach((error) => {
        req.flash("errors", error);
      });
      req.session.save(() => res.redirect("/"));
    });
};
