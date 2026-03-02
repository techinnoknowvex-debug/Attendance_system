const bcrypt = require("bcrypt");

const plainPassword = "Inno1037"; 

const saltRounds = 10;

bcrypt.hash(plainPassword, saltRounds)
  .then(hash => {
    console.log("Hashed Password:");
    console.log(hash);
  })
  .catch(err => {
    console.error(err);
  });