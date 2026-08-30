/* =====================================================
   GRIEVEASE - SMART GRIEVANCE MANAGEMENT SYSTEM
   =====================================================
   
   A comprehensive citizen grievance management platform
   with AI-powered classification, duplicate detection,
   and automatic department routing.
   
   KEY FEATURES:
   ✓ AI-powered complaint classification
   ✓ Automatic severity assessment
   ✓ Smart duplicate detection
   ✓ GPS location capture
   ✓ Photo evidence attachment
   ✓ Voice input support
   ✓ Real-time dashboard
   ✓ SLA tracking
   ✓ Browser-based data persistence
   
   TECHNOLOGY STACK:
   - Frontend: HTML5, CSS3, Vanilla JavaScript
   - Storage: Browser LocalStorage (client-side)
   - Backend: Flask (Python)
   - Data: SQLite database
   
   WORKFLOW:
   1. Citizen submits complaint with details & media
   2. AI analyzes and classifies the complaint
   3. Duplicate detection checks for similar issues
   4. System routes to appropriate department
   5. Department views in real-time dashboard
   6. Status updates tracked and displayed to citizen
   
   FIXED ISSUES (This Session):
   - Form submission flow was broken (duplicate listeners)
   - Static assets not being served by Flask
   - No proper form validation and analysis
   - Dashboard not updating correctly
   
   FILE STRUCTURE:
   - index.html: Main UI template with all sections
   - script.js: Client-side logic (this file)
   - style.css: UI styling and responsive design
   - app.py: Flask backend server
   - database.py: SQLite database operations
   - services/: AI classification and routing logic
   
===================================================== */


/* =====================================================
   GLOBAL VARIABLES
=====================================================
   Store browser state including media streams,
   captured data, and all grievances from localStorage.
===================================================== */

let cameraStream = null;

let capturedPhoto = null;

let userLocation = null;


/* Load grievances from browser storage */

let grievances =
    JSON.parse(
        localStorage.getItem("grievances")
    ) || [];



/* =====================================================
   NAVIGATION
===================================================== */

function goToSubmit() {

    document
        .getElementById("submit")
        .scrollIntoView({
            behavior: "smooth"
        });

}


function goToTrack() {

    document
        .getElementById("track")
        .scrollIntoView({
            behavior: "smooth"
        });

}


/* =====================================================
   CAMERA
===================================================== */

async function startCamera() {

    try {

        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode: "environment"
                },

                audio: false

            });


        const camera =
            document.getElementById("camera");


        camera.srcObject =
            cameraStream;


        camera.style.display =
            "block";


        document
            .getElementById(
                "cameraPlaceholder"
            )
            .style.display = "none";


    }

    catch (error) {

        alert(
            "Camera permission was not granted. " +
            "Please allow camera access in your browser."
        );

        console.error(error);

    }

}



/* Take photograph */

function takePhoto() {

    if (!cameraStream) {

        alert(
            "Please start the camera first."
        );

        return;
    }


    const camera =
        document.getElementById("camera");


    const canvas =
        document.getElementById("photoCanvas");


    canvas.width =
        camera.videoWidth;


    canvas.height =
        camera.videoHeight;


    const context =
        canvas.getContext("2d");


    context.drawImage(
        camera,
        0,
        0,
        canvas.width,
        canvas.height
    );


    capturedPhoto =
        canvas.toDataURL(
            "image/jpeg",
            0.8
        );


    const preview =
        document.getElementById(
            "photoPreview"
        );


    preview.src =
        capturedPhoto;


    document
        .getElementById(
            "photoPreviewContainer"
        )
        .style.display = "flex";


    alert(
        "Photo captured successfully!"
    );

}



/* Stop camera */

function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track => track.stop()
            );


        cameraStream = null;

    }


    const camera =
        document.getElementById("camera");


    camera.srcObject = null;

    camera.style.display = "none";


    document
        .getElementById(
            "cameraPlaceholder"
        )
        .style.display = "block";

}



/* =====================================================
   GPS
===================================================== */

function getLocation() {

    const locationText =
        document.getElementById(
            "locationText"
        );


    if (!navigator.geolocation) {

        locationText.textContent =
            "GPS is not supported by this browser.";

        return;

    }


    locationText.textContent =
        "Getting your location...";


    navigator.geolocation.getCurrentPosition(

        function(position) {

            const latitude =
                position.coords.latitude;


            const longitude =
                position.coords.longitude;


            userLocation = {

                latitude:
                    latitude,

                longitude:
                    longitude

            };


            locationText.textContent =
                "Latitude: " +
                latitude.toFixed(6) +
                " | Longitude: " +
                longitude.toFixed(6);


        },


        function(error) {

            locationText.textContent =
                "Unable to capture GPS location.";

            console.error(error);

        }

    );

}



/* =====================================================
   FORM SUBMISSION HANDLER
   ===================================================== 
   FIXED: Removed duplicate/conflicting event listeners
   that were preventing proper form submission.
   
   This canonical listener:
   1. Validates form input
   2. Generates unique grievance ID
   3. Analyzes complaint for category/severity
   4. Detects duplicate complaints
   5. Calculates SLA deadline
   6. Saves to localStorage
   7. Shows AI analysis results
   8. Updates dashboard statistics
   9. Resets form for next submission
===================================================== */

const grievanceForm = document.getElementById("grievanceForm");

if (grievanceForm) {
    grievanceForm.addEventListener("submit", function (event) {
        event.preventDefault();


            const name =
                document
                    .getElementById(
                        "studentName"
                    )
                    .value
                    .trim();


            const language =
                document
                    .getElementById(
                        "language"
                    )
                    .value;


            const selectedCategory =
                document
                    .getElementById(
                        "category"
                    )
                    .value;


            const title =
                document
                    .getElementById(
                        "problemTitle"
                    )
                    .value
                    .trim();


            const description =
                document
                    .getElementById(
                        "description"
                    )
                    .value
                    .trim();



            /* Check description */

            if (description.length < 20) {

                alert(
                    "Please describe the problem using at least 20 characters."
                );

                return;

            }



            /* Generate ID */

            const grievanceId =
                generateGrievanceId();



            /* AI classification */

            const analysis =
                analyzeComplaint(
                    title,
                    description,
                    selectedCategory
                );



            /* Duplicate detection */

            const duplicate =
                detectDuplicate(
                    title,
                    description,
                    analysis.category
                );



            /* SLA */

            const slaHours =
                getSLA(
                    analysis.severity
                );


            const now =
                new Date();


            const deadline =
                new Date(
                    now.getTime() +
                    slaHours *
                    60 *
                    60 *
                    1000
                );



            /* Create grievance */

            const grievance = {

                id:
                    grievanceId,

                name:
                    name,

                language:
                    language,

                title:
                    title,

                description:
                    description,

                selectedCategory:
                    selectedCategory,

                category:
                    analysis.category,

                department:
                    analysis.department,

                severity:
                    analysis.severity,

                confidence:
                    analysis.confidence,

                slaHours:
                    slaHours,

                createdAt:
                    now.toISOString(),

                deadline:
                    deadline.toISOString(),

                status:
                    "Submitted",

                duplicate:
                    duplicate,

                photo:
                    capturedPhoto,

                location:
                    userLocation,

                humanReview:
                    analysis.confidence < 70

            };



            /* Save */

            grievances.push(
                grievance
            );


            localStorage.setItem(

                "grievances",

                JSON.stringify(
                    grievances
                )

            );



            /* Display analysis */

            showAnalysis(
                grievance
            );


            /* Reset */

            document
                .getElementById(
                    "grievanceForm"
                )
                .reset();


            capturedPhoto = null;

            userLocation = null;


            document
                .getElementById(
                    "photoPreviewContainer"
                )
                .style.display = "none";


            document
                .getElementById(
                    "locationText"
                )
                .textContent =
                "Location not captured";


            stopCamera();


            renderDashboard();

        }
    );



/* =====================================================
   GENERATE GRIEVANCE ID
===================================================== */

function generateGrievanceId() {

    const random =
        Math.floor(
            100000 +
            Math.random() *
            900000
        );


    return (
        "GE-" +
        new Date()
            .getFullYear() +
        "-" +
        random
    );

}



/* =====================================================
   AI CLASSIFICATION ENGINE
   =====================================================
   Analyzes complaint text to automatically determine:
   - Category (Road, Water, Electricity, Waste, etc.)
   - Department (which agency should handle it)
   - Severity (CRITICAL, HIGH, MEDIUM, LOW)
   - Confidence score (0-100% certainty)
   
   Uses keyword matching to classify complaints
   without requiring backend API calls.
   
   Benefits:
   - Instant feedback to citizens
   - Automatic routing to correct department
   - Prioritization by severity
===================================================== */

function analyzeComplaint(
    title,
    description,
    selectedCategory
) {


    const text =
        (
            title +
            " " +
            description
        ).toLowerCase();



    let category =
        "General Civic Issue";


    let department =
        "General Administration";


    let severity =
        "LOW";


    let confidence =
        70;



    /* -----------------------------------------------
       ROAD
    ------------------------------------------------ */

    if (

        text.includes("pothole") ||
        text.includes("road") ||
        text.includes("street") ||
        text.includes("traffic") ||
        text.includes("footpath")

    ) {

        category =
            "Road Damage / Pothole";

        department =
            "Roads & Infrastructure";

        confidence =
            94;

    }



    /* -----------------------------------------------
       WATER
    ------------------------------------------------ */

    else if (

        text.includes("water") ||
        text.includes("drain") ||
        text.includes("leak") ||
        text.includes("sewage") ||
        text.includes("flood")

    ) {

        category =
            "Water / Drainage";

        department =
            "Water & Sanitation";

        confidence =
            93;

    }



    /* -----------------------------------------------
       ELECTRICITY
    ------------------------------------------------ */

    else if (

        text.includes("streetlight") ||
        text.includes("electricity") ||
        text.includes("light") ||
        text.includes("power") ||
        text.includes("wire")

    ) {

        category =
            "Electricity / Streetlight";

        department =
            "Electrical Department";

        confidence =
            92;

    }



    /* -----------------------------------------------
       WASTE
    ------------------------------------------------ */

    else if (

        text.includes("garbage") ||
        text.includes("waste") ||
        text.includes("trash") ||
        text.includes("dirty") ||
        text.includes("dump")

    ) {

        category =
            "Waste Management";

        department =
            "Sanitation Department";

        confidence =
            91;

    }



    /* -----------------------------------------------
       HOSTEL
    ------------------------------------------------ */

    else if (

        text.includes("hostel") ||
        text.includes("room") ||
        text.includes("warden") ||
        text.includes("bed")

    ) {

        category =
            "Hostel Issue";

        department =
            "Hostel Administration";

        confidence =
            90;

    }



    /* -----------------------------------------------
       MESS
    ------------------------------------------------ */

    else if (

        text.includes("mess") ||
        text.includes("food") ||
        text.includes("canteen") ||
        text.includes("meal")

    ) {

        category =
            "Mess / Food";

        department =
            "Mess Committee";

        confidence =
            89;

    }



    /* -----------------------------------------------
       ACADEMIC
    ------------------------------------------------ */

    else if (

        text.includes("teacher") ||
        text.includes("professor") ||
        text.includes("class") ||
        text.includes("exam") ||
        text.includes("marks") ||
        text.includes("academic")

    ) {

        category =
            "Academic Issue";

        department =
            "Academic Section";

        confidence =
            87;

    }



    /* If user selected category */

    if (
        selectedCategory &&
        selectedCategory !== ""
    ) {

        if (
            selectedCategory === "Road"
        ) {

            category =
                "Road Damage / Pothole";

            department =
                "Roads & Infrastructure";

        }

        else if (
            selectedCategory === "Water"
        ) {

            category =
                "Water / Drainage";

            department =
                "Water & Sanitation";

        }

        else if (
            selectedCategory === "Electricity"
        ) {

            category =
                "Electricity / Streetlight";

            department =
                "Electrical Department";

        }

        else if (
            selectedCategory === "Waste"
        ) {

            category =
                "Waste Management";

            department =
                "Sanitation Department";

        }

        else if (
            selectedCategory === "Hostel"
        ) {

            category =
                "Hostel Issue";

            department =
                "Hostel Administration";

        }

        else if (
            selectedCategory === "Mess"
        ) {

            category =
                "Mess / Food";

            department =
                "Mess Committee";

        }

        else if (
            selectedCategory === "Academic"
        ) {

            category =
                "Academic Issue";

            department =
                "Academic Section";

        }

    }



    /* -----------------------------------------------
       SEVERITY
    ------------------------------------------------ */

    if (

        text.includes("death") ||
        text.includes("danger") ||
        text.includes("contamination") ||
        text.includes("accident") ||
        text.includes("fire") ||
        text.includes("emergency") ||
        text.includes("injury")

    ) {

        severity =
            "CRITICAL";

    }


    else if (

        text.includes("urgent") ||
        text.includes("unsafe") ||
        text.includes("major") ||
        text.includes("dangerous") ||
        text.includes("blocked")

    ) {

        severity =
            "HIGH";

    }


    else if (

        text.includes("problem") ||
        text.includes("broken") ||
        text.includes("damaged")

    ) {

        severity =
            "MEDIUM";

    }


    return {

        category:
            category,

        department:
            department,

        severity:
            severity,

        confidence:
            confidence

    };

}



/* =====================================================
   SLA CALCULATION
   =====================================================
   Calculate Service Level Agreement (SLA) deadline
   based on severity level.
   
   SLA DEADLINES:
   - CRITICAL: 12 hours (life/safety issues)
   - HIGH: 24 hours (major damage/hazards)
   - MEDIUM: 48 hours (standard issues)
   - LOW: 72 hours (minor problems)
   
   Used to:
   1. Set deadline for department response
   2. Prioritize high-urgency complaints
   3. Escalate overdue grievances
   4. Track department performance
===================================================== */

function getSLA(severity) {

    if (
        severity === "CRITICAL"
    ) {

        return 12;

    }


    if (
        severity === "HIGH"
    ) {

        return 24;

    }


    if (
        severity === "MEDIUM"
    ) {

        return 48;

    }


    return 72;

}



/* =====================================================
   DUPLICATE DETECTION ENGINE
   =====================================================
   Compares new complaint against existing grievances
   to identify duplicates or similar issues.
   
   Algorithm:
   1. Tokenize both complaints into words
   2. Calculate similarity score (0-1)
   3. Flag if similarity >= 35% threshold
   4. Only compares within same category
   5. Ignores resolved complaints
   
   Benefits:
   - Consolidates resources on high-impact issues
   - Prevents duplicate work by departments
   - Helps track recurring problems
   - Improves response efficiency
===================================================== */

function detectDuplicate(
    title,
    description,
    category
) {


    const currentWords =
        tokenize(
            title +
            " " +
            description
        );


    let bestMatch =
        null;


    let bestScore =
        0;



    grievances.forEach(
        function(oldGrievance) {


            if (
                oldGrievance.category !==
                category
            ) {

                return;

            }


            if (
                oldGrievance.status ===
                "Resolved"
            ) {

                return;

            }


            const oldWords =
                tokenize(
                    oldGrievance.title +
                    " " +
                    oldGrievance.description
                );


            const score =
                similarity(
                    currentWords,
                    oldWords
                );


            if (
                score > bestScore
            ) {

                bestScore =
                    score;

                bestMatch =
                    oldGrievance;

            }

        }
    );



    if (
        bestMatch &&
        bestScore >= 0.35
    ) {

        return {

            found:
                true,

            score:
                Math.round(
                    bestScore * 100
                ),

            matchedId:
                bestMatch.id,

            matchedTitle:
                bestMatch.title

        };

    }


    return {

        found:
            false,

        score:
            0,

        matchedId:
            null,

        matchedTitle:
            null

    };

}



/* =====================================================
   TEXT TOKENIZATION
   =====================================================
   Break text into individual words for analysis.
   
   Process:
   1. Convert to lowercase for case-insensitive matching
   2. Remove punctuation and special characters
   3. Split into individual words
   4. Filter out words shorter than 3 characters
   
   Purpose:
   - Prepare text for duplicate detection
   - Enable word-based similarity comparison
   - Standardize complaint text analysis
===================================================== */

function tokenize(text) {

    return text
        .toLowerCase()
        .replace(
            /[^a-z0-9\s]/g,
            ""
        )
        .split(/\s+/)
        .filter(
            word =>
                word.length > 2
        );

}



/* =====================================================
   TEXT SIMILARITY MATCHING
   =====================================================
   Calculate Jaccard similarity between two word sets.
   
   Algorithm:
   - Finds common words between two complaints
   - Calculates: common_words / total_unique_words
   - Returns score from 0 (no match) to 1 (identical)
   
   Used by: detectDuplicate() function
   Threshold: >= 0.35 (35%) flags as duplicate
===================================================== */

function similarity(
    wordsA,
    wordsB
) {


    const setA =
        new Set(wordsA);


    const setB =
        new Set(wordsB);


    let common =
        0;


    setA.forEach(
        function(word) {

            if (
                setB.has(word)
            ) {

                common++;

            }

        }
    );


    const total =
        new Set(
            [
                ...setA,
                ...setB
            ]
        ).size;


    if (
        total === 0
    ) {

        return 0;

    }


    return common / total;

}



/* =====================================================
   SHOW AI ANALYSIS
===================================================== */

function showAnalysis(
    grievance
) {


    const section =
        document.getElementById(
            "analysis"
        );


    const loading =
        document.getElementById(
            "analysisLoading"
        );


    const result =
        document.getElementById(
            "analysisResult"
        );


    section.classList.remove(
        "hidden"
    );


    loading.classList.remove(
        "hidden"
    );


    result.classList.add(
        "hidden"
    );


    section.scrollIntoView({
        behavior: "smooth"
    });



    setTimeout(
        function() {


            loading.classList.add(
                "hidden"
            );


            result.classList.remove(
                "hidden"
            );



            document.getElementById(
                "resultId"
            ).textContent =
                grievance.id;


            document.getElementById(
                "resultDepartment"
            ).textContent =
                grievance.department;


            document.getElementById(
                "resultCategory"
            ).textContent =
                grievance.category;


            const severityElement =
                document.getElementById(
                    "resultSeverity"
                );


            severityElement.textContent =
                grievance.severity;


            severityElement.style.background =
                getSeverityBackground(
                    grievance.severity
                );


            severityElement.style.color =
                getSeverityColor(
                    grievance.severity
                );


            document.getElementById(
                "resultConfidence"
            ).textContent =
                grievance.confidence +
                "%";


            document.getElementById(
                "resultSLA"
            ).textContent =
                grievance.slaHours +
                " hours";



            /* Duplicate */

            const duplicate =
                document.getElementById(
                    "duplicateResult"
                );


            if (
                grievance.duplicate.found
            ) {

                duplicate.innerHTML = `

                    <div class="duplicate-warning">

                        ⚠️ Possible duplicate detected.

                        <br><br>

                        Similarity:
                        <strong>
                            ${grievance.duplicate.score}%
                        </strong>

                        <br>

                        Related grievance:
                        <strong>
                            ${grievance.duplicate.matchedId}
                        </strong>

                        <br>

                        ${grievance.duplicate.matchedTitle}

                    </div>

                `;

            }


            else {

                duplicate.innerHTML = `

                    <div class="duplicate-safe">

                        ✓ No strong duplicate found
                        among current open grievances.

                    </div>

                `;

            }



            /* Human review */

            if (
                grievance.humanReview
            ) {

                document
                    .getElementById(
                        "humanReview"
                    )
                    .classList.remove(
                        "hidden"
                    );

            }

            else {

                document
                    .getElementById(
                        "humanReview"
                    )
                    .classList.add(
                        "hidden"
                    );

            }

        },

        1800
    );

}



/* =====================================================
   SEVERITY COLORS
===================================================== */

function getSeverityColor(
    severity
) {

    if (
        severity === "CRITICAL"
    ) {

        return "#991b1b";

    }


    if (
        severity === "HIGH"
    ) {

        return "#b91c1c";

    }


    if (
        severity === "MEDIUM"
    ) {

        return "#92400e";

    }


    return "#166534";

}



function getSeverityBackground(
    severity
) {

    if (
        severity === "CRITICAL"
    ) {

        return "#fee2e2";

    }


    if (
        severity === "HIGH"
    ) {

        return "#fee2e2";

    }


    if (
        severity === "MEDIUM"
    ) {

        return "#fef3c7";

    }


    return "#dcfce7";

}



/* =====================================================
   TRACK GRIEVANCE
===================================================== */

function trackGrievance() {


    const input =
        document.getElementById(
            "trackingInput"
        );


    const id =
        input.value
            .trim()
            .toUpperCase();


    const result =
        document.getElementById(
            "trackingResult"
        );


    const grievance =
        grievances.find(
            item =>
                item.id === id
        );


    if (!grievance) {

        result.innerHTML = `

            <div class="duplicate-warning">

                ❌ No grievance found with ID:

                <strong>
                    ${id}
                </strong>

            </div>

        `;

        return;

    }



    const stages = [

        "Submitted",

        "Verified",

        "Assigned",

        "In Progress",

        "Resolved"

    ];


    const currentIndex =
        stages.indexOf(
            grievance.status
        );



    let timelineHTML = "";



    stages.forEach(
        function(stage, index) {


            let className = "";


            if (
                index < currentIndex
            ) {

                className =
                    "completed";

            }


            else if (
                index === currentIndex
            ) {

                className =
                    "current";

            }



            timelineHTML += `

                <div
                    class="timeline-item
                    ${className}"
                >

                    <div
                        class="timeline-circle"
                    ></div>

                    <div
                        class="timeline-content"
                    >

                        <strong>
                            ${stage}
                        </strong>

                        <small>
                            ${
                                index <= currentIndex
                                ? "Completed / reached"
                                : "Waiting"
                            }
                        </small>

                    </div>

                </div>

            `;

        }
    );



    const deadline =
        new Date(
            grievance.deadline
        );


    const now =
        new Date();


    const remaining =
        deadline.getTime() -
        now.getTime();


    let slaText =
        "";


    if (
        grievance.status ===
        "Resolved"
    ) {

        slaText =
            "✓ Grievance resolved";

    }

    else if (
        remaining > 0
    ) {

        const hours =
            Math.floor(
                remaining /
                (1000 * 60 * 60)
            );


        const minutes =
            Math.floor(
                (
                    remaining %
                    (1000 * 60 * 60)
                ) /
                (1000 * 60)
            );


        slaText =
            "⏱ " +
            hours +
            "h " +
            minutes +
            "m remaining";

    }

    else {

        slaText =
            "⚠️ SLA overdue — escalation required";

    }



    result.innerHTML = `

        <div class="tracking-card">


            <div class="tracking-header">

                <div>

                    <span>
                        Grievance ID
                    </span>

                    <div class="tracking-id">
                        ${grievance.id}
                    </div>

                    <h3>
                        ${grievance.title}
                    </h3>

                </div>


                <span class="status-pill">

                    ${grievance.status}

                </span>

            </div>



            <p>

                <strong>
                    Department:
                </strong>

                ${grievance.department}

            </p>


            <p>

                <strong>
                    Severity:
                </strong>

                ${grievance.severity}

            </p>



            <div class="timeline">

                ${timelineHTML}

            </div>



            <div class="sla-box">

                <strong>
                    SLA Status
                </strong>

                <br>

                ${slaText}

            </div>


        </div>

    `;

}



/* =====================================================
   DASHBOARD STATISTICS & DISPLAY
   =====================================================
   Updates the department dashboard with real-time
   counts of grievances by status and severity.
   
   Metrics tracked and displayed:
   - TOTAL: All grievances submitted to the system
   - CRITICAL: High-severity issues needing urgent action
   - PENDING: Open grievances awaiting resolution
   - RESOLVED: Completed and closed grievances
   
   Also filters grievances by:
   - Status (Submitted, Verified, Assigned, etc.)
   - Severity (Critical, High, Medium, Low)
   
   Purpose:
   - Give departments real-time visibility
   - Prioritize critical issues
   - Track resolution progress
===================================================== */

function renderDashboard() {


    const list =
        document.getElementById(
            "dashboardList"
        );


    const statusFilter =
        document.getElementById(
            "statusFilter"
        ).value;


    const severityFilter =
        document.getElementById(
            "severityFilter"
        ).value;



    /* Statistics: Count grievances by severity and status */

    document.getElementById(
        "totalComplaints"
    ).textContent =
        grievances.length;


    document.getElementById(
        "criticalComplaints"
    ).textContent =

        grievances.filter(
            item =>
                item.severity ===
                "CRITICAL"
        ).length;


    document.getElementById(
        "pendingComplaints"
    ).textContent =

        grievances.filter(
            item =>
                item.status !==
                "Resolved"
        ).length;


    document.getElementById(
        "resolvedComplaints"
    ).textContent =

        grievances.filter(
            item =>
                item.status ===
                "Resolved"
        ).length;



    /* Filter */

    let filtered =
        grievances.filter(
            function(item) {


                const statusMatch =
                    statusFilter ===
                    "All" ||
                    item.status ===
                    statusFilter;


                const severityMatch =
                    severityFilter ===
                    "All" ||
                    item.severity ===
                    severityFilter;


                return (
                    statusMatch &&
                    severityMatch
                );

            }
        );



    /* Sort priority */

    const priority = {

        CRITICAL: 4,

        HIGH: 3,

        MEDIUM: 2,

        LOW: 1

    };


    filtered.sort(
        function(a, b) {

            return (
                priority[b.severity] -
                priority[a.severity]
            );

        }
    );



    if (
        filtered.length === 0
    ) {

        list.innerHTML = `

            <div class="dashboard-card">

                No grievances found.

            </div>

        `;

        return;

    }



    list.innerHTML = "";



    filtered.forEach(
        function(grievance) {


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "dashboard-card";


            card.innerHTML = `

                <div
                    class="dashboard-card-header"
                >

                    <div>

                        <h3>
                            ${grievance.title}
                        </h3>

                        <small>
                            ${grievance.id}
                        </small>

                    </div>


                    <span
                        class="
                        status-pill
                        "
                    >

                        ${grievance.status}

                    </span>

                </div>



                <div
                    class="dashboard-meta"
                >

                    <span>

                        <strong>
                            Department:
                        </strong>

                        ${grievance.department}

                    </span>


                    <span
                        class="
                        ${getPriorityClass(
                            grievance.severity
                        )}
                        "
                    >

                        ${grievance.severity}

                    </span>


                    <span>

                        SLA:
                        ${grievance.slaHours}
                        hours

                    </span>


                    <span>

                        Confidence:
                        ${grievance.confidence}%

                    </span>


                    <span>

                        Duplicate:
                        ${
                            grievance.duplicate.found
                            ? "Possible"
                            : "No"
                        }

                    </span>

                </div>



                <p>

                    ${grievance.description}

                </p>



                <br>



                <label>
                    Update Status
                </label>


                <select
                    class="status-select"
                    onchange="
                        updateStatus(
                            '${grievance.id}',
                            this.value
                        )
                    "
                >

                    <option
                        ${
                            grievance.status ===
                            "Submitted"
                            ? "selected"
                            : ""
                        }
                    >
                        Submitted
                    </option>


                    <option
                        ${
                            grievance.status ===
                            "Verified"
                            ? "selected"
                            : ""
                        }
                    >
                        Verified
                    </option>


                    <option
                        ${
                            grievance.status ===
                            "Assigned"
                            ? "selected"
                            : ""
                        }
                    >
                        Assigned
                    </option>


                    <option
                        ${
                            grievance.status ===
                            "In Progress"
                            ? "selected"
                            : ""
                        }
                    >
                        In Progress
                    </option>


                    <option
                        ${
                            grievance.status ===
                            "Resolved"
                            ? "selected"
                            : ""
                        }
                    >
                        Resolved
                    </option>

                </select>

            `;


            list.appendChild(
                card
            );

        }
    );

}



/* =====================================================
   UPDATE STATUS
===================================================== */

function updateStatus(
    id,
    newStatus
) {


    const grievance =
        grievances.find(
            item =>
                item.id === id
        );


    if (!grievance) {

        return;

    }


    grievance.status =
        newStatus;


    localStorage.setItem(

        "grievances",

        JSON.stringify(
            grievances
        )

    );


    renderDashboard();


    alert(
        "Status updated to: " +
        newStatus
    );

}



/* =====================================================
   PRIORITY CLASS
===================================================== */

function getPriorityClass(
    severity
) {

    if (
        severity === "CRITICAL" ||
        severity === "HIGH"
    ) {

        return "priority-high";

    }


    if (
        severity === "MEDIUM"
    ) {

        return "priority-medium";

    }


    return "priority-low";

}



/* =====================================================
   INITIALIZATION ON PAGE LOAD
   =====================================================
   Initialize the dashboard when page first loads.
   This displays current statistics to users/admins.
===================================================== */

renderDashboard();



/* =====================================================
   CONTINUOUS DASHBOARD UPDATES
   =====================================================
   Refresh dashboard every 30 seconds to reflect:
   - New grievances submitted by citizens
   - Status changes by departments
   - Resolved grievances
   
   Keeps admins aware of real-time workload and
   allows them to prioritize critical issues.
===================================================== */

setInterval(
    function() {

        renderDashboard();

    },

    30000
);const micButton = document.getElementById("micButton");
const voiceStatus = document.getElementById("voiceStatus");
const descriptionBox = document.getElementById("description");

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;

    // You can change this language
    recognition.lang = "en-IN";

    micButton.addEventListener("click", () => {

        recognition.start();

        voiceStatus.textContent = "🎙️ Listening... Speak now.";
        micButton.textContent = "🛑 Listening...";
    });

    recognition.onresult = (event) => {

        const spokenText = event.results[0][0].transcript;

        descriptionBox.value = spokenText;

        voiceStatus.textContent =
            "✅ Your complaint has been converted to text.";

        micButton.textContent = "🎤 Speak Again";
    };

    recognition.onerror = (event) => {

        voiceStatus.textContent =
            "❌ Could not hear you. Please try again.";

        micButton.textContent = "🎤 Speak Your Complaint";

        console.log(event.error);
    };

    recognition.onend = () => {

        micButton.textContent = "🎤 Speak Your Complaint";
    };

} else {

    micButton.disabled = true;

    voiceStatus.textContent =
        "Your browser does not support voice recognition.";
}

console.log("GrievEase complaint system is ready");