def classify_complaint(description):

    text = description.lower()

    # Road
    if any(word in text for word in [
        "pothole",
        "road damage",
        "road broken",
        "road damaged"
    ]):
        return {
            "category": "Road Damage",
            "severity": "HIGH",
            "confidence": 0.95
        }

    # Water
    if any(word in text for word in [
        "dirty water",
        "water contamination",
        "contaminated water",
        "unsafe water"
    ]):
        return {
            "category": "Water Contamination",
            "severity": "CRITICAL",
            "confidence": 0.95
        }

    # Garbage
    if any(word in text for word in [
        "garbage",
        "waste",
        "trash",
        "dustbin overflow"
    ]):
        return {
            "category": "Garbage / Waste Overflow",
            "severity": "MEDIUM",
            "confidence": 0.90
        }

    # Sewage
    if any(word in text for word in [
        "sewage",
        "drain blockage",
        "drain blocked",
        "sewer"
    ]):
        return {
            "category": "Sewage / Drain Blockage",
            "severity": "HIGH",
            "confidence": 0.90
        }

    # Streetlight
    if any(word in text for word in [
        "streetlight",
        "street light",
        "light not working"
    ]):
        return {
            "category": "Streetlight / Electrical",
            "severity": "MEDIUM",
            "confidence": 0.90
        }

    # Traffic
    if any(word in text for word in [
        "traffic signal",
        "traffic light",
        "road sign"
    ]):
        return {
            "category": "Traffic Signal / Road Signage",
            "severity": "HIGH",
            "confidence": 0.90
        }

    # Unknown
    return {
        "category": "Other",
        "severity": "MEDIUM",
        "confidence": 0.40
    }