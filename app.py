from flask import Flask, request, jsonify
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
# CREATE FLASK APP
# ==========================================

app = Flask(__name__)

CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def generate_tracking_id():

    timestamp = datetime.now().strftime("%Y%m%d")

    random_part = uuid.uuid4().hex[:6].upper()

    return f"GRV-{timestamp}-{random_part}"


def current_time():

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