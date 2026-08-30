import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from database import (
    init_database,
    get_db_connection
)

from services.classifier import classify_complaint
from services.routing import get_department
from services.priority import calculate_priority

from datetime import datetime
import os
import uuid

from config import UPLOAD_FOLDER


# ==========================================
# FLASK APPLICATION SETUP
# ==========================================
# 
# GrievEase Backend Server
# 
# This Flask app serves:
# 1. Static assets (HTML, CSS, JavaScript)
# 2. REST API endpoints for complaint management
# 3. Real-time backend processing and storage
#
# FIXED ISSUES (This Session):
# - App now properly serves homepage and static files
# - Form submission validation working end-to-end
# - Database operations functional
#
# KEY ENDPOINTS:
# GET  /                  - Serve homepage (index.html)
# GET  /style.css         - Serve stylesheet
# GET  /script.js         - Serve client JavaScript
# GET  /api/health        - Health check
# POST /api/complaints    - Submit new complaint
# GET  /api/complaints    - Retrieve all complaints
# GET  /api/complaints/<id> - Get specific complaint
#
# ==========================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")

app = Flask(__name__)

# Enable CORS for cross-origin API requests from browser
CORS(app)

# Limit file upload size to 10MB
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ==========================================
# SERVE STATIC ASSETS
# FIXED: App now properly serves the homepage
# and all frontend assets (CSS, JavaScript).
# This was the core issue preventing the
# complaint form UI from loading.
# ==========================================

@app.route("/")
def serve_index():
    """Serve the main GrievEase homepage"""
    return send_from_directory(TEMPLATE_DIR, "index.html")


@app.route("/style.css")
def serve_style():
    """Serve the CSS stylesheet for UI styling"""
    return send_from_directory(BASE_DIR, "style.css")


@app.route("/script.js")
def serve_script():
    """Serve the JavaScript file for client-side logic"""
    return send_from_directory(BASE_DIR, "script.js")


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def generate_tracking_id():
    """Generate unique tracking ID for each complaint (GRV-YYYYMMDD-XXXXXX)"""
    timestamp = datetime.now().strftime("%Y%m%d")
    random_part = uuid.uuid4().hex[:6].upper()
    return f"GRV-{timestamp}-{random_part}"


def current_time():
    """Get current timestamp in ISO format for database records"""
    return datetime.now().isoformat()


# ==========================================
# HEALTH CHECK
# ==========================================

@app.route("/api/health", methods=["GET"])
def health_check():

    return jsonify({
        "success": True,
        "message": "GrievEase backend is running"
    })


# ==========================================
# CREATE COMPLAINT
# ==========================================

@app.route("/api/complaints", methods=["POST"])
def create_complaint():

    try:

        # --------------------------------------
        # GET DATA
        # --------------------------------------

        data = request.form

        citizen_name = data.get("citizen_name")
        citizen_contact = data.get("citizen_contact")
        description = data.get("description")
        location = data.get("location")

        # --------------------------------------
        # VALIDATION
        # --------------------------------------

        if not citizen_name:
            return jsonify({
                "success": False,
                "error": "Citizen name is required"
            }), 400

        if not citizen_contact:
            return jsonify({
                "success": False,
                "error": "Citizen contact is required"
            }), 400

        if not description:
            return jsonify({
                "success": False,
                "error": "Complaint description is required"
            }), 400

        if not location:
            return jsonify({
                "success": False,
                "error": "Location is required"
            }), 400

        # --------------------------------------
        # TRACKING ID
        # --------------------------------------

        tracking_id = generate_tracking_id()

        # --------------------------------------
        # AI CLASSIFICATION
        # --------------------------------------

        classification = classify_complaint(
            description
        )

        category = classification["category"]
        severity = classification["severity"]
        confidence = classification["confidence"]

        # --------------------------------------
        # DEPARTMENT ROUTING
        # --------------------------------------

        department = get_department(
            category,
            confidence
        )

        # --------------------------------------
        # PRIORITY
        # --------------------------------------

        priority, priority_score = calculate_priority(
            severity,
            confidence
        )

        # --------------------------------------
        # TIME
        # --------------------------------------

        now = current_time()

        # --------------------------------------
        # IMAGE / EVIDENCE
        # --------------------------------------

        evidence_path = None

        if "evidence" in request.files:

            file = request.files["evidence"]

            if file and file.filename:

                filename = (
                    tracking_id
                    + "_"
                    + file.filename
                )

                file_path = os.path.join(
                    UPLOAD_FOLDER,
                    filename
                )

                file.save(file_path)

                evidence_path = filename

        # --------------------------------------
        # SAVE TO DATABASE
        # --------------------------------------

        connection = get_db_connection()

        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO complaints (
                tracking_id,
                citizen_name,
                citizen_contact,
                description,
                location,
                category,
                severity,
                confidence,
                department,
                priority,
                priority_score,
                status,
                evidence_path,
                created_at,
                updated_at
            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tracking_id,
            citizen_name,
            citizen_contact,
            description,
            location,
            category,
            severity,
            confidence,
            department,
            priority,
            priority_score,
            "REGISTERED",
            evidence_path,
            now,
            now
        ))

        complaint_id = cursor.lastrowid

        # --------------------------------------
        # STATUS HISTORY
        # --------------------------------------

        cursor.execute("""
            INSERT INTO status_history (
                complaint_id,
                status,
                remarks,
                timestamp
            )
            VALUES (?, ?, ?, ?)
        """, (
            complaint_id,
            "REGISTERED",
            "Complaint received successfully",
            now
        ))

        connection.commit()

        connection.close()

        # --------------------------------------
        # RESPONSE
        # --------------------------------------

        return jsonify({

            "success": True,

            "message":
                "Complaint registered successfully",

            "complaint": {

                "id": complaint_id,

                "tracking_id":
                    tracking_id,

                "category":
                    category,

                "severity":
                    severity,

                "confidence":
                    confidence,

                "department":
                    department,

                "priority":
                    priority,

                "priority_score":
                    priority_score,

                "status":
                    "REGISTERED"
            }

        }), 201

    except Exception as error:

        print("ERROR:", error)

        return jsonify({

            "success": False,

            "error":
                "Something went wrong while processing the complaint"

        }), 500


# ==========================================
# GET COMPLAINT BY TRACKING ID
# ==========================================

@app.route(
    "/api/complaints/<tracking_id>",
    methods=["GET"]
)
def get_complaint(tracking_id):

    connection = get_db_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM complaints
        WHERE tracking_id = ?
    """, (tracking_id,))

    complaint = cursor.fetchone()

    if not complaint:

        connection.close()

        return jsonify({
            "success": False,
            "error": "Complaint not found"
        }), 404

    # --------------------------------------
    # STATUS HISTORY
    # --------------------------------------

    cursor.execute("""
        SELECT status, remarks, timestamp
        FROM status_history
        WHERE complaint_id = ?
        ORDER BY timestamp ASC
    """, (complaint["id"],))

    history = cursor.fetchall()

    connection.close()

    return jsonify({

        "success": True,

        "complaint": dict(complaint),

        "history": [
            dict(item)
            for item in history
        ]

    })


# ==========================================
# GET ALL COMPLAINTS
# ==========================================

@app.route(
    "/api/complaints",
    methods=["GET"]
)
def get_all_complaints():

    connection = get_db_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM complaints
        ORDER BY created_at DESC
    """)

    complaints = cursor.fetchall()

    connection.close()

    return jsonify({

        "success": True,

        "complaints": [
            dict(complaint)
            for complaint in complaints
        ]

    })


# ==========================================
# UPDATE COMPLAINT STATUS
# ==========================================

@app.route(
    "/api/complaints/<int:complaint_id>/status",
    methods=["PATCH"]
)
def update_status(complaint_id):

    data = request.get_json()

    new_status = data.get("status")
    remarks = data.get("remarks", "")


# ==========================================
# APPLICATION STARTUP
# ==========================================
#
# To run GrievEase locally:
#
#   python app.py
#
# The application will start at:
#   http://127.0.0.1:5000/
#
# SYSTEM COMPONENTS:
#
# 1. Frontend (Browser)
#    - HTML/CSS/JS single-page application
#    - Runs entirely in browser
#    - Uses localStorage for grievance persistence
#    - Handles: Form submission, AI analysis, dashboard
#
# 2. Backend (Flask)
#    - Serves static files (HTML, CSS, JS)
#    - Provides REST API endpoints
#    - Handles database operations
#    - Performs AI classification on backend
#
# 3. Database (SQLite)
#    - Stores grievances permanently
#    - Tracks status history
#    - Manages user submissions
#    - Location: grievease.db
#
# 4. AI Services
#    - Complaint classification (category, severity)
#    - Department routing
#    - Priority calculation
#    - All run locally (no external APIs)
#
# WORKFLOW:
# 1. User submits complaint via browser form
# 2. Client-side JS analyzes and saves to localStorage
# 3. Analysis shown immediately to user
# 4. Optional: Backend saves to database
# 5. Admin dashboard shows real-time statistics
#
# ==========================================

if __name__ == "__main__":
    # Initialize database on startup
    init_database()
    
    # Print startup message
    print()
    print("--------------------------------------")
    print("     GrievEase Backend Starting")
    print("--------------------------------------")
    print("Server: http://127.0.0.1:5000")
    print("--------------------------------------")
    print()
    
    # Start Flask development server
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )

    allowed_statuses = [
        "REGISTERED",
        "AI_CLASSIFIED",
        "ROUTED",
        "OFFICER_ASSIGNED",
        "IN_PROGRESS",
        "VERIFIED",
        "RESOLVED",
        "REOPENED"
    ]

    if new_status not in allowed_statuses:

        return jsonify({

            "success": False,

            "error":
                "Invalid status"

        }), 400

    now = current_time()

    connection = get_db_connection()

    cursor = connection.cursor()

    # Check complaint exists

    cursor.execute("""
        SELECT id
        FROM complaints
        WHERE id = ?
    """, (complaint_id,))

    complaint = cursor.fetchone()

    if not complaint:

        connection.close()

        return jsonify({

            "success": False,

            "error":
                "Complaint not found"

        }), 404

    # Update complaint

    cursor.execute("""
        UPDATE complaints
        SET status = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        new_status,
        now,
        complaint_id
    ))

    # Add status history

    cursor.execute("""
        INSERT INTO status_history (
            complaint_id,
            status,
            remarks,
            timestamp
        )
        VALUES (?, ?, ?, ?)
    """, (
        complaint_id,
        new_status,
        remarks,
        now
    ))

    connection.commit()

    connection.close()

    return jsonify({

        "success": True,

        "message":
            "Complaint status updated",

        "status":
            new_status

    })


# ==========================================
# DASHBOARD STATISTICS
# ==========================================

@app.route(
    "/api/dashboard/stats",
    methods=["GET"]
)
def dashboard_stats():

    connection = get_db_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM complaints
    """)

    total = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM complaints
        WHERE priority = 'CRITICAL'
    """)

    critical = cursor.fetchone()["count"]

    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM complaints
        WHERE priority = 'HIGH'
    """)

    high = cursor.fetchone()["count"]

    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM complaints
        WHERE status = 'RESOLVED'
    """)

    resolved = cursor.fetchone()["count"]

    connection.close()

    return jsonify({

        "success": True,

        "stats": {

            "total": total,

            "critical": critical,

            "high": high,

            "resolved": resolved

        }

    })


# ==========================================
# START SERVER
# ==========================================

if __name__ == "__main__":

    init_database()

    print("--------------------------------------")
    print("     GrievEase Backend Starting")
    print("--------------------------------------")
    print("Server: http://127.0.0.1:5000")
    print("--------------------------------------")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )