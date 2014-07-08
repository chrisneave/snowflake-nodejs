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

router.get('/login/connect', function(req, res) {
  if (req.query.iss === 'https://snowflake-op.herokuapp.com') {
    res.redirect('https://snowflake-op.herokuapp.com/auth/oauth/v2/authorize?' + qs.stringify({
      client_id: 'snowflake-nodejs',
      response_type: 'code',
      redirect_uri: 'https://snowflake-nodejs.herokuapp.com/login/connect/snowflake',
      scope: 'openid profile email'
    }));
  }

  res.render('error', { message: 'Missing iss query parameter!' });
});

router.get('/user/login', function(req, res) {
  res.render('login');
});

router.get('/user/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

function getUserInfo(access_token, id_token, done) {
  var request;

  request = https.request({
    hostname: 'snowflake-op.herokuapp.com',
    port: 443,
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
      done(null, response_json);
    });
  });

  request.end();
};

function getToken(code, done) {
  var request,
      post_data = {};

  post_data.client_id = 'snowflake-nodejs';
  post_data.grant_type = 'authorization_code';
  post_data.redirect_uri = 'https://snowflake-nodejs.herokuapp.com/login/connect/snowflake';
  post_data.code = code;

  request = https.request({
    hostname: 'snowflake-op.herokuapp.com',
    port: 443,
    path: '/auth/oauth/v2/token',
    method: 'POST',
    auth: 'snowflake-nodejs:7796f01f7251dc47f440ae461ac2fc8d'
  }, function(res) {
    var response_data = '';
    res.setEncoding('utf8');
    res.on('data', function(data) {
      response_data += data;
    });
    res.on('end', function() {
      var response_json = JSON.parse(response_data);
      if (response_json.error) { return done(response_json); }

      var access_token = response_json.access_token,
          id_token = jwt.decode(response_json.id_token, 'https://snowflake-op.herokuapp.com');

      getUserInfo(access_token, id_token, done);
    });
  });

  request.write(qs.stringify(post_data));
  request.end();
};

router.get('/login/connect/snowflake', function(req, res) {
  if (req.params['error']) {
    res.render('error', { message: util.format('%s', req.params['error']) })
  }

  getToken(req.query.code, function(err, result) {
    if (err) {
      res.render('error', {
        message: util.format('%s - %s', err.error, err.error_description || '')
      });
      res.end();
    } else {
      req.session['user'] = result;
      res.redirect('/');
    }
  });
});

module.exports = router;
