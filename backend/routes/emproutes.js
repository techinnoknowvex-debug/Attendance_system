
const express=require('express');
const Router=express.Router();
const supabase = require("../config/supabase");
const { EMPLOYEES_TABLE } = require("../models/supabaseModels");
const verifyToken=require('../middleware/admincheck');

// Public endpoint to fetch employees for attendance form (no authentication required)
Router.get("/employees-for-attendance", async (req, res) => {
  try {
    const { data: Empdata, error } = await supabase
      .from(EMPLOYEES_TABLE)
      .select('employee_id, name, department');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ Empdata: Empdata });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

 Router.post("/empregister",verifyToken,async (req,res)=>{
  const {employeeId,name,department,pin}= req.body;
    try {
      if(req.user.role!=="admin"){
        return res.status(403).json({message:"Access Denied for adding the EMPLOYEE data"})
      }

      if(!employeeId || !name || !department|| !pin){
        return res.status(400).json({message:"Please provide employeeId, name, and department"})
      }

      const { data: empidexists, error: checkError } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (checkError) {
        return res.status(500).json({ error: checkError.message });
      }

      if (empidexists) {
        return res.status(409).json({
          message: "Employee already exists with this ID",
        });
      }


      const { error: insertError } = await supabase
        .from(EMPLOYEES_TABLE)
        .insert({
          employee_id: employeeId,
          name: name,
          department: department,
          pin:pin
        });

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }

      return res.status(200).json({sucess:true,message:"Employee added in database"});
    } catch (error) {
      return res.status(500).json({error: error.message});
    }
 })

 Router.get("/allemp",verifyToken,async (req,res)=>{
    try {
      if(req.user.role!=="admin"){
        return res.status(403).json({message:"Access Denied"})
      }

      const { data: Empdata, error } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('id, employee_id, name, department');

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({Empdata:Empdata});
    } catch (error) {
      return res.status(500).json({error: error.message});
    }
 })


 Router.put("/update/:id",verifyToken,async (req,res)=>{
     const {id}=req.params;
     const {name,department}=req.body;
     try{
      if(req.user.role!=="admin"){
        return res.status(403).json({message:"Access Denied for updating the EMPLOYEE data"})
      }

      if(!name || !department){
        return res.status(400).json({message:"Please provide name and department"})
      }
      
      const { data: empexits, error: checkError } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (checkError) {
        return res.status(500).json({ message: checkError.message });
      }

      if(!empexits){
        return res.status(404).json({message:`Employee not found`})
      }

      const { error: updateError } = await supabase
        .from(EMPLOYEES_TABLE)
        .update({
          name: name,
          department: department
        })
        .eq('id', id);

      if (updateError) {
        return res.status(500).json({ message: updateError.message });
      }

      return res.status(200).json({message:`Employee with id: ${empexits.employee_id} updated successfully`})
     }catch(err){
      return res.status(500).json({message:err.message || err});
     }
 })

 Router.delete("/delete/:id",verifyToken,async (req,res)=>{
     const {id}=req.params;
     try{
      if(req.user.role!=="admin"){
        return res.status(403).json({message:"Access Denied for deleting the EMPLOYEE data"})
      }
      
   
      const { data: empexits, error: checkError } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (checkError) {
        return res.status(500).json({ message: checkError.message });
      }

      if(!empexits){
        return res.status(404).json({message:`Employee with id ${empexits.employee_id} not found`})
      }

      const { error: deleteError } = await supabase
        .from(EMPLOYEES_TABLE)
        .delete()
        .eq('id', id);

      if (deleteError) {
        return res.status(500).json({ message: deleteError.message });
      }

      return res.status(200).json({message:`Employee with id: ${empexits.employee_id} deleted successfully`})
     }catch(err){
      return res.status(500).json({message:err.message || err});
     }
 })





module.exports=Router;

