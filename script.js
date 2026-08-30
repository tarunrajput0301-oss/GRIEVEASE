/* =====================================================
   GRIEV EASE
   SMART GRIEVANCE MANAGEMENT SYSTEM
===================================================== */


/* =====================================================
   GLOBAL VARIABLES
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
   FORM SUBMISSION
===================================================== */

document
    .getElementById("grievanceForm")
    .addEventListener(
        "submit",
        function(event) {

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
   AI CLASSIFICATION
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
   SLA
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
   DUPLICATE DETECTION
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



/* Convert text into words */

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



/* Simple similarity */

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
   ADMIN DASHBOARD
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



    /* Statistics */

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
   INITIAL LOAD
===================================================== */

renderDashboard();



/* =====================================================
   UPDATE DASHBOARD PERIODICALLY
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
}async function submitComplaint(complaintData) {
    try {
        const response = await fetch("http://localhost:5000/complaints", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(complaintData)
        });

        const result = await response.json();

        if (response.ok) {
            alert("Complaint submitted successfully!");
            console.log("Complaint:", result.complaint);
        } else {
            alert("Failed to submit complaint.");
        }

    } catch (error) {
        console.error("Error:", error);
        alert("Could not connect to GrievEase server.");
    }
}async function submitComplaint(complaintData) {
    try {
        const response = await fetch("http://localhost:5000/complaints", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(complaintData)
        });

        const result = await response.json();

        if (response.ok) {
            alert("Complaint submitted successfully!");
            console.log("Complaint:", result.complaint);
        } else {
            alert("Failed to submit complaint.");
        }

    } catch (error) {
        console.error("Error:", error);
        alert("Could not connect to GrievEase server.");
    }
}document.getElementById("grievanceForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const formData = new FormData(this);

    const complaintData = {
        name: formData.get("name"),
        email: formData.get("email"),
        category: formData.get("category"),
        description: formData.get("description")
    };

    await submitComplaint(complaintData);
});console.log("GrievEase complaint system is ready");
async function submitToDepartment(complaintData) {
    try {
        const response = await fetch("http://localhost:5000/complaints/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(complaintData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(
                "Complaint submitted successfully!\n" +
                "Department: " + result.complaint.department
            );

            console.log("Complaint:", result.complaint);
        } else {
            alert("Complaint submission failed.");
        }

    } catch (error) {
        console.error("Error:", error);
        alert("Could not connect to GrievEase backend.");
    }
}
const grievanceForm = document.querySelector("form");

if (grievanceForm) {
    grievanceForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const formData = new FormData(grievanceForm);
        const complaintData = {};

        formData.forEach((value, key) => {
            complaintData[key] = value;
        });

        await submitToDepartment(complaintData);
    });
}