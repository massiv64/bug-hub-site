'use strict'
const GoogleStrategy = require('passport-google-oauth20').Strategy
const knex = require("../db/knex");
const passwordHelpers = require("./passwordHelpers");

if(process.env.NODE_ENV !== 'production'){
  require('dotenv').load();
}

module.exports = (passport) => {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.URL}/auth/google/callback`,
      scope: ['profile', 'email'],
      state: true
  },
  function(accessToken, refreshToken, profile, done){
    //is this email in the database?
    knex('users').where('email', profile._json.emails[0].value).first().then(user=> {
      let photoString = profile.photos[0].value;
      let updatedPhoto = photoString.substring(0, photoString.length -6 )

      if(user){
        //does this person w/ a registered email have a Google token?
        knex('users').where('token', profile.id).first().then(foundUser => {
          if(foundUser){
            return(done(null, foundUser))
          } else {
            //if they do not, we add more data to the user profile from Google
            knex('users').where('email', profile._json.emails[0].value).first().update({
              token: profile.id,
              alias: profile._json.displayName,
              photo: updatedPhoto
            }).then(user => {
              return done(null, user)
            })
          }
        })
        return done(null, user);
      }
      else {
        knex('users').insert({
          token: profile.id,
          alias: profile._json.displayName,
          email: profile._json.emails[0].value,
          photo: updatedPhoto
        }, "*").then(user => {
          return done(null, user[0]);
        });
      }
    }).catch(err => {
      return done(err,null);
    });
    }
  ));

  passport.serializeUser((user, done) =>{
    done(null, user.id);
  });

  passport.deserializeUser((id, done) =>{
    knex('users').where({id}).first()
      .then((user) =>{
        done(null, user);
      }).catch((err) =>{
        done(err,null);
      });
  });
}
