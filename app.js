//jshint esversion: 6

/*packages*/

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');
mongoose.connect("mongodb://localhost:27017/HospitalDB", {useNewUrlParser: true});

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const userSchema = {
  _id: String,
  firstname: String,
  lastname: String,
  DoB: Date,
  gender: String,
  email: String,
  password: String,
  employee: String
};

const patientSchema = {
  _id: String,
  profile: userSchema,
  physician: userSchema,
  history: [
    {
      title: String,
      body: String
    }
  ],
  prescriptions: [
    {
      value: String
    }
  ],
  appointments: [
    {
      time: Date,
      doctor: String
  }
]
};

const employeeSchema = {
  _id: String,
  profile: userSchema,
  patients: [
    {
      patient: String
    }
  ],
  schedule: [
    {
      time: Date,
      patient: String
    }
  ]

};



const User = mongoose.model("User", userSchema);
const Employee = mongoose.model("Employee", employeeSchema);
const Patient = mongoose.model("Patient", patientSchema);

let currentuser = new User();
let currentEmployee = new Employee();
let currentPatient = new Patient();
let currentPatients = new Patient();
let currentEmployees = new Employee();
let portals = [];
let prescriptions = [];

app.get("/", function(req, res){
  res.sendFile(__dirname+"/views/index.html");
});

app.get("/signup", function(req, res){
  res.sendFile(__dirname+"/views/signup.html");
});

app.post("/signup", function(req, res){
  var firstname = req.body.fname;
  var lastname = req.body.lname;
  var birthdate = req.body.birthdate;
  var gender = req.body.gender;
  var email = req.body.email;
  var password = req.body.password;
  var status = req.body.employee;
  var id =  req.body.userid;

  console.log(id, firstname, lastname, birthdate, gender, email, password, status);

  const user = new User({
    _id: id,
    firstname: firstname,
    lastname: lastname,
    DoB: birthdate,
    gender: gender,
    email: email,
    password: password,
    employee: status
  });

  user.save();
  if (status === "on"){
    const employee = new Employee({
      _id: id,
      profile: user
    });
    employee.save();
  } else {
    const patient = new Patient({
      _id: id,
      profile: user
    });
    patient.save();
  }

  res.redirect("/");

});

app.get("/login", function(req, res){
  res.sendFile(__dirname+"/views/login.html");
});

app.post("/login", function(req, res){
  var userID = req.body.userid;
  var password = req.body.password;
  var employee = req.body.employee;


  User.findOne({_id: userID}, function(err, user){
    if (err){
      console.log(err);
    } else {
      if (user.password === password){
        let name = user.firstname + " " + user.lastname;

        const portal = {
          name: name
        };
        portals.push(portal);
          currentuser = user;
          if(currentuser.employee === "on"){
            Employee.findOne({_id: userID}, function(err, employee){
              if (err) {
              } else {
                console.log(employee);
                if (employee.profile.password === password){
                  currentEmployee = employee;
                  res.redirect("/portal");
                } else {
                  res.send("Wrong Password.");
                }
              }
            });
          } else {
            Patient.findOne({_id: userID}, function(err, patient){
              if (err) {
                console.log(err);
              } else {
                if (patient.profile.password === password){
                  currentPatient = patient;
                  console.log(currentPatient);
                  res.redirect("/portal");
                } else {
                  res.send("Wrong Password.");
                }
              }
            });
          }
      } else {
        res.send("fail");
      }
    }
  });





});

app.get("/portal", function(req, res){
portals.forEach(function(portal){
  if(currentuser.employee === "on") {
    patient = {
      patient:"Alice Wonderland"
    };
    currentEmployee.patients.push(patient);
    res.render("employeeportal", {
      name: portal.name,
      content: "employee",
      patients: currentEmployee.patients,
      user: currentEmployee.profile
    });
    portals.pop();
  } else {
          res.render("patientportal", {
            name: portal.name,
            content: "patient",
            prescriptions: currentPatient.prescriptions,
            user: currentPatient.profile
          });
          portals.pop();
      }

  });
});

app.get("/history", function(req, res){

  console.log("History");
   let name = currentPatient.profile.firstname + " " + currentPatient.profile.lastname;
  res.render("history", {
    patientname: name,
    contents: currentPatient.history
  });
  res.end();
});

app.get("/schedule", function(req, res){
  res.sendFile(__dirname+"schedule-template-master/index.html");
  res.end();
});


app.get("/history/:postName", function(req, res){
  let posts = [];
  posts = currentPatient.history;
  posts.forEach(function(post){
      if(_.lowerCase(req.params.postName) === _.lowerCase(post.title)){
        res.render("post", {title: post.title, content: post.body});
      }
    });
});

app.get("/portal/empview", function(req, res){
  Patient.findOne({_id: "AW0"}, function(err, patient){
    if(err){
      console.log(err);
    } else {
      currentPatient = patient;
    }
  });
  let posts = [];
  posts = currentEmployee.patients;
  posts.forEach(function(post){
        res.render("empview", {
          name: post.patient,
          content: "Patient",
          prescriptions:currentPatient.prescriptions,
          user:currentPatient.profile
        });

    });
});

app.post("/portal/empview", function(req, res){
  let item = {
    value:req.body.newItem
  };
  currentPatient.prescriptions.push(item);
  currentPatient.save();
  res.redirect("/portal/empview");

});

app.get("/histview", function(req, res){
   let name = currentPatient.profile.firstname + " " + currentPatient.profile.lastname;
  res.render("histview", {
    patientname: name,
    contents: currentPatient.history
  });
});


app.get("/histview/compose", function(req, res){
  res.render("compose");
});

app.post("/histview/compose", function(req, res){
  const post = {
    title: req.body.postTitle,
    body: req.body.postBody
  };
  currentPatient.history.push(post);
  currentPatient.save();
  res.redirect("/histview");
});


app.get("/adminPage", function(req, res){
  Patient.find({}, function(err, user){
    currentPatients = user;

    Employee.find({},function(err, user) {
      currentEmployees = user;

      res.render("adminPortal", {
          users: currentPatients,
          employees: currentEmployees
      });
    });
  });
});
app.post("/promote", function(req, res){
  var promotees = req.body.patients;
  Patient.findOne({'profile._id': promotees}, function(req, user){
    console.log(user.profile);
    console.log("----------------------------------");
    var tempEmp = new Employee({
      _id: user._id,
      profile: user.profile
    });
    console.log(tempEmp);
    tempEmp.save();
  });
  Patient.deleteMany({'patient._id': promotees},function(){});
  console.log("--------------------");
  res.redirect("/adminPage");
});

app.post("/demote", function(req, res){
  var demotees = req.body.employees;
  Employee.findOne({'profile._id': demotees}, function(req, user){
    console.log(user.profile);
    console.log("----------------------------------");
    var tempPat = new Patient({
      _id: user._id,
      profile: user.profile
    });
    console.log(tempPat);
    tempPat.save();
  });
  Employee.deleteMany({'emp._id': demotees},function(){});
  console.log("--------------------");
  res.redirect("/adminPage");
});

app.get("/appointments", function(req, res){
    res.render("appointments", {
      content: "appointments",
      user: currentPatient,
      appointments: currentPatient.appointments
    });
});

app.post("/appointments", function(req, res){
  var appDate = req.body.appDate;
  var appTime = req.body.appTime;
  var tempUser = req.body.userID;
  console.log(appDate,appTime,tempUser);
  Patient.findOne({'profile._id': tempUser}, function(err, user){
    var tempApp = {time: appDate, doctor: "Harry Potter"};
    user.appointments.push(tempApp);
    user.save();
    console.log(user);
  });
  res.redirect("/appointments");
});



app.listen(3000, function(){
  console.log("Server started on port 3000");
});
