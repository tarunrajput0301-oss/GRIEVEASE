DEPARTMENT_MAPPING = {

    "Road Damage":
        "Roads & Infrastructure / PWD",

    "Water Contamination":
        "Water Supply + Public Health",

    "Sewage / Drain Blockage":
        "Sewerage & Drainage",

    "Garbage / Waste Overflow":
        "Sanitation / Solid Waste",

    "Streetlight / Electrical":
        "Electrical / Public Lighting",

    "Traffic Signal / Road Signage":
        "Traffic Management",

    "Parks / Public Space":
        "Parks & Horticulture",

    "Other":
        "Human Review Queue"
}


def get_department(category, confidence):

    # Low-confidence complaints
    # should not be automatically routed.

    if confidence < 0.70:
        return "Human Review Queue"

    return DEPARTMENT_MAPPING.get(
        category,
        "Human Review Queue"
    )