const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let complaints = [];

app.get("/", (req, res) => {
    res.send("GrievEase Backend is running!");
});

app.post("/complaints", (req, res) => {
    const complaint = {
        id: complaints.length + 1,
        ...req.body,
        status: "Pending"
    };

    complaints.push(complaint);

    res.status(201).json({
        message: "Complaint submitted successfully",
        complaint: complaint
    });
});

app.get("/complaints", (req, res) => {
    res.json(complaints);
});
function getDepartment(category) {
    const departments = {
        "Road": "Public Works Department",
        "Pothole": "Public Works Department",
        "Streetlight": "Electrical Department",
        "Electricity": "Electrical Department",
        "Water": "Water Supply Department",
        "Water Leakage": "Water Supply Department",
        "Garbage": "Sanitation Department",
        "Waste": "Sanitation Department",
        "Drainage": "Drainage Department",
        "Sewage": "Drainage Department",
        "Tree": "Parks and Gardens Department",
        "Park": "Parks and Gardens Department"
    };

    return departments[category] || "General Department";
}
app.post("/complaints/submit", (req, res) => {
    const department = getDepartment(req.body.category);

    const complaint = {
        id: complaints.length + 1,
        ...req.body,
        department: department,
        status: "Pending"
    };

    complaints.push(complaint);

    res.status(201).json({
        message: "Complaint submitted successfully",
        complaint: complaint
    });
});
app.listen(PORT, () => {
    console.log(`GrievEase server running at http://localhost:5000`);
});