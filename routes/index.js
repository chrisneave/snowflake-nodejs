var express = require('express');
var router = express.Router();
var util = require('util');
var url = require('url');
var qs = require('querystring');
var https = require('https');
var jwt = require('jwt-simple');

/* GET home page. */
router.get('/', function(req, res) {
  var title = 'Snowflake Node.js App';

  if (req.session['user']) {
    var user = req.session['user'];
    res.render('welcome', {
      title: title,
      user: user
    });
  } else {
    res.render('login', {
      title: title,
      message: util.format('To use the %s please login by clicking on the link below', title)
    });
  }
});

router.get('/user/login', function(req, res) {
  res.render('login');
});

router.get('/user/login/snowflake', function(req, res) {
  res.redirect('https://snowflake-op.herokuapp.com/oauth/authorize?' + qs.stringify({
    client_id: 'snowflake-nodejs',
    response_type: 'code',
    redirect_uri: 'https://snowflake-nodejs.herokuapp.com/user/login/openid/snowflake',
    scope: 'openid profile email'
  }));
});

router.get('/user/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

function getUserInfo(access_token, id_token, done) {
  var request;

  request = https.request({
    hostname: 'snowflake-op.herokuapp.com',
    port: 433,
    path: '/userinfo',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + access_token
    }
  }, function(res) {
    var response_data = '';

    res.setEncoding('utf8');
    res.on('data', function(data) {
      response_data += data;
    });

    res.on('end', function() {
      var response_json = JSON.parse(response_data);
      done(response_data);
    });
  });
};

router.get('/user/login/openid/snowflake', function(req, res) {
  if (req.params['error']) {
    res.render('error', { message: util.format('%s', req.params['error']) })
  }

  var request,
      post_data = {};

  post_data.client_id = 'snowflake-nodejs';
  post_data.grant_type = 'authorization_code';
  post_data.redirect_uri = 'https://snowflake-nodejs.herokuapp.com/user/login/openid/snowflake';
  post_data.code = req.params['code'];

  request = https.request({
    hostname: 'snowflake-op.herokuapp.com',
    port: 433,
    path: '/oauth/token',
    method: 'POST',
    auth: 'snowflake-nodejs:7796f01f7251dc47f440ae461ac2fc8d'
  }, function(res) {
    var reponse_data = '';
    res.setEncoding('utf8');
    res.on('data', function(data) {
      response_data += data;
    });
    res.on('end', function() {
      if (response_data.error) {
        res.render('error', {
          message: util.format('%s - %s', response_data.error, response_data.error_description)
        });
      }

      var access_token = response_data.access_token,
          id_token = jwt.decode(response_data.id_token, 'https://snowflake-op.herokuapp.com');

      getUserInfo(access_token, id_token, function(response_json) {
        req.session['user'] = response_json;
        res.redirect('/');
      });
    });
  });

  request.write(qs.stringify(post_data));
  request.end();
});

module.exports = router;
