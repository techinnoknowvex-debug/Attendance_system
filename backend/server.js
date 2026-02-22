const express=require('express');
const cors = require("cors");
const app=express();
require("dotenv").config();
const supabase = require("./config/supabase");

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials:true
}));

app.use(express.json());

const admin=require("./routes/admin");
const markattandance=require("./routes/markattandance");
let empdata;
try {
  empdata = require("./routes/empdata");
} catch (err) {
  console.error("Failed to load ./routes/empdata:", err);
  const express = require("express");
  empdata = express.Router();
}
const emproutes=require("./routes/emproutes")
const lop=require("./routes/lop")

// Test Supabase connection
supabase.from('employees').select('count').limit(1)
  .then(() => {
    console.log("Supabase connected successfully");
  })
  .catch((err) => {
    console.error("Supabase connection failed:", err);
  });
  
app.get("/healthcheck",(req,res)=>{
     res.send("health check")
})

app.use("/emp",emproutes)
app.use("/emp",admin)
app.use("/emp",markattandance)
app.use("/emp",empdata)
app.use("/emp",lop)


app.listen(5000,()=>{
   console.log("Server started runnung on 5000 sucessfully");
})