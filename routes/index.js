var express = require('express');
var router = express.Router();
var util = require('util');

/* GET home page. */
router.get('/', function(req, res) {
  var title = 'Snowflake Node.js App';

  if (res.user) {
    res.render('welcome', {
      title: title,
      message: util.format('Hi %s %s!', user.given_name, user.family_name)
    });
  } else {
    res.render('login', {
      title: title,
      message: util.format('To use the %s please login by clicking on the link below', title)
    });
  }
});

module.exports = router;
